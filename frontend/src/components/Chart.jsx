import { useEffect, useRef } from "react";
import { createChartAdapter } from "../chartAdapter.js";

/** A canvas driven by the repo's InteractiveChart; `spec` is a render spec. */
export function Chart({ spec, label }) {
  const canvasRef = useRef(null);
  const adapterRef = useRef(null);

  useEffect(() => {
    if (!spec || !canvasRef.current) return;
    adapterRef.current ??= createChartAdapter(window.InteractiveChart);
    adapterRef.current.show(canvasRef.current, spec);
  }, [spec]);

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
