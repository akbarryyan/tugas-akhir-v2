import { Role } from "@prisma/client";

import { PaginationControls, PageIntro } from "@/app/admin/_components";
import {
  getAdminActivities,
  type AdminActivityItem,
} from "@/lib/admin/activity";
import { requireRole } from "@/lib/auth/session";

type AdminActivityPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

const PAGE_SIZE = 12;

export default async function AdminActivityPage({
  searchParams,
}: AdminActivityPageProps) {
  await requireRole([Role.ADMIN]);

  const resolvedSearchParams = await searchParams;
  const currentPage = parsePositiveInt(resolvedSearchParams?.page, 1);
  const { rows, total } = await getAdminActivities(currentPage, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Riwayat Admin"
        title="Aktivitas Admin"
        description="Pantau perubahan penting yang dilakukan dari panel administrasi, mulai dari import data, pembuatan data baru, pembaruan, hingga penghapusan."
      />

      <section className="rounded-[1.05rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Timeline Aktivitas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Total {total} aktivitas tercatat.
            </p>
          </div>
          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Halaman {safePage} dari {totalPages}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {rows.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Belum ada aktivitas admin yang tercatat.
            </div>
          ) : (
            rows.map((activity) => (
              <ActivityTimelineItem key={activity.id} activity={activity} />
            ))
          )}
        </div>

        <PaginationControls
          currentPage={safePage}
          pathname="/admin/aktivitas"
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}

function ActivityTimelineItem({
  activity,
}: {
  activity: AdminActivityItem;
}) {
  return (
    <article className="grid gap-3 rounded-[1rem] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-[0.9rem] text-sm font-semibold ${getActivityTone(activity.action)}`}
      >
        {getActivityInitial(activity.action)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-950">
            {activity.message}
          </h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            {formatActivityEntity(activity.entityType)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Dilakukan oleh {activity.actorName} untuk {activity.entityLabel}.
        </p>
      </div>
      <time className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-right">
        {formatDateTime(activity.createdAt)}
      </time>
    </article>
  );
}

function getActivityInitial(action: AdminActivityItem["action"]) {
  const initials: Record<AdminActivityItem["action"], string> = {
    CREATE: "+",
    DELETE: "-",
    IMPORT: "I",
    TOGGLE: "T",
    UPDATE: "U",
  };

  return initials[action];
}

function getActivityTone(action: AdminActivityItem["action"]) {
  if (action === "DELETE") {
    return "bg-rose-50 text-rose-700";
  }

  if (action === "IMPORT") {
    return "bg-indigo-50 text-indigo-700";
  }

  if (action === "UPDATE" || action === "TOGGLE") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function formatActivityEntity(entityType: AdminActivityItem["entityType"]) {
  const labels: Record<AdminActivityItem["entityType"], string> = {
    GURU: "Guru",
    MAPEL: "Mapel",
    PENGAMPU: "Pengampu",
    PROFIL: "Profil",
    SISWA: "Siswa",
  };

  return labels[entityType];
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
