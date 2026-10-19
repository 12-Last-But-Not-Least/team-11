/**
 * n and the key (year) range of a landed scatter spec, read from the hover
 * labels the backend builds ("<key>\n<x label>: …\n<y label>: …").
 */
export function keyRange(spec) {
  const points = spec?.data?.series?.[0]?.points;
  if (!points?.length) return null;
  const keys = points.map((p) => Number.parseFloat(String(p.label).split("\n")[0])).filter(Number.isFinite);
  if (!keys.length) return null;
  return keys.reduce((range, key) => ({
    n: range.n, min: Math.min(range.min, key), max: Math.max(range.max, key),
  }), { n: spec.stats.n, min: Infinity, max: -Infinity });
}
