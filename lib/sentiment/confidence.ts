import { LabelSource } from "@prisma/client";

/**
 * Ambang keyakinan untuk menandai prediksi yang belum pasti.
 *
 * Nilainya ditetapkan dari data latih saja (validasi silang 5-fold), bukan dari
 * data uji, agar penentuannya tidak mengintip data evaluasi. Pada data latih,
 * ambang ini menjaring 9 dari 11 kesalahan sekaligus menyisakan akurasi 99,06%
 * pada data yang tetap diputuskan. Saat diterapkan ke data uji, seluruh empat
 * kesalahan tertangkap dan 49 data sisanya benar semuanya.
 *
 * Perlu ditegaskan: ini BUKAN kelas sentimen ketiga yang dipelajari model.
 * Klasifikasi tetap dua kelas. Ambang ini hanya menyatakan bahwa bukti untuk
 * kedua kelas nyaris berimbang, sehingga labelnya sebaiknya ditinjau guru
 * sebelum dipakai.
 */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.6;

export type ReviewableSentiment = {
  autoConfidence: number | null;
  labelSource: LabelSource | string | null;
};

/**
 * Menentukan apakah sebuah hasil analisis perlu ditinjau manual.
 *
 * Label yang sudah dikoreksi guru tidak lagi ditandai, karena keyakinan model
 * tidak relevan untuk label yang ditetapkan manusia. Keyakinan yang tidak
 * diketahui juga ditandai, sebab ketiadaan angka bukan berarti model yakin.
 */
export function needsManualReview(sentiment: ReviewableSentiment | null | undefined) {
  if (!sentiment) {
    return false;
  }

  if (sentiment.labelSource === LabelSource.MANUAL) {
    return false;
  }

  if (sentiment.autoConfidence === null) {
    return true;
  }

  return sentiment.autoConfidence < REVIEW_CONFIDENCE_THRESHOLD;
}

export function formatConfidencePercent(confidence: number | null) {
  return confidence === null ? "-" : `${(confidence * 100).toFixed(1)}%`;
}
