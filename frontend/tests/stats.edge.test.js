import {
  correlationStats,
  yearOverYearCorrelation,
  leaveOneOutCorrelation,
} from "../src/stats.js";

const x = [1, 2, 3, 4, 5, 6, 7, 8];
const y = [2, 1, 4, 3, 7, 5, 8, 9];

describe("correlationStats: input validation", () => {
  it("accepts the minimum of 3 pairs (df = 1)", () => {
    const s = correlationStats([1, 2, 3], [1, 3, 2]);
    expect(s.n).toBe(3);
    expect(s.df).toBe(1);
    expect(Number.isFinite(s.p_value)).toBe(true);
  });

  it.each([
    ["empty", [], [], /at least 3/i],
    ["two pairs", [1, 2], [1, 2], /at least 3/i],
    ["unequal lengths", [1, 2, 3], [1, 2], /same length/i],
    ["constant y", [1, 2, 3], [5, 5, 5], /constant/i],
    ["NaN", [1, 2, NaN], [1, 2, 3], /./],
    ["Infinity", [1, 2, 3], [1, Infinity, 3], /./],
    ["null", [1, null, 3], [1, 2, 3], /./],
    ["undefined", [1, undefined, 3], [1, 2, 3], /./],
    ["numeric string", ["1", 2, 3], [1, 2, 3], /./],
    ["non-array", { length: 3 }, [1, 2, 3], /one-dimensional/i],
    ["scalar", 5, [1, 2, 3], /one-dimensional/i],
  ])("throws for %s", (_n, a, b, msg) => {
    expect(() => correlationStats(a, b)).toThrow(msg);
  });

  it("treats typed arrays like plain arrays", () => {
    expect(correlationStats(Float64Array.from(x), Float64Array.from(y))).toEqual(correlationStats(x, y));
  });
});

describe("correlationStats: numerics", () => {
  it("is unchanged by a 1e12 offset", () => {
    const base = correlationStats(x, y);
    const shifted = correlationStats(x.map((v) => v + 1e12), y.map((v) => v + 1e12));
    expect(shifted.r).toBeCloseTo(base.r, 8);
  });

  it("handles tiny magnitudes and very different scales", () => {
    const base = correlationStats(x, y);
    const s = correlationStats(x.map((v) => v * 1e-150), y.map((v) => v * 1e9));
    expect(s.r).toBeCloseTo(base.r, 10);
    for (const k of ["r", "t", "p_value", "slope", "intercept"]) expect(Number.isNaN(s[k])).toBe(false);
  });

  it("gives p = 1 when r is exactly 0", () => {
    const s = correlationStats([1, 2, 3, 4, 5], [1, 2, 3, 2, 1]);
    expect(s.r).toBeCloseTo(0, 12);
    expect(s.p_value).toBeCloseTo(1, 9);
  });

  it("keeps r in [-1, 1], symmetric in x and y, and invariant to rescaling x", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) {
      const a = Array.from({ length: 10 }, rnd);
      const b = Array.from({ length: 10 }, rnd);
      const r = correlationStats(a, b).r;
      expect(r).toBeGreaterThanOrEqual(-1);
      expect(r).toBeLessThanOrEqual(1);
      expect(correlationStats(b, a).r).toBeCloseTo(r, 12);
      expect(correlationStats(a.map((v) => 3 * v + 10), b).r).toBeCloseTo(r, 10);
    }
  });
});

describe("yearOverYearCorrelation: input validation", () => {
  const years = [2000, 2001, 2002, 2003, 2004, 2005];
  const a = [1, 3, 2, 5, 4, 7];
  const b = [2, 2.5, 3, 6, 5, 9];

  it("gives the same answer for unsorted years", () => {
    const order = [3, 0, 5, 1, 4, 2];
    const pick = (arr) => order.map((i) => arr[i]);
    expect(yearOverYearCorrelation(pick(years), pick(a), pick(b))).toEqual(yearOverYearCorrelation(years, a, b));
  });

  it.each([
    ["duplicate years", [2000, 2000, 2001, 2002, 2003, 2004], a, b],
    ["fractional years", [2000, 2001.5, 2002, 2003, 2004, 2005], a, b],
    ["non-finite values", years, [1, NaN, 2, 3, 4, 5], b],
    ["length mismatch", years, a.slice(1), b],
  ])("throws for %s", (_n, yrs, p, q) => {
    expect(() => yearOverYearCorrelation(yrs, p, q)).toThrow();
  });
});

describe("leaveOneOutCorrelation", () => {
  it("reports undefined_correlation when every omission leaves a constant series", () => {
    // Four points; each omission leaves x constant only if x has one distinct pair repeated.
    const r = leaveOneOutCorrelation([1, 1, 1, 1], [1, 2, 3, 4]);
    expect(r.reason).toBe("undefined_correlation");
    expect(r.r_min).toBeNull();
    expect(r.valid_count).toBe(0);
    expect(r.undefined_count).toBe(4);
  });

  it("counts an omission that leaves a constant series as undefined", () => {
    const r = leaveOneOutCorrelation([1, 2, 2, 2], [1, 2, 3, 4]);
    expect(r.undefined_count).toBe(1);
    expect(r.valid_count).toBe(3);
  });

  it("shows a wide range spanning zero when one outlier drives the correlation", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 100];
    const b = [3, 1, 2, 3, 1, 2, 3, 100];
    const full = correlationStats(a, b).r;
    const r = leaveOneOutCorrelation(a, b);
    expect(full).toBeGreaterThan(0.9);
    expect(r.r_min).toBeLessThan(0.5);
    expect(r.r_max - r.r_min).toBeGreaterThan(0.5);
  });
});
