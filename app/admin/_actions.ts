"use server";

import { AuthMethod, Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
