import { LearningAspect } from "@prisma/client";

export const REQUIRED_FEEDBACK_ASPECTS = [
  LearningAspect.MATERI,
  LearningAspect.PENYAMPAIAN,
  LearningAspect.SOAL,
] as const;

export const REQUIRED_FEEDBACK_ASPECT_COUNT = REQUIRED_FEEDBACK_ASPECTS.length;

export const feedbackAspectLabelMap: Record<LearningAspect, string> = {
  [LearningAspect.MATERI]: "Materi",
  [LearningAspect.PENYAMPAIAN]: "Penyampaian",
  [LearningAspect.SOAL]: "Evaluasi",
};

export function getFeedbackCompletionCount(
  feedbacks: Array<{ aspect: LearningAspect }> | null | undefined,
) {
  return new Set((feedbacks ?? []).map((feedback) => feedback.aspect)).size;
}

export function isFeedbackComplete(
  feedbacks: Array<{ aspect: LearningAspect }> | null | undefined,
) {
  return getFeedbackCompletionCount(feedbacks) >= REQUIRED_FEEDBACK_ASPECT_COUNT;
}

export function getMissingFeedbackAspects(
  feedbacks: Array<{ aspect: LearningAspect }> | null | undefined,
) {
  const existingAspects = new Set((feedbacks ?? []).map((feedback) => feedback.aspect));

  return REQUIRED_FEEDBACK_ASPECTS.filter((aspect) => !existingAspects.has(aspect));
}
