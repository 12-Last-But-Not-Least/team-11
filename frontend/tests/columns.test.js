import { groupBySource, defaultPair, labelOf, isKey, optionLabels } from "../src/columns.js";

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

describe("groupBySource", () => {
  it("groups plottable columns by source file in first-seen order, without the join key", () => {
    expect(groupBySource(cols)).toEqual([
      { source: "falls_normalized.csv", columns: [cols[1]] },
      { source: "iphone_normalized.csv", columns: [cols[2]] },
      { source: "normalized_merged_set.csv", columns: [cols[3], cols[4]] },
    ]);
  });
  it("returns an empty list when only the join key exists", () => {
    expect(groupBySource([cols[0]])).toEqual([]);
  });
});

describe("defaultPair", () => {
  it("pairs the first column with the first column from a different source", () => {
    expect(defaultPair(cols)).toEqual({ x: "falls_norm", y: "iphone_norm" });
  });
  it("falls back to the next column when every column shares one source", () => {
    const oneFile = [cols[0], cols[3], cols[4]];
    expect(defaultPair(oneFile)).toEqual({ x: "iphone_units_sold_millions_norm", y: "deaths_norm" });
  });
  it("plots a lone column against the join key", () => {
    expect(defaultPair([cols[0], cols[1]])).toEqual({ x: "year", y: "falls_norm" });
  });
  it("returns null when nothing is plottable", () => {
    expect(defaultPair([cols[0]])).toBeNull();
    expect(defaultPair([])).toBeNull();
  });
  it("returns null for a lone column when there is no join key to plot it against", () => {
    expect(defaultPair([cols[1]])).toBeNull();
  });
  it("never picks the join key as x when a second column exists", () => {
    const pair = defaultPair(cols);
    expect(pair.x).not.toBe("year");
    expect(pair.y).not.toBe("year");
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
    expect(labels.get("iphone_norm")).toBe("iPhone sales (normalized) — iphone_normalized.csv");
    expect(labels.get("year")).toBe("Year");
    expect(labels.get("falls_norm")).toBe("Fall deaths (normalized) — falls_normalized.csv");
    expect(labels.get("deaths_norm")).toBe("Fall deaths (normalized) — normalized_merged_set.csv");
  });
});
