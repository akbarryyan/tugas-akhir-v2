import Link from "next/link";

import {
  ConfirmResetSearchButton,
  ResetSearchButton,
} from "@/app/admin/_client-actions";
import { QueryToastSync } from "@/components/ui/query-toast-sync";

type SearchParams = Promise<{
  message?: string;
  type?: string;
}>;

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
  title: string;
};

type SearchToolbarProps = {
  confirmReset?: boolean;
  placeholder: string;
  query?: string;
};

export function PageIntro({ description, eyebrow, title }: PageIntroProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
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
    <section className="rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
      <div className="mb-5 space-y-1">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AdminLinkCard({
  description,
  href,
  title,
}: AdminLinkCardProps) {
  return (
    <Link
      href={href}
      className="rounded-[1.5rem] border border-white/70 bg-white/85 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_20px_56px_rgba(79,70,229,0.12)]"
    >
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
        <span className="inline-flex text-sm font-medium text-indigo-600">
          Buka halaman
        </span>
      </div>
    </Link>
  );
}

export function SearchToolbar({
  confirmReset = false,
  placeholder,
  query,
}: SearchToolbarProps) {
  return (
    <form className="flex flex-col gap-3 md:flex-row md:items-center">
      <input
        type="search"
        name="q"
        defaultValue={query ?? ""}
        placeholder={placeholder}
        className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-indigo-500"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Cari
        </button>
        {query ? (
          confirmReset ? (
            <ConfirmResetSearchButton />
          ) : (
            <ResetSearchButton />
          )
        ) : null}
      </div>
    </form>
  );
}
