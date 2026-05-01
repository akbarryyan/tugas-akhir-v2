import { Role } from "@prisma/client";
import * as XLSX from "xlsx";

import { getCurrentSession } from "@/lib/auth/session";

type TemplateType = "guru" | "mapel" | "siswa";

const templates: Record<
  TemplateType,
  {
    fileName: string;
    rows: Array<Record<string, string>>;
    sheetName: string;
  }
> = {
  guru: {
    fileName: "template-import-guru.xlsx",
    rows: [
      {
        email: "budi.guru@sekolah.sch.id",
        nama: "Budi Santoso",
        nip: "198001012010011001",
        password: "guru12345",
      },
    ],
    sheetName: "Data Guru",
  },
  mapel: {
    fileName: "template-import-mapel.xlsx",
    rows: [
      {
        deskripsi: "Mata pelajaran untuk tryout dan bank soal.",
        nama: "Matematika",
        status: "aktif",
      },
    ],
    sheetName: "Data Mapel",
  },
  siswa: {
    fileName: "template-import-siswa.xlsx",
    rows: [
      {
        kelas: "XII IPA 1",
        nama: "Andi Pratama",
        nisn: "1234567890",
      },
    ],
    sheetName: "Data Siswa",
  },
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const type = new URL(request.url).searchParams.get("type");

  if (!isTemplateType(type)) {
    return new Response("Template tidak ditemukan.", {
      status: 404,
    });
  }

  const template = templates[type];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(template.rows);

  XLSX.utils.book_append_sheet(workbook, worksheet, template.sheetName);

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${template.fileName}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

function isTemplateType(type: string | null): type is TemplateType {
  return type === "guru" || type === "mapel" || type === "siswa";
}
