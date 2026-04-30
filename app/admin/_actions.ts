"use server";

import { AuthMethod, Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { z } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";

const teacherCreateSchema = z.object({
  email: z.email("Email guru tidak valid.").transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(3, "Nama guru minimal 3 karakter."),
  nip: z.string().trim().min(5, "NIP minimal 5 karakter."),
  password: z.string().min(6, "Password minimal 6 karakter."),
});

const teacherUpdateSchema = z.object({
  email: z.email("Email guru tidak valid.").transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(3, "Nama guru minimal 3 karakter."),
  nip: z.string().trim().min(5, "NIP minimal 5 karakter."),
  password: z.string().optional(),
  teacherId: z.string().min(1),
  userId: z.string().min(1),
});

const studentCreateSchema = z.object({
  className: z.string().trim().min(2, "Kelas wajib diisi."),
  name: z.string().trim().min(3, "Nama siswa minimal 3 karakter."),
  nisn: z.string().trim().min(10, "NISN minimal 10 digit."),
});

const studentUpdateSchema = z.object({
  className: z.string().trim().min(2, "Kelas wajib diisi."),
  name: z.string().trim().min(3, "Nama siswa minimal 3 karakter."),
  nisn: z.string().trim().min(10, "NISN minimal 10 digit."),
  studentId: z.string().min(1),
  userId: z.string().min(1),
});

const subjectSchema = z.object({
  description: z.string().trim().optional(),
  isActive: z.boolean(),
  name: z.string().trim().min(3, "Nama mata pelajaran minimal 3 karakter."),
});

const subjectUpdateSchema = subjectSchema.extend({
  subjectId: z.string().min(1),
});

const subjectStatusSchema = z.object({
  isActive: z.boolean(),
  subjectId: z.string().min(1),
});

const assignmentSchema = z.object({
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih."),
  teacherId: z.string().min(1, "Guru wajib dipilih."),
});

const MAX_TEACHER_IMPORT_ROWS = 300;
const MAX_STUDENT_IMPORT_ROWS = 500;
const MAX_SUBJECT_IMPORT_ROWS = 200;

function redirectWithMessage(
  path: string,
  type: "error" | "success",
  message: string,
) {
  const params = new URLSearchParams({
    message,
    type,
  });

  redirect(`${path}?${params.toString()}`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Data yang dikirim belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Data yang sama sudah terdaftar. Periksa kembali input Anda.";
    }

    if (error.code === "P2003") {
      return "Data masih terhubung dengan data lain dan belum bisa dihapus.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat memproses data.";
}

async function parseTeacherImportFile(file: File) {
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

async function parseStudentImportFile(file: File) {
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

async function parseSubjectImportFile(file: File) {
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

async function readImportRows(file: File) {
  if (
    ![
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ].includes(file.type) &&
    !/\.(xlsx|xls|csv)$/i.test(file.name)
  ) {
    throw new Error("Format file harus Excel (.xlsx/.xls) atau CSV.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran file import maksimal 2 MB.");
  }

  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), {
    type: "buffer",
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("File Excel tidak memiliki sheet.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    blankrows: false,
    defval: "",
    header: 1,
  });

  if (rows.length < 2) {
    throw new Error("File Excel perlu memiliki header dan minimal satu baris data.");
  }

  return rows;
}

function parseImportBoolean(value: unknown) {
  const normalized = cellToString(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  return ["1", "aktif", "active", "true", "ya", "yes", "y"].includes(normalized);
}

function normalizeHeader(value: unknown) {
  return cellToString(value)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function findColumnIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function cellToString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
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

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
  } catch (error) {
    redirectWithMessage("/admin/guru", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/guru");
  revalidatePath("/admin/pengampu");
  redirectWithMessage("/admin/guru", "success", "Data guru berhasil dihapus.");
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
  } catch (error) {
    redirectWithMessage("/admin/siswa", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/siswa");
  redirectWithMessage("/admin/siswa", "success", "Data siswa berhasil diperbarui.");
}

export async function deleteStudentAction(formData: FormData) {
  try {
    const userId = z.string().min(1).parse(formData.get("userId"));

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
  } catch (error) {
    redirectWithMessage("/admin/siswa", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/siswa");
  redirectWithMessage("/admin/siswa", "success", "Data siswa berhasil dihapus.");
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

    await prisma.subject.delete({
      where: {
        id: subjectId,
      },
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

    await prisma.subject.update({
      where: {
        id: parsedData.subjectId,
      },
      data: {
        isActive: parsedData.isActive,
      },
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

export async function assignTeacherAction(formData: FormData) {
  try {
    const parsedData = assignmentSchema.parse({
      subjectId: formData.get("subjectId"),
      teacherId: formData.get("teacherId"),
    });

    await prisma.subjectTeacher.create({
      data: {
        subjectId: parsedData.subjectId,
        teacherId: parsedData.teacherId,
      },
    });
  } catch (error) {
    redirectWithMessage("/admin/pengampu", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/pengampu");
  redirectWithMessage(
    "/admin/pengampu",
    "success",
    "Penugasan guru pengampu berhasil disimpan.",
  );
}

export async function deleteAssignmentAction(formData: FormData) {
  try {
    const assignmentId = z.string().min(1).parse(formData.get("assignmentId"));

    await prisma.subjectTeacher.delete({
      where: {
        id: assignmentId,
      },
    });
  } catch (error) {
    redirectWithMessage("/admin/pengampu", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/pengampu");
  redirectWithMessage(
    "/admin/pengampu",
    "success",
    "Penugasan guru pengampu berhasil dihapus.",
  );
}
