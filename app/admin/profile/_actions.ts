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

const adminProfileSchema = z.object({
  email: z.email("Email admin belum valid.").transform((value) => value.toLowerCase().trim()),
  name: z.string().trim().min(3, "Nama admin minimal 3 karakter."),
});

function redirectWithMessage(type: "error" | "success", message: string) {
  const params = new URLSearchParams({
    message,
    type,
  });

  redirect(`/admin/profile?${params.toString()}`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Data profil admin belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Email tersebut sudah digunakan oleh akun lain.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat memperbarui profil admin.";
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
    "admin-profiles",
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

  return `/uploads/admin-profiles/${fileName}`;
}

async function deleteAvatarFile(avatarUrl: string | null | undefined) {
  if (!avatarUrl?.startsWith("/uploads/admin-profiles/")) {
    return;
  }

  const absolutePath = path.join(
    process.cwd(),
    "public",
    avatarUrl.replace(/^\//, ""),
  );

  try {
    await unlink(absolutePath);
  } catch {
    // File lama mungkin sudah tidak ada; update profil tetap boleh berhasil.
  }
}

export async function updateAdminProfileAction(formData: FormData) {
  let uploadedAvatarUrl: string | null = null;
  let previousAvatarUrl: string | null = null;

  try {
    const session = await getCurrentSession();

    if (!session?.user || session.user.role !== Role.ADMIN) {
      throw new Error("Sesi admin tidak valid. Silakan masuk kembali.");
    }

    const parsedData = adminProfileSchema.parse({
      email: formData.get("email"),
      name: formData.get("name"),
    });

    const admin = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        avatarUrl: true,
        id: true,
        role: true,
      },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new Error("Profil admin tidak ditemukan.");
    }

    previousAvatarUrl = admin.avatarUrl;

    const avatarFile = formData.get("avatar");

    if (avatarFile instanceof File && avatarFile.size > 0) {
      uploadedAvatarUrl = await saveAvatarFile(avatarFile, admin.id);
    }

    await prisma.user.update({
      where: {
        id: admin.id,
      },
      data: {
        ...(uploadedAvatarUrl
          ? {
              avatarUrl: uploadedAvatarUrl,
            }
          : {}),
        email: parsedData.email,
        name: parsedData.name,
      },
    });

    if (uploadedAvatarUrl && previousAvatarUrl !== uploadedAvatarUrl) {
      await deleteAvatarFile(previousAvatarUrl);
    }
  } catch (error) {
    if (uploadedAvatarUrl) {
      await deleteAvatarFile(uploadedAvatarUrl);
    }

    redirectWithMessage("error", getErrorMessage(error));
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/profile");

  redirectWithMessage("success", "Profil admin berhasil diperbarui.");
}
