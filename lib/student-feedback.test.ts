import { LearningAspect } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  getFeedbackCompletionCount,
  getMissingFeedbackAspects,
  isFeedbackComplete,
  REQUIRED_FEEDBACK_ASPECTS,
  REQUIRED_FEEDBACK_ASPECT_COUNT,
} from "@/lib/student-feedback";

describe("REQUIRED_FEEDBACK_ASPECTS", () => {
  it("contains exactly 3 aspects", () => {
    expect(REQUIRED_FEEDBACK_ASPECTS).toHaveLength(3);
  });

  it("includes MATERI, PENYAMPAIAN, and SOAL", () => {
    expect(REQUIRED_FEEDBACK_ASPECTS).toContain(LearningAspect.MATERI);
    expect(REQUIRED_FEEDBACK_ASPECTS).toContain(LearningAspect.PENYAMPAIAN);
    expect(REQUIRED_FEEDBACK_ASPECTS).toContain(LearningAspect.SOAL);
  });

  it("REQUIRED_FEEDBACK_ASPECT_COUNT equals 3", () => {
    expect(REQUIRED_FEEDBACK_ASPECT_COUNT).toBe(3);
  });
});

describe("getFeedbackCompletionCount", () => {
  it("returns 0 for null", () => {
    expect(getFeedbackCompletionCount(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(getFeedbackCompletionCount(undefined)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(getFeedbackCompletionCount([])).toBe(0);
  });

  it("returns 1 for single aspect", () => {
    expect(getFeedbackCompletionCount([{ aspect: LearningAspect.MATERI }])).toBe(1);
  });

  it("returns 2 for two distinct aspects", () => {
    expect(
      getFeedbackCompletionCount([
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.PENYAMPAIAN },
      ]),
    ).toBe(2);
  });

  it("returns 3 for all three aspects", () => {
    expect(
      getFeedbackCompletionCount([
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.PENYAMPAIAN },
        { aspect: LearningAspect.SOAL },
      ]),
    ).toBe(3);
  });

  it("counts unique aspects (ignores duplicates)", () => {
    expect(
      getFeedbackCompletionCount([
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.MATERI },
      ]),
    ).toBe(1);
  });

  it("counts unique even with mixed duplicates", () => {
    expect(
      getFeedbackCompletionCount([
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.PENYAMPAIAN },
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.SOAL },
        { aspect: LearningAspect.PENYAMPAIAN },
      ]),
    ).toBe(3);
  });
});

describe("isFeedbackComplete", () => {
  it("returns false for null", () => {
    expect(isFeedbackComplete(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isFeedbackComplete(undefined)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isFeedbackComplete([])).toBe(false);
  });

  it("returns false for 1 of 3 aspects", () => {
    expect(isFeedbackComplete([{ aspect: LearningAspect.MATERI }])).toBe(false);
  });

  it("returns false for 2 of 3 aspects", () => {
    expect(
      isFeedbackComplete([
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.PENYAMPAIAN },
      ]),
    ).toBe(false);
  });

  it("returns true for all 3 aspects", () => {
    expect(
      isFeedbackComplete([
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.PENYAMPAIAN },
        { aspect: LearningAspect.SOAL },
      ]),
    ).toBe(true);
  });

  it("returns true even with duplicates if all 3 present", () => {
    expect(
      isFeedbackComplete([
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.PENYAMPAIAN },
        { aspect: LearningAspect.SOAL },
      ]),
    ).toBe(true);
  });
});

describe("getMissingFeedbackAspects", () => {
  it("returns all 3 aspects for null", () => {
    const missing = getMissingFeedbackAspects(null);
    expect(missing).toHaveLength(3);
    expect(missing).toContain(LearningAspect.MATERI);
    expect(missing).toContain(LearningAspect.PENYAMPAIAN);
    expect(missing).toContain(LearningAspect.SOAL);
  });

  it("returns all 3 aspects for undefined", () => {
    const missing = getMissingFeedbackAspects(undefined);
    expect(missing).toHaveLength(3);
  });

  it("returns all 3 aspects for empty array", () => {
    const missing = getMissingFeedbackAspects([]);
    expect(missing).toHaveLength(3);
  });

  it("returns 2 missing when MATERI is present", () => {
    const missing = getMissingFeedbackAspects([{ aspect: LearningAspect.MATERI }]);
    expect(missing).toHaveLength(2);
    expect(missing).toContain(LearningAspect.PENYAMPAIAN);
    expect(missing).toContain(LearningAspect.SOAL);
    expect(missing).not.toContain(LearningAspect.MATERI);
  });

  it("returns 1 missing when MATERI and PENYAMPAIAN are present", () => {
    const missing = getMissingFeedbackAspects([
      { aspect: LearningAspect.MATERI },
      { aspect: LearningAspect.PENYAMPAIAN },
    ]);
    expect(missing).toHaveLength(1);
    expect(missing).toContain(LearningAspect.SOAL);
  });

  it("returns empty array when all 3 aspects present", () => {
    const missing = getMissingFeedbackAspects([
      { aspect: LearningAspect.MATERI },
      { aspect: LearningAspect.PENYAMPAIAN },
      { aspect: LearningAspect.SOAL },
    ]);
    expect(missing).toHaveLength(0);
  });

  it("returns empty array when all 3 present even with duplicates", () => {
    const missing = getMissingFeedbackAspects([
      { aspect: LearningAspect.MATERI },
      { aspect: LearningAspect.MATERI },
      { aspect: LearningAspect.PENYAMPAIAN },
      { aspect: LearningAspect.SOAL },
      { aspect: LearningAspect.SOAL },
    ]);
    expect(missing).toHaveLength(0);
  });

  it("does not include duplicate missing aspects", () => {
    const missing = getMissingFeedbackAspects([{ aspect: LearningAspect.MATERI }]);
    const uniqueMissing = new Set(missing);
    expect(missing.length).toBe(uniqueMissing.size);
  });
});
