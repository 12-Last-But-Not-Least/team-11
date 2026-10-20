"""Turn data into a canvas render spec.

The spec is plain JSON with two views of the same chart:

* ``commands``: draw commands whose coordinates are already in canvas pixels
  (y flipped, margins applied). A static frontend just replays them.
* ``data``: the data values behind the chart (points, axis ranges, plot-area
  bounds, hover labels). An interactive frontend uses it to zoom, pan and
  hover; see interactive.js.

Every command has a ``layer``: "static" (background, titles, axis labels,
legend and stats box) never changes when zooming; "plot" (grid, ticks, axes,
points, lines) is what an interactive frontend redraws from ``data``.

No FastAPI imports here, so it is easy to test.
Ops: rect, line, circle, polyline, text  (see USAGE.md for fields).
"""
import math

MARGIN = {"left": 70, "top": 50, "bottom": 60, "right": 210}  # right = stats/legend panel
COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea"]
FIT_COLOR = "#6b7280"
GRID = "#e5e7eb"
AXIS = "#111827"
FONT = "sans-serif"


# ---------------------------------------------------------------- ticks ----
def nice_ticks(lo, hi, target=6):
    """Return (axis_min, axis_max, ticks, decimals) covering [lo, hi]."""
    if hi == lo:
        lo, hi = lo - 1, hi + 1
    raw = (hi - lo) / target
    mag = 10 ** math.floor(math.log10(raw))
    step = next(m * mag for m in (1, 2, 5, 10) if m * mag >= raw)
    start = math.floor(lo / step + 1e-9) * step
    end = math.ceil(hi / step - 1e-9) * step
    n = int(round((end - start) / step))
    ticks = [start + i * step for i in range(n + 1)]
    decimals = max(0, -math.floor(math.log10(step) + 1e-9))
    return start, end, ticks, decimals


def _pad_range(lo, hi, fraction=0.05):
    """Expand [lo, hi] by ``fraction`` of the span on each side."""
    span = hi - lo if hi != lo else 1.0
    pad = span * fraction
    return lo - pad, hi + pad


def _data_ticks(xs):
    """Integer x values (e.g. years): tick on each data point, pad half a step."""
    lo, hi = min(xs), max(xs)
    pad = (hi - lo) / (len(xs) - 1) / 2 if len(xs) > 1 else 1
    return lo - pad, hi + pad, sorted(set(xs)), 0


def _is_int_axis(xs):
    return len(xs) <= 20 and all(float(v).is_integer() for v in xs)


def _num(v):
    return f"{v:.4g}"


# -------------------------------------------------------------- layout -----
class _Frame:
    """Plot area + scaling + axes/grid/labels for one chart."""

    def __init__(self, width, height, xaxis, yaxis, title, x_label, y_label,
                 x_from_data=False):
        self.w, self.h = width, height
        self.left = MARGIN["left"]
        self.right = width - MARGIN["right"]
        self.top = MARGIN["top"]
        self.bottom = height - MARGIN["bottom"]
        self.xmin, self.xmax, self.xticks, self.xdec = xaxis
        self.ymin, self.ymax, self.yticks, self.ydec = yaxis
        self.x_from_data = x_from_data
        self.cmds = []
        self.layer = "static"
        self.add({"op": "rect", "x": 0, "y": 0, "w": width, "h": height, "fill": "#ffffff"})
        self._decorate(title, x_label, y_label)
        self.layer = "plot"  # series drawn next; panel() switches back to static

    def add(self, cmd):
        cmd["layer"] = self.layer
        self.cmds.append(cmd)

    def px(self, x):
        return round(self.left + (x - self.xmin) / (self.xmax - self.xmin)
                     * (self.right - self.left), 2)

    def py(self, y):
        return round(self.bottom - (y - self.ymin) / (self.ymax - self.ymin)
                     * (self.bottom - self.top), 2)

    def _decorate(self, title, x_label, y_label):
        add = self.add
        self.layer = "plot"
        for t in self.xticks:
            x = self.px(t)
            add({"op": "line", "x1": x, "y1": self.top, "x2": x, "y2": self.bottom,
                 "stroke": GRID, "width": 1})
            add({"op": "text", "x": x, "y": self.bottom + 18, "text": f"{t:.{self.xdec}f}",
                 "font": f"12px {FONT}", "fill": AXIS, "align": "center"})
        for t in self.yticks:
            y = self.py(t)
            add({"op": "line", "x1": self.left, "y1": y, "x2": self.right, "y2": y,
                 "stroke": GRID, "width": 1})
            add({"op": "text", "x": self.left - 8, "y": y + 4, "text": f"{t:.{self.ydec}f}",
                 "font": f"12px {FONT}", "fill": AXIS, "align": "right"})
        add({"op": "line", "x1": self.left, "y1": self.bottom, "x2": self.right,
             "y2": self.bottom, "stroke": AXIS, "width": 2})
        add({"op": "line", "x1": self.left, "y1": self.top, "x2": self.left,
             "y2": self.bottom, "stroke": AXIS, "width": 2})
        self.layer = "static"
        add({"op": "text", "x": (self.left + self.right) / 2, "y": 28, "text": title,
             "font": f"bold 16px {FONT}", "fill": AXIS, "align": "center"})
        add({"op": "text", "x": (self.left + self.right) / 2, "y": self.h - 14,
             "text": x_label, "font": f"13px {FONT}", "fill": AXIS, "align": "center"})
        # rotate = degrees, applied around (x, y)
        add({"op": "text", "x": 18, "y": (self.top + self.bottom) / 2, "text": y_label,
             "font": f"13px {FONT}", "fill": AXIS, "align": "center", "rotate": -90})

    def panel(self, stats, legend=None):
        """Stats box (and optional legend) in the reserved right-hand margin."""
        self.layer = "static"
        add = self.add
        x0 = self.right + 20
        y = self.top
        if legend:
            for name, color in legend:
                add({"op": "rect", "x": x0, "y": y - 9, "w": 14, "h": 4, "fill": color})
                add({"op": "text", "x": x0 + 22, "y": y - 3, "text": name,
                     "font": f"12px {FONT}", "fill": AXIS, "align": "left"})
                y += 20
            y += 10
        lines = _stats_lines(stats)
        box_h = 28 + 18 * len(lines)
        add({"op": "rect", "x": x0 - 8, "y": y - 8, "w": MARGIN["right"] - 28, "h": box_h,
             "fill": "#f9fafb", "stroke": "#9ca3af", "width": 1})
        add({"op": "text", "x": x0, "y": y + 10, "text": "Correlation stats",
             "font": f"bold 12px {FONT}", "fill": AXIS, "align": "left"})
        for i, line in enumerate(lines):
            add({"op": "text", "x": x0, "y": y + 30 + 18 * i, "text": line,
                 "font": "12px monospace", "fill": AXIS, "align": "left"})

    def data_block(self, series, fit=None):
        """Data values behind the chart, for interactive frontends."""
        return {
            "plot_area": {"left": self.left, "right": self.right,
                          "top": self.top, "bottom": self.bottom},
            "x_axis": {"min": self.xmin, "max": self.xmax, "ticks": self.xticks,
                       "decimals": self.xdec, "from_data": self.x_from_data},
            "y_axis": {"min": self.ymin, "max": self.ymax, "ticks": self.yticks,
                       "decimals": self.ydec, "from_data": False},
            "series": series,
            "fit": fit,
        }


def _fmt_p(p):
    return f"{p:.2e}" if p < 0.001 else f"{p:.4f}"


def _stats_lines(s):
    return [f"n         = {s['n']}",
            f"r         = {s['r']:.4f}",
            f"R^2       = {s['r_squared']:.4f}",
            f"p-value   = {_fmt_p(s['p_value'])}",
            f"slope     = {s['slope']:.4f}",
            f"intercept = {s['intercept']:.4f}"]


def _clip_line(slope, intercept, x0, x1, ymin, ymax):
    """Clip y = slope*x + intercept over [x0, x1] to y in [ymin, ymax]."""
    if slope == 0:
        return (x0, x1) if ymin <= intercept <= ymax else None
    xa, xb = sorted(((ymin - intercept) / slope, (ymax - intercept) / slope))
    lo, hi = max(x0, xa), min(x1, xb)
    return (lo, hi) if lo < hi else None


def _spec(frame, stats, title, x_label, y_label, series, fit=None):
    return {"width": frame.w, "height": frame.h, "commands": frame.cmds, "stats": stats,
            "data": frame.data_block(series, fit),
            "meta": {"title": title, "x_label": x_label, "y_label": y_label}}


def _label(prefix, x_label, x, y_label, y):
    head = f"{prefix}\n" if prefix else ""
    return f"{head}{x_label}: {_num(x)}\n{y_label}: {_num(y)}"


# ------------------------------------------------------------- charts ------
def build_scatter(x, y, stats, title="Scatter plot", x_label="x", y_label="y",
                  width=800, height=500, labels=None):
    """labels: optional per-point heading for hover tooltips (e.g. the year)."""
    labels = labels or [""] * len(x)
    xax = nice_ticks(*_pad_range(min(x), max(x)))
    yax = nice_ticks(*_pad_range(min(y), max(y)))
    f = _Frame(width, height, xax, yax, title, x_label, y_label)
    # Span the visible plot box (axis limits), not just the data's x extent.
    seg = _clip_line(stats["slope"], stats["intercept"], f.xmin, f.xmax, f.ymin, f.ymax)
    if seg:
        pts = [[f.px(v), f.py(stats["slope"] * v + stats["intercept"])] for v in seg]
        f.add({"op": "polyline", "points": pts, "stroke": FIT_COLOR, "width": 2,
               "dash": [6, 4]})
    for xv, yv in zip(x, y):
        f.add({"op": "circle", "x": f.px(xv), "y": f.py(yv), "r": 4.5,
               "fill": COLORS[0], "stroke": "#ffffff", "width": 1})
    f.panel(stats, legend=[("data", COLORS[0]), ("least-squares fit", FIT_COLOR)])
    series = [{"name": "data", "kind": "points", "color": COLORS[0], "radius": 4.5,
               "points": [{"x": xv, "y": yv, "label": _label(lb, x_label, xv, y_label, yv)}
                          for xv, yv, lb in zip(x, y, labels)]}]
    fit = {"slope": stats["slope"], "intercept": stats["intercept"],
           "x_min": f.xmin, "x_max": f.xmax, "color": FIT_COLOR}
    return _spec(f, stats, title, x_label, y_label, series, fit)


def build_line(x, series, stats, title="Line graph", x_label="x", y_label="y",
               width=800, height=500):
    """series: list of (name, ys). Points are drawn in x order."""
    order = sorted(range(len(x)), key=lambda i: x[i])
    xs = [x[i] for i in order]
    series = [(name, [ys[i] for i in order]) for name, ys in series]
    from_data = _is_int_axis(xs)
    xax = _data_ticks(xs) if from_data else nice_ticks(*_pad_range(min(xs), max(xs)))
    allv = [v for _, ys in series for v in ys]
    yax = nice_ticks(*_pad_range(min(allv), max(allv)))
    f = _Frame(width, height, xax, yax, title, x_label, y_label, x_from_data=from_data)
    legend, sdata = [], []
    for k, (name, ys) in enumerate(series):
        color = COLORS[k % len(COLORS)]
        legend.append((name, color))
        f.add({"op": "polyline", "points": [[f.px(a), f.py(b)] for a, b in zip(xs, ys)],
               "stroke": color, "width": 2.5})
        for a, b in zip(xs, ys):
            f.add({"op": "circle", "x": f.px(a), "y": f.py(b), "r": 3.5, "fill": color})
        sdata.append({"name": name, "kind": "line", "color": color, "radius": 3.5,
                      "line_width": 2.5,
                      "points": [{"x": a, "y": b, "label": _label(name, x_label, a, y_label, b)}
                                 for a, b in zip(xs, ys)]})
    f.panel(stats, legend=legend)
    return _spec(f, stats, title, x_label, y_label, sdata)
