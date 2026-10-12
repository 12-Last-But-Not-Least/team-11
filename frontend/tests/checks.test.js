import { runChecks } from "../src/checks.js";
import { SMALL_N } from "../src/describe.js";

const ctx = { keyLabel: "year", keyed: true, keyOnAxis: false, features: {} };

describe("runChecks", () => {
  it("flags a shared time trend when both columns are keyed by the join key", () => {
    const out = runChecks({ n: 100 }, ctx);
    expect(out).toEqual([
      expect.objectContaining({ id: "shared-trend", kind: "warn", title: "Both change over time" }),
    ]);
    expect(out[0].body).toMatch(/A shared trend can produce a strong r with no causal link/);
  });

  it("also flags it when the key itself is on an axis, even for unkeyed data", () => {
    expect(runChecks({ n: 100 }, { ...ctx, keyed: false, keyOnAxis: true }).map((c) => c.id)).toEqual(["shared-trend"]);
  });

  it("flags a small sample below the threshold", () => {
    expect(runChecks({ n: SMALL_N - 1 }, { ...ctx, keyed: false }).map((c) => c.id)).toEqual(["small-sample"]);
    expect(runChecks({ n: SMALL_N }, { ...ctx, keyed: false })).toEqual([]);
  });

  it("offers the detrend try-it only when the backend advertises the transform", () => {
    expect(runChecks({ n: 100 }, { ...ctx, keyed: false }).map((c) => c.id)).toEqual([]);
    const out = runChecks({ n: 100 }, { ...ctx, keyed: false, features: { transform: true } });
    expect(out).toEqual([expect.objectContaining({ id: "detrend", kind: "try", action: expect.any(String) })]);
  });

  it("orders warnings before the try-it card", () => {
    const ids = runChecks({ n: 12 }, { ...ctx, features: { transform: true } }).map((c) => c.id);
    expect(ids).toEqual(["shared-trend", "small-sample", "detrend"]);
  });
});
