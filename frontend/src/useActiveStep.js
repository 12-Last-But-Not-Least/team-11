import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll-spy for numbered `.step` sections. Returns the step number whose
 * section intersects a band in the upper viewport, plus a stable ref callback
 * factory: `stepRef={register(n)}`.
 */
export function useActiveStep(initial = 1) {
  const [active, setActive] = useState(initial);
  const nodes = useRef(new Map());
  const ratios = useRef(new Map());
  const observer = useRef(null);
  const callbacks = useRef(new Map());

  useEffect(() => {
    const pick = () => {
      let best = null;
      let bestRatio = 0;
      for (const [n, ratio] of ratios.current) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = n;
        }
      }
      if (best != null) setActive(best);
    };

    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const n = Number(entry.target.dataset.step);
          if (!Number.isFinite(n)) continue;
          ratios.current.set(n, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        pick();
      },
      {
        // Active band sits in the upper third of the viewport.
        rootMargin: "-15% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of nodes.current.values()) observer.current.observe(el);
    return () => {
      observer.current?.disconnect();
      observer.current = null;
    };
  }, []);

  const register = useCallback((n) => {
    let cb = callbacks.current.get(n);
    if (!cb) {
      cb = (el) => {
        const prev = nodes.current.get(n);
        if (prev && observer.current) observer.current.unobserve(prev);
        if (!el) {
          nodes.current.delete(n);
          ratios.current.delete(n);
          return;
        }
        el.dataset.step = String(n);
        nodes.current.set(n, el);
        observer.current?.observe(el);
      };
      callbacks.current.set(n, cb);
    }
    return cb;
  }, []);

  return { active, register };
}
