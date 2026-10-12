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
