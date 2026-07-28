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

    await prisma.subjectTeacher.create({
      data: {
        subjectId: parsedData.subjectId,
        teacherId: parsedData.teacherId,
      },
    });
    await recordAdminActivity({
      action: "CREATE",
      entityLabel: `${teacher?.user.name ?? "Guru"} - ${subject?.name ?? "Mapel"}`,
      entityType: "PENGAMPU",
      message: `Guru pengampu ${teacher?.user.name ?? ""}`.trim() + ` ditugaskan ke ${subject?.name ?? "mapel"}`,
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
