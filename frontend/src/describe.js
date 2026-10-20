// Fixed-rule interpretation of the backend's stats. Every threshold is a
// constant below; there is no other logic. See SPEC.md "Description rules".

export const STRONG = 0.7;
export const MODERATE = 0.4;
export const P_VERY = 0.001;
export const P_LIKELY = 0.05;
export const SMALL_N = 30;

export function band(r) {
  const a = Math.abs(r);
  if (a >= STRONG) return "strong";
  if (a >= MODERATE) return "moderate";
  return "weak";
}

export function formatP(p) {
  return p < P_VERY ? "< 0.001" : p.toFixed(3);
}

const HEADLINES = {
  strong: {
    positive: "Strongly related — but that does not mean one causes the other.",
    negative: "Strongly related, in opposite directions — but that does not mean one causes the other.",
  },
  moderate: {
    positive: "Moderately related — worth a closer look before claiming anything.",
    negative: "Moderately related, in opposite directions — worth a closer look before claiming anything.",
  },
  weak: {
    positive: "Little or no straight-line relationship here.",
    negative: "Little or no straight-line relationship here.",
  },
};

/**
 * Sentence with the positions of the glossary terms it contains. Terms are
 * anchored on their parenthesised form "(term …" so a letter that happens
 * to appear earlier in the prose (the n in "Only") is never underlined.
 */
function sentence(text, terms) {
  return {
    text,
    terms: terms.map((term) => {
      const anchored = text.indexOf(`(${term}`);
      const start = anchored >= 0 ? anchored + 1 : text.indexOf(term);
      return { term, start, end: start + term.length };
    }),
  };
}

function scaleOf(r) {
  return {
    r,
    position: Math.abs(r),
    band: band(r),
    rLabel: `r = ${r.toFixed(2)}`,
  };
}

function yoyEvidence(yoy) {
  if (yoy.p_value === null) return { text: "A p-value is unavailable.", terms: [] };
  const pText = yoy.p_value < P_VERY ? "< 0.001" : `= ${formatP(yoy.p_value)}`;
  if (yoy.p_value < P_LIKELY) {
    return {
      text: `There is evidence of correlation (p-value ${pText}).`,
      terms: ["p-value"],
    };
  }
  return {
    text: `There is insufficient evidence of correlation (p-value ${pText}).`,
    terms: ["p-value"],
  };
}

function trendTakeaway(levelsBand, yoyBand) {
  if (levelsBand !== "weak" && yoyBand === "weak") {
    return "The shared time trend may be doing most of the work.";
  }
  if (levelsBand === yoyBand) {
    return "The relationship still shows up after removing the shared climb.";
  }
  return "Annual changes tell a different story than the levels alone.";
}

/** Structured "Does the trend explain it?" block, or null if no YoY payload. */
export function describeTrend(stats) {
  const yoy = stats.year_over_year;
  if (!yoy) return null;

  const levels = scaleOf(stats.r);

  if (yoy.r === null) {
    const text = yoy.reason === "insufficient_changes"
      ? `Only ${yoy.n} paired annual changes are available; at least 3 are needed to calculate correlation.`
      : "Annual-change correlation cannot be calculated because one series changes by the same amount each year.";
    return {
      levels,
      yoy: null,
      takeaway: null,
      summary: sentence(text, []),
    };
  }

  const yoyScale = scaleOf(yoy.r);
  const strength = yoyScale.band;
  const relationship = strength === "weak"
    ? "a weak linear relationship"
    : `a ${strength} ${yoy.r < 0 ? "negative" : "positive"} linear relationship`;
  const evidence = yoyEvidence(yoy);
  const summaryText =
    `After year-over-year changes (year-over-year), yearly increases and decreases show ${relationship} ` +
    `(r = ${yoy.r.toFixed(3)}, ${yoy.n} paired changes). ${evidence.text} ` +
    "Annual changes may not be independent, so interpret this cautiously.";

  return {
    levels,
    yoy: { ...yoyScale, n: yoy.n, p_value: yoy.p_value },
    takeaway: trendTakeaway(levels.band, yoyScale.band),
    summary: sentence(summaryText, ["year-over-year", "r", ...evidence.terms]),
  };
}

/** Structured leave-one-out block, or null if no payload. */
export function describeLeaveOneOut(stats) {
  const result = stats.leave_one_out;
  if (!result) return null;

  if (result.r_min === null || result.r_max === null) {
    const text = result.reason === "insufficient_data"
      ? "At least 4 data points are needed to check how leaving out individual points affects correlation."
      : "Correlation cannot be calculated after leaving out any single data point.";
    return {
      r: stats.r,
      rMin: null,
      rMax: null,
      summary: sentence(text, []),
    };
  }

  const total = result.valid_count + result.undefined_count;
  const skipped = result.undefined_count > 0
    ? ` Correlation could not be calculated in ${result.undefined_count} of the ${total} cases.`
    : "";
  const summaryText =
    `Leaving out one data point at a time (leave-one-out) gives correlations between ` +
    `${result.r_min.toFixed(3)} and ${result.r_max.toFixed(3)}. ` +
    `This shows how much individual points affect the result, not a confidence interval.${skipped}`;

  return {
    r: stats.r,
    rMin: result.r_min,
    rMax: result.r_max,
    summary: sentence(summaryText, ["leave-one-out"]),
  };
}

/**
 * @param stats  the backend's stats object
 * @param labels { x, y } display labels
 */
export function describeStats(stats, labels) {
  const b = band(stats.r);
  const direction = stats.r < 0 ? "negative" : "positive";
  const pct = Math.round(stats.r_squared * 100);
  const pText = formatP(stats.p_value);

  const r2 = sentence(
    `${pct}% of the variation in ${labels.y} moves together with ${labels.x} (r² = ${stats.r_squared.toFixed(2)}).`,
    ["r²"],
  );

  let pSentence;
  if (stats.p_value < P_VERY) {
    pSentence = `A pattern like this would almost never appear by chance if the two were unrelated (p-value ${pText}).`;
  } else if (stats.p_value < P_LIKELY) {
    pSentence = `A pattern like this would be unlikely by chance if the two were unrelated (p-value = ${pText}).`;
  } else {
    pSentence = `A pattern like this could easily appear by chance (p-value = ${pText}).`;
  }
  const p = sentence(pSentence, ["p-value"]);

  const n =
    stats.n < SMALL_N
      ? sentence(`Only ${stats.n} data points (n = ${stats.n}). Small samples make strong-looking patterns easy to find.`, ["n"])
      : sentence(`${stats.n} data points (n = ${stats.n}).`, ["n"]);

  return {
    band: b,
    direction,
    headline: HEADLINES[b][direction],
    rLabel: `r = ${stats.r.toFixed(2)}`,
    position: Math.abs(stats.r),
    sentences: [r2, p, n],
    trend: describeTrend(stats),
    leaveOneOut: describeLeaveOneOut(stats),
  };
}
