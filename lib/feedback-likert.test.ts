import { describe, expect, it } from "vitest";

import {
  formatAverageScore,
  getAverageScore,
  getLikertFieldName,
  getLikertStatement,
  isRatingComplete,
  LIKERT_ITEM_COUNT,
  LIKERT_ITEMS,
  LIKERT_MAX_SCORE,
  LIKERT_MIN_SCORE,
  likertScaleLabelMap,
} from "@/lib/feedback-likert";

describe("LIKERT_ITEMS", () => {
  it("defines five statements", () => {
    expect(LIKERT_ITEMS).toHaveLength(5);
    expect(LIKERT_ITEM_COUNT).toBe(5);
  });

  it("numbers the items 1 to 5 without gaps", () => {
    expect(LIKERT_ITEMS.map((item) => item.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it("gives every scale point a label", () => {
    for (let score = LIKERT_MIN_SCORE; score <= LIKERT_MAX_SCORE; score += 1) {
      expect(likertScaleLabelMap[score]).toBeTruthy();
    }
  });
});

describe("getLikertFieldName", () => {
  it("builds the form field name used by the radio group", () => {
    expect(getLikertFieldName(3)).toBe("rating-3");
  });
});

describe("getLikertStatement", () => {
  it("returns the statement of a known item", () => {
    expect(getLikertStatement(1)).toBe(LIKERT_ITEMS[0].statement);
  });

  it("falls back to a generic label for an unknown item", () => {
    expect(getLikertStatement(99)).toBe("Butir 99");
  });
});

describe("getAverageScore", () => {
  it("returns null when there is nothing to average", () => {
    expect(getAverageScore([])).toBeNull();
    expect(getAverageScore(null)).toBeNull();
    expect(getAverageScore(undefined)).toBeNull();
  });

  it("averages the given scores", () => {
    expect(getAverageScore([{ score: 4 }, { score: 5 }, { score: 3 }])).toBe(4);
  });

  it("keeps fractional averages intact", () => {
    expect(getAverageScore([{ score: 4 }, { score: 5 }])).toBe(4.5);
  });
});

describe("formatAverageScore", () => {
  it("renders a dash when no average exists", () => {
    expect(formatAverageScore(null)).toBe("-");
  });

  it("renders two decimals", () => {
    expect(formatAverageScore(4.5)).toBe("4.50");
    expect(formatAverageScore(3.333333)).toBe("3.33");
  });
});

describe("isRatingComplete", () => {
  it("is false when some items are missing", () => {
    expect(isRatingComplete([{ itemNumber: 1 }, { itemNumber: 2 }])).toBe(false);
    expect(isRatingComplete([])).toBe(false);
    expect(isRatingComplete(null)).toBe(false);
  });

  it("is true when every item has an answer", () => {
    expect(
      isRatingComplete(LIKERT_ITEMS.map((item) => ({ itemNumber: item.number }))),
    ).toBe(true);
  });
});
