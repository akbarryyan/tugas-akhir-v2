import { Role } from "@prisma/client";

import { PageIntro, StatusAlert } from "@/app/admin/_components";
import { FeedbackReportStats, FeedbackReportView } from "@/app/admin/_feedback-report";
import { ReportFilters } from "@/app/admin/_report-filters";
import { requireRole } from "@/lib/auth/session";
import {
  getReportSummaryLine,
  loadFeedbackReport,
  parseReportFilters,
} from "@/lib/sentiment/report";

type AdminLaporanPageProps = {
  searchParams?: Promise<{
    guru?: string;
    kelas?: string;
    mapel?: string;
    message?: string;
    page?: string;
    type?: string;
  }>;
};

export default async function AdminLaporanPage({ searchParams }: AdminLaporanPageProps) {
  await requireRole([Role.ADMIN]);
  const resolvedSearchParams = await searchParams;
  const filters = parseReportFilters(resolvedSearchParams);

  const data = await loadFeedbackReport({ filters });

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Laporan Evaluasi"
        title="Laporan Evaluasi Pembelajaran"
        description={`Rekap penilaian dan tanggapan siswa per kelas dan per guru sebagai bahan evaluasi sekolah. ${getReportSummaryLine(data)}`}
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <ReportFilters
        className={filters.className}
        classNames={data.options.classNames}
        resetHref="/admin/laporan"
        subjectId={filters.subjectId}
        subjects={data.options.subjects.map((subject) => ({
          label: subject.name,
          value: subject.id,
        }))}
        teacherId={filters.teacherId}
        teachers={data.options.teachers.map((teacher) => ({
          label: teacher.name,
          value: teacher.id,
        }))}
      />

      <FeedbackReportStats accent="indigo" data={data} />

      <FeedbackReportView
        data={data}
        pathname="/admin/laporan"
        searchParams={{
          guru: filters.teacherId || undefined,
          kelas: filters.className || undefined,
          mapel: filters.subjectId || undefined,
        }}
        showTeacherColumn
      />
    </div>
  );
}
