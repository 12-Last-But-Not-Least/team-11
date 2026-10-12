import { GLOSSARY, STAT_ROWS, define } from "../src/glossary.js";

test("every stats-table row has a one-line definition", () => {
  for (const [, term] of STAT_ROWS) {
    expect(typeof GLOSSARY[term]).toBe("string");
    expect(GLOSSARY[term].length).toBeGreaterThan(20);
    expect(GLOSSARY[term].split("\n")).toHaveLength(1);
  }
});

test("STAT_ROWS maps every backend stats key in display order", () => {
  expect(STAT_ROWS.map(([key]) => key)).toEqual(["n", "r", "r_squared", "t", "df", "p_value", "slope", "intercept"]);
});

test("define returns the definition or null for an unknown term", () => {
  expect(define("p-value")).toBe(GLOSSARY["p-value"]);
  expect(define("nope")).toBeNull();
});
