import { useEffect, useRef } from "react";
import { createChartAdapter } from "../chartAdapter.js";

/**
 * A canvas driven by the repo's InteractiveChart; `spec` is a render spec.
 * `canvasRef` receives the canvas element; `chartRef` receives the chart
 * instance (for reset()).
 */
export function Chart({ spec, label, canvasRef: externalRef, chartRef }) {
  const internalRef = useRef(null);
  const canvasRef = externalRef ?? internalRef;
  const adapterRef = useRef(null);

  useEffect(() => {
    if (!spec || !canvasRef.current) return;
    adapterRef.current ??= createChartAdapter(window.InteractiveChart);
    adapterRef.current.show(canvasRef.current, spec);
    if (chartRef) chartRef.current = adapterRef.current.chart;
  }, [spec, canvasRef, chartRef]);

  return (
    <canvas
      ref={canvasRef}
      className="chart"
      role="img"
      aria-label={label}
      width={spec?.width ?? 800}
      height={spec?.height ?? 500}
    />
  );
}
