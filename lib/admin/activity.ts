import { randomUUID } from "node:crypto";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type AdminActivityType =
  | "CREATE"
  | "DELETE"
  | "IMPORT"
  | "TOGGLE"
  | "UPDATE";

export type AdminActivityEntity =
  | "GURU"
  | "MAPEL"
  | "PENGAMPU"
  | "PROFIL"
  | "SISWA";

export type AdminActivityItem = {
  action: AdminActivityType;
  actorId: string | null;
  actorName: string;
  createdAt: Date;
  details: string | null;
  entityLabel: string;
  entityType: AdminActivityEntity;
  id: string;
  message: string;
};

type RecordAdminActivityInput = {
  action: AdminActivityType;
  details?: string | null;
  entityLabel: string;
  entityType: AdminActivityEntity;
  message: string;
};

type AdminActivityFilters = {
  action?: AdminActivityType;
  entityType?: AdminActivityEntity;
};

let tableReadyPromise: Promise<void> | null = null;

export async function recordAdminActivity(input: RecordAdminActivityInput) {
  try {
    const session = await getCurrentSession();

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return;
    }

    await ensureAdminActivityTable();
    await prisma.$executeRaw`
      INSERT INTO AdminActivity (
        id,
        actorId,
        actorName,
        action,
        entityType,
        entityLabel,
        message,
        details,
        createdAt
      )
      VALUES (
        ${randomUUID()},
        ${session.user.id},
        ${session.user.name ?? "Administrator"},
        ${input.action},
        ${input.entityType},
        ${input.entityLabel},
        ${input.message},
        ${input.details ?? null},
        NOW(3)
      )
    `;

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/aktivitas");
  } catch (error) {
    console.error("Gagal mencatat aktivitas admin:", error);
  }
}

export async function getRecentAdminActivities(limit = 5) {
  await ensureAdminActivityTable();

  const safeLimit = Math.min(Math.max(limit, 1), 20);

  return prisma.$queryRawUnsafe<AdminActivityItem[]>(
    `
      SELECT
        id,
        actorId,
        actorName,
        action,
        entityType,
        entityLabel,
        message,
        details,
        createdAt
      FROM AdminActivity
      ORDER BY createdAt DESC
      LIMIT ${safeLimit}
    `,
  );
}

export async function getAdminActivities(
  page = 1,
  pageSize = 12,
  filters: AdminActivityFilters = {},
) {
  await ensureAdminActivityTable();

  const safePage = Math.max(page, 1);
  const safePageSize = Math.min(Math.max(pageSize, 1), 50);
  const offset = (safePage - 1) * safePageSize;
  const conditions = [
    filters.action ? `action = '${filters.action}'` : "",
    filters.entityType ? `entityType = '${filters.entityType}'` : "",
  ].filter(Boolean);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows, totalRows] = await Promise.all([
    prisma.$queryRawUnsafe<AdminActivityItem[]>(
      `
        SELECT
          id,
          actorId,
          actorName,
          action,
          entityType,
          entityLabel,
          message,
          details,
          createdAt
        FROM AdminActivity
        ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ${safePageSize}
        OFFSET ${offset}
      `,
    ),
    prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `
        SELECT COUNT(*) AS total
        FROM AdminActivity
        ${whereClause}
      `,
    ),
  ]);

  return {
    rows,
    total: Number(totalRows[0]?.total ?? 0),
  };
}

async function ensureAdminActivityTable() {
  tableReadyPromise ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS AdminActivity (
        id VARCHAR(191) NOT NULL,
        actorId VARCHAR(191) NULL,
        actorName VARCHAR(191) NOT NULL,
        action VARCHAR(64) NOT NULL,
        entityType VARCHAR(64) NOT NULL,
        entityLabel VARCHAR(191) NOT NULL,
        message TEXT NOT NULL,
        details TEXT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        INDEX AdminActivity_createdAt_idx (createdAt),
        INDEX AdminActivity_entityType_idx (entityType),
        INDEX AdminActivity_action_idx (action)
      )
    `);

    const detailColumn = await prisma.$queryRaw<{ columnName: string }[]>`
      SELECT COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'AdminActivity'
        AND COLUMN_NAME = 'details'
    `;

    if (detailColumn.length === 0) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE AdminActivity
        ADD COLUMN details TEXT NULL AFTER message
      `);
    }
  })();

  return tableReadyPromise;
}
