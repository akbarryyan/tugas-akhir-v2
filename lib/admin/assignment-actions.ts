"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAdminActivity } from "@/lib/admin/activity";
import { prisma } from "@/lib/db/prisma";
import { assignmentSchema } from "@/lib/admin/schemas";
import {
  getErrorMessage,
  redirectWithMessage,
} from "@/lib/admin/shared";

export async function assignTeacherAction(formData: FormData) {
  try {
    const parsedData = assignmentSchema.parse({
      classNames: formData.getAll("classNames").map(String),
      subjectId: formData.get("subjectId"),
      teacherId: formData.get("teacherId"),
    });
    const [teacher, subject] = await Promise.all([
      prisma.teacherProfile.findUnique({
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
        where: {
          id: parsedData.teacherId,
        },
      }),
      prisma.subject.findUnique({
        select: {
          name: true,
        },
        where: {
          id: parsedData.subjectId,
        },
      }),
    ]);

    // Satu kelas hanya boleh punya satu guru per mata pelajaran, jadi penugasan
    // untuk kelas yang sudah terisi ditimpa alih-alih ditolak. Ini juga yang
    // membuat pemindahan kelas dari satu guru ke guru lain cukup satu langkah.
    for (const className of parsedData.classNames) {
      await prisma.subjectTeacher.upsert({
        where: {
          subjectId_className: {
            className,
            subjectId: parsedData.subjectId,
          },
        },
        create: {
          className,
          subjectId: parsedData.subjectId,
          teacherId: parsedData.teacherId,
        },
        update: {
          teacherId: parsedData.teacherId,
        },
      });
    }

    const classLabel = parsedData.classNames.join(", ");

    await recordAdminActivity({
      action: "CREATE",
      entityLabel: `${teacher?.user.name ?? "Guru"} - ${subject?.name ?? "Mapel"} (${classLabel})`,
      entityType: "PENGAMPU",
      message:
        `Guru pengampu ${teacher?.user.name ?? ""}`.trim() +
        ` ditugaskan ke ${subject?.name ?? "mapel"} pada kelas ${classLabel}`,
    });
  } catch (error) {
    redirectWithMessage("/admin/pengampu", "error", getErrorMessage(error));
  }

  revalidatePath("/admin/pengampu");
  revalidatePath("/admin");
  revalidatePath("/siswa");
  revalidatePath("/siswa/tryout");
  redirectWithMessage(
    "/admin/pengampu",
    "success",
    "Penugasan guru pengampu berhasil disimpan.",
  );
}

export async function deleteAssignmentAction(formData: FormData) {
  try {
    const assignmentId = z.string().min(1).parse(formData.get("assignmentId"));
    const assignment = await prisma.subjectTeacher.findUnique({
      include: {
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      where: {
        id: assignmentId,
      },
    });

    await prisma.subjectTeacher.delete({
      where: {
        id: assignmentId,
      },
    });
    await recordAdminActivity({
      action: "DELETE",
      entityLabel: `${assignment?.teacher.user.name ?? "Guru"} - ${assignment?.subject.name ?? "Mapel"}`,
      entityType: "PENGAMPU",
      message: `Penugasan ${assignment?.teacher.user.name ?? "guru"} di ${assignment?.subject.name ?? "mapel"} dihapus`,
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
