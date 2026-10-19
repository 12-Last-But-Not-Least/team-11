// Canvas and interactive chart specifications, built in the browser from raw data.
// Keep this contract shared with interactive.js and svg_export.js at the repo root.
const MARGIN = { left: 70, top: 50, bottom: 60, right: 210 };
const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea"];
const FIT_COLOR = "#6b7280";
const GRID = "#e5e7eb";
const AXIS = "#111827";
const RANGE_ERROR = "Chart values exceed the numeric range supported by the interactive renderer";

function requireRenderableRange(lo, hi) {
  const span = hi - lo;
  // InteractiveChart allows 20x zoom out and 1e-4x zoom in, then formats
  // ticks with toFixed (at most 100 decimals). Reject ranges that would fail
  // that renderer rather than returning commands or axes containing NaN.
  const smallestStep = 10 ** Math.floor(Math.log10(span * 1e-4 / 6));
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(span > 0) ||
      !Number.isFinite(span * 20) || !(smallestStep > 0) ||
      Math.max(0, -Math.floor(Math.log10(smallestStep) + 1e-9)) > 100) {
    throw new Error(RANGE_ERROR);
  }
}

function values(values, name, length) {
  if (!Array.isArray(values) || !values.length || !values.every(Number.isFinite)) {
    throw new Error(`${name} must be a nonempty array of finite numbers`);
  }
  if (length !== undefined && values.length !== length) {
    throw new Error(`${name} must have the same length as x`);
  }
}

function extent(values) {
  let lo = Infinity, hi = -Infinity;
  for (const value of values) {
    lo = Math.min(lo, value);
    hi = Math.max(hi, value);
  }
  return [lo, hi];
}

/** Expand [lo, hi] by ``fraction`` of the span on each side so extremes sit inset. */
function padRange(lo, hi, fraction = 0.05) {
  const span = hi !== lo ? hi - lo : 1;
  const pad = span * fraction;
  return [lo - pad, hi + pad];
}

function niceTicks(lo, hi, target = 6) {
  if (hi === lo) {
    const pad = Math.max(1, Math.abs(lo) * Number.EPSILON * 4);
    lo -= pad;
    hi += pad;
  }
  requireRenderableRange(lo, hi);
  const raw = (hi - lo) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  const count = Math.round((end - start) / step);
  requireRenderableRange(Math.min(start, lo), Math.max(end, hi));
  if (!Number.isInteger(count) || count < 0 || count > 20) throw new Error(RANGE_ERROR);
  return {
    min: Math.min(start, lo), max: Math.max(end, hi),
    ticks: Array.from({ length: count + 1 }, (_, i) => start + i * step),
    decimals: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)),
    from_data: false,
  };
}

function dataTicks(xs) {
  const [lo, hi] = extent(xs);
  // Repeated integer x values still need a nonzero viewport for zoom and pan.
  const pad = hi > lo ? (hi - lo) / (xs.length - 1) / 2 : 1;
  requireRenderableRange(lo - pad, hi + pad);
  return { min: lo - pad, max: hi + pad, ticks: [...new Set(xs)], decimals: 0, from_data: true };
}

function scientific(value, digits) {
  return value.toExponential(digits).replace(/e([+-])(\d+)$/, (_, sign, exp) =>
    `e${sign}${exp.padStart(2, "0")}`);
}

function num(value) {
  const exponent = Number(value.toExponential(3).split("e")[1]);
  if (exponent < -4 || exponent >= 4) {
    const [coefficient, exp] = scientific(value, 3).split("e");
    return `${Number(coefficient)}e${exp}`;
  }
  return String(Number(value.toPrecision(4)));
}

function pointLabel(prefix, xLabel, x, yLabel, y) {
  const heading = prefix === undefined || prefix === null || prefix === "" ? "" : `${prefix}\n`;
  return `${heading}${xLabel}: ${num(x)}\n${yLabel}: ${num(y)}`;
}

function statsLines(stats) {
  const p = stats.p_value < 0.001 ? scientific(stats.p_value, 2) : stats.p_value.toFixed(4);
  return [
    `n         = ${stats.n}`,
    `r         = ${stats.r.toFixed(4)}`,
    `R^2       = ${stats.r_squared.toFixed(4)}`,
    `p-value   = ${p}`,
    `slope     = ${stats.slope.toFixed(4)}`,
    `intercept = ${stats.intercept.toFixed(4)}`,
  ];
}

class Frame {
  constructor(width, height, xAxis, yAxis, title, xLabel, yLabel) {
    if (!Number.isFinite(width) || width <= MARGIN.left + MARGIN.right ||
        !Number.isFinite(height) || height <= MARGIN.top + MARGIN.bottom) {
      throw new Error("Chart dimensions must leave room for the plot and its margins");
    }
    this.width = width;
    this.height = height;
    this.area = { left: MARGIN.left, right: width - MARGIN.right,
      top: MARGIN.top, bottom: height - MARGIN.bottom };
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.meta = { title, x_label: xLabel, y_label: yLabel };
    this.commands = [];
    this.layer = "static";
    this.add({ op: "rect", x: 0, y: 0, w: width, h: height, fill: "#ffffff" });
    this.decorate();
    this.layer = "plot";
  }

  add(command) {
    if (Object.values(command).some((value) => typeof value === "number" && !Number.isFinite(value)) ||
        command.points?.some((point) => !point.every(Number.isFinite))) throw new Error(RANGE_ERROR);
    this.commands.push({ ...command, layer: this.layer });
  }

  px(x) {
    const a = this.area, axis = this.xAxis;
    return Math.round((a.left + (x - axis.min) / (axis.max - axis.min) * (a.right - a.left)) * 100) / 100;
  }

  py(y) {
    const a = this.area, axis = this.yAxis;
    return Math.round((a.bottom - (y - axis.min) / (axis.max - axis.min) * (a.bottom - a.top)) * 100) / 100;
  }

  text(x, y, text, font = "12px sans-serif", align = "left", extra = {}) {
    this.add({ op: "text", x, y, text, font, fill: AXIS, align, ...extra });
  }

  decorate() {
    const a = this.area;
    this.layer = "plot";
    for (const tick of this.xAxis.ticks) {
      const x = this.px(tick);
      this.add({ op: "line", x1: x, y1: a.top, x2: x, y2: a.bottom, stroke: GRID, width: 1 });
      this.text(x, a.bottom + 18, tick.toFixed(this.xAxis.decimals), "12px sans-serif", "center");
    }
    for (const tick of this.yAxis.ticks) {
      const y = this.py(tick);
      this.add({ op: "line", x1: a.left, y1: y, x2: a.right, y2: y, stroke: GRID, width: 1 });
      this.text(a.left - 8, y + 4, tick.toFixed(this.yAxis.decimals), "12px sans-serif", "right");
    }
    this.add({ op: "line", x1: a.left, y1: a.bottom, x2: a.right, y2: a.bottom, stroke: AXIS, width: 2 });
    this.add({ op: "line", x1: a.left, y1: a.top, x2: a.left, y2: a.bottom, stroke: AXIS, width: 2 });
    this.layer = "static";
    this.text((a.left + a.right) / 2, 28, this.meta.title, "bold 16px sans-serif", "center");
    this.text((a.left + a.right) / 2, this.height - 14, this.meta.x_label, "13px sans-serif", "center");
    this.text(18, (a.top + a.bottom) / 2, this.meta.y_label, "13px sans-serif", "center", { rotate: -90 });
  }

  panel(stats, legend) {
    this.layer = "static";
    const x = this.area.right + 20;
    let y = this.area.top;
    for (const { name, color } of legend) {
      this.add({ op: "rect", x, y: y - 9, w: 14, h: 4, fill: color });
      this.text(x + 22, y - 3, name);
      y += 20;
    }
    if (legend.length) y += 10;
    const lines = statsLines(stats);
    this.add({ op: "rect", x: x - 8, y: y - 8, w: MARGIN.right - 28,
      h: 28 + 18 * lines.length, fill: "#f9fafb", stroke: "#9ca3af", width: 1 });
    this.text(x, y + 10, "Correlation stats", "bold 12px sans-serif");
    lines.forEach((line, i) => this.text(x, y + 30 + 18 * i, line, "12px monospace"));
  }

  spec(stats, series, fit = null) {
    return {
      width: this.width, height: this.height, commands: this.commands, stats,
      data: { plot_area: this.area, x_axis: this.xAxis, y_axis: this.yAxis, series, fit },
      meta: this.meta,
    };
  }
}

function clipLine(slope, intercept, x0, x1, ymin, ymax) {
  if (slope === 0) return ymin <= intercept && intercept <= ymax ? [x0, x1] : null;
  const a = (ymin - intercept) / slope, b = (ymax - intercept) / slope;
  const lo = Math.max(x0, Math.min(a, b)), hi = Math.min(x1, Math.max(a, b));
  return lo < hi ? [lo, hi] : null;
}

export function buildScatter(x, y, stats, {
  title = "Scatter plot", xLabel = "x", yLabel = "y", width = 800, height = 500, labels = [],
} = {}) {
  values(x, "x");
  values(y, "y", x.length);
  const [xmin, xmax] = extent(x);
  const frame = new Frame(
    width, height,
    niceTicks(...padRange(xmin, xmax)),
    niceTicks(...padRange(...extent(y))),
    title, xLabel, yLabel,
  );
  // interactive.js evaluates these endpoints directly when drawing the fit.
  // Finite coefficients alone do not guarantee finite multiply/add results.
  const fitEnds = [xmin, xmax].map((v) => stats.slope * v + stats.intercept);
  if (!fitEnds.every((v) => Number.isFinite(v) && Number.isFinite(frame.py(v)))) {
    throw new Error(RANGE_ERROR);
  }
  const segment = clipLine(stats.slope, stats.intercept, xmin, xmax, frame.yAxis.min, frame.yAxis.max);
  if (segment) {
    frame.add({ op: "polyline", points: segment.map((v) => [frame.px(v), frame.py(stats.slope * v + stats.intercept)]),
      stroke: FIT_COLOR, width: 2, dash: [6, 4] });
  }
  x.forEach((xv, i) => frame.add({ op: "circle", x: frame.px(xv), y: frame.py(y[i]),
    r: 4.5, fill: COLORS[0], stroke: "#ffffff", width: 1 }));
  frame.panel(stats, [{ name: "data", color: COLORS[0] }, { name: "least-squares fit", color: FIT_COLOR }]);
  const series = [{ name: "data", kind: "points", color: COLORS[0], radius: 4.5,
    points: x.map((xv, i) => ({ x: xv, y: y[i], label: pointLabel(labels[i], xLabel, xv, yLabel, y[i]) })) }];
  const fit = { slope: stats.slope, intercept: stats.intercept, x_min: xmin, x_max: xmax, color: FIT_COLOR };
  return frame.spec(stats, series, fit);
}

export function buildLine(x, series, stats, {
  title = "Line graph", xLabel = "x", yLabel = "y", width = 800, height = 500,
} = {}) {
  values(x, "x");
  if (!Array.isArray(series) || !series.length) throw new Error("At least one line series is required");
  for (const s of series) values(s.values, s.name, x.length);
  const order = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
  const xs = order.map((i) => x[i]);
  const xAxis = xs.length <= 20 && xs.every(Number.isInteger)
    ? dataTicks(xs)
    : niceTicks(...padRange(...extent(xs)));
  let ymin = Infinity, ymax = -Infinity;
  for (const s of series) {
    const [lo, hi] = extent(s.values);
    ymin = Math.min(ymin, lo);
    ymax = Math.max(ymax, hi);
  }
  const frame = new Frame(width, height, xAxis, niceTicks(...padRange(ymin, ymax)), title, xLabel, yLabel);
  const legend = [];
  const data = series.map((s, index) => {
    const color = COLORS[index % COLORS.length];
    const points = order.map((i) => ({ x: x[i], y: s.values[i], label: pointLabel(s.name, xLabel, x[i], yLabel, s.values[i]) }));
    legend.push({ name: s.name, color });
    frame.add({ op: "polyline", points: points.map((p) => [frame.px(p.x), frame.py(p.y)]), stroke: color, width: 2.5 });
    for (const point of points) {
      frame.add({ op: "circle", x: frame.px(point.x), y: frame.py(point.y), r: 3.5, fill: color });
    }
    return { name: s.name, kind: "line", color, radius: 3.5, line_width: 2.5, points };
  });
  frame.panel(stats, legend);
  return frame.spec(stats, data);
}
