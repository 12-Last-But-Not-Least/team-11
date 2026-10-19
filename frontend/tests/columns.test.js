import { labelOf, isKey, optionLabels } from "../src/columns.js";

// Shape of GET /columns (see USAGE.md): year first, then plottable columns.
const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
  { name: "iphone_units_sold_millions_norm", label: "iPhone sales (normalized)", source: "normalized_merged_set.csv" },
  { name: "deaths_norm", label: "Fall deaths (normalized)", source: "normalized_merged_set.csv" },
];

describe("isKey", () => {
  it("is true only for the join key column", () => {
    expect(isKey(cols[0])).toBe(true);
    expect(isKey(cols[1])).toBe(false);
  });
});

describe("labelOf", () => {
  it("returns the display label for a known column", () => {
    expect(labelOf(cols, "falls_norm")).toBe("Fall deaths (normalized)");
  });
  it("falls back to the raw name for an unknown column", () => {
    expect(labelOf(cols, "mystery")).toBe("mystery");
  });
});

describe("optionLabels", () => {
  it("keeps unique labels and appends the source to duplicated ones", () => {
    const labels = optionLabels(cols);
    expect(labels.get("iphone_norm")).toBe("iPhone sales (normalized) — iphone_normalized");
    expect(labels.get("year")).toBe("Year");
    expect(labels.get("falls_norm")).toBe("Fall deaths (normalized) — falls_normalized");
    expect(labels.get("deaths_norm")).toBe("Fall deaths (normalized) — normalized_merged_set");
  });
});
