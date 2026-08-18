/**
 * Butir penilaian disusun mengacu pada Kompetensi Inti Guru dalam Permendiknas
 * No. 16 Tahun 2007 tentang Standar Kualifikasi Akademik dan Kompetensi Guru.
 * Setiap butir mewakili satu kompetensi inti yang berbeda dan dipilih hanya dari
 * kompetensi yang dapat diamati langsung oleh siswa di kelas.
 */
export type LikertItem = {
  number: number;
  statement: string;
  /** Nomor kompetensi inti guru pada Permendiknas No. 16 Tahun 2007. */
  competencyNumber: number;
  /** Ranah kompetensi: Pedagogik, Kepribadian, Sosial, atau Profesional. */
  competency: string;
};

export const LIKERT_ITEMS: readonly LikertItem[] = [
  {
    number: 1,
    statement: "Guru menyampaikan materi dengan cara yang mudah saya pahami.",
    competencyNumber: 4, // Menyelenggarakan pembelajaran yang mendidik.
    competency: "Pedagogik",
  },
  {
    number: 2,
    statement: "Guru menguasai materi pelajaran yang diajarkan.",
    competencyNumber: 20, // Menguasai materi, struktur, konsep, dan pola pikir
    competency: "Profesional", // keilmuan yang mendukung mata pelajaran yang diampu.
  },
  {
    number: 3,
    statement: "Soal yang diberikan sesuai dengan materi yang telah diajarkan.",
    competencyNumber: 8, // Menyelenggarakan penilaian dan evaluasi proses dan
    competency: "Pedagogik", // hasil belajar.
  },
  {
    number: 4,
    statement: "Guru membahas hasil ujian sebagai bahan perbaikan belajar.",
    competencyNumber: 9, // Memanfaatkan hasil penilaian dan evaluasi untuk
    competency: "Pedagogik", // kepentingan pembelajaran.
  },
  {
    number: 5,
    statement: "Guru menanggapi pertanyaan siswa dengan jelas dan santun.",
    competencyNumber: 7, // Berkomunikasi secara efektif, empatik, dan santun
    competency: "Pedagogik", // dengan peserta didik.
  },
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
