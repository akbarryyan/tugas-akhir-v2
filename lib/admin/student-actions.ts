"use server";

import { AuthMethod, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAdminActivity } from "@/lib/admin/activity";
import { prisma } from "@/lib/db/prisma";
import { studentCreateSchema, studentUpdateSchema } from "@/lib/admin/schemas";
import {
  type ImportPreviewRow,
  MAX_STUDENT_IMPORT_ROWS,
  buildChangeDetails,
  cellToString,
  findColumnIndex,
  getErrorMessage,
  normalizeHeader,
  readImportRows,
  redirectWithMessage,
} from "@/lib/admin/shared";

export async function parseStudentImportFile(file: File) {
  const rows = await readImportRows(file);
  const headers = rows[0]?.map((cell) => normalizeHeader(cell)) ?? [];
  const columnIndexes = {
    className: findColumnIndex(headers, ["kelas", "class", "class_name", "classname"]),
    name: findColumnIndex(headers, ["nama", "nama_siswa", "name"]),
    nisn: findColumnIndex(headers, ["nisn", "nomor_induk_siswa"]),
  };

  const missingColumns = Object.entries(columnIndexes)
    .filter(([, index]) => index === -1)
    .map(([key]) => key);

  if (missingColumns.length > 0) {
    throw new Error("Kolom wajib belum lengkap. Gunakan header: nama, nisn, kelas.");
  }

  const importedStudents: z.infer<typeof studentCreateSchema>[] = [];
  const seenNisns = new Set<string>();
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cellToString(cell)));

  if (dataRows.length > MAX_STUDENT_IMPORT_ROWS) {
    throw new Error(`Maksimal import ${MAX_STUDENT_IMPORT_ROWS} data siswa per file.`);
  }

  for (const [index, row] of dataRows.entries()) {
    const excelRowNumber = index + 2;
    const parsed = studentCreateSchema.safeParse({
      className: cellToString(row[columnIndexes.className]),
      name: cellToString(row[columnIndexes.name]),
      nisn: cellToString(row[columnIndexes.nisn]),
    });

    if (!parsed.success) {
      throw new Error(
        `Baris ${excelRowNumber}: ${
          parsed.error.issues[0]?.message ?? "Data siswa belum valid."
        }`,
      );
    }

    if (seenNisns.has(parsed.data.nisn)) {
      throw new Error(`Baris ${excelRowNumber}: NISN duplikat di file import.`);
    }

    seenNisns.add(parsed.data.nisn);
    importedStudents.push(parsed.data);
  }

  return importedStudents;
}

export async function buildStudentImportPreview(rows: unknown[][]) {
  const headers = rows[0]?.map((cell) => normalizeHeader(cell)) ?? [];
  const columnIndexes = {
    className: findColumnIndex(headers, ["kelas", "class", "class_name", "classname"]),
    name: findColumnIndex(headers, ["nama", "nama_siswa", "name"]),
    nisn: findColumnIndex(headers, ["nisn", "nomor_induk_siswa"]),
  };
  const missingColumns = Object.entries(columnIndexes)
    .filter(([, index]) => index === -1)
    .map(([key]) => key);

  if (missingColumns.length > 0) {
    throw new Error("Kolom wajib belum lengkap. Gunakan header: nama, nisn, kelas.");
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cellToString(cell)));

  if (dataRows.length > MAX_STUDENT_IMPORT_ROWS) {
    throw new Error(`Maksimal import ${MAX_STUDENT_IMPORT_ROWS} data siswa per file.`);
  }

  const seenNisns = new Set<string>();
  const previewRows: ImportPreviewRow[] = dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const parsed = studentCreateSchema.safeParse({
      className: cellToString(row[columnIndexes.className]),
      name: cellToString(row[columnIndexes.name]),
      nisn: cellToString(row[columnIndexes.nisn]),
    });

    if (!parsed.success) {
      return {
        data: {
          className: cellToString(row[columnIndexes.className]),
          name: cellToString(row[columnIndexes.name]),
          nisn: cellToString(row[columnIndexes.nisn]),
        },
        errors: parsed.error.issues.map((issue) => issue.message),
        rowNumber,
        status: "error",
      };
    }

    const errors = seenNisns.has(parsed.data.nisn)
      ? ["NISN duplikat di file import."]
      : [];

    seenNisns.add(parsed.data.nisn);

    return {
      data: parsed.data,
      errors,
      rowNumber,
      status: errors.length > 0 ? "error" : "valid",
    };
  });
  const validNisns = previewRows
    .filter((row) => row.status === "valid")
    .map((row) => String(row.data.nisn));
  const existingStudents = validNisns.length
    ? await prisma.studentProfile.findMany({
        select: {
          nisn: true,
        },
        where: {
          nisn: {
            in: validNisns,
          },
        },
      })
    : [];
  const existingNisns = new Set(existingStudents.map((student) => student.nisn));

  return previewRows.map((row) => {
    const errors = [...row.errors];

    if (existingNisns.has(String(row.data.nisn))) {
      errors.push("NISN sudah terdaftar di sistem.");
    }

    return {
      ...row,
      errors,
      status: errors.length > 0 ? "error" : "valid",
    } satisfies ImportPreviewRow;
  });
}

export async function createStudentAction(formData: FormData) {
  try {
    const parsedData = studentCreateSchema.parse({
      className: formData.get("className"),
      name: formData.get("name"),
      nisn: formData.get("nisn"),
    });

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          authMethod: AuthMethod.NISN,
          name: parsedData.name,
          role: Role.SISWA,
        },
      });

      await tx.studentProfile.create({
        data: {
          className: parsedData.className,
          nisn: parsedData.nisn,
          userId: user.id,
        },
      });
    });
    await recordAdminActivity({
      action: "CREATE",
      entityLabel: parsedData.name,
      entityType: "SISWA",
      message: `Siswa ${parsedData.name} dibuat`,
    });
  } catch (error) {
    redirectWithMessage("/admin/siswa", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/siswa");
  redirectWithMessage("/admin/siswa", "success", "Data siswa berhasil ditambahkan.");
}

export async function importStudentsFromExcelAction(formData: FormData) {
  let importedCount = 0;

  try {
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("File Excel wajib dipilih.");
    }

    const students = await parseStudentImportFile(file);

    if (students.length === 0) {
      throw new Error("File belum berisi data siswa yang bisa diimpor.");
    }

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
      throw new Error(
        `NISN sudah terdaftar: ${existingStudents
          .map((student) => student.nisn)
          .join(", ")}.`,
      );
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
  } catch (error) {
    redirectWithMessage("/admin/siswa", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/siswa");
  redirectWithMessage(
    "/admin/siswa",
    "success",
    `${importedCount} data siswa berhasil diimpor dari Excel.`,
  );
}

export async function updateStudentAction(formData: FormData) {
  try {
    const parsedData = studentUpdateSchema.parse({
      className: formData.get("className"),
      name: formData.get("name"),
      nisn: formData.get("nisn"),
      studentId: formData.get("studentId"),
      userId: formData.get("userId"),
    });
    const currentStudent = await prisma.studentProfile.findUnique({
      include: {
        user: true,
      },
      where: {
        id: parsedData.studentId,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: parsedData.userId,
        },
        data: {
          name: parsedData.name,
        },
      });

      await tx.studentProfile.update({
        where: {
          id: parsedData.studentId,
        },
        data: {
          className: parsedData.className,
          nisn: parsedData.nisn,
        },
      });
    });
    await recordAdminActivity({
      action: "UPDATE",
      details: buildChangeDetails([
        {
          after: parsedData.name,
          before: currentStudent?.user.name,
          label: "Nama",
        },
        {
          after: parsedData.nisn,
          before: currentStudent?.nisn,
          label: "NISN",
        },
        {
          after: parsedData.className,
          before: currentStudent?.className,
          label: "Kelas",
        },
      ]),
      entityLabel: parsedData.name,
      entityType: "SISWA",
      message: `Siswa ${parsedData.name} diperbarui`,
    });
  } catch (error) {
    redirectWithMessage("/admin/siswa", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/siswa");
  redirectWithMessage("/admin/siswa", "success", "Data siswa berhasil diperbarui.");
}

export async function deleteStudentAction(formData: FormData) {
  try {
    const userId = z.string().min(1).parse(formData.get("userId"));
    const student = await prisma.user.findUnique({
      select: {
        name: true,
      },
      where: {
        id: userId,
      },
    });

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
    await recordAdminActivity({
      action: "DELETE",
      entityLabel: student?.name ?? "Siswa",
      entityType: "SISWA",
      message: `Siswa ${student?.name ?? ""}`.trim() + " dihapus",
    });
  } catch (error) {
    redirectWithMessage("/admin/siswa", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/siswa");
  redirectWithMessage("/admin/siswa", "success", "Data siswa berhasil dihapus.");
}
