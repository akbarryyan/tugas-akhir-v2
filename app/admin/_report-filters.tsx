import Link from "next/link";

type FilterOption = {
  label: string;
  value: string;
};

/**
 * Filter laporan sengaja dibuat sebagai form GET biasa agar halaman tetap dapat
 * dibagikan lewat URL dan tetap berfungsi tanpa JavaScript, sama seperti
 * SearchToolbar yang dipakai halaman lain.
 */
export function ReportFilters({
  className,
  classNames,
  resetHref,
  subjectId,
  subjects,
  teacherId,
  teachers,
}: {
  className: string;
  classNames: string[];
  resetHref: string;
  subjectId: string;
  subjects: FilterOption[];
  teacherId?: string;
  teachers?: FilterOption[];
}) {
  const hasActiveFilter = Boolean(className || subjectId || teacherId);

  return (
    <form className="flex flex-col gap-3 rounded-[1rem] border border-slate-200/80 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)] lg:flex-row lg:items-end">
      <input type="hidden" name="page" value="1" />

      <FilterSelect
        label="Kelas"
        name="kelas"
        value={className}
        placeholder="Semua kelas"
        options={classNames.map((item) => ({ label: item, value: item }))}
      />

      <FilterSelect
        label="Mata Pelajaran"
        name="mapel"
        value={subjectId}
        placeholder="Semua mata pelajaran"
        options={subjects}
      />

      {teachers ? (
        <FilterSelect
          label="Guru"
          name="guru"
          value={teacherId ?? ""}
          placeholder="Semua guru"
          options={teachers}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Terapkan
        </button>
        {hasActiveFilter ? (
          <Link
            href={resetHref}
            className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function FilterSelect({
  label,
  name,
  options,
  placeholder,
  value,
}: {
  label: string;
  name: string;
  options: FilterOption[];
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid min-w-0 flex-1 gap-2 text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="h-11 min-w-0 rounded-[0.9rem] border border-slate-200 bg-white px-4 outline-none transition focus:border-indigo-500"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
