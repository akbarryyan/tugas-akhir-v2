import { Role } from "@prisma/client";
import Link from "next/link";

import { PaginationControls, PageIntro } from "@/app/admin/_components";
import {
  getAdminActivities,
  type AdminActivityEntity,
  type AdminActivityItem,
  type AdminActivityType,
} from "@/lib/admin/activity";
import { requireRole } from "@/lib/auth/session";

type AdminActivityPageProps = {
  searchParams?: Promise<{
    action?: string;
    entity?: string;
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
  const actionFilter = getActionFilter(resolvedSearchParams?.action);
  const entityFilter = getEntityFilter(resolvedSearchParams?.entity);
  const { rows, total } = await getAdminActivities(currentPage, PAGE_SIZE, {
    action: actionFilter,
    entityType: entityFilter,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginationParams = {
    action: actionFilter,
    entity: entityFilter,
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Riwayat Admin"
        title="Aktivitas Admin"
        description="Pantau perubahan penting yang dilakukan dari panel administrasi, mulai dari import data, pembuatan data baru, pembaruan, hingga penghapusan."
      />

      <section className="rounded-[1.05rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="mb-5 grid gap-3 rounded-[1rem] border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-slate-950">
              Filter Aktivitas
            </h2>
            <p className="text-xs leading-5 text-slate-500">
              Saring riwayat berdasarkan jenis aksi atau jenis data yang berubah.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              href="/admin/aktivitas"
              isActive={!actionFilter && !entityFilter}
              label="Semua"
            />
            {activityActions.map((action) => (
              <FilterChip
                key={action.value}
                href={buildActivityFilterHref({
                  action: action.value,
                  entity: entityFilter,
                })}
                isActive={actionFilter === action.value}
                label={action.label}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {activityEntities.map((entity) => (
              <FilterChip
                key={entity.value}
                href={buildActivityFilterHref({
                  action: actionFilter,
                  entity: entity.value,
                })}
                isActive={entityFilter === entity.value}
                label={entity.label}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Timeline Aktivitas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Total {total} aktivitas tercatat
              {actionFilter || entityFilter ? " sesuai filter." : "."}
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
          searchParams={paginationParams}
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
        {activity.details ? (
          <p className="mt-2 rounded-[0.75rem] bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            {activity.details}
          </p>
        ) : null}
      </div>
      <time className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-right">
        {formatDateTime(activity.createdAt)}
      </time>
    </article>
  );
}

const activityActions: Array<{ label: string; value: AdminActivityType }> = [
  { label: "Import", value: "IMPORT" },
  { label: "Tambah", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Hapus", value: "DELETE" },
  { label: "Status", value: "TOGGLE" },
];

const activityEntities: Array<{ label: string; value: AdminActivityEntity }> = [
  { label: "Guru", value: "GURU" },
  { label: "Siswa", value: "SISWA" },
  { label: "Mapel", value: "MAPEL" },
  { label: "Pengampu", value: "PENGAMPU" },
  { label: "Profil", value: "PROFIL" },
];

function FilterChip({
  href,
  isActive,
  label,
}: {
  href: string;
  isActive: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition ${
        isActive
          ? "bg-indigo-600 text-white shadow-[0_10px_22px_rgba(79,70,229,0.18)]"
          : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
      }`}
    >
      {label}
    </Link>
  );
}

function buildActivityFilterHref({
  action,
  entity,
}: {
  action?: AdminActivityType;
  entity?: AdminActivityEntity;
}) {
  const params = new URLSearchParams();

  if (action) {
    params.set("action", action);
  }

  if (entity) {
    params.set("entity", entity);
  }

  const query = params.toString();

  return query ? `/admin/aktivitas?${query}` : "/admin/aktivitas";
}

function getActionFilter(value: string | undefined): AdminActivityType | undefined {
  if (
    value === "CREATE" ||
    value === "DELETE" ||
    value === "IMPORT" ||
    value === "TOGGLE" ||
    value === "UPDATE"
  ) {
    return value;
  }

  return undefined;
}

function getEntityFilter(value: string | undefined): AdminActivityEntity | undefined {
  if (
    value === "GURU" ||
    value === "MAPEL" ||
    value === "PENGAMPU" ||
    value === "PROFIL" ||
    value === "SISWA"
  ) {
    return value;
  }

  return undefined;
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
