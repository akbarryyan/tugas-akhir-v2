export type SentimentCounts = {
  positif: number;
  negatif: number;
};

export type SentimentRowData = {
  label: string;
  counts: SentimentCounts;
};

export type SentimentBarGroupData = {
  title: string;
  description: string;
  rows: SentimentRowData[];
};

export type SentimentChartData = {
  overall: SentimentCounts;
  groups: SentimentBarGroupData[];
};

export function SentimentDistributionSection({
  data,
}: {
  data: SentimentChartData;
}) {
  const total = data.overall.positif + data.overall.negatif;

  if (total === 0) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-8 text-center text-sm leading-7 text-slate-500">
        Belum ada data sentimen untuk ditampilkan dalam grafik.
      </div>
    );
  }

  const visibleGroups = data.groups.filter((group) => group.rows.length > 0);

  return (
    <div
      className={
        visibleGroups.length > 0
          ? "grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]"
          : "grid gap-5"
      }
    >
      <OverallDonut overall={data.overall} total={total} />

      {visibleGroups.length > 0 && (
        <div className="grid gap-5">
          {visibleGroups.map((group) => (
            <SentimentBarGroup
              key={group.title}
              title={group.title}
              description={group.description}
              rows={group.rows}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OverallDonut({
  overall,
  total,
}: {
  overall: SentimentCounts;
  total: number;
}) {
  const positifPct = total === 0 ? 0 : Math.round((overall.positif / total) * 100);
  const negatifPct = Math.max(0, 100 - positifPct);

  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const positifDash = (overall.positif / total) * circumference;
  const negatifDash = circumference - positifDash;

  const positifOffset = 0;
  const negatifOffset = -positifDash;

  return (
    <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold text-slate-900">Distribusi Keseluruhan</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Total {total} umpan balik teranalisis
      </p>

      <div className="mt-5 flex items-center justify-center">
        <div className="relative">
          <svg viewBox="0 0 160 160" width="160" height="160" className="-rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="18"
            />
            {overall.positif > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
                strokeDasharray={`${positifDash} ${circumference}`}
                strokeDashoffset={positifOffset}
                strokeLinecap="butt"
              />
            )}
            {overall.negatif > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="18"
                strokeDasharray={`${negatifDash} ${circumference}`}
                strokeDashoffset={negatifOffset}
                strokeLinecap="butt"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-semibold tracking-tight text-slate-950">{total}</p>
            <p className="text-xs font-medium text-slate-400">total</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <DonutLegendItem
          color="bg-emerald-500"
          label="Positif"
          count={overall.positif}
          percent={positifPct}
        />
        <DonutLegendItem
          color="bg-rose-500"
          label="Negatif"
          count={overall.negatif}
          percent={negatifPct}
        />
      </div>
    </div>
  );
}

function DonutLegendItem({
  color,
  count,
  label,
  percent,
}: {
  color: string;
  count: number;
  label: string;
  percent: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-right">
        <span className="text-sm font-semibold text-slate-950">{count}</span>
        <span className="w-10 rounded-full bg-slate-100 px-2 py-0.5 text-center text-xs font-semibold text-slate-500">
          {percent}%
        </span>
      </div>
    </div>
  );
}

function SentimentBarGroup({
  description,
  rows,
  title,
}: {
  description: string;
  rows: SentimentRowData[];
  title: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          <LegendDot color="bg-emerald-500" label="Positif" />
          <LegendDot color="bg-rose-500" label="Negatif" />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <SentimentStackedBar key={row.label} row={row} />
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function SentimentStackedBar({ row }: { row: SentimentRowData }) {
  const total = row.counts.positif + row.counts.negatif;

  if (total === 0) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-800">{row.label}</span>
          <span className="text-xs text-slate-400">Belum ada data</span>
        </div>
        <div className="h-5 overflow-hidden rounded-full bg-slate-100" />
      </div>
    );
  }

  const positifW = Math.round((row.counts.positif / total) * 100);
  const negatifW = Math.max(0, 100 - positifW);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-800">{row.label}</span>
        <span className="text-xs font-semibold text-slate-500">{total} umpan balik</span>
      </div>
      <div className="flex h-5 overflow-hidden rounded-full bg-slate-100">
        {positifW > 0 && (
          <div
            className="flex h-full items-center justify-center bg-emerald-500 text-[10px] font-semibold text-white"
            style={{ width: `${positifW}%` }}
            title={`Positif: ${row.counts.positif}`}
          >
            {positifW >= 12 ? `${positifW}%` : ""}
          </div>
        )}
        {negatifW > 0 && (
          <div
            className="flex h-full items-center justify-center bg-rose-500 text-[10px] font-semibold text-white"
            style={{ width: `${negatifW}%` }}
            title={`Negatif: ${row.counts.negatif}`}
          >
            {negatifW >= 12 ? `${negatifW}%` : ""}
          </div>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          <span className="font-semibold text-emerald-700">{row.counts.positif}</span> positif
        </span>
        <span>
          <span className="font-semibold text-rose-700">{row.counts.negatif}</span> negatif
        </span>
      </div>
    </div>
  );
}
