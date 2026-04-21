"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const studentSettingsSchema = z.object({
  className: z.string().trim().min(2, "Kelas wajib diisi."),
  name: z.string().trim().min(3, "Nama lengkap minimal 3 karakter."),
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
    return error.issues[0]?.message ?? "Data profil belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Data yang sama sudah digunakan pada sistem.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat memperbarui profil siswa.";
}

async function saveAvatarFile(file: File, userId: string) {
  if (!file.type.startsWith("image/")) {
    throw new Error("File foto profil harus berupa gambar.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran foto profil maksimal 2 MB.");
  }

  const uploadsDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "student-profiles",
  );
  const extension =
    path.extname(file.name).trim().toLowerCase() ||
    `.${file.type.split("/")[1] ?? "jpg"}`;
  const safeExtension = extension.replace(/[^a-z0-9.]/g, "") || ".jpg";
  const fileName = `${userId}-${randomUUID()}${safeExtension}`;
  const absolutePath = path.join(uploadsDirectory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadsDirectory, { recursive: true });
  await writeFile(absolutePath, buffer);

  return `/uploads/student-profiles/${fileName}`;
}

async function deleteOldAvatarFile(avatarUrl: string | null | undefined) {
  if (!avatarUrl?.startsWith("/uploads/student-profiles/")) {
    return;
  }

  const absolutePath = path.join(process.cwd(), "public", avatarUrl.replace(/^\//, ""));

  try {
    await unlink(absolutePath);
  } catch {
    // Abaikan bila file lama sudah tidak tersedia.
  }
}

export async function updateStudentProfileAction(formData: FormData) {
  let uploadedAvatarUrl: string | null = null;
  let previousAvatarUrl: string | null = null;

  try {
    const session = await getCurrentSession();

    if (!session?.user || session.user.role !== Role.SISWA) {
      throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");
    }

    const parsedData = studentSettingsSchema.parse({
      className: formData.get("className"),
      name: formData.get("name"),
    });

    const studentProfile = await prisma.studentProfile.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        user: {
          select: {
            avatarUrl: true,
          },
        },
        id: true,
        userId: true,
      },
    });

    if (!studentProfile) {
      throw new Error("Profil siswa belum tersedia.");
    }

    previousAvatarUrl = studentProfile.user.avatarUrl;

    const avatarFile = formData.get("avatar");

    if (avatarFile instanceof File && avatarFile.size > 0) {
      uploadedAvatarUrl = await saveAvatarFile(avatarFile, studentProfile.userId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: studentProfile.userId,
        },
        data: {
          ...(uploadedAvatarUrl
            ? {
                avatarUrl: uploadedAvatarUrl,
              }
            : {}),
          name: parsedData.name,
        },
      });

      await tx.studentProfile.update({
        where: {
          id: studentProfile.id,
        },
        data: {
          className: parsedData.className,
        },
      });
    });

    if (uploadedAvatarUrl && previousAvatarUrl && previousAvatarUrl !== uploadedAvatarUrl) {
      await deleteOldAvatarFile(previousAvatarUrl);
    }
  } catch (error) {
    if (uploadedAvatarUrl) {
      await deleteOldAvatarFile(uploadedAvatarUrl);
    }

    redirectWithMessage("/siswa/pengaturan", "error", getErrorMessage(error));
  }

  revalidatePath("/siswa");
  revalidatePath("/siswa/pengaturan");
  revalidatePath("/siswa/tryout");
  revalidatePath("/siswa/hasil");
  revalidatePath("/siswa/tanggapan");
  revalidatePath("/siswa/progres");

  redirectWithMessage(
    "/siswa/pengaturan",
    "success",
    "Profil siswa berhasil diperbarui.",
  );
}
