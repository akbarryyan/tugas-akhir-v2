"use server";

import { AuthMethod, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAdminActivity } from "@/lib/admin/activity";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { studentCreateSchema, subjectSchema, teacherCreateSchema } from "@/lib/admin/schemas";
import {
  type ImportType,
  getErrorMessage,
  getImportRedirectPath,
  getImportType,
  readImportRows,
  redirectWithMessage,
} from "@/lib/admin/shared";
import { buildStudentImportPreview } from "@/lib/admin/student-actions";
import { buildSubjectImportPreview } from "@/lib/admin/subject-actions";
import { buildTeacherImportPreview } from "@/lib/admin/teacher-actions";

async function buildImportPreview(type: ImportType, file: File) {
  const rows = await readImportRows(file);

  if (type === "guru") {
    return buildTeacherImportPreview(rows);
  }

  if (type === "siswa") {
    return buildStudentImportPreview(rows);
  }

  return buildSubjectImportPreview(rows);
}

export async function previewAdminImportAction(formData: FormData) {
  try {
    const type = getImportType(formData.get("type"));
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("File Excel wajib dipilih.");
    }

    const rows = await buildImportPreview(type, file);
    const validCount = rows.filter((row) => row.status === "valid").length;
    const errorCount = rows.length - validCount;

    return {
      errorCount,
      message:
        errorCount > 0
          ? "Preview selesai. Perbaiki baris yang bermasalah sebelum import."
          : "Preview selesai. Semua data siap diimpor.",
      rows,
      status: "ready" as const,
      type,
      validCount,
    };
  } catch (error) {
    return {
      errorCount: 0,
      message: getErrorMessage(error),
      rows: [],
      status: "error" as const,
      type: null,
      validCount: 0,
    };
  }
}

export async function confirmAdminImportAction(formData: FormData) {
  const type = getImportType(formData.get("type"));
  const redirectPath = getImportRedirectPath(type);
  let importedCount = 0;

  try {
    const payload = z
      .array(
        z.object({
          data: z.record(z.string(), z.union([z.string(), z.boolean()])),
          rowNumber: z.number(),
          status: z.literal("valid"),
        }),
      )
      .min(1, "Tidak ada data valid untuk diimpor.")
      .parse(JSON.parse(String(formData.get("payload") ?? "[]")));

    if (type === "guru") {
      const teachers = payload.map((row) => teacherCreateSchema.parse(row.data));
      const emails = teachers.map((teacher) => teacher.email);
      const nips = teachers.map((teacher) => teacher.nip);
      const [existingEmailUsers, existingNipProfiles] = await Promise.all([
        prisma.user.findMany({
          select: {
            email: true,
          },
          where: {
            email: {
              in: emails,
            },
          },
        }),
        prisma.teacherProfile.findMany({
          select: {
            nip: true,
          },
          where: {
            nip: {
              in: nips,
            },
          },
        }),
      ]);

      if (existingEmailUsers.length > 0 || existingNipProfiles.length > 0) {
        throw new Error("Sebagian email atau NIP sudah terdaftar. Muat ulang preview.");
      }

      await prisma.$transaction(async (tx) => {
        for (const teacher of teachers) {
          const user = await tx.user.create({
            data: {
              authMethod: AuthMethod.EMAIL_PASSWORD,
              email: teacher.email,
              name: teacher.name,
              passwordHash: hashPassword(teacher.password),
              role: Role.GURU,
            },
          });

          await tx.teacherProfile.create({
            data: {
              nip: teacher.nip,
              userId: user.id,
            },
          });
        }
      });
      importedCount = teachers.length;
      revalidatePath("/admin/pengampu");
      await recordAdminActivity({
        action: "IMPORT",
        entityLabel: "Data Guru",
        entityType: "GURU",
        message: `${importedCount} data guru diimpor dari Excel`,
      });
    } else if (type === "siswa") {
      const students = payload.map((row) => studentCreateSchema.parse(row.data));
      const nisns = students.map((student) => student.nisn);
      const existingStudents = await prisma.studentProfile.findMany({
        select: {
          nisn: true,
        },
        where: {
          nisn: {
            in: nisns,
          },
        },
      });

      if (existingStudents.length > 0) {
        throw new Error("Sebagian NISN sudah terdaftar. Muat ulang preview.");
      }

      await prisma.$transaction(async (tx) => {
        for (const student of students) {
          const user = await tx.user.create({
            data: {
              authMethod: AuthMethod.NISN,
              name: student.name,
              role: Role.SISWA,
            },
          });

          await tx.studentProfile.create({
            data: {
              className: student.className,
              nisn: student.nisn,
              userId: user.id,
            },
          });
        }
      });
      importedCount = students.length;
      await recordAdminActivity({
        action: "IMPORT",
        entityLabel: "Data Siswa",
        entityType: "SISWA",
        message: `${importedCount} data siswa diimpor dari Excel`,
      });
    } else {
      const subjects = payload.map((row) => subjectSchema.parse(row.data));
      const names = subjects.map((subject) => subject.name);
      const existingSubjects = await prisma.subject.findMany({
        select: {
          name: true,
        },
        where: {
          name: {
            in: names,
          },
        },
      });

      if (existingSubjects.length > 0) {
        throw new Error("Sebagian mata pelajaran sudah terdaftar. Muat ulang preview.");
      }

      await prisma.subject.createMany({
        data: subjects.map((subject) => ({
          description: subject.description || null,
          isActive: subject.isActive,
          name: subject.name,
        })),
      });
      importedCount = subjects.length;
      revalidatePath("/admin/pengampu");
      await recordAdminActivity({
        action: "IMPORT",
        entityLabel: "Mata Pelajaran",
        entityType: "MAPEL",
        message: `${importedCount} mata pelajaran diimpor dari Excel`,
      });
    }
  } catch (error) {
    redirectWithMessage(redirectPath, "error", getErrorMessage(error));
  }

  revalidatePath(redirectPath);
  redirectWithMessage(
    redirectPath,
    "success",
    `${importedCount} data berhasil dikonfirmasi dan diimpor.`,
  );
}
