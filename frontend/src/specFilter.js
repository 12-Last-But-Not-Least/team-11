/**
 * Remove the backend's in-canvas "Correlation stats" box (its rect, heading
 * and monospace lines, all drawn in the right margin) so the page can show
 * the statistics once, in its own table. The legend in the same margin is
 * kept (it is set in the sans face). Returns a new spec; `data` is shared.
 */
export function stripStatsPanel(spec) {
  const right = spec.data?.plot_area?.right ?? Infinity;
  const isStatsBox = (c) =>
    c.layer === "static" &&
    typeof c.x === "number" &&
    c.x >= right &&
    ((c.op === "rect" && c.fill === "#f9fafb") ||
      (c.op === "text" && (c.text === "Correlation stats" || /monospace/.test(c.font ?? ""))));
  return { ...spec, commands: spec.commands.filter((c) => !isStatsBox(c)) };
}
