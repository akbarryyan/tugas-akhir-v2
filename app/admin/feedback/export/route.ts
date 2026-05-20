import { LabelSource, Role } from "@prisma/client";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function hasValidInternalToken(request: Request) {
  const expectedToken = process.env.TRAINING_DATASET_EXPORT_TOKEN?.trim();

  if (!expectedToken) {
    return false;
  }

  const providedToken =
    request.headers.get("x-dataset-export-token")?.trim() ??
    new URL(request.url).searchParams.get("token")?.trim() ??
    "";

  return providedToken.length > 0 && providedToken === expectedToken;
}

function escapeCsvValue(value: string) {
  const escaped = value.replace(/"/g, '""');

  return `"${escaped}"`;
}

function buildCsv(rows: Array<Record<string, string>>) {
  if (rows.length === 0) {
    return "comment,aspect,subject,label,labelSource\n";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(String(row[header] ?? ""))).join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if ((!session?.user || session.user.role !== Role.ADMIN) && !hasValidInternalToken(request)) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const feedbacks = await prisma.feedback.findMany({
    where: {
      sentiment: {
        isNot: null,
      },
      ...(query
        ? {
            OR: [
              {
                comment: {
                  contains: query,
                },
              },
              {
                subject: {
                  name: {
                    contains: query,
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      aspect: true,
      comment: true,
      subject: {
        select: {
          name: true,
        },
      },
      sentiment: {
        select: {
          finalLabel: true,
          labelSource: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const rows = feedbacks
    .filter((feedback) => feedback.sentiment)
    .map((feedback) => ({
      aspect: feedback.aspect,
      comment: feedback.comment,
      label: feedback.sentiment?.finalLabel ?? "",
      labelSource:
        feedback.sentiment?.labelSource === LabelSource.MANUAL ? "MANUAL" : "AUTO",
      subject: feedback.subject.name,
    }));

  const csvContent = `\uFEFF${buildCsv(rows)}`;
  const timestamp = new Date().toISOString().slice(0, 10);

  return new Response(csvContent, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="dataset-feedback-sentimen-${timestamp}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
