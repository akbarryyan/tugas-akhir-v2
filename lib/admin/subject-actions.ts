"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAdminActivity } from "@/lib/admin/activity";
import { prisma } from "@/lib/db/prisma";
import { subjectSchema, subjectStatusSchema, subjectUpdateSchema } from "@/lib/admin/schemas";
import {
  type ImportPreviewRow,
  MAX_SUBJECT_IMPORT_ROWS,
  buildChangeDetails,
  cellToString,
  findColumnIndex,
  getErrorMessage,
  normalizeHeader,
  parseImportBoolean,
  readImportRows,
  redirectWithMessage,
} from "@/lib/admin/shared";

export async function parseSubjectImportFile(file: File) {
  const rows = await readImportRows(file);
  const headers = rows[0]?.map((cell) => normalizeHeader(cell)) ?? [];
  const columnIndexes = {
    description: findColumnIndex(headers, ["deskripsi", "description", "keterangan"]),
    isActive: findColumnIndex(headers, ["status", "aktif", "is_active", "isactive"]),
    name: findColumnIndex(headers, ["nama", "nama_mapel", "mata_pelajaran", "name"]),
  };

  if (columnIndexes.name === -1) {
    throw new Error("Kolom wajib belum lengkap. Gunakan header minimal: nama.");
  }

  const importedSubjects: z.infer<typeof subjectSchema>[] = [];
  const seenNames = new Set<string>();
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cellToString(cell)));

  if (dataRows.length > MAX_SUBJECT_IMPORT_ROWS) {
    throw new Error(`Maksimal import ${MAX_SUBJECT_IMPORT_ROWS} mata pelajaran per file.`);
  }

  for (const [index, row] of dataRows.entries()) {
    const excelRowNumber = index + 2;
    const name = cellToString(row[columnIndexes.name]);
    const normalizedName = name.toLowerCase();
    const parsed = subjectSchema.safeParse({
      description:
        columnIndexes.description === -1
          ? ""
          : cellToString(row[columnIndexes.description]),
      isActive:
        columnIndexes.isActive === -1
          ? true
          : parseImportBoolean(row[columnIndexes.isActive]),
      name,
    });

    if (!parsed.success) {
      throw new Error(
        `Baris ${excelRowNumber}: ${
          parsed.error.issues[0]?.message ?? "Data mata pelajaran belum valid."
        }`,
      );
    }

    if (seenNames.has(normalizedName)) {
      throw new Error(`Baris ${excelRowNumber}: nama mata pelajaran duplikat di file import.`);
    }

    seenNames.add(normalizedName);
    importedSubjects.push(parsed.data);
  }

  return importedSubjects;
}

export async function buildSubjectImportPreview(rows: unknown[][]) {
  const headers = rows[0]?.map((cell) => normalizeHeader(cell)) ?? [];
  const columnIndexes = {
    description: findColumnIndex(headers, ["deskripsi", "description", "keterangan"]),
    isActive: findColumnIndex(headers, ["status", "aktif", "is_active", "isactive"]),
    name: findColumnIndex(headers, ["nama", "nama_mapel", "mata_pelajaran", "name"]),
  };

  if (columnIndexes.name === -1) {
    throw new Error("Kolom wajib belum lengkap. Gunakan header minimal: nama.");
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cellToString(cell)));

  if (dataRows.length > MAX_SUBJECT_IMPORT_ROWS) {
    throw new Error(`Maksimal import ${MAX_SUBJECT_IMPORT_ROWS} mata pelajaran per file.`);
  }

  const seenNames = new Set<string>();
  const previewRows: ImportPreviewRow[] = dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const name = cellToString(row[columnIndexes.name]);
    const parsed = subjectSchema.safeParse({
      description:
        columnIndexes.description === -1
          ? ""
          : cellToString(row[columnIndexes.description]),
      isActive:
        columnIndexes.isActive === -1
          ? true
          : parseImportBoolean(row[columnIndexes.isActive]),
      name,
    });

    if (!parsed.success) {
      return {
        data: {
          description:
            columnIndexes.description === -1
              ? ""
              : cellToString(row[columnIndexes.description]),
          isActive:
            columnIndexes.isActive === -1
              ? true
              : parseImportBoolean(row[columnIndexes.isActive]),
          name,
        },
        errors: parsed.error.issues.map((issue) => issue.message),
        rowNumber,
        status: "error",
      };
    }

    const normalizedName = parsed.data.name.toLowerCase();
    const errors = seenNames.has(normalizedName)
      ? ["Nama mata pelajaran duplikat di file import."]
      : [];

    seenNames.add(normalizedName);

    return {
      data: parsed.data,
      errors,
      rowNumber,
      status: errors.length > 0 ? "error" : "valid",
    };
  });
  const validNames = previewRows
    .filter((row) => row.status === "valid")
    .map((row) => String(row.data.name));
  const existingSubjects = validNames.length
    ? await prisma.subject.findMany({
        select: {
          name: true,
        },
        where: {
          name: {
            in: validNames,
          },
        },
      })
    : [];
  const existingNames = new Set(existingSubjects.map((subject) => subject.name.toLowerCase()));

  return previewRows.map((row) => {
    const errors = [...row.errors];

    if (existingNames.has(String(row.data.name).toLowerCase())) {
      errors.push("Mata pelajaran sudah terdaftar di sistem.");
    }

    return {
      ...row,
      errors,
      status: errors.length > 0 ? "error" : "valid",
    } satisfies ImportPreviewRow;
  });
}

export async function createSubjectAction(formData: FormData) {
  try {
    const parsedData = subjectSchema.parse({
      description: formData.get("description"),
      isActive: formData.get("isActive") === "on",
      name: formData.get("name"),
    });

    await prisma.subject.create({
      data: {
        description: parsedData.description || null,
        isActive: parsedData.isActive,
        name: parsedData.name,
      },
    });
    await recordAdminActivity({
      action: "CREATE",
      entityLabel: parsedData.name,
      entityType: "MAPEL",
      message: `Mata pelajaran ${parsedData.name} dibuat`,
    });
  } catch (error) {
    redirectWithMessage("/admin/mapel", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/mapel");
  revalidatePath("/admin/pengampu");
  redirectWithMessage(
    "/admin/mapel",
    "success",
    "Mata pelajaran berhasil ditambahkan.",
  );
}

export async function importSubjectsFromExcelAction(formData: FormData) {
  let importedCount = 0;

  try {
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("File Excel wajib dipilih.");
    }

    const subjects = await parseSubjectImportFile(file);

    if (subjects.length === 0) {
      throw new Error("File belum berisi mata pelajaran yang bisa diimpor.");
    }

    const subjectNames = subjects.map((subject) => subject.name);
    const existingSubjects = await prisma.subject.findMany({
      select: {
        name: true,
      },
      where: {
        name: {
          in: subjectNames,
        },
      },
    });

    if (existingSubjects.length > 0) {
      throw new Error(
        `Mata pelajaran sudah terdaftar: ${existingSubjects
          .map((subject) => subject.name)
          .join(", ")}.`,
      );
    }

    await prisma.subject.createMany({
      data: subjects.map((subject) => ({
        description: subject.description || null,
        isActive: subject.isActive,
        name: subject.name,
      })),
    });
    importedCount = subjects.length;
    await recordAdminActivity({
      action: "IMPORT",
      entityLabel: "Mata Pelajaran",
      entityType: "MAPEL",
      message: `${importedCount} mata pelajaran diimpor dari Excel`,
    });
  } catch (error) {
    redirectWithMessage("/admin/mapel", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/mapel");
  revalidatePath("/admin/pengampu");
  redirectWithMessage(
    "/admin/mapel",
    "success",
    `${importedCount} mata pelajaran berhasil diimpor dari Excel.`,
  );
}

export async function updateSubjectAction(formData: FormData) {
  try {
    const parsedData = subjectUpdateSchema.parse({
      description: formData.get("description"),
      isActive: formData.get("isActive") === "on",
      name: formData.get("name"),
      subjectId: formData.get("subjectId"),
    });
    const currentSubject = await prisma.subject.findUnique({
      where: {
        id: parsedData.subjectId,
      },
    });

    await prisma.subject.update({
      where: {
        id: parsedData.subjectId,
      },
      data: {
        description: parsedData.description || null,
        isActive: parsedData.isActive,
        name: parsedData.name,
      },
    });
    await recordAdminActivity({
      action: "UPDATE",
      details: buildChangeDetails([
        {
          after: parsedData.name,
          before: currentSubject?.name,
          label: "Nama",
        },
        {
          after: parsedData.description || null,
          before: currentSubject?.description,
          label: "Deskripsi",
        },
        {
          after: parsedData.isActive,
          before: currentSubject?.isActive,
          label: "Status",
        },
      ]),
      entityLabel: parsedData.name,
      entityType: "MAPEL",
      message: `Mata pelajaran ${parsedData.name} diperbarui`,
    });
  } catch (error) {
    redirectWithMessage("/admin/mapel", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/mapel");
  revalidatePath("/admin/pengampu");
  redirectWithMessage(
    "/admin/mapel",
    "success",
    "Mata pelajaran berhasil diperbarui.",
  );
}

export async function deleteSubjectAction(formData: FormData) {
  try {
    const subjectId = z.string().min(1).parse(formData.get("subjectId"));
    const subject = await prisma.subject.findUnique({
      select: {
        name: true,
      },
      where: {
        id: subjectId,
      },
    });

    await prisma.subject.delete({
      where: {
        id: subjectId,
      },
    });
    await recordAdminActivity({
      action: "DELETE",
      entityLabel: subject?.name ?? "Mata Pelajaran",
      entityType: "MAPEL",
      message: `Mata pelajaran ${subject?.name ?? ""}`.trim() + " dihapus",
    });
  } catch (error) {
    redirectWithMessage("/admin/mapel", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/mapel");
  revalidatePath("/admin/pengampu");
  redirectWithMessage("/admin/mapel", "success", "Mata pelajaran berhasil dihapus.");
}

export async function toggleSubjectStatusAction(formData: FormData) {
  try {
    const parsedData = subjectStatusSchema.parse({
      isActive: formData.get("isActive") === "true",
      subjectId: formData.get("subjectId"),
    });
    const subject = await prisma.subject.findUnique({
      select: {
        name: true,
      },
      where: {
        id: parsedData.subjectId,
      },
    });

    await prisma.subject.update({
      where: {
        id: parsedData.subjectId,
      },
      data: {
        isActive: parsedData.isActive,
      },
    });
    await recordAdminActivity({
      action: "TOGGLE",
      details: buildChangeDetails([
        {
          after: parsedData.isActive,
          before: !parsedData.isActive,
          label: "Status",
        },
      ]),
      entityLabel: subject?.name ?? "Mata Pelajaran",
      entityType: "MAPEL",
      message: `Status mata pelajaran ${subject?.name ?? ""}`.trim() + ` ${parsedData.isActive ? "diaktifkan" : "dinonaktifkan"}`,
    });
  } catch (error) {
    redirectWithMessage("/admin/mapel", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/mapel");
  revalidatePath("/admin/pengampu");
  redirectWithMessage(
    "/admin/mapel",
    "success",
    "Status mata pelajaran berhasil diperbarui.",
  );
}
