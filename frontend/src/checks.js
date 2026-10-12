import { SMALL_N } from "./describe.js";

/**
 * Step 4 rules. Returns cards in display order: warnings first, then the
 * optional "try it". Pure: stats + context in, cards out.
 *
 * ctx: { keyLabel, keyed (both columns share the join key), keyOnAxis,
 *        features: { transform } }
 */
export function runChecks(stats, ctx) {
  const cards = [];
  const key = ctx.keyLabel ?? "the key";
  if (ctx.keyed || ctx.keyOnAxis) {
    cards.push({
      id: "shared-trend",
      kind: "warn",
      title: "Both change over time",
      body: `${capitalize(key)} is driving both columns. A shared trend can produce a strong r with no causal link at all.`,
    });
  }
  if (stats.n < SMALL_N) {
    cards.push({
      id: "small-sample",
      kind: "warn",
      title: "Small sample",
      body: `${stats.n} points is not many. Treat the strength here with caution and look for more ${key}s or more cases.`,
    });
  }
  if (ctx.features?.transform) {
    cards.push({
      id: "detrend",
      kind: "try",
      title: "Try removing the trend",
      body: `Compare ${key}-over-${key} changes instead of levels. If r drops sharply, the time trend was doing the work.`,
      action: `Compare ${key}-over-${key} changes`,
    });
  }
  return cards;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
