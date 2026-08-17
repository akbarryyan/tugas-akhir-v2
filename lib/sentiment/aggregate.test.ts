import { SentimentLabel } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { LIKERT_ITEMS } from "@/lib/feedback-likert";
import {
  buildLikertSummary,
  countByLabel,
  getPercentages,
  getTotal,
  groupCountsBy,
} from "@/lib/sentiment/aggregate";

const positif = { finalLabel: SentimentLabel.POSITIF };
const negatif = { finalLabel: SentimentLabel.NEGATIF };

describe("countByLabel", () => {
  it("returns zeroes for an empty list", () => {
    expect(countByLabel([])).toEqual({ negatif: 0, positif: 0 });
  });

  it("counts each label", () => {
    expect(countByLabel([positif, positif, negatif])).toEqual({ negatif: 1, positif: 2 });
  });
});

describe("getPercentages", () => {
  it("returns zeroes when there is no data, avoiding a division by zero", () => {
    expect(getPercentages({ negatif: 0, positif: 0 })).toEqual({ negatif: 0, positif: 0 });
  });

  it("splits a simple case exactly", () => {
    expect(getPercentages({ negatif: 1, positif: 3 })).toEqual({ negatif: 25, positif: 75 });
  });

  it("always sums to 100 even when rounding is awkward", () => {
    const percentages = getPercentages({ negatif: 2, positif: 1 });

    expect(percentages.positif + percentages.negatif).toBe(100);
    expect(percentages.positif).toBe(33);
    expect(percentages.negatif).toBe(67);
  });
});

describe("getTotal", () => {
  it("adds both counts", () => {
    expect(getTotal({ negatif: 4, positif: 6 })).toBe(10);
  });
});

describe("groupCountsBy", () => {
  const rows = [
    { ...positif, className: "XII IPA 1" },
    { ...negatif, className: "XII IPA 1" },
    { ...positif, className: "XII IPA 1" },
    { ...positif, className: "XII IPS 2" },
  ];

  it("groups and counts per key", () => {
    const grouped = groupCountsBy(rows, (row) => ({
      key: row.className,
      label: row.className,
    }));

    expect(grouped).toEqual([
      { counts: { negatif: 1, positif: 2 }, key: "XII IPA 1", label: "XII IPA 1" },
      { counts: { negatif: 0, positif: 1 }, key: "XII IPS 2", label: "XII IPS 2" },
    ]);
  });

  it("sorts by number of responses, descending", () => {
    const grouped = groupCountsBy(rows, (row) => ({
      key: row.className,
      label: row.className,
    }));

    expect(grouped.map((group) => group.key)).toEqual(["XII IPA 1", "XII IPS 2"]);
  });

  it("skips rows whose group cannot be resolved", () => {
    const grouped = groupCountsBy(
      [{ ...positif, teacherName: null }, { ...positif, teacherName: "Bu Sari" }],
      (row) => (row.teacherName ? { key: row.teacherName, label: row.teacherName } : null),
    );

    expect(grouped).toHaveLength(1);
    expect(grouped[0].key).toBe("Bu Sari");
  });

  it("honours the limit option", () => {
    const grouped = groupCountsBy(
      rows,
      (row) => ({ key: row.className, label: row.className }),
      { limit: 1 },
    );

    expect(grouped).toHaveLength(1);
  });
});

describe("buildLikertSummary", () => {
  it("reports every item even when nothing has been answered", () => {
    const summary = buildLikertSummary([]);

    expect(summary.items).toHaveLength(LIKERT_ITEMS.length);
    expect(summary.overallAverage).toBeNull();
    expect(summary.responseCount).toBe(0);
    expect(summary.items.every((item) => item.average === null)).toBe(true);
  });

  it("averages each item separately", () => {
    const summary = buildLikertSummary([
      { itemNumber: 1, score: 4 },
      { itemNumber: 1, score: 2 },
      { itemNumber: 2, score: 5 },
    ]);

    expect(summary.items[0].average).toBe(3);
    expect(summary.items[0].responseCount).toBe(2);
    expect(summary.items[1].average).toBe(5);
    expect(summary.items[2].average).toBeNull();
  });

  it("weights the overall average by raw scores, not by item", () => {
    // Butir 1 dijawab dua kali dengan nilai rendah, butir 2 sekali dengan nilai
    // tinggi. Rata-rata dari rata-rata per butir akan menghasilkan 3, sedangkan
    // rata-rata skor mentah yang benar adalah 7/3.
    const summary = buildLikertSummary([
      { itemNumber: 1, score: 1 },
      { itemNumber: 1, score: 1 },
      { itemNumber: 2, score: 5 },
    ]);

    expect(summary.overallAverage).toBeCloseTo(7 / 3, 10);
    expect(summary.responseCount).toBe(3);
  });
});
