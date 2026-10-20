/**
 * Mirror of tests/test_parity_stats.py on the JS side: same shared cases,
 * same edge categories (perfect corr, large magnitudes, missing years, etc.).
 * Cross-language numeric agreement is enforced in the pytest suite via
 * scripts/parity_js.mjs; this file keeps the browser package honest on its own.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  correlationStats,
  yearOverYearCorrelation,
  leaveOneOutCorrelation,
} from "../src/stats.js";
import { buildScatter } from "../src/render.js";

const cases = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../testdata/parity/stats_cases.json"),
    "utf8",
  ),
);

describe("parity cases: correlation", () => {
  for (const c of cases.correlation) {
    it(c.id, () => {
      if (c.error) {
        expect(() => correlationStats(c.x, c.y)).toThrow(/constant/i);
        return;
      }
      const result = correlationStats(c.x, c.y);
      expect(result.n).toBe(c.x.length);
      expect(Number.isFinite(result.r)).toBe(true);
      expect(result.r).toBeGreaterThanOrEqual(-1);
      expect(result.r).toBeLessThanOrEqual(1);
      if (c.id.startsWith("perfect_")) {
        expect(Math.abs(result.r)).toBeCloseTo(1, 12);
        expect(result.t).toBeNull();
        expect(result.p_value).toBe(0);
      }
      if (c.id === "large_magnitudes") {
        expect(Number.isFinite(result.slope)).toBe(true);
        expect(Number.isFinite(result.intercept)).toBe(true);
      }
    });
  }
});

describe("parity cases: year-over-year", () => {
  for (const c of cases.year_over_year) {
    it(c.id, () => {
      const result = yearOverYearCorrelation(c.years, c.x, c.y);
      expect(result).toHaveProperty("n");
      expect(result).toHaveProperty("reason");
      if (c.id === "perfect_consecutive" || c.id === "skips_missing_years") {
        expect(result.r).toBeCloseTo(1, 10);
        expect(result.reason).toBeNull();
      }
      if (c.id === "constant_changes") {
        expect(result.r).toBeNull();
        expect(result.reason).toBe("constant_changes");
      }
      if (c.id === "insufficient_changes") {
        expect(result.r).toBeNull();
        expect(result.reason).toBe("insufficient_changes");
      }
    });
  }
});

describe("parity cases: leave-one-out", () => {
  for (const c of cases.leave_one_out) {
    it(c.id, () => {
      const result = leaveOneOutCorrelation(c.x, c.y);
      if (c.id === "insufficient_data") {
        expect(result.r_min).toBeNull();
        expect(result.reason).toBe("insufficient_data");
      } else {
        expect(result.r_min).toBeLessThanOrEqual(result.r_max);
        expect(result.valid_count).toBeGreaterThan(0);
      }
    });
  }
});

describe("parity cases: render padding", () => {
  for (const c of cases.render) {
    it(c.id, () => {
      const stats = correlationStats(c.x, c.y);
      const spec = buildScatter(c.x, c.y, stats, { width: c.width, height: c.height });
      expect(spec.data.x_axis.min).toBeLessThan(Math.min(...c.x));
      expect(spec.data.x_axis.max).toBeGreaterThan(Math.max(...c.x));
      expect(spec.data.fit.x_min).toBe(spec.data.x_axis.min);
      expect(spec.data.fit.x_max).toBe(spec.data.x_axis.max);
    });
  }
});
