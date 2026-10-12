import { useEffect, useState } from "react";
import { api as defaultApi } from "./api.js";
import { defaultPair, groupBySource, isKey } from "./columns.js";
import { Chart } from "./components/Chart.jsx";
import { Step } from "./components/Step.jsx";
import { Controls } from "./components/Controls.jsx";
import { DEFAULT_SIZE } from "./sizes.js";
import { useRun } from "./useRun.js";

// Product name is a placeholder until the team picks one (candidate from
// Poorva's demo: "Coincidence? I Think Not"). Single constant on purpose.
export const PRODUCT_NAME = "Graph Explorer";
export const TAGLINE = "Are these two things related? Find out in four steps.";

function Mark() {
  // Three points on a dashed fit line: "a scatter plot", not a statistic.
  return (
    <span className="mark" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 30 30">
        <line x1="6" y1="22" x2="24" y2="8" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="2.5 2" />
        <circle cx="9" cy="20" r="2.5" fill="currentColor" />
        <circle cx="15.5" cy="13" r="2.5" fill="currentColor" />
        <circle cx="22" cy="9.5" r="2.5" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function App({ api = defaultApi }) {
  const [cols, setCols] = useState(null);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null); // { x, y, size }

  useEffect(() => {
    let live = true;
    api
      .getColumns()
      .then((c) => {
        if (!live) return;
        setCols(c);
        const pair = defaultPair(c);
        setSel(pair ? { ...pair, size: DEFAULT_SIZE } : null);
      })
      .catch((e) => live && setError(e));
    return () => {
      live = false;
    };
  }, [api]);

  const key = cols?.find(isKey);
  const keyLabel = (key?.label ?? "point").toLowerCase();
  const { scatter, line, running, error: runError } = useRun(api, sel, key?.name ?? "year");
  const files = cols ? groupBySource(cols).length : 0;
  const plottable = cols ? cols.length - 1 : 0;

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <Mark />
          <div>
            <h1 className="brand__name">{PRODUCT_NAME}</h1>
            <p className="brand__tagline">{TAGLINE}</p>
          </div>
        </div>
        {cols && (
          <div className="dataset">
            <span className="dataset__label">Dataset</span>
            <span className="chip chip--static">
              {files} {files === 1 ? "file" : "files"} · {plottable} columns
            </span>
          </div>
        )}
      </header>
      <main>
        {error && (
          <p role="status" className="status status--error">
            Start the backend first (uvicorn main:app): {error.message}
          </p>
        )}
        {cols && sel && (
          <Step n={1} title="Choose two things to compare" hint="Any two columns from the dataset. Swap them any time.">
            <Controls cols={cols} value={sel} onChange={setSel} />
          </Step>
        )}
        {runError && (
          <p role="status" className="status status--error">
            {runError.detail ?? runError.message}
          </p>
        )}
        {sel && (
          <Step
            n={2}
            title="Look at them two ways"
            hint="Same data, two views. The second one is the one people forget."
            busy={running}
          >
            {!scatter || !line ? (
              <div className="charts charts--pending" aria-hidden="true">
                <div className="chart-skeleton" style={{ width: 800, height: 500 }} />
                <div className="chart-skeleton" style={{ width: 800, height: 500 }} />
              </div>
            ) : (
            <div className="charts">
              <figure className="chart-figure">
                <Chart spec={scatter} label="Scatter plot" />
                <figcaption className="chart-caption">
                  Each dot is one {keyLabel}. The dashed line is the best straight-line fit through them — the closer the dots hug it, the higher r.
                </figcaption>
              </figure>
              <figure className="chart-figure">
                <Chart spec={line} label="Line chart" />
                <figcaption className="chart-caption">
                  The same columns over time. If both simply climb {keyLabel} after {keyLabel}, that alone can make the dots line up on the left.
                </figcaption>
              </figure>
            </div>
            )}
          </Step>
        )}
      </main>
    </div>
  );
}
