/*
 * interactive.js: example frontend for the graphing API (no dependencies).
 *
 *   <canvas id="c"></canvas>
 *   <script src="interactive.js"></script>
 *   <script>
 *     InteractiveChart.load(document.getElementById("c"), "http://127.0.0.1:8000/plot/scatter")
 *       .then(chart => { window.chart = chart; });
 *   </script>
 *
 * Pick the axes with query params (column names come from GET /columns):
 *   InteractiveChart.load(canvas, "http://127.0.0.1:8000/plot/scatter?x=year&y=falls_norm");
 *
 * Controls
 *   mouse wheel         scrolls the page as usual (a hint says how to zoom)
 *   ctrl/⌘ + wheel      zoom both axes around the cursor (trackpad pinch too)
 *   + shift / + alt     zoom x axis only / y axis only
 *   drag                pan
 *   hover               tooltip for the nearest point
 *   double-click        reset view
 * Methods: chart.zoom(factor) (<1 zooms in), chart.reset()
 *
 * How it works: commands with layer "static" (titles, legend, stats box) are
 * replayed as-is. The "plot" layer (grid, ticks, points, lines) is redrawn from
 * spec.data using the current view, so the axes rescale as you zoom.
 */
(function (global) {
  "use strict";

  const GRID = "#e5e7eb", AXIS = "#111827", FONT = "12px sans-serif";
  const HOVER_RADIUS_PX = 14;
  const HINT_TEXT = "Hold Ctrl or ⌘ and scroll to zoom", HINT_MS = 1200;

  // ---- replay server draw commands on a 2D context -----------------------
  function replay(ctx, commands) {
    for (const c of commands) {
      ctx.save();
      ctx.setLineDash(c.dash || []);
      if (c.op === "rect") {
        ctx.fillStyle = c.fill;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        if (c.stroke) {
          ctx.strokeStyle = c.stroke; ctx.lineWidth = c.width || 1;
          ctx.strokeRect(c.x, c.y, c.w, c.h);
        }
      } else if (c.op === "line") {
        ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2);
        ctx.strokeStyle = c.stroke; ctx.lineWidth = c.width; ctx.stroke();
      } else if (c.op === "polyline") {
        ctx.beginPath();
        c.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = c.stroke; ctx.lineWidth = c.width; ctx.stroke();
      } else if (c.op === "circle") {
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
        ctx.fillStyle = c.fill; ctx.fill();
        if (c.stroke) { ctx.strokeStyle = c.stroke; ctx.lineWidth = c.width || 1; ctx.stroke(); }
      } else if (c.op === "text") {
        ctx.translate(c.x, c.y);
        ctx.rotate(((c.rotate || 0) * Math.PI) / 180);
        ctx.font = c.font; ctx.fillStyle = c.fill; ctx.textAlign = c.align;
        ctx.fillText(c.text, 0, 0);
      }
      ctx.restore();
    }
  }

  // ---- ticks for the visible range (same idea as the server) -------------
  function niceTicks(lo, hi, target) {
    const raw = (hi - lo) / (target || 6);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const start = Math.ceil(lo / step - 1e-9) * step;
    const n = Math.floor((hi - start) / step + 1e-9);
    const ticks = [];
    for (let i = 0; i <= n; i++) ticks.push(start + i * step);
    return { ticks, decimals: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) };
  }

  function axisTicks(axis, lo, hi) {
    if (axis.from_data) {  // e.g. years: keep one tick per data point while readable
      const visible = axis.ticks.filter((t) => t >= lo && t <= hi);
      if (visible.length >= 3) return { ticks: visible, decimals: axis.decimals };
    }
    return niceTicks(lo, hi);
  }

  // ---- the chart ---------------------------------------------------------
  class InteractiveChart {
    constructor(canvas, spec) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.spec = spec;
      canvas.width = spec.width;
      canvas.height = spec.height;
      this.home = {
        x0: spec.data.x_axis.min, x1: spec.data.x_axis.max,
        y0: spec.data.y_axis.min, y1: spec.data.y_axis.max,
      };
      this.view = Object.assign({}, this.home);
      this.hover = null;
      this.hint = false;
      this.drag = null;
      this._queued = false;
      this._bind();
      this.draw();
    }

    static async load(canvas, url, fetchOptions) {
      const res = await fetch(url, fetchOptions);
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${await res.text()}`);
      return new InteractiveChart(canvas, await res.json());
    }

    // data <-> pixel
    px(x) {
      const a = this.spec.data.plot_area, v = this.view;
      return a.left + ((x - v.x0) / (v.x1 - v.x0)) * (a.right - a.left);
    }
    py(y) {
      const a = this.spec.data.plot_area, v = this.view;
      return a.bottom - ((y - v.y0) / (v.y1 - v.y0)) * (a.bottom - a.top);
    }
    dataX(px) {
      const a = this.spec.data.plot_area, v = this.view;
      return v.x0 + ((px - a.left) / (a.right - a.left)) * (v.x1 - v.x0);
    }
    dataY(py) {
      const a = this.spec.data.plot_area, v = this.view;
      return v.y0 + ((a.bottom - py) / (a.bottom - a.top)) * (v.y1 - v.y0);
    }

    // canvas-space mouse position (works when CSS resizes the canvas)
    _pos(e) {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) * this.canvas.width) / r.width,
        y: ((e.clientY - r.top) * this.canvas.height) / r.height,
      };
    }
    _inPlot(p) {
      const a = this.spec.data.plot_area;
      return p.x >= a.left && p.x <= a.right && p.y >= a.top && p.y <= a.bottom;
    }

    // ---- public controls
    reset() { this.view = Object.assign({}, this.home); this.hover = null; this._redraw(); }

    zoom(factor, cx, cy, axes) {
      const a = this.spec.data.plot_area, v = this.view, h = this.home;
      axes = axes || "xy";
      cx = cx === undefined ? (a.left + a.right) / 2 : cx;
      cy = cy === undefined ? (a.top + a.bottom) / 2 : cy;
      const clamp = (range, homeRange) =>
        Math.min(Math.max(range, homeRange * 1e-4), homeRange * 20) / range;
      if (axes.includes("x")) {
        const f = clamp((v.x1 - v.x0) * factor, h.x1 - h.x0) * factor;
        const dx = this.dataX(cx);
        v.x0 = dx - (dx - v.x0) * f; v.x1 = dx + (v.x1 - dx) * f;
      }
      if (axes.includes("y")) {
        const f = clamp((v.y1 - v.y0) * factor, h.y1 - h.y0) * factor;
        const dy = this.dataY(cy);
        v.y0 = dy - (dy - v.y0) * f; v.y1 = dy + (v.y1 - dy) * f;
      }
      this._redraw();
    }

    // ---- events
    _bind() {
      const cv = this.canvas;
      cv.addEventListener("wheel", (e) => {
        const p = this._pos(e);
        if (!this._inPlot(p)) return;
        // A plain scroll belongs to the page; only Ctrl/⌘ + wheel zooms.
        // Trackpad pinch arrives as Ctrl + wheel, so it zooms too.
        if (!(e.ctrlKey || e.metaKey)) { this._flashHint(); return; }
        e.preventDefault();  // stop the browser zooming the whole page
        // macOS turns Shift + wheel into horizontal scrolling (deltaY = 0)
        const delta = e.deltaY || e.deltaX;
        if (!delta) return;
        const axes = e.shiftKey ? "x" : e.altKey ? "y" : "xy";
        this.zoom(delta < 0 ? 0.8 : 1.25, p.x, p.y, axes);
      }, { passive: false });

      cv.addEventListener("mousedown", (e) => {
        const p = this._pos(e);
        if (!this._inPlot(p)) return;
        this.drag = { x: p.x, y: p.y, view: Object.assign({}, this.view) };
        this.hover = null;
        cv.style.cursor = "grabbing";
      });
      window.addEventListener("mouseup", () => {
        this.drag = null;
        cv.style.cursor = "default";
      });
      cv.addEventListener("mousemove", (e) => {
        const p = this._pos(e);
        if (this.drag) {
          const a = this.spec.data.plot_area, d = this.drag, v = d.view;
          const dx = ((p.x - d.x) / (a.right - a.left)) * (v.x1 - v.x0);
          const dy = ((p.y - d.y) / (a.bottom - a.top)) * (v.y1 - v.y0);
          this.view = { x0: v.x0 - dx, x1: v.x1 - dx, y0: v.y0 + dy, y1: v.y1 + dy };
        } else {
          this.hover = this._inPlot(p) ? this._nearest(p) : null;
          cv.style.cursor = this._inPlot(p) ? "grab" : "default";
        }
        this._redraw();
      });
      cv.addEventListener("mouseleave", () => { this.hover = null; this._redraw(); });
      cv.addEventListener("dblclick", () => this.reset());
    }

    _nearest(p) {
      let best = null, bestD = HOVER_RADIUS_PX;
      for (const s of this.spec.data.series) {
        for (const pt of s.points) {
          const d = Math.hypot(this.px(pt.x) - p.x, this.py(pt.y) - p.y);
          if (d < bestD) { bestD = d; best = { series: s, point: pt }; }
        }
      }
      return best;
    }

    // ---- drawing
    _redraw() {
      if (this._queued) return;
      this._queued = true;
      requestAnimationFrame(() => { this._queued = false; this.draw(); });
    }

    draw() {
      const ctx = this.ctx;
      replay(ctx, this.spec.commands.filter((c) => c.layer !== "plot"));
      this._drawPlot();
      if (this.hover) this._drawTooltip();
      if (this.hint) this._drawHint();
    }

    // shown briefly when someone scrolls over the plot without Ctrl/⌘
    _flashHint() {
      this.hint = true;
      clearTimeout(this._hintTimer);
      this._hintTimer = setTimeout(() => { this.hint = false; this._redraw(); }, HINT_MS);
      this._redraw();
    }

    _drawHint() {
      const ctx = this.ctx, a = this.spec.data.plot_area;
      ctx.save();
      ctx.font = FONT;
      const w = ctx.measureText(HINT_TEXT).width + 24, h = 28;
      const x = (a.left + a.right - w) / 2, y = (a.top + a.bottom - h) / 2;
      ctx.fillStyle = "rgba(17,24,39,0.85)";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
      ctx.fillText(HINT_TEXT, x + w / 2, y + 18);
      ctx.restore();
    }

    _drawPlot() {
      const ctx = this.ctx, d = this.spec.data, a = d.plot_area, v = this.view;
      const xt = axisTicks(d.x_axis, v.x0, v.x1);
      const yt = axisTicks(d.y_axis, v.y0, v.y1);

      ctx.save();
      ctx.font = FONT; ctx.fillStyle = AXIS;
      ctx.lineWidth = 1; ctx.strokeStyle = GRID;
      ctx.textAlign = "center";
      for (const t of xt.ticks) {
        const x = this.px(t);
        ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom); ctx.stroke();
        ctx.fillText(t.toFixed(xt.decimals), x, a.bottom + 18);
      }
      ctx.textAlign = "right";
      for (const t of yt.ticks) {
        const y = this.py(t);
        ctx.beginPath(); ctx.moveTo(a.left, y); ctx.lineTo(a.right, y); ctx.stroke();
        ctx.fillText(t.toFixed(yt.decimals), a.left - 8, y + 4);
      }
      ctx.strokeStyle = AXIS; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.left, a.top); ctx.lineTo(a.left, a.bottom); ctx.lineTo(a.right, a.bottom);
      ctx.stroke();

      // everything below is clipped to the plot area
      ctx.beginPath(); ctx.rect(a.left, a.top, a.right - a.left, a.bottom - a.top); ctx.clip();

      if (d.fit) {
        const f = d.fit;
        ctx.setLineDash([6, 4]); ctx.strokeStyle = f.color; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.px(f.x_min), this.py(f.slope * f.x_min + f.intercept));
        ctx.lineTo(this.px(f.x_max), this.py(f.slope * f.x_max + f.intercept));
        ctx.stroke(); ctx.setLineDash([]);
      }
      for (const s of d.series) {
        if (s.kind === "line") {
          ctx.strokeStyle = s.color; ctx.lineWidth = s.line_width || 2;
          ctx.beginPath();
          s.points.forEach((p, i) =>
            i ? ctx.lineTo(this.px(p.x), this.py(p.y)) : ctx.moveTo(this.px(p.x), this.py(p.y)));
          ctx.stroke();
        }
        ctx.fillStyle = s.color;
        for (const p of s.points) {
          ctx.beginPath(); ctx.arc(this.px(p.x), this.py(p.y), s.radius, 0, 2 * Math.PI); ctx.fill();
        }
      }
      if (this.hover) {  // highlight ring on the hovered point
        const h = this.hover;
        ctx.strokeStyle = AXIS; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.px(h.point.x), this.py(h.point.y), h.series.radius + 3, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawTooltip() {
      const ctx = this.ctx, h = this.hover;
      const lines = h.point.label.split("\n");
      ctx.save();
      ctx.font = FONT;
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
      const ht = lines.length * 16 + 10;
      let x = this.px(h.point.x) + 12, y = this.py(h.point.y) - ht - 8;
      if (x + w > this.canvas.width) x = this.px(h.point.x) - w - 12;
      if (y < 0) y = this.py(h.point.y) + 12;
      ctx.fillStyle = "rgba(17,24,39,0.92)";
      ctx.fillRect(x, y, w, ht);
      ctx.fillStyle = "#ffffff"; ctx.textAlign = "left";
      lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 17 + i * 16));
      ctx.restore();
    }
  }

  global.InteractiveChart = InteractiveChart;
})(window);
