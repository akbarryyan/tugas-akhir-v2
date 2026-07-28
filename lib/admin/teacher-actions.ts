"use server";

import { AuthMethod, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAdminActivity } from "@/lib/admin/activity";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { teacherCreateSchema, teacherUpdateSchema } from "@/lib/admin/schemas";
import {
  type ImportPreviewRow,
  MAX_TEACHER_IMPORT_ROWS,
  buildChangeDetails,
  cellToString,
  findColumnIndex,
  getErrorMessage,
  normalizeHeader,
  readImportRows,
  redirectWithMessage,
} from "@/lib/admin/shared";

export async function parseTeacherImportFile(file: File) {
  const rows = await readImportRows(file);

  const headers = rows[0]?.map((cell) => normalizeHeader(cell)) ?? [];
  const columnIndexes = {
    email: findColumnIndex(headers, ["email", "alamat_email"]),
    name: findColumnIndex(headers, ["nama", "nama_guru", "name"]),
    nip: findColumnIndex(headers, ["nip", "nomor_induk_pegawai"]),
    password: findColumnIndex(headers, [
      "password",
      "password_awal",
      "kata_sandi",
      "sandi",
    ]),
  };

  const missingColumns = Object.entries(columnIndexes)
    .filter(([, index]) => index === -1)
    .map(([key]) => key);

  if (missingColumns.length > 0) {
    throw new Error(
      "Kolom wajib belum lengkap. Gunakan header: nama, email, nip, password.",
    );
  }

  const importedTeachers: z.infer<typeof teacherCreateSchema>[] = [];
  const seenEmails = new Set<string>();
  const seenNips = new Set<string>();
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cellToString(cell)));

  if (dataRows.length > MAX_TEACHER_IMPORT_ROWS) {
    throw new Error(`Maksimal import ${MAX_TEACHER_IMPORT_ROWS} data guru per file.`);
  }

  for (const [index, row] of dataRows.entries()) {
    const excelRowNumber = index + 2;
    const parsed = teacherCreateSchema.safeParse({
      email: cellToString(row[columnIndexes.email]),
      name: cellToString(row[columnIndexes.name]),
      nip: cellToString(row[columnIndexes.nip]),
      password: cellToString(row[columnIndexes.password]),
    });

    if (!parsed.success) {
      throw new Error(
        `Baris ${excelRowNumber}: ${
          parsed.error.issues[0]?.message ?? "Data guru belum valid."
        }`,
      );
    }

    if (seenEmails.has(parsed.data.email)) {
      throw new Error(`Baris ${excelRowNumber}: email duplikat di file import.`);
    }

    if (seenNips.has(parsed.data.nip)) {
      throw new Error(`Baris ${excelRowNumber}: NIP duplikat di file import.`);
    }

    seenEmails.add(parsed.data.email);
    seenNips.add(parsed.data.nip);
    importedTeachers.push(parsed.data);
  }

  return importedTeachers;
}

export async function buildTeacherImportPreview(rows: unknown[][]) {
  const headers = rows[0]?.map((cell) => normalizeHeader(cell)) ?? [];
  const columnIndexes = {
    email: findColumnIndex(headers, ["email", "alamat_email"]),
    name: findColumnIndex(headers, ["nama", "nama_guru", "name"]),
    nip: findColumnIndex(headers, ["nip", "nomor_induk_pegawai"]),
    password: findColumnIndex(headers, [
      "password",
      "password_awal",
      "kata_sandi",
      "sandi",
    ]),
  };
  const missingColumns = Object.entries(columnIndexes)
    .filter(([, index]) => index === -1)
    .map(([key]) => key);

  if (missingColumns.length > 0) {
    throw new Error(
      "Kolom wajib belum lengkap. Gunakan header: nama, email, nip, password.",
    );
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cellToString(cell)));

  if (dataRows.length > MAX_TEACHER_IMPORT_ROWS) {
    throw new Error(`Maksimal import ${MAX_TEACHER_IMPORT_ROWS} data guru per file.`);
  }

  const seenEmails = new Set<string>();
  const seenNips = new Set<string>();
  const previewRows: ImportPreviewRow[] = dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const parsed = teacherCreateSchema.safeParse({
      email: cellToString(row[columnIndexes.email]),
      name: cellToString(row[columnIndexes.name]),
      nip: cellToString(row[columnIndexes.nip]),
      password: cellToString(row[columnIndexes.password]),
    });

    if (!parsed.success) {
      return {
        data: {
          email: cellToString(row[columnIndexes.email]),
          name: cellToString(row[columnIndexes.name]),
          nip: cellToString(row[columnIndexes.nip]),
          password: cellToString(row[columnIndexes.password]),
        },
        errors: parsed.error.issues.map((issue) => issue.message),
        rowNumber,
        status: "error",
      };
    }

    const errors: string[] = [];

    if (seenEmails.has(parsed.data.email)) {
      errors.push("Email duplikat di file import.");
    }

    if (seenNips.has(parsed.data.nip)) {
      errors.push("NIP duplikat di file import.");
    }

    seenEmails.add(parsed.data.email);
    seenNips.add(parsed.data.nip);

    return {
      data: parsed.data,
      errors,
      rowNumber,
      status: errors.length > 0 ? "error" : "valid",
    };
  });
  const validRows = previewRows.filter((row) => row.status === "valid");
  const emails = validRows.map((row) => String(row.data.email));
  const nips = validRows.map((row) => String(row.data.nip));
  const [existingEmailUsers, existingNipProfiles] = await Promise.all([
    emails.length
      ? prisma.user.findMany({
          select: {
            email: true,
          },
          where: {
            email: {
              in: emails,
            },
          },
        })
      : [],
    nips.length
      ? prisma.teacherProfile.findMany({
          select: {
            nip: true,
          },
          where: {
            nip: {
              in: nips,
            },
          },
        })
      : [],
  ]);
  const existingEmails = new Set(existingEmailUsers.map((user) => user.email).filter(Boolean));
  const existingNips = new Set(existingNipProfiles.map((profile) => profile.nip));

  return previewRows.map((row) => {
    const errors = [...row.errors];

    if (existingEmails.has(String(row.data.email))) {
      errors.push("Email sudah terdaftar di sistem.");
    }

    if (existingNips.has(String(row.data.nip))) {
      errors.push("NIP sudah terdaftar di sistem.");
    }

    return {
      ...row,
      errors,
      status: errors.length > 0 ? "error" : "valid",
    } satisfies ImportPreviewRow;
  });
}

export async function createTeacherAction(formData: FormData) {
  try {
    const parsedData = teacherCreateSchema.parse({
      email: formData.get("email"),
      name: formData.get("name"),
      nip: formData.get("nip"),
      password: formData.get("password"),
    });

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          authMethod: AuthMethod.EMAIL_PASSWORD,
          email: parsedData.email,
          name: parsedData.name,
          passwordHash: hashPassword(parsedData.password),
          role: Role.GURU,
        },
      });

      await tx.teacherProfile.create({
        data: {
          nip: parsedData.nip,
          userId: user.id,
        },
      });
    });
    await recordAdminActivity({
      action: "CREATE",
      entityLabel: parsedData.name,
      entityType: "GURU",
      message: `Guru ${parsedData.name} dibuat`,
    });
  } catch (error) {
    redirectWithMessage("/admin/guru", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/guru");
  revalidatePath("/admin/pengampu");
  redirectWithMessage("/admin/guru", "success", "Data guru berhasil ditambahkan.");
}

export async function importTeachersFromExcelAction(formData: FormData) {
  let importedCount = 0;

  try {
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("File Excel wajib dipilih.");
    }

    const teachers = await parseTeacherImportFile(file);

    if (teachers.length === 0) {
      throw new Error("File belum berisi data guru yang bisa diimpor.");
    }

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

    if (existingEmailUsers.length > 0) {
      throw new Error(
        `Email sudah terdaftar: ${existingEmailUsers
          .map((user) => user.email)
          .filter(Boolean)
          .join(", ")}.`,
      );
    }

    if (existingNipProfiles.length > 0) {
      throw new Error(
        `NIP sudah terdaftar: ${existingNipProfiles
          .map((profile) => profile.nip)
          .join(", ")}.`,
      );
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
    await recordAdminActivity({
      action: "IMPORT",
      entityLabel: "Data Guru",
      entityType: "GURU",
      message: `${importedCount} data guru diimpor dari Excel`,
    });
  } catch (error) {
    redirectWithMessage("/admin/guru", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/guru");
  revalidatePath("/admin/pengampu");
  redirectWithMessage(
    "/admin/guru",
    "success",
    `${importedCount} data guru berhasil diimpor dari Excel.`,
  );
}

export async function updateTeacherAction(formData: FormData) {
  try {
    const parsedData = teacherUpdateSchema.parse({
      email: formData.get("email"),
      name: formData.get("name"),
      nip: formData.get("nip"),
      password: String(formData.get("password") ?? "").trim() || undefined,
      teacherId: formData.get("teacherId"),
      userId: formData.get("userId"),
    });
    const currentTeacher = await prisma.teacherProfile.findUnique({
      include: {
        user: true,
      },
      where: {
        id: parsedData.teacherId,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: parsedData.userId,
        },
        data: {
          email: parsedData.email,
          name: parsedData.name,
          ...(parsedData.password
            ? {
                passwordHash: hashPassword(parsedData.password),
              }
            : {}),
        },
      });

      await tx.teacherProfile.update({
        where: {
          id: parsedData.teacherId,
        },
        data: {
          nip: parsedData.nip,
        },
      });
    });
    await recordAdminActivity({
      action: "UPDATE",
      details: buildChangeDetails([
        {
          after: parsedData.name,
          before: currentTeacher?.user.name,
          label: "Nama",
        },
        {
          after: parsedData.email,
          before: currentTeacher?.user.email,
          label: "Email",
        },
        {
          after: parsedData.nip,
          before: currentTeacher?.nip,
          label: "NIP",
        },
        {
          after: parsedData.password ? "Diubah" : "Tidak diubah",
          before: "Tidak diubah",
          label: "Password",
        },
      ]),
      entityLabel: parsedData.name,
      entityType: "GURU",
      message: `Guru ${parsedData.name} diperbarui`,
    });
  } catch (error) {
    redirectWithMessage("/admin/guru", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/guru");
  revalidatePath("/admin/pengampu");
  redirectWithMessage("/admin/guru", "success", "Data guru berhasil diperbarui.");
}

export async function deleteTeacherAction(formData: FormData) {
  try {
    const userId = z.string().min(1).parse(formData.get("userId"));
    const teacher = await prisma.user.findUnique({
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
      entityLabel: teacher?.name ?? "Guru",
      entityType: "GURU",
      message: `Guru ${teacher?.name ?? ""}`.trim() + " dihapus",
    });
  } catch (error) {
    redirectWithMessage("/admin/guru", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/guru");
  revalidatePath("/admin/pengampu");
  redirectWithMessage("/admin/guru", "success", "Data guru berhasil dihapus.");
}
