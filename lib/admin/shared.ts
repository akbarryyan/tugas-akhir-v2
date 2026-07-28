import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import * as XLSX from "xlsx";

export const MAX_TEACHER_IMPORT_ROWS = 300;
export const MAX_STUDENT_IMPORT_ROWS = 500;
export const MAX_SUBJECT_IMPORT_ROWS = 200;

export type ImportType = "guru" | "mapel" | "siswa";

export type ImportPreviewRow = {
  data: Record<string, string | boolean>;
  errors: string[];
  rowNumber: number;
  status: "error" | "valid";
};

export function redirectWithMessage(
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

export function getErrorMessage(error: unknown) {
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

export async function readImportRows(file: File) {
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

export function parseImportBoolean(value: unknown) {
  const normalized = cellToString(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  return ["1", "aktif", "active", "true", "ya", "yes", "y"].includes(normalized);
}

export function normalizeHeader(value: unknown) {
  return cellToString(value)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function findColumnIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

export function cellToString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function buildChangeDetails(
  changes: Array<{
    after: boolean | string | null | undefined;
    before: boolean | string | null | undefined;
    label: string;
  }>,
) {
  const details = changes
    .filter((change) => normalizeDetailValue(change.before) !== normalizeDetailValue(change.after))
    .map(
      (change) =>
        `${change.label}: ${formatDetailValue(change.before)} -> ${formatDetailValue(change.after)}`,
    );

  return details.length > 0
    ? details.join("; ")
    : "Tidak ada perubahan pada field utama.";
}

export function normalizeDetailValue(value: boolean | string | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value ?? "").trim();
}

export function formatDetailValue(value: boolean | string | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "Aktif" : "Nonaktif";
  }

  const normalized = String(value ?? "").trim();

  return normalized || "-";
}

export function getImportRedirectPath(type: ImportType) {
  if (type === "guru") {
    return "/admin/guru";
  }

  if (type === "siswa") {
    return "/admin/siswa";
  }

  return "/admin/mapel";
}

export function getImportType(value: FormDataEntryValue | null): ImportType {
  if (value === "guru" || value === "mapel" || value === "siswa") {
    return value;
  }

  throw new Error("Tipe import tidak valid.");
}
