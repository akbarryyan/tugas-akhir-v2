import { LabelSource, SentimentLabel } from "@prisma/client";

import {
  AdminEmptyState,
  DesktopTable,
  DesktopTableBody,
  DesktopTableHeaderRow,
  DesktopTableRow,
  MobileDataCard,
  PaginationControls,
  SectionCard,
} from "@/app/admin/_components";
import {
  SentimentDistributionSection,
  type SentimentChartData,
} from "@/app/admin/_sentiment-charts";
import { formatAverageScore, LIKERT_MAX_SCORE } from "@/lib/feedback-likert";
import { getTotal } from "@/lib/sentiment/aggregate";
import type { FeedbackReportData, FeedbackReportRow } from "@/lib/sentiment/report";

/**
 * Lebar kolom dibedakan menurut peran: guru tidak butuh kolom Guru karena
 * seluruh barisnya memang miliknya. Kolom Nilai dan Sentimen diberi lebar tetap
 * sebab isinya terbatas, sehingga sisa ruang sepenuhnya jatuh ke kolom tanggapan.
 */
const COLUMNS_WITH_TEACHER =
  "grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_4.5rem_7.5rem]";
const COLUMNS_WITHOUT_TEACHER =
  "grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_4.5rem_7.5rem]";

export function FeedbackReportStats({
  accent,
  data,
}: {
  accent: "indigo" | "sky";
  data: FeedbackReportData;
}) {
  const total = getTotal(data.counts);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ReportStatCard
        accent={accent}
        label="Tanggapan Dianalisis"
        value={String(total)}
        helper={
          data.pendingAnalysisCount > 0
            ? `${data.pendingAnalysisCount} tanggapan belum teranalisis dan tidak dihitung.`
            : `Dari total ${data.respondentCount} tanggapan yang masuk.`
        }
      />
      <ReportStatCard
        accent="emerald"
        label="Sentimen Positif"
        value={`${data.percentages.positif}%`}
        helper={`${data.counts.positif} tanggapan bernada positif.`}
      />
      <ReportStatCard
        accent="rose"
        label="Sentimen Negatif"
        value={`${data.percentages.negatif}%`}
        helper={`${data.counts.negatif} tanggapan bernada negatif.`}
      />
      <ReportStatCard
        accent={accent}
        label="Rata-rata Penilaian"
        value={
          data.likert.overallAverage === null
            ? "-"
            : `${formatAverageScore(data.likert.overallAverage)} / ${LIKERT_MAX_SCORE}`
        }
        helper={`Dihitung dari ${data.likert.responseCount} jawaban skala.`}
      />
    </section>
  );
}

export function FeedbackReportView({
  data,
  pathname,
  searchParams,
  showTeacherColumn,
}: {
  data: FeedbackReportData;
  pathname: string;
  searchParams: Record<string, string | undefined>;
  showTeacherColumn: boolean;
}) {
  const columns = showTeacherColumn ? COLUMNS_WITH_TEACHER : COLUMNS_WITHOUT_TEACHER;
  const tableMinWidth = showTeacherColumn ? "min-w-[64rem]" : "min-w-[52rem]";

  const chartData: SentimentChartData = {
    overall: data.counts,
    groups: [
      {
        title: "Distribusi per Kelas",
        description:
          "Perbandingan sentimen tanggapan siswa pada masing-masing kelas. Kosongkan filter kelas untuk membandingkan seluruh kelas.",
        rows: data.byClass.map((row) => ({ counts: row.counts, label: row.label })),
      },
      {
        title: "Distribusi per Mata Pelajaran",
        description: "Perbandingan sentimen tanggapan siswa pada masing-masing mata pelajaran.",
        rows: data.bySubject.map((row) => ({ counts: row.counts, label: row.label })),
      },
      ...(showTeacherColumn
        ? [
            {
              title: "Distribusi per Guru",
              description: "Perbandingan sentimen tanggapan siswa terhadap masing-masing guru.",
              rows: data.byTeacher.map((row) => ({ counts: row.counts, label: row.label })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.05rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950">Distribusi Sentimen</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Persentase dihitung dari label final, sehingga koreksi manual pada halaman
            review sentimen ikut tercermin di sini.
          </p>
        </div>
        <SentimentDistributionSection data={chartData} />
      </section>

      <SectionCard
        title="Rata-rata Penilaian per Pernyataan"
        description="Nilai 1 berarti sangat tidak setuju dan 5 berarti sangat setuju."
      >
        {data.likert.responseCount === 0 ? (
          <AdminEmptyState message="Belum ada jawaban skala penilaian untuk filter ini." />
        ) : (
          <div className="space-y-4">
            {data.likert.items.map((item) => (
              <LikertAverageBar
                key={item.itemNumber}
                average={item.average}
                itemNumber={item.itemNumber}
                responseCount={item.responseCount}
                statement={item.statement}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Data Tanggapan Siswa"
        description="Tanggapan yang menjadi dasar perhitungan persentase di atas."
      >
        {data.rows.length === 0 ? (
          <AdminEmptyState message="Belum ada tanggapan yang cocok dengan filter ini." />
        ) : (
          <>
            {/* Tabel hanya untuk layar lebar; di bawah lg diganti kartu supaya
                tidak ada dua penyajian data yang sama tampil bersamaan. */}
            <div className="hidden lg:block">
              <DesktopTable minWidthClassName={tableMinWidth}>
                <DesktopTableHeaderRow columnsClassName={columns}>
                  <span>Tanggapan</span>
                  <span>Siswa</span>
                  {showTeacherColumn ? <span>Guru</span> : null}
                  <span>Mata Pelajaran</span>
                  <span className="text-right">Nilai</span>
                  <span>Sentimen</span>
                </DesktopTableHeaderRow>
                <DesktopTableBody>
                  {data.rows.map((row) => (
                    <DesktopTableRow
                      key={row.id}
                      columnsClassName={`${columns} items-start`}
                    >
                      <div className="min-w-0">
                        {/* Dibatasi tiga baris agar tinggi antarbaris tetap rapi;
                            teks utuh tetap bisa dilihat lewat tooltip. */}
                        <p
                          className="line-clamp-3 text-sm leading-6 text-slate-700"
                          title={row.comment}
                        >
                          {row.comment}
                        </p>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {formatDate(row.createdAt)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {row.studentName}
                        </p>
                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {row.className}
                        </span>
                      </div>
                      {showTeacherColumn ? (
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm text-slate-700"
                            title={row.teacherName ?? undefined}
                          >
                            {row.teacherName ?? "Belum ditentukan"}
                          </p>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-700" title={row.subjectName}>
                          {row.subjectName}
                        </p>
                      </div>
                      <div className="text-right text-sm font-semibold tabular-nums text-slate-800">
                        {formatAverageScore(row.averageScore)}
                      </div>
                      <div>
                        <SentimentPill row={row} />
                      </div>
                    </DesktopTableRow>
                  ))}
                </DesktopTableBody>
              </DesktopTable>
            </div>

            <div className="grid gap-3 lg:hidden">
              {data.rows.map((row) => (
                <MobileDataCard key={row.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {row.studentName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {row.className} · {row.subjectName}
                      </p>
                    </div>
                    <SentimentPill row={row} />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-700">{row.comment}</p>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <dt className="text-slate-400">Nilai</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-slate-800">
                        {formatAverageScore(row.averageScore)} / {LIKERT_MAX_SCORE}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Tanggal</dt>
                      <dd className="mt-0.5 text-slate-700">{formatDate(row.createdAt)}</dd>
                    </div>
                    {showTeacherColumn ? (
                      <div className="col-span-2">
                        <dt className="text-slate-400">Guru</dt>
                        <dd className="mt-0.5 truncate text-slate-700">
                          {row.teacherName ?? "Belum ditentukan"}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </MobileDataCard>
              ))}
            </div>

            <PaginationControls
              currentPage={data.currentPage}
              pathname={pathname}
              searchParams={searchParams}
              totalPages={data.totalPages}
            />
          </>
        )}
      </SectionCard>
    </div>
  );
}

function SentimentPill({ row }: { row: FeedbackReportRow }) {
  if (!row.finalLabel) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
        Menunggu
      </span>
    );
  }

  const isPositive = row.finalLabel === SentimentLabel.POSITIF;

  return (
    <span className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
          isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        }`}
      >
        {isPositive ? "Positif" : "Negatif"}
      </span>
      <span className="text-[11px] text-slate-400">
        {row.labelSource === LabelSource.MANUAL
          ? "Ditinjau manual"
          : row.confidence !== null
            ? `Keyakinan ${(row.confidence * 100).toFixed(1)}%`
            : "Otomatis"}
      </span>
    </span>
  );
}

function LikertAverageBar({
  average,
  itemNumber,
  responseCount,
  statement,
}: {
  average: number | null;
  itemNumber: number;
  responseCount: number;
  statement: string;
}) {
  const widthPercent = average === null ? 0 : (average / LIKERT_MAX_SCORE) * 100;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">
          {itemNumber}. {statement}
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {formatAverageScore(average)} / {LIKERT_MAX_SCORE}
          <span className="ml-2 font-normal text-slate-400">
            {responseCount} jawaban
          </span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

function ReportStatCard({
  accent,
  helper,
  label,
  value,
}: {
  accent: "emerald" | "indigo" | "rose" | "sky";
  helper: string;
  label: string;
  value: string;
}) {
  const accentClass =
    accent === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : accent === "rose"
        ? "bg-rose-100 text-rose-700"
        : accent === "sky"
          ? "bg-sky-100 text-sky-700"
          : "bg-indigo-100 text-indigo-700";

  return (
    <div className="rounded-[1.05rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accentClass}`}>
        {label}
      </span>
      <p className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
