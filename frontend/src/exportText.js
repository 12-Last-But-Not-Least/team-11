import { STAT_ROWS } from "./glossary.js";
import { formatStat } from "./format.js";

/** Plain-text block for the clipboard: title line, then one "term = value" per stat. */
export function statsToText(stats, labels, datasetName) {
  const lines = [...(datasetName ? [`Dataset: ${datasetName}`] : []), `${labels.y} vs. ${labels.x}`];
  for (const [key, term] of STAT_ROWS) lines.push(`${term} = ${formatStat(key, stats[key])}`);
  return lines.join("\n");
}

/** e.g. scatter_falls_norm_vs_iphone_norm.svg — column names, not labels. */
export function fileName(kind, names, ext) {
  return `${kind}_${names.datasetId ? `${names.datasetId}_` : ""}${names.x}_vs_${names.y}.${ext}`;
}
