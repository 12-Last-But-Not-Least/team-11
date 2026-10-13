// interactive.js has no destroy(): every `new InteractiveChart` adds a window
// mouseup listener. So each canvas gets exactly one instance, and later specs
// are swapped into it (the pattern canvas_svg_demo.html uses).
export function createChartAdapter(ChartClass) {
  let chart = null;
  return {
    get chart() {
      return chart;
    },
    show(canvas, spec) {
      if (!chart || chart.canvas !== canvas) {
        chart = new ChartClass(canvas, spec);
        return chart;
      }
      chart.spec = spec;
      canvas.width = spec.width;
      canvas.height = spec.height;
      chart.home = {
        x0: spec.data.x_axis.min, x1: spec.data.x_axis.max,
        y0: spec.data.y_axis.min, y1: spec.data.y_axis.max,
      };
      chart.view = { ...chart.home };
      chart.hover = null;
      chart.drag = null;
      chart.draw();
      return chart;
    },
  };
}
