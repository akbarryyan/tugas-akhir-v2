import { SentimentLabel } from "@prisma/client";

import { LIKERT_ITEMS } from "@/lib/feedback-likert";

export type SentimentCounts = {
  positif: number;
  negatif: number;
};

export type SentimentBreakdownRow = {
  key: string;
  label: string;
  counts: SentimentCounts;
};

export type LabelledRow = {
  finalLabel: SentimentLabel;
};

export function createEmptyCounts(): SentimentCounts {
  return { negatif: 0, positif: 0 };
}

export function getTotal(counts: SentimentCounts) {
  return counts.positif + counts.negatif;
}

/**
 * Persentase positif dibulatkan, lalu persentase negatif diturunkan dari
 * sisanya supaya keduanya selalu berjumlah 100 dan tidak menampilkan
 * kombinasi ganjil seperti 33% + 68% akibat pembulatan terpisah.
 */
export function getPercentages(counts: SentimentCounts) {
  const total = getTotal(counts);

  if (total === 0) {
    return { negatif: 0, positif: 0 };
  }

  const positif = Math.round((counts.positif / total) * 100);

  return { negatif: Math.max(0, 100 - positif), positif };
}

export function countByLabel<Row extends LabelledRow>(rows: Row[]): SentimentCounts {
  const counts = createEmptyCounts();

  for (const row of rows) {
    if (row.finalLabel === SentimentLabel.POSITIF) {
      counts.positif += 1;
    } else {
      counts.negatif += 1;
    }
  }

  return counts;
}

/**
 * Mengelompokkan baris sentimen berdasarkan kunci apa pun (kelas, guru, mata
 * pelajaran) dan mengurutkannya dari yang jumlah datanya terbanyak.
 */
export function groupCountsBy<Row extends LabelledRow>(
  rows: Row[],
  resolve: (row: Row) => { key: string; label: string } | null,
  options?: { limit?: number },
): SentimentBreakdownRow[] {
  const groups = new Map<string, SentimentBreakdownRow>();

  for (const row of rows) {
    const identity = resolve(row);

    if (!identity) {
      continue;
    }

    let group = groups.get(identity.key);

    if (!group) {
      group = { counts: createEmptyCounts(), key: identity.key, label: identity.label };
      groups.set(identity.key, group);
    }

    if (row.finalLabel === SentimentLabel.POSITIF) {
      group.counts.positif += 1;
    } else {
      group.counts.negatif += 1;
    }
  }

  const sorted = Array.from(groups.values()).sort((a, b) => {
    const totalDiff = getTotal(b.counts) - getTotal(a.counts);

    return totalDiff !== 0 ? totalDiff : a.label.localeCompare(b.label, "id-ID");
  });

  return typeof options?.limit === "number" ? sorted.slice(0, options.limit) : sorted;
}

export type LikertItemSummary = {
  itemNumber: number;
  statement: string;
  average: number | null;
  responseCount: number;
};

export type LikertSummary = {
  overallAverage: number | null;
  items: LikertItemSummary[];
  responseCount: number;
};

/**
 * Merangkum jawaban skala Likert menjadi rata-rata per butir dan rata-rata
 * keseluruhan. Rata-rata keseluruhan dihitung dari seluruh skor mentah, bukan
 * dari rata-rata per butir, agar butir yang jumlah jawabannya berbeda tidak
 * memperoleh bobot yang sama besar.
 */
export function buildLikertSummary(
  ratings: Array<{ itemNumber: number; score: number }>,
): LikertSummary {
  const totals = new Map<number, { sum: number; count: number }>();

  for (const rating of ratings) {
    const current = totals.get(rating.itemNumber) ?? { count: 0, sum: 0 };

    current.count += 1;
    current.sum += rating.score;
    totals.set(rating.itemNumber, current);
  }

  return buildLikertSummaryFromTotals(
    Array.from(totals.entries()).map(([itemNumber, total]) => ({
      count: total.count,
      itemNumber,
      sum: total.sum,
    })),
  );
}

/**
 * Varian yang menerima hasil agregasi database (groupBy dengan _sum dan
 * _count), sehingga halaman laporan tidak perlu menarik seluruh baris skor ke
 * dalam memori hanya untuk menghitung rata-rata.
 */
export function buildLikertSummaryFromTotals(
  totals: Array<{ itemNumber: number; sum: number; count: number }>,
): LikertSummary {
  const totalByItem = new Map(totals.map((total) => [total.itemNumber, total]));

  const items = LIKERT_ITEMS.map((item) => {
    const total = totalByItem.get(item.number);

    return {
      average: total && total.count > 0 ? total.sum / total.count : null,
      itemNumber: item.number,
      responseCount: total?.count ?? 0,
      statement: item.statement,
    };
  });

  const responseCount = totals.reduce((sum, total) => sum + total.count, 0);
  const scoreSum = totals.reduce((sum, total) => sum + total.sum, 0);

  return {
    items,
    overallAverage: responseCount > 0 ? scoreSum / responseCount : null,
    responseCount,
  };
}
