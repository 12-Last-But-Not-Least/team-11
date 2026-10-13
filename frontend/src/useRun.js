import { useEffect, useRef, useState } from "react";
import { parseSize } from "./sizes.js";

/**
 * One "run" per selection: scatter and line fetched in parallel, landed
 * together. A run id drops responses from superseded selections, so a slow
 * earlier response never overwrites a newer one. On error the previous
 * charts are kept and `error` carries the backend's detail.
 *
 * `running` is derived: the charts on screen belong to `landed.sel`; while
 * that differs from the current `sel` (and no error was recorded for it),
 * a run is in flight.
 */
export function useRun(api, sel, keyName) {
  const [landed, setLanded] = useState({ sel: null, scatter: null, line: null, error: null, errorSel: null });
  const runRef = useRef(0);

  useEffect(() => {
    if (!sel) return;
    const run = ++runRef.current;
    const size = parseSize(sel.size);
    const lineYs = [sel.x, sel.y].filter((n) => n !== keyName);
    Promise.all([
      api.getScatter({ x: sel.x, y: sel.y, ...size }),
      api.getLine({ x: keyName, ys: lineYs, ...size }),
    ])
      .then(([scatter, line]) => {
        if (run !== runRef.current) return;
        setLanded({ sel, scatter, line, error: null, errorSel: null });
      })
      .catch((e) => {
        if (run !== runRef.current) return;
        setLanded((s) => ({ ...s, error: e, errorSel: sel }));
      });
  }, [api, sel, keyName]);

  const failed = sel && landed.errorSel === sel;
  return {
    forSel: landed.sel,
    scatter: landed.scatter,
    line: landed.line,
    running: Boolean(sel) && landed.sel !== sel && !failed,
    error: failed ? landed.error : null,
  };
}
