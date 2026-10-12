// Stand-in for window.InteractiveChart under jsdom (no canvas there).
// Records constructions and draws so tests can assert instance reuse.
export class FakeChart {
  static instances = [];
  static reset() { FakeChart.instances = []; }
  constructor(canvas, spec) {
    this.canvas = canvas;
    this.spec = spec;
    this.draws = 0;
    this.home = { x0: spec.data.x_axis.min, x1: spec.data.x_axis.max, y0: spec.data.y_axis.min, y1: spec.data.y_axis.max };
    this.view = { ...this.home };
    this.hover = null;
    this.drag = null;
    FakeChart.instances.push(this);
  }
  draw() { this.draws += 1; }
}

export function spec(overrides = {}) {
  return {
    width: 800, height: 500, commands: [], meta: { title: "t", x_label: "x", y_label: "y" },
    stats: { n: 12, r: 0.9, r_squared: 0.81, t: 6.5, df: 10, p_value: 0.0001, slope: 1, intercept: 0 },
    data: { plot_area: { left: 70, right: 590, top: 50, bottom: 440 },
      x_axis: { min: 0, max: 1, ticks: [0, 1], decimals: 1, from_data: false },
      y_axis: { min: 0, max: 1, ticks: [0, 1], decimals: 1, from_data: false },
      series: [{ name: "data", kind: "points", color: "#2563eb", radius: 4.5, points: [{ x: 0, y: 0, label: "2007" }] }], fit: null },
    ...overrides,
  };
}
