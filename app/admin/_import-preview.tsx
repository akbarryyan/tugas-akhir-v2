"use client";

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import {
  confirmAdminImportAction,
  previewAdminImportAction,
} from "@/lib/admin/import-actions";
import { useToast } from "@/components/ui/toast-provider";

type ImportType = "guru" | "mapel" | "siswa";

type PreviewRow = {
  data: Record<string, string | boolean>;
  errors: string[];
  rowNumber: number;
  status: "error" | "valid";
};

type PreviewState = {
  errorCount: number;
  message: string;
  rows: PreviewRow[];
  status: "error" | "ready";
  type: ImportType | null;
  validCount: number;
};

type AdminImportPreviewProps = {
  description: string;
  maxRowsLabel: string;
  templateHref: string;
  title: string;
  type: ImportType;
};

const columnsByType: Record<ImportType, Array<{ key: string; label: string }>> = {
  guru: [
    { key: "name", label: "Nama" },
    { key: "email", label: "Email" },
    { key: "nip", label: "NIP" },
  ],
  mapel: [
    { key: "name", label: "Nama" },
    { key: "description", label: "Deskripsi" },
    { key: "isActive", label: "Status" },
  ],
  siswa: [
    { key: "name", label: "Nama" },
    { key: "nisn", label: "NISN" },
    { key: "className", label: "Kelas" },
  ],
};

const exportColumnsByType: Record<ImportType, Array<{ key: string; label: string }>> = {
  guru: [
    { key: "name", label: "nama" },
    { key: "email", label: "email" },
    { key: "nip", label: "nip" },
    { key: "password", label: "password" },
  ],
  mapel: [
    { key: "name", label: "nama" },
    { key: "description", label: "deskripsi" },
    { key: "isActive", label: "status" },
  ],
  siswa: [
    { key: "name", label: "nama" },
    { key: "nisn", label: "nisn" },
    { key: "className", label: "kelas" },
  ],
};

export function AdminImportPreview({
  description,
  maxRowsLabel,
  templateHref,
  title,
  type,
}: AdminImportPreviewProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const { showToast } = useToast();
  const validRows = preview?.rows.filter((row) => row.status === "valid") ?? [];
  const errorRows = preview?.rows.filter((row) => row.status === "error") ?? [];
  const canConfirm =
    preview?.status === "ready" &&
    preview.errorCount === 0 &&
    validRows.length > 0;

  const handleDownloadErrors = () => {
    if (errorRows.length === 0) {
      showToast({
        message: "Belum ada baris error untuk diunduh.",
        type: "info",
      });
      return;
    }

    const csvHeader = ["baris", ...exportColumnsByType[type].map((column) => column.label), "error"];
    const csvRows = errorRows.map((row) => [
      String(row.rowNumber),
      ...exportColumnsByType[type].map((column) => formatExportValue(row.data[column.key])),
      row.errors.join("; "),
    ]);
    const csvContent = [csvHeader, ...csvRows]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `import-${type}-error-rows.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);

    showToast({
      message: `${errorRows.length} baris error berhasil diunduh.`,
      type: "success",
    });
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-[1rem] border border-indigo-100 bg-indigo-50/60 p-4 text-sm leading-6 text-slate-600">
        <p className="font-semibold text-indigo-700">{title}</p>
        <p className="mt-1">{description}</p>
      </div>

      <form
        ref={formRef}
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();

          const form = event.currentTarget;
          const formData = new FormData(form);
          formData.set("type", type);

          startPreviewTransition(async () => {
            const result = await previewAdminImportAction(formData);
            setPreview(result);

            showToast({
              message: result.message,
              type: result.status === "error" ? "error" : "info",
            });
          });
        }}
      >
        <input type="hidden" name="type" value={type} />
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          File Excel
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
            onChange={() => setPreview(null)}
            required
          />
          <span className="text-xs font-normal leading-5 text-slate-500">
            {maxRowsLabel}. Setelah upload, data akan dipreview dulu sebelum
            disimpan.
          </span>
        </label>

        <div className="mt-2 flex flex-wrap gap-3">
          <a
            href={templateHref}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            Download Template
          </a>
          <button
            type="submit"
            disabled={isPreviewPending}
            className="inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPreviewPending ? "Membaca File..." : "Preview Import"}
          </button>
        </div>
      </form>

      {preview ? (
        <div className="rounded-[1rem] border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Preview Hasil Import
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {preview.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Valid {preview.validCount}
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                Error {preview.errorCount}
              </span>
              {errorRows.length > 0 ? (
                <button
                  type="button"
                  onClick={handleDownloadErrors}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                >
                  Download Baris Error
                </button>
              ) : null}
            </div>
          </div>

          {preview.rows.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[720px] overflow-hidden rounded-[0.9rem] border border-slate-200">
                <div
                  className={`grid gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 ${getGridClass(type)}`}
                >
                  <span>Baris</span>
                  {columnsByType[type].map((column) => (
                    <span key={column.key}>{column.label}</span>
                  ))}
                  <span>Status</span>
                </div>

                <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
                  {preview.rows.map((row) => (
                    <div
                      key={row.rowNumber}
                      className={`grid gap-3 px-4 py-3 text-sm ${getGridClass(type)} ${
                        row.status === "error" ? "bg-rose-50/45" : "bg-white"
                      }`}
                    >
                      <span className="font-semibold text-slate-500">
                        {row.rowNumber}
                      </span>
                      {columnsByType[type].map((column) => (
                        <span
                          key={column.key}
                          className="min-w-0 truncate text-slate-700"
                        >
                          {formatCellValue(row.data[column.key]) || "-"}
                        </span>
                      ))}
                      <span
                        className={`text-xs font-semibold ${
                          row.status === "valid"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {row.status === "valid"
                          ? "Valid"
                          : row.errors.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <form
            action={confirmAdminImportAction}
            className="mt-4 flex flex-wrap items-center gap-3"
            onSubmit={(event) => {
              if (!canConfirm) {
                event.preventDefault();
                showToast({
                  message:
                    preview.errorCount > 0
                      ? "Masih ada baris error. Perbaiki file lalu preview ulang."
                      : "Belum ada data valid untuk diimpor.",
                  type: "error",
                });
                return;
              }

            }}
          >
            <input type="hidden" name="type" value={type} />
            <input
              type="hidden"
              name="payload"
              value={JSON.stringify(validRows)}
            />
            <ConfirmImportSubmitButton disabled={!canConfirm} />
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                formRef.current?.reset();
              }}
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Reset Preview
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ConfirmImportSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Mengimpor..." : "Konfirmasi Import"}
    </button>
  );
}

function formatExportValue(value: string | boolean | undefined) {
  if (typeof value === "boolean") {
    return value ? "aktif" : "nonaktif";
  }

  return String(value ?? "").trim();
}

function escapeCsvCell(value: string) {
  const normalized = value.replaceAll('"', '""');

  return `"${normalized}"`;
}

function getGridClass(type: ImportType) {
  if (type === "mapel") {
    return "grid-cols-[4rem_1fr_1.35fr_0.7fr_1.4fr]";
  }

  return "grid-cols-[4rem_1fr_1fr_0.8fr_1.4fr]";
}

function formatCellValue(value: string | boolean | undefined) {
  if (typeof value === "boolean") {
    return value ? "Aktif" : "Nonaktif";
  }

  return value ?? "";
}
