import Link from "next/link";

import {
  ConfirmResetSearchButton,
  ResetSearchButton,
} from "@/app/admin/_client-actions";
import { QueryToastSync } from "@/components/ui/query-toast-sync";

type SearchParams = Promise<
  | {
      message?: string;
      type?: string;
      [key: string]: string | undefined;
    }
  | undefined
>;

type PageIntroProps = {
  description: string;
  eyebrow: string;
  title: string;
};

type StatusAlertProps = {
  searchParams?: SearchParams;
};

type SectionCardProps = {
  children: React.ReactNode;
  description?: string;
  title: string;
};

type AdminLinkCardProps = {
  description: string;
  href: string;
  metric?: string;
  title: string;
};

type SearchToolbarProps = {
  confirmReset?: boolean;
  params?: Record<string, string | undefined>;
  placeholder: string;
  query?: string;
  resetHref?: string;
};

type AdminStatCardProps = {
  accent: "amber" | "emerald" | "indigo" | "sky";
  description: string;
  label: string;
  value: number;
};

type PaginationControlsProps = {
  currentPage: number;
  pathname: string;
  searchParams?: Record<string, string | undefined>;
  totalPages: number;
};

type SortableHeaderLinkProps = {
  currentOrder: "asc" | "desc";
  currentSort: string;
  label: string;
  pathname: string;
  searchParams?: Record<string, string | undefined>;
  sortKey: string;
};

type DesktopTableProps = {
  children: React.ReactNode;
  minWidthClassName: string;
};

type DesktopTableHeaderRowProps = {
  children: React.ReactNode;
  columnsClassName: string;
};

type DesktopTableBodyProps = {
  children: React.ReactNode;
};

type DesktopTableRowProps = {
  children: React.ReactNode;
  columnsClassName: string;
};

type AdminEmptyStateProps = {
  message: string;
};

type MobileDataCardProps = {
  children: React.ReactNode;
};

type MobileDataCardHeaderProps = {
  badge?: React.ReactNode;
  children: React.ReactNode;
};

type TableIconButtonProps = {
  children: React.ReactNode;
  title: string;
  variant?: "danger" | "primary" | "neutral";
};

export function PageIntro({ description, eyebrow, title }: PageIntroProps) {
  return (
    <div className="rounded-[1.8rem] border border-white/80 bg-white/80 px-6 py-6 shadow-[0_18px_54px_rgba(15,23,42,0.06)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

export async function StatusAlert({ searchParams }: StatusAlertProps) {
  const resolvedSearchParams = await searchParams;

  if (
    !resolvedSearchParams?.message ||
    (resolvedSearchParams.type !== "success" &&
      resolvedSearchParams.type !== "error")
  ) {
    return null;
  }

  return (
    <QueryToastSync
      message={resolvedSearchParams.message}
      type={resolvedSearchParams.type}
    />
  );
}

export function SectionCard({
  children,
  description,
  title,
}: SectionCardProps) {
  return (
    <section className="rounded-[1.8rem] border border-white/80 bg-white/88 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {description ? (
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          ) : null}
        </div>
        <div className="mt-1 h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,#e0e7ff_0%,#f8fafc_100%)]" />
      </div>
      {children}
    </section>
  );
}

export function AdminLinkCard({
  description,
  href,
  metric,
  title,
}: AdminLinkCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[1.65rem] border border-white/80 bg-white/88 p-6 shadow-[0_18px_54px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_22px_62px_rgba(79,70,229,0.14)]"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#e0e7ff_0%,#eef2ff_55%,#ffffff_100%)] text-indigo-700 shadow-inner shadow-white/80">
            <ArrowTileIcon />
          </div>
          {metric ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {metric}
            </span>
          ) : null}
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition group-hover:gap-3">
          Buka halaman
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

export function AdminStatCard({
  accent,
  description,
  label,
  value,
}: AdminStatCardProps) {
  const accentClasses =
    accent === "indigo"
      ? {
          badge: "bg-indigo-100 text-indigo-700",
          ring: "from-indigo-100 via-white to-white",
        }
      : accent === "emerald"
        ? {
            badge: "bg-emerald-100 text-emerald-700",
            ring: "from-emerald-100 via-white to-white",
          }
        : accent === "amber"
          ? {
              badge: "bg-amber-100 text-amber-700",
              ring: "from-amber-100 via-white to-white",
            }
          : {
              badge: "bg-sky-100 text-sky-700",
              ring: "from-sky-100 via-white to-white",
            };

  return (
    <div className={`rounded-[1.7rem] border border-white/80 bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${accentClasses.ring} p-5 shadow-[0_18px_54px_rgba(15,23,42,0.06)]`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`rounded-2xl px-3 py-2 text-xs font-semibold ${accentClasses.badge}`}>
          Aktif
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function SearchToolbar({
  confirmReset = false,
  params,
  placeholder,
  query,
  resetHref,
}: SearchToolbarProps) {
  const preservedParams = Object.entries(params ?? {}).filter(
    ([key, value]) => key !== "page" && key !== "q" && value,
  );

  return (
    <form className="flex flex-col gap-3 rounded-[1.6rem] border border-white/80 bg-white/82 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] md:flex-row md:items-center">
      {preservedParams.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <input type="hidden" name="page" value="1" />
      <input
        type="search"
        name="q"
        defaultValue={query ?? ""}
        placeholder={placeholder}
        className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-indigo-500"
      />
      <div className="flex flex-wrap gap-3 sm:flex-nowrap">
        <button
          type="submit"
          className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Cari
        </button>
        {query ? (
          confirmReset ? (
            <ConfirmResetSearchButton href={resetHref} />
          ) : (
            <ResetSearchButton href={resetHref} />
          )
        ) : null}
      </div>
    </form>
  );
}

export function SortableHeaderLink({
  currentOrder,
  currentSort,
  label,
  pathname,
  searchParams,
  sortKey,
}: SortableHeaderLinkProps) {
  const nextOrder =
    currentSort === sortKey && currentOrder === "asc" ? "desc" : "asc";
  const href = buildAdminHref(pathname, {
    ...searchParams,
    order: nextOrder,
    page: "1",
    sort: sortKey,
  });
  const isActive = currentSort === sortKey;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 transition ${
        isActive ? "text-slate-800" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`text-[10px] ${isActive ? "text-indigo-600" : "text-slate-400"}`}
      >
        {isActive ? (currentOrder === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </Link>
  );
}

export function DesktopTable({
  children,
  minWidthClassName,
}: DesktopTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.65rem] border border-slate-200/80 bg-white/92 shadow-[0_14px_42px_rgba(15,23,42,0.05)]">
      <div className="no-scrollbar max-h-[720px] overflow-auto overscroll-contain">
        <div className={minWidthClassName}>{children}</div>
      </div>
    </div>
  );
}

export function DesktopTableHeaderRow({
  children,
  columnsClassName,
}: DesktopTableHeaderRowProps) {
  return (
    <div
      className={`sticky top-0 z-10 grid ${columnsClassName} gap-3 border-b border-slate-200 bg-slate-50/95 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur`}
    >
      {children}
    </div>
  );
}

export function DesktopTableActionHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="sticky right-0 z-20 flex h-full w-[9.5rem] min-w-[9.5rem] items-center justify-end bg-slate-50/95 pl-4 text-right">
      {children}
    </span>
  );
}

export function DesktopTableBody({ children }: DesktopTableBodyProps) {
  return <div className="divide-y divide-slate-200">{children}</div>;
}

export function DesktopTableRow({
  children,
  columnsClassName,
}: DesktopTableRowProps) {
  return (
    <div className={`grid ${columnsClassName} gap-3 px-5 py-4`}>{children}</div>
  );
}

export function DesktopTableActionCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky right-0 flex h-full w-[9.5rem] min-w-[9.5rem] items-center justify-end bg-white/98 pl-4 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function AdminEmptyState({ message }: AdminEmptyStateProps) {
  return (
    <p className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
      {message}
    </p>
  );
}

export function MobileDataCard({ children }: MobileDataCardProps) {
  return (
    <div className="rounded-[1.65rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_42px_rgba(15,23,42,0.05)]">
      {children}
    </div>
  );
}

export function MobileDataCardHeader({
  badge,
  children,
}: MobileDataCardHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
      {children}
      {badge ? badge : null}
    </div>
  );
}

export function TableIconButton({
  children,
  title,
  variant = "neutral",
}: TableIconButtonProps) {
  const classes =
    variant === "primary"
      ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
      : variant === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <span
      title={title}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${classes}`}
    >
      {children}
    </span>
  );
}

export function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export function ToggleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a4 4 0 0 1 4-4h10a4 4 0 1 1 0 8H7a4 4 0 0 1-4-4Z" />
      <path d="M15 12h.01" />
    </svg>
  );
}

export function PaginationControls({
  currentPage,
  pathname,
  searchParams,
  totalPages,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getVisiblePages(currentPage, totalPages);

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500">
        Halaman <span className="font-semibold text-slate-800">{currentPage}</span>{" "}
        dari <span className="font-semibold text-slate-800">{totalPages}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <PaginationLink
          href={buildAdminHref(pathname, {
            ...searchParams,
            page: String(Math.max(1, currentPage - 1)),
          })}
          disabled={currentPage === 1}
        >
          Sebelumnya
        </PaginationLink>

        {pageNumbers.map((pageNumber) => (
          <Link
            key={pageNumber}
            href={buildAdminHref(pathname, {
              ...searchParams,
              page: String(pageNumber),
            })}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition ${
              currentPage === pageNumber
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {pageNumber}
          </Link>
        ))}

        <PaginationLink
          href={buildAdminHref(pathname, {
            ...searchParams,
            page: String(Math.min(totalPages, currentPage + 1)),
          })}
          disabled={currentPage === totalPages}
        >
          Berikutnya
        </PaginationLink>
      </div>
    </div>
  );
}

function ArrowTileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

function PaginationLink({
  children,
  disabled,
  href,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  href: string;
}) {
  return (
    <Link
      aria-disabled={disabled}
      href={disabled ? "#" : href}
      className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
        disabled
          ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}

function buildAdminHref(
  pathname: string,
  searchParams?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];

  for (let page = Math.max(1, end - 4); page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}
