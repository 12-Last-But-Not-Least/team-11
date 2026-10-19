// Browser equivalent of stats.py. No data leaves the browser to compute these
// statistics; the returned field names are also used by describeStats.

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function lanczosSum(z) {
  let sum = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) sum += LANCZOS[i] / (z + i - 1);
  return sum;
}

// log B(a, 1/2), using the g=7 Lanczos gamma approximation. Combining
// log Gamma(a) - log Gamma(a+1/2) before evaluation avoids cancellation for
// large sample sizes. Here a = (n - 2) / 2 is always at least 1/2.
function logBetaHalf(a) {
  const t = a + 6.5;
  return 0.5 * Math.log(Math.PI) - 0.5 * Math.log(t)
    - a * Math.log1p(0.5 / t) + 0.5
    + Math.log(lanczosSum(a) / lanczosSum(a + 0.5));
}

function nonzero(value) {
  return Math.abs(value) < 1e-300 ? (value < 0 ? -1e-300 : 1e-300) : value;
}

// NIST DLMF 8.17.22–23, evaluated by modified Lentz iteration.
// https://dlmf.nist.gov/8.17.E22 and https://dlmf.nist.gov/8.17.E23
function betaFraction(a, b, x) {
  let c = 1;
  let d = 1 / nonzero(1 - (a + b) * x / (a + 1));
  let result = d;
  for (let m = 1; m <= 10000; m++) {
    const twice = 2 * m;
    const even = m * (b - m) * x / ((a + twice - 1) * (a + twice));
    d = 1 / nonzero(1 + even * d);
    c = nonzero(1 + even / c);
    result *= d * c;
    const odd = -(a + m) * (a + b + m) * x / ((a + twice) * (a + twice + 1));
    d = 1 / nonzero(1 + odd * d);
    c = nonzero(1 + odd / c);
    const change = d * c;
    result *= change;
    if (Math.abs(change - 1) <= 8 * Number.EPSILON) return result;
  }
  throw new Error("Student t probability did not converge");
}

function correlationPValue(r, df) {
  const absolute = Math.abs(r);
  if (absolute === 0) return 1;
  if (absolute === 1) return 0;
  const a = df / 2;
  const square = absolute * absolute;
  const remaining = (1 - absolute) * (1 + absolute);
  // Two-sided Student t probability: I_(1-r²)(df/2, 1/2).
  // DLMF 8.17.4 symmetry chooses the rapidly converging fraction. Computing
  // the complement from r² directly also preserves tiny correlations.
  const logRemaining = absolute < 0.5 ? Math.log1p(-square) : Math.log(remaining);
  const logFront = a * logRemaining + Math.log(absolute) - logBetaHalf(a);
  let probability;
  if (remaining < (a + 1) / (a + 2.5)) {
    probability = Math.exp(logFront + Math.log(betaFraction(a, 0.5, remaining)) - Math.log(a));
  } else {
    probability = -Math.expm1(logFront + Math.log(betaFraction(0.5, a, square)) - Math.log(0.5));
  }
  return Math.max(0, Math.min(1, probability));
}

function isNumericArray(values) {
  return Array.isArray(values) || (ArrayBuffer.isView(values) && !(values instanceof DataView));
}

// Translate first, then scale: this retains small differences around a large
// offset while avoiding overflow/underflow when squaring large/tiny values.
function axis(values) {
  let origin = values[0];
  let scale = 0;
  for (let i = 0; i < values.length; i++) {
    scale = Math.max(scale, Math.abs(values[i] - origin));
  }
  if (!Number.isFinite(scale)) {
    origin = 0;
    scale = 0;
    for (let i = 0; i < values.length; i++) scale = Math.max(scale, Math.abs(values[i]));
  }
  if (scale === 0) throw new Error("correlation is undefined when x or y is constant");
  let sum = 0;
  let correction = 0;
  for (let i = 0; i < values.length; i++) {
    const term = (values[i] - origin) / scale - correction;
    const next = sum + term;
    correction = (next - sum) - term;
    sum = next;
  }
  return { origin, scale, mean: sum / values.length };
}

function rescaleSlope(value, numerator, denominator) {
  if (value === 0) return 0;
  // Try different orders before allowing an unrepresentable slope to overflow.
  for (const result of [value * (numerator / denominator), (value * numerator) / denominator, (value / denominator) * numerator]) {
    if (Number.isFinite(result) && result !== 0) return result;
  }
  return value * (numerator / denominator);
}

/** Pearson correlation, two-sided Student t test, and least-squares line. */
export function correlationStats(x, y) {
  if (!isNumericArray(x) || !isNumericArray(y)) {
    throw new Error("x and y must be one-dimensional numeric arrays");
  }
  if (x.length !== y.length) {
    throw new Error(`x and y must be the same length (got ${x.length} and ${y.length})`);
  }
  for (let i = 0; i < x.length; i++) {
    if (typeof x[i] !== "number" || typeof y[i] !== "number" || !Number.isFinite(x[i]) || !Number.isFinite(y[i])) {
      throw new Error("x and y must contain only finite numbers (no NaN or infinite values)");
    }
  }
  const n = x.length;
  if (n < 3) throw new Error("at least 3 paired values are required");
  const ax = axis(x);
  const ay = axis(y);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let correctionX = 0;
  let correctionY = 0;
  let correctionXY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (x[i] - ax.origin) / ax.scale - ax.mean;
    const dy = (y[i] - ay.origin) / ay.scale - ay.mean;
    const termX = dx * dx - correctionX;
    const termY = dy * dy - correctionY;
    const termXY = dx * dy - correctionXY;
    const nextX = sxx + termX;
    const nextY = syy + termY;
    const nextXY = sxy + termXY;
    correctionX = (nextX - sxx) - termX;
    correctionY = (nextY - syy) - termY;
    correctionXY = (nextXY - sxy) - termXY;
    sxx = nextX;
    syy = nextY;
    sxy = nextXY;
  }
  const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  const df = n - 2;
  const t = Math.abs(r) === 1 ? null : r * Math.sqrt(df) / Math.sqrt((1 - r) * (1 + r));
  const normalizedSlope = sxy / sxx;
  const slope = rescaleSlope(normalizedSlope, ay.scale, ax.scale);
  const offset = ay.mean - normalizedSlope * ax.mean;
  let intercept = (ay.origin - slope * ax.origin) + ay.scale * offset;
  if (!Number.isFinite(intercept) && Number.isFinite(slope)) {
    // The individual products can overflow even when their difference fits.
    const scale = Math.max(Math.abs(ay.origin), Math.abs(ax.origin), ay.scale);
    intercept = (ay.origin / scale - slope * (ax.origin / scale) + (ay.scale / scale) * offset) * scale;
  }
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) {
    throw new Error("regression coefficients exceed the numeric range");
  }
  return {
    n, r, r_squared: r * r, t, df,
    p_value: correlationPValue(r, df), slope, intercept,
  };
}

function validateSeries(series, names) {
  if (series.some((values) => !isNumericArray(values))) {
    throw new Error(`${names} must be one-dimensional numeric arrays`);
  }
  if (series.some((values) => values.length !== series[0].length)) {
    throw new Error(`${names} must have the same length`);
  }
  for (const values of series) {
    for (const value of values) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`${names} must contain only finite numbers`);
      }
    }
  }
}

function isConstant(values) {
  return values.every((value) => value === values[0]);
}

function correlationOnly(x, y) {
  // These diagnostics do not need regression coefficients. Normalize first so
  // an unrepresentable slope between differently scaled series cannot fail them.
  const ax = axis(x);
  const ay = axis(y);
  return correlationStats(
    x.map((value) => (value - ax.origin) / ax.scale),
    y.map((value) => (value - ay.origin) / ay.scale),
  );
}

function annualChanges(values, pairs) {
  const changes = pairs.map(([previous, next]) => values[next] - values[previous]);
  if (changes.every(Number.isFinite)) return changes;
  // Opposite finite extremes can have an infinite difference. A common scale
  // keeps annual changes finite without changing their correlation.
  let scale = 0;
  for (const [previous, next] of pairs) {
    scale = Math.max(scale, Math.abs(values[previous]), Math.abs(values[next]));
  }
  return pairs.map(([previous, next]) => values[next] / scale - values[previous] / scale);
}

/** Correlate paired changes between consecutive calendar years. */
export function yearOverYearCorrelation(years, x, y) {
  validateSeries([years, x, y], "years, x and y");
  if (!years.every(Number.isInteger)) throw new Error("years must be integers");
  const order = Array.from({ length: years.length }, (_, index) => index)
    .sort((a, b) => years[a] - years[b]);
  const pairs = [];
  for (let i = 1; i < order.length; i++) {
    const previous = order[i - 1];
    const next = order[i];
    if (years[next] === years[previous]) throw new Error("years must be unique");
    if (years[next] - years[previous] === 1) pairs.push([previous, next]);
  }
  const n = pairs.length;
  if (n < 3) {
    return { n, r: null, p_value: null, reason: "insufficient_changes" };
  }
  const xChanges = annualChanges(x, pairs);
  const yChanges = annualChanges(y, pairs);
  if (isConstant(xChanges) || isConstant(yChanges)) {
    return { n, r: null, p_value: null, reason: "constant_changes" };
  }
  const result = correlationOnly(xChanges, yChanges);
  return { n, r: result.r, p_value: result.p_value, reason: null };
}

/** Correlation range after omitting each paired observation in turn. */
export function leaveOneOutCorrelation(x, y) {
  validateSeries([x, y], "x and y");
  if (x.length < 4) {
    return {
      r_min: null, r_max: null, valid_count: 0, undefined_count: 0,
      reason: "insufficient_data",
    };
  }
  let rMin = Infinity;
  let rMax = -Infinity;
  let validCount = 0;
  let undefinedCount = 0;
  for (let omitted = 0; omitted < x.length; omitted++) {
    const remainingX = Array.from(x).filter((_, index) => index !== omitted);
    const remainingY = Array.from(y).filter((_, index) => index !== omitted);
    if (isConstant(remainingX) || isConstant(remainingY)) {
      undefinedCount++;
      continue;
    }
    const { r } = correlationOnly(remainingX, remainingY);
    rMin = Math.min(rMin, r);
    rMax = Math.max(rMax, r);
    validCount++;
  }
  return {
    r_min: validCount ? rMin : null,
    r_max: validCount ? rMax : null,
    valid_count: validCount,
    undefined_count: undefinedCount,
    reason: validCount ? null : "undefined_correlation",
  };
}
