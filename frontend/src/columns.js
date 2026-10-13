// Pure helpers over the GET /columns response: [{ name, label, source }].
// The backend marks its join key (year) with source "(join key)".

export const KEY_SOURCE = "(join key)";

export function isKey(col) {
  return col.source === KEY_SOURCE;
}

/** Plottable columns grouped by source file, in first-seen order. */
export function groupBySource(cols) {
  const groups = [];
  for (const col of cols) {
    if (isKey(col)) continue;
    let g = groups.find((x) => x.source === col.source);
    if (!g) {
      g = { source: col.source, columns: [] };
      groups.push(g);
    }
    g.columns.push(col);
  }
  return groups;
}

/**
 * The opening chart's axes. First plottable column on x; on y, the first
 * column from a different file (so the default compares two datasets),
 * else the next column. A lone column is plotted against the join key.
 * Nothing in here knows a dataset by name.
 */
export function defaultPair(cols) {
  const key = cols.find(isKey);
  const plottable = cols.filter((c) => !isKey(c));
  if (plottable.length === 0) return null;
  const [first, ...rest] = plottable;
  if (rest.length === 0) return key ? { x: key.name, y: first.name } : null;
  const other = rest.find((c) => c.source !== first.source) ?? rest[0];
  return { x: first.name, y: other.name };
}

export function labelOf(cols, name) {
  return cols.find((c) => c.name === name)?.label ?? name;
}

/**
 * Option text per column. Unique labels stand alone; a label shared by
 * several files gets the file stem appended (the full file name is already
 * on the picker's meta line).
 */
export function optionLabels(cols) {
  const counts = new Map();
  for (const c of cols) counts.set(c.label, (counts.get(c.label) ?? 0) + 1);
  const stem = (source) => source.replace(/\.[^.]+$/, "");
  return new Map(cols.map((c) => [c.name, counts.get(c.label) > 1 ? `${c.label} — ${stem(c.source)}` : c.label]));
}
