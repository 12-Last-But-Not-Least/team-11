import { createChartAdapter } from "../src/chartAdapter.js";
import { FakeChart, spec } from "./fakeChart.js";

describe("chart adapter: one instance per canvas", () => {
  it("constructs the chart once and swaps later specs into it", () => {
    const canvas = { width: 0, height: 0 };
    const adapter = createChartAdapter(FakeChart);
    adapter.show(canvas, spec({ width: 800, height: 500 }));
    adapter.show(canvas, spec({ width: 640, height: 400 }));
    adapter.show(canvas, spec({ width: 1000, height: 600 }));
    expect(FakeChart.instances).toHaveLength(1);
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(600);
  });

  it("resets view, hover and drag to the new spec's home range and redraws", () => {
    const canvas = { width: 0, height: 0 };
    const adapter = createChartAdapter(FakeChart);
    const chart = adapter.show(canvas, spec());
    chart.view = { x0: 0.2, x1: 0.4, y0: 0.2, y1: 0.4 };
    chart.hover = { x: 1 };
    chart.drag = { x: 1 };
    const next = spec({ data: { ...spec().data, x_axis: { min: 2007, max: 2018, ticks: [], decimals: 0, from_data: true } } });
    adapter.show(canvas, next);
    expect(chart.spec).toBe(next);
    expect(chart.home).toEqual({ x0: 2007, x1: 2018, y0: 0, y1: 1 });
    expect(chart.view).toEqual(chart.home);
    expect(chart.hover).toBeNull();
    expect(chart.drag).toBeNull();
    expect(chart.draws).toBe(1);
  });

  it("constructs a new chart when the canvas element changes", () => {
    const adapter = createChartAdapter(FakeChart);
    adapter.show({ width: 0, height: 0 }, spec());
    adapter.show({ width: 0, height: 0 }, spec());
    expect(FakeChart.instances).toHaveLength(2);
  });
});
