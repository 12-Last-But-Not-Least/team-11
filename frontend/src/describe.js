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

function describeYearOverYear(yoy) {
  // Older responses and test fixtures may not include annual-change stats.
  if (!yoy) return [];

  if (yoy.r === null) {
    const text = yoy.reason === "insufficient_changes"
      ? `Annual-change correlation is unavailable: only ${yoy.n} paired changes; at least 3 are required.`
      : "Annual-change correlation is undefined because one series has constant annual changes.";

    return [sentence(text, [])];
  }

  const strength = band(yoy.r);
  const relationship = strength === "weak"
    ? "a weak linear relationship"
    : `a ${strength} ${yoy.r < 0 ? "negative" : "positive"} linear relationship`;

  const pText = yoy.p_value === null
    ? "unavailable"
    : yoy.p_value < P_VERY
      ? "< 0.001"
      : `= ${formatP(yoy.p_value)}`;

  const evidence = yoy.p_value === null
    ? ""
    : yoy.p_value < P_LIKELY
      ? ": evidence of correlation"
      : ": insufficient evidence of correlation";

  return [
    sentence(
      `Annual changes have ${relationship} ` +
      `(r = ${yoy.r.toFixed(3)}, ${yoy.n} pairs).`,
      [],
    ),
    sentence(
      `Annual-change p-value ${pText}${evidence}. ` +
      "Interpret cautiously: annual changes may not be independent.",
      [],
    ),
  ];
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
    sentences: [r2, p, n, ...describeYearOverYear(stats.year_over_year)],
  };
}
