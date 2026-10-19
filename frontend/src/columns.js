// Pure helpers over the GET /columns response: [{ name, label, source }].
// The backend marks its join key (year) with source "(join key)".

export const KEY_SOURCE = "(join key)";

export function isKey(col) {
  return col.source === KEY_SOURCE;
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
