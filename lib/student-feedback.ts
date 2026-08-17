import { LearningAspect } from "@prisma/client";

/**
 * Aspek pembelajaran dipakai oleh umpan balik format lama, yaitu ketika siswa
 * menulis satu tanggapan teks untuk masing-masing aspek. Format sekarang
 * mengukur ketiga hal itu lewat skala Likert dan hanya menyisakan satu kolom
 * teks, sehingga baris baru selalu memakai LearningAspect.UMUM. Peta label di
 * bawah tetap dibutuhkan untuk menampilkan data historis.
 */
export const LEGACY_FEEDBACK_ASPECTS = [
  LearningAspect.MATERI,
  LearningAspect.PENYAMPAIAN,
  LearningAspect.SOAL,
] as const;

export const feedbackAspectLabelMap: Record<LearningAspect, string> = {
  [LearningAspect.MATERI]: "Materi",
  [LearningAspect.PENYAMPAIAN]: "Penyampaian",
  [LearningAspect.SOAL]: "Soal",
  [LearningAspect.UMUM]: "Tanggapan",
};

export function isLegacyAspect(aspect: LearningAspect) {
  return aspect !== LearningAspect.UMUM;
}

/**
 * Satu sesi tryout cukup diberi satu tanggapan. Sesi dianggap sudah ditanggapi
 * begitu ada minimal satu baris umpan balik, termasuk baris format lama.
 */
export function isFeedbackComplete(
  feedbacks: Array<unknown> | null | undefined,
) {
  return (feedbacks ?? []).length > 0;
}
