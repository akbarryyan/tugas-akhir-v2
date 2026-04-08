"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FilterOption = {
  label: string;
  value: string;
};

type LiveFiltersProps = {
  field: string;
  fieldLabel?: string;
  placeholder: string;
  query?: string;
  queryLabel?: string;
  options: FilterOption[];
};

const DEBOUNCE_MS = 320;

export function LiveFilters({
  field,
  fieldLabel = "Filter Pencarian",
  options,
  placeholder,
  query,
  queryLabel = "Pencarian",
}: LiveFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const defaultParams = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    return params;
  }, [searchParams]);

  function replaceWithParams(nextParams: URLSearchParams) {
    const nextQuery = nextParams.toString();
    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white/82 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="grid min-w-0 flex-1 gap-2 text-sm font-medium text-slate-700">
          {queryLabel}
          <input
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder={placeholder}
            className="h-11 min-w-0 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-indigo-500"
            onChange={(event) => {
              const nextParams = new URLSearchParams(defaultParams.toString());
              const nextValue = event.currentTarget.value.trim();

              if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
              }

              debounceTimeoutRef.current = setTimeout(() => {
                if (nextValue) {
                  nextParams.set("q", nextValue);
                } else {
                  nextParams.delete("q");
                }

                replaceWithParams(nextParams);
              }, DEBOUNCE_MS);
            }}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:w-[220px]">
          {fieldLabel}
          <select
            name="field"
            defaultValue={field}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-indigo-500"
            onChange={(event) => {
              const nextParams = new URLSearchParams(defaultParams.toString());
              const nextField = event.currentTarget.value;

              if (nextField === "all") {
                nextParams.delete("field");
              } else {
                nextParams.set("field", nextField);
              }

              replaceWithParams(nextParams);
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }

            const nextParams = new URLSearchParams(defaultParams.toString());
            nextParams.delete("field");
            nextParams.delete("q");
            replaceWithParams(nextParams);
          }}
          className="mt-auto inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>Filter akan diterapkan otomatis tanpa tombol cari.</span>
        <span
          className={`transition-opacity duration-200 ${
            isPending ? "opacity-100" : "opacity-0"
          }`}
        >
          Memperbarui daftar...
        </span>
      </div>
    </div>
  );
}
