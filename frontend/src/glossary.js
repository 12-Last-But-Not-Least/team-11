// One-line definitions in course vocabulary. Keys are the display terms.

export const GLOSSARY = {
  r: "The correlation coefficient: how closely the points follow one straight line, from −1 to 1. Near 0 means no straight-line pattern.",
  "r²": "r squared: the share of the variation in one column that moves together with the other, from 0 (none) to 1 (all).",
  "p-value": "The chance of seeing a pattern at least this strong if the two were actually unrelated. Below 0.05 is usually called \"unlikely to be chance\".",
  n: "The number of data points used: the rows where both columns have a value.",
  t: "The test statistic for r: how many standard errors r sits away from zero. Larger means less likely to be chance.",
  df: "Degrees of freedom for the test: n − 2, the number of points free to vary once the line is fitted.",
  slope: "How much y changes for each one-unit change in x along the fitted line.",
  intercept: "The fitted line's value of y when x is 0.",
  "year-over-year": "Replace each value with how much it changed from the previous year, then correlate those changes. If r shrinks a lot, a shared time trend may have been inflating the original correlation.",
  "leave-one-out": "Recompute r after dropping each point in turn. The range of those r values shows how sensitive the result is to individual years.",
};

/** [backend stats key, display term] in table order. */
export const STAT_ROWS = [
  ["n", "n"],
  ["r", "r"],
  ["r_squared", "r²"],
  ["t", "t"],
  ["df", "df"],
  ["p_value", "p-value"],
  ["slope", "slope"],
  ["intercept", "intercept"],
];

export function define(term) {
  return Object.prototype.hasOwnProperty.call(GLOSSARY, term) ? GLOSSARY[term] : null;
}
