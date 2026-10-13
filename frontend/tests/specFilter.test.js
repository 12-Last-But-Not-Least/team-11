import { stripStatsPanel } from "../src/specFilter.js";
import { spec } from "./fakeChart.js";

function panelSpec() {
  const s = spec();
  const right = s.data.plot_area.right; // 590
  s.commands = [
    { op: "rect", x: 0, y: 0, w: 800, h: 500, fill: "#ffffff", layer: "static" },
    { op: "text", x: 400, y: 20, text: "Title", font: "bold 14px sans-serif", fill: "#111827", align: "center", layer: "static" },
    { op: "rect", x: right + 20, y: 41, w: 14, h: 4, fill: "#2563eb", layer: "static" },            // legend swatch
    { op: "text", x: right + 42, y: 47, text: "data", font: "12px sans-serif", fill: "#111827", align: "left", layer: "static" },
    { op: "rect", x: right + 12, y: 72, w: 182, h: 136, fill: "#f9fafb", stroke: "#9ca3af", width: 1, layer: "static" }, // stats box
    { op: "text", x: right + 20, y: 90, text: "Correlation stats", font: "bold 12px sans-serif", fill: "#111827", align: "left", layer: "static" },
    { op: "text", x: right + 20, y: 110, text: "n         = 12", font: "12px monospace", fill: "#111827", align: "left", layer: "static" },
    { op: "text", x: right + 20, y: 128, text: "r         = 0.9626", font: "12px monospace", fill: "#111827", align: "left", layer: "static" },
    { op: "circle", x: 100, y: 100, r: 4.5, fill: "#2563eb", layer: "plot" },
    { op: "text", x: 60, y: 460, text: "0.0", font: "11px monospace", fill: "#6b7280", align: "center", layer: "plot" }, // tick label, left of panel
  ];
  return s;
}

test("removes the in-canvas stats box (its rect, heading and mono lines) and keeps everything else", () => {
  const out = stripStatsPanel(panelSpec());
  const texts = out.commands.filter((c) => c.op === "text").map((c) => c.text);
  expect(texts).toEqual(["Title", "data", "0.0"]);
  expect(out.commands.filter((c) => c.op === "rect")).toHaveLength(2); // background + legend swatch
  expect(out.commands.some((c) => c.op === "circle")).toBe(true);
});

test("returns a new spec and leaves the input untouched", () => {
  const input = panelSpec();
  const before = input.commands.length;
  const out = stripStatsPanel(input);
  expect(input.commands).toHaveLength(before);
  expect(out).not.toBe(input);
  expect(out.data).toBe(input.data);
});
