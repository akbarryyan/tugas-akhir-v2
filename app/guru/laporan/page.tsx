import { Role } from "@prisma/client";

import { AdminEmptyState, StatusAlert } from "@/app/admin/_components";
import { FeedbackReportStats, FeedbackReportView } from "@/app/admin/_feedback-report";
import { ReportFilters } from "@/app/admin/_report-filters";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { loadFeedbackReport, parseReportFilters } from "@/lib/sentiment/report";

type GuruLaporanPageProps = {
  searchParams?: Promise<{
    guru?: string;
    kelas?: string;
    mapel?: string;
    message?: string;
    page?: string;
    type?: string;
  }>;
};

export default async function GuruLaporanPage({ searchParams }: GuruLaporanPageProps) {
  const session = await requireRole([Role.GURU]);
  const resolvedSearchParams = await searchParams;
  const filters = parseReportFilters(resolvedSearchParams);

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!teacherProfile) {
    return (
      <div className="space-y-5">
        <AdminEmptyState message="Profil guru belum ditemukan. Hubungi admin untuk melengkapi data kepegawaian Anda." />
      </div>
    );
  }

  const data = await loadFeedbackReport({
    filters,
    lockedTeacherId: teacherProfile.id,
  });

  return (
    <div className="space-y-5">
      <FeedbackReportStats accent="sky" data={data} />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <ReportFilters
        className={filters.className}
        classNames={data.options.classNames}
        resetHref="/guru/laporan"
        subjectId={filters.subjectId}
        subjects={data.options.subjects.map((subject) => ({
          label: subject.name,
          value: subject.id,
        }))}
      />

      <FeedbackReportView
        data={data}
        pathname="/guru/laporan"
        searchParams={{
          kelas: filters.className || undefined,
          mapel: filters.subjectId || undefined,
        }}
        showTeacherColumn={false}
      />
    </div>
  );
}
