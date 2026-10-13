import { statsToText, fileName } from "../src/exportText.js";

const stats = { n: 12, r: 0.9625562715881898, r_squared: 0.926514575973757, t: 11.228597794127518, df: 10, p_value: 5.443126328198838e-7, slope: 1.042544092290118, intercept: 0.052266580261948636 };
const labels = { x: "Fall deaths (normalized)", y: "iPhone sales (normalized)" };

test("statsToText lists every statistic with its label, one per line, under a title", () => {
  expect(statsToText(stats, labels)).toBe(
    [
      "iPhone sales (normalized) vs. Fall deaths (normalized)",
      "n = 12",
      "r = 0.9626",
      "r² = 0.9265",
      "t = 11.23",
      "df = 10",
      "p-value = 5.44e-7",
      "slope = 1.043",
      "intercept = 0.052",
    ].join("\n"),
  );
});

test("statsToText prints a dash for a null t", () => {
  expect(statsToText({ ...stats, t: null }, labels)).toContain("t = —");
});

test("fileName uses the chart kind, both column names and the extension", () => {
  expect(fileName("scatter", { x: "falls_norm", y: "iphone_norm" }, "svg")).toBe("scatter_falls_norm_vs_iphone_norm.svg");
  expect(fileName("line", { x: "year", y: "deaths_norm" }, "png")).toBe("line_year_vs_deaths_norm.png");
});
