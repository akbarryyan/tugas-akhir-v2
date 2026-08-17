import { LabelSource } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  formatConfidencePercent,
  needsManualReview,
  REVIEW_CONFIDENCE_THRESHOLD,
} from "@/lib/sentiment/confidence";

describe("REVIEW_CONFIDENCE_THRESHOLD", () => {
  it("sits above the 0.5 floor of a two-class posterior", () => {
    // Dengan dua kelas, keyakinan tidak pernah di bawah 0,5, sehingga ambang
    // di bawah itu tidak akan pernah menandai apa pun.
    expect(REVIEW_CONFIDENCE_THRESHOLD).toBeGreaterThan(0.5);
    expect(REVIEW_CONFIDENCE_THRESHOLD).toBeLessThan(1);
  });
});

describe("needsManualReview", () => {
  it("flags a low-confidence automatic label", () => {
    expect(
      needsManualReview({ autoConfidence: 0.5378, labelSource: LabelSource.AUTO }),
    ).toBe(true);
  });

  it("leaves a confident automatic label alone", () => {
    expect(
      needsManualReview({ autoConfidence: 0.88, labelSource: LabelSource.AUTO }),
    ).toBe(false);
  });

  it("treats the threshold itself as confident enough", () => {
    expect(
      needsManualReview({
        autoConfidence: REVIEW_CONFIDENCE_THRESHOLD,
        labelSource: LabelSource.AUTO,
      }),
    ).toBe(false);
  });

  it("never flags a label a teacher already corrected", () => {
    expect(
      needsManualReview({ autoConfidence: 0.51, labelSource: LabelSource.MANUAL }),
    ).toBe(false);
  });

  it("flags an unknown confidence, since a missing number is not confidence", () => {
    expect(
      needsManualReview({ autoConfidence: null, labelSource: LabelSource.AUTO }),
    ).toBe(true);
  });

  it("returns false when there is no analysis at all", () => {
    expect(needsManualReview(null)).toBe(false);
    expect(needsManualReview(undefined)).toBe(false);
  });
});

describe("formatConfidencePercent", () => {
  it("renders one decimal", () => {
    expect(formatConfidencePercent(0.5378)).toBe("53.8%");
    expect(formatConfidencePercent(0.88)).toBe("88.0%");
  });

  it("renders a dash when unknown", () => {
    expect(formatConfidencePercent(null)).toBe("-");
  });
});
