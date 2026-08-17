import { LearningAspect } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  feedbackAspectLabelMap,
  isFeedbackComplete,
  isLegacyAspect,
  LEGACY_FEEDBACK_ASPECTS,
} from "@/lib/student-feedback";

describe("LEGACY_FEEDBACK_ASPECTS", () => {
  it("keeps the three aspects used by the old feedback format", () => {
    expect(LEGACY_FEEDBACK_ASPECTS).toHaveLength(3);
    expect(LEGACY_FEEDBACK_ASPECTS).toContain(LearningAspect.MATERI);
    expect(LEGACY_FEEDBACK_ASPECTS).toContain(LearningAspect.PENYAMPAIAN);
    expect(LEGACY_FEEDBACK_ASPECTS).toContain(LearningAspect.SOAL);
  });

  it("does not contain UMUM", () => {
    expect(LEGACY_FEEDBACK_ASPECTS).not.toContain(LearningAspect.UMUM);
  });
});

describe("feedbackAspectLabelMap", () => {
  it("has a label for every aspect including UMUM", () => {
    for (const aspect of Object.values(LearningAspect)) {
      expect(feedbackAspectLabelMap[aspect]).toBeTruthy();
    }
  });
});

describe("isLegacyAspect", () => {
  it("marks the three old aspects as legacy", () => {
    expect(isLegacyAspect(LearningAspect.MATERI)).toBe(true);
    expect(isLegacyAspect(LearningAspect.PENYAMPAIAN)).toBe(true);
    expect(isLegacyAspect(LearningAspect.SOAL)).toBe(true);
  });

  it("does not mark UMUM as legacy", () => {
    expect(isLegacyAspect(LearningAspect.UMUM)).toBe(false);
  });
});

describe("isFeedbackComplete", () => {
  it("returns false for null", () => {
    expect(isFeedbackComplete(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isFeedbackComplete(undefined)).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isFeedbackComplete([])).toBe(false);
  });

  it("returns true once a session has one feedback in the new format", () => {
    expect(isFeedbackComplete([{ aspect: LearningAspect.UMUM }])).toBe(true);
  });

  it("returns true for sessions that still hold the old three-aspect feedback", () => {
    expect(
      isFeedbackComplete([
        { aspect: LearningAspect.MATERI },
        { aspect: LearningAspect.PENYAMPAIAN },
        { aspect: LearningAspect.SOAL },
      ]),
    ).toBe(true);
  });

  it("returns true for a partially filled legacy session so it is not asked again", () => {
    expect(isFeedbackComplete([{ aspect: LearningAspect.MATERI }])).toBe(true);
  });
});
