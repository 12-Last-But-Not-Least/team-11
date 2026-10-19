import { useEffect, useState } from "react";
import {
  CONTAINER_FRACTION,
  DEFAULT_SIZE,
  FALLBACK_WIDTH,
  formatSize,
  sizeFromWidth,
} from "./sizes.js";

const DEBOUNCE_MS = 150;

/**
 * Measure `ref`'s content width and return an API size string ("WxH") at
 * CONTAINER_FRACTION of that width. Re-renders on resize (debounced).
 * While `active` is false, keeps the last size (or the fallback).
 */
export function useChartSize(ref, active) {
  const [size, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    let timer = null;
    const apply = (rawWidth) => {
      // Unmeasured (jsdom / zero width): keep the full fallback; otherwise use 80%.
      const w = rawWidth > 0 ? rawWidth * CONTAINER_FRACTION : FALLBACK_WIDTH;
      const next = formatSize(sizeFromWidth(w));
      setSize((prev) => (prev === next ? prev : next));
    };

    apply(el.clientWidth || el.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return undefined;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      clearTimeout(timer);
      timer = setTimeout(() => apply(w), DEBOUNCE_MS);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [ref, active]);

  return size;
}
