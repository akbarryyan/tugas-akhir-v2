export type LikertItem = {
  number: number;
  statement: string;
};

export const LIKERT_ITEMS: readonly LikertItem[] = [
  { number: 1, statement: "Guru menjelaskan materi dengan jelas." },
  { number: 2, statement: "Guru menguasai materi pelajaran." },
  { number: 3, statement: "Cara mengajar guru mudah saya pahami." },
  { number: 4, statement: "Soal yang diberikan sesuai dengan materi yang diajarkan." },
  { number: 5, statement: "Guru terbuka terhadap pertanyaan siswa." },
] as const;

export const LIKERT_ITEM_COUNT = LIKERT_ITEMS.length;

export const LIKERT_MIN_SCORE = 1;
export const LIKERT_MAX_SCORE = 5;

export const LIKERT_SCALE = [1, 2, 3, 4, 5] as const;

export const likertScaleLabelMap: Record<number, string> = {
  1: "Sangat Tidak Setuju",
  2: "Tidak Setuju",
  3: "Cukup",
  4: "Setuju",
  5: "Sangat Setuju",
};

export function getLikertFieldName(itemNumber: number) {
  return `rating-${itemNumber}`;
}

export function getLikertStatement(itemNumber: number) {
  return LIKERT_ITEMS.find((item) => item.number === itemNumber)?.statement ?? `Butir ${itemNumber}`;
}

export function getAverageScore(
  ratings: Array<{ score: number }> | null | undefined,
): number | null {
  const scores = (ratings ?? []).map((rating) => rating.score);

  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function isRatingComplete(
  ratings: Array<{ itemNumber: number }> | null | undefined,
) {
  const filledItems = new Set((ratings ?? []).map((rating) => rating.itemNumber));

  return LIKERT_ITEMS.every((item) => filledItems.has(item.number));
}

export function formatAverageScore(average: number | null) {
  return average === null ? "-" : average.toFixed(2);
}
