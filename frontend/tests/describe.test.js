import { describeStats, band, formatP, STRONG, MODERATE, P_VERY, P_LIKELY, SMALL_N } from "../src/describe.js";

const labels = { x: "iPhone sales (normalized)", y: "Fall deaths (normalized)" };
const stats = (o = {}) => ({ n: 12, r: 0.98, r_squared: 0.9604, t: 15.1, df: 10, p_value: 3e-8, slope: 0.89, intercept: -0.01, ...o });

describe("thresholds are the documented constants", () => {
  it("matches SPEC", () => {
    expect([STRONG, MODERATE, P_VERY, P_LIKELY, SMALL_N]).toEqual([0.7, 0.4, 0.001, 0.05, 30]);
  });
});

describe("band(r)", () => {
  it.each([
    [0.7, "strong"], [0.699, "moderate"], [0.4, "moderate"], [0.399, "weak"], [0, "weak"],
    [-0.7, "strong"], [-0.5, "moderate"], [1, "strong"], [-1, "strong"],
  ])("r = %s → %s", (r, expected) => {
    expect(band(r)).toBe(expected);
  });
});

describe("formatP", () => {
  it("prints very small p as a bound and others to 3 decimals", () => {
    expect(formatP(3e-8)).toBe("< 0.001");
    expect(formatP(0.001)).toBe("0.001");
    expect(formatP(0.0123)).toBe("0.012");
    expect(formatP(0.31)).toBe("0.310");
  });
});

describe("describeStats: headline", () => {
  it("strong positive", () => {
    expect(describeStats(stats(), labels).headline).toBe("Strongly related — but that does not mean one causes the other.");
  });
  it("strong negative says the directions are opposite", () => {
    const d = describeStats(stats({ r: -0.9 }), labels);
    expect(d.direction).toBe("negative");
    expect(d.headline).toMatch(/^Strongly related, in opposite directions — but that does not mean one causes the other\.$/);
  });
  it("moderate", () => {
    expect(describeStats(stats({ r: 0.5 }), labels).headline).toBe("Moderately related — worth a closer look before claiming anything.");
  });
  it("weak", () => {
    expect(describeStats(stats({ r: 0.1 }), labels).headline).toBe("Little or no straight-line relationship here.");
  });
});

describe("describeStats: sentences", () => {
  it("explains r² with both labels and the percentage", () => {
    const [s] = describeStats(stats(), labels).sentences;
    expect(s.text).toBe("96% of the variation in Fall deaths (normalized) moves together with iPhone sales (normalized) (r² = 0.96).");
    expect(s.terms).toEqual([{ term: "r²", start: s.text.indexOf("r²"), end: s.text.indexOf("r²") + 2 }]);
  });
  it.each([
    [3e-8, "A pattern like this would almost never appear by chance if the two were unrelated (p-value < 0.001)."],
    [0.001, "A pattern like this would be unlikely by chance if the two were unrelated (p-value = 0.001)."],
    [0.049, "A pattern like this would be unlikely by chance if the two were unrelated (p-value = 0.049)."],
    [0.05, "A pattern like this could easily appear by chance (p-value = 0.050)."],
  ])("p = %s", (p, text) => {
    const s = describeStats(stats({ p_value: p }), labels).sentences[1];
    expect(s.text).toBe(text);
    expect(s.terms.map((t) => t.term)).toEqual(["p-value"]);
  });
  it("warns about a small sample below the threshold", () => {
    expect(describeStats(stats({ n: 29 }), labels).sentences[2].text).toBe("Only 29 data points (n = 29). Small samples make strong-looking patterns easy to find.");
    expect(describeStats(stats({ n: 30 }), labels).sentences[2].text).toBe("30 data points (n = 30).");
  });
  it("marks each term at the position where it appears in the text", () => {
    for (const s of describeStats(stats(), labels).sentences) {
      for (const t of s.terms) expect(s.text.slice(t.start, t.end)).toBe(t.term);
    }
  });
  it("anchors each term on its parenthesised form, not on the first matching letter", () => {
    // "Only 12 data points (n = 12)…" contains an 'n' in "Only" before the real term
    const n = describeStats(stats({ n: 12 }), labels).sentences[2];
    expect(n.text[n.terms[0].start - 1]).toBe("(");
    expect(n.text.slice(n.terms[0].start, n.terms[0].end + 3)).toBe("n = ");
    const p = describeStats(stats({ p_value: 0.3 }), labels).sentences[1];
    expect(p.text[p.terms[0].start - 1]).toBe("(");
  });
  it("tolerates a perfect correlation (t is null, p is 0)", () => {
    expect(() => describeStats(stats({ r: 1, r_squared: 1, t: null, p_value: 0 }), labels)).not.toThrow();
  });
  it("exposes the band, the r label and the scale position", () => {
    const d = describeStats(stats({ r: -0.98 }), labels);
    expect(d.band).toBe("strong");
    expect(d.rLabel).toBe("r = -0.98");
    expect(d.position).toBeCloseTo(0.98);
  });
});

describe("describeStats: year-over-year trend card", () => {
  it("keeps core sentences free of YoY prose and exposes a trend block", () => {
    const result = describeStats(stats({
      year_over_year: {
        n: 11,
        r: 0.178,
        p_value: 0.600,
        reason: null,
      },
    }), labels);

    expect(result.sentences).toHaveLength(3);
    expect(result.trend.levels.rLabel).toBe("r = 0.98");
    expect(result.trend.yoy.rLabel).toBe("r = 0.18");
    expect(result.trend.takeaway).toBe("The shared time trend may be doing most of the work.");
    expect(result.trend.summary.text).toContain("year-over-year");
    expect(result.trend.summary.text).toContain("(r = 0.178, 11 paired changes)");
    expect(result.trend.summary.text).toContain("There is insufficient evidence of correlation (p-value = 0.600)");
    expect(result.trend.summary.terms.map((t) => t.term)).toEqual(["year-over-year", "r", "p-value"]);
  });

  it.each([
    [0.049, "There is evidence of correlation"],
    [0.050, "There is insufficient evidence of correlation"],
  ])("interprets annual-change p = %s", (p, expected) => {
    const result = describeStats(stats({
      year_over_year: {
        n: 11,
        r: 0.6,
        p_value: p,
        reason: null,
      },
    }), labels);

    expect(result.trend.summary.text).toContain(`${expected} (p-value`);
  });

  it.each([
    [
      "insufficient_changes",
      2,
      "Only 2 paired annual changes are available; at least 3 are needed to calculate correlation.",
    ],
    [
      "constant_changes",
      11,
      "Annual-change correlation cannot be calculated because one series changes by the same amount each year.",
    ],
  ])("explains unavailable results: %s", (reason, n, expected) => {
    const result = describeStats(stats({
      year_over_year: {
        n,
        r: null,
        p_value: null,
        reason,
      },
    }), labels);

    expect(result.trend.yoy).toBeNull();
    expect(result.trend.summary.text).toBe(expected);
  });
});

describe("describeStats: leave-one-out card", () => {
  it("exposes the correlation range with a glossary term", () => {
    const result = describeStats(stats({
      leave_one_out: {
        r_min: 0.95536,
        r_max: 0.97360,
        valid_count: 12,
        undefined_count: 0,
        reason: null,
      },
    }), labels);

    expect(result.leaveOneOut.rMin).toBeCloseTo(0.95536);
    expect(result.leaveOneOut.rMax).toBeCloseTo(0.97360);
    expect(result.leaveOneOut.summary.text).toBe(
      "Leaving out one data point at a time (leave-one-out) gives correlations " +
      "between 0.955 and 0.974. " +
      "This shows how much individual points affect the result, " +
      "not a confidence interval."
    );
    expect(result.leaveOneOut.summary.terms.map((t) => t.term)).toEqual(["leave-one-out"]);
  });

  it("reports cases with undefined correlation", () => {
    const result = describeStats(stats({
      leave_one_out: {
        r_min: 0.756,
        r_max: 0.945,
        valid_count: 3,
        undefined_count: 1,
        reason: null,
      },
    }), labels);

    expect(result.leaveOneOut.summary.text).toContain(
      "Correlation could not be calculated in 1 of the 4 cases."
    );
  });

  it.each([
    [
      "insufficient_data",
      "At least 4 data points are needed to check how leaving out individual points affects correlation.",
    ],
    [
      "undefined_correlation",
      "Correlation cannot be calculated after leaving out any single data point.",
    ],
  ])("explains unavailable results: %s", (reason, expected) => {
    const result = describeStats(stats({
      leave_one_out: {
        r_min: null,
        r_max: null,
        valid_count: 0,
        undefined_count: 0,
        reason,
      },
    }), labels);

    expect(result.leaveOneOut.summary.text).toBe(expected);
  });
});