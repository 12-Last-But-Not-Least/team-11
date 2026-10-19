import { useEffect, useMemo, useRef, useState } from "react";
import { api as defaultApi } from "./api.js";
import { defaultPair, groupBySource, isKey, labelOf } from "./columns.js";
import { describeStats } from "./describe.js";
import { diffTexts } from "./diffSentences.js";
import { keyRange } from "./runMeta.js";
import { stripStatsPanel } from "./specFilter.js";
import { HELP } from "./help.js";
import { parseSize } from "./sizes.js";
import { useChartSize } from "./useChartSize.js";
import { useRun } from "./useRun.js";
import { Step } from "./components/Step.jsx";
import { Controls } from "./components/Controls.jsx";
import { Chart } from "./components/Chart.jsx";
import { StatsBar } from "./components/StatsBar.jsx";
import { Verdict } from "./components/Verdict.jsx";
import { Sentences } from "./components/Sentences.jsx";
import { Actions } from "./components/Actions.jsx";

// Product name (team decision 2026-10-12, from Poorva's demo). Single constant on purpose.
export const PRODUCT_NAME = "Coincidence? I Think Not";

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
  const [sel, setSel] = useState(null); // { x, y }
  const chartsRef = useRef(null);
  const scatterCanvas = useRef(null);
  const scatterChart = useRef(null);
  const lineChart = useRef(null);
  const chartSize = useChartSize(chartsRef, Boolean(sel));

  useEffect(() => {
    let live = true;
    api
      .getColumns()
      .then((c) => {
        if (!live) return;
        setCols(c);
        setSel(defaultPair(c));
      })
      .catch((e) => live && setError(e));
    return () => {
      live = false;
    };
  }, [api]);

  const key = cols?.find(isKey);
  const keyLabel = (key?.label ?? "point").toLowerCase();
  // Size comes from the step-2 container, not a dropdown.
  const runSel = useMemo(
    () => (sel && chartSize ? { ...sel, size: chartSize } : null),
    [sel, chartSize],
  );
  const { forSel, scatter, line, running, error: runError } = useRun(api, runSel, key?.name ?? "year");

  // steps 3–4 describe the landed run (forSel), not a selection still in flight
  const description = scatter && forSel
    ? describeStats(scatter.stats, { x: labelOf(cols, forSel.x), y: labelOf(cols, forSel.y) })
    : null;
  const range = keyRange(scatter);
  const runMeta = range ? { ...range, keyLabel } : null;

  // Changed-since-last-run flags, recomputed only when a new scatter lands
  // (state derived from props, the React-sanctioned setState-in-render form).
  const [runMemo, setRunMemo] = useState({ scatter: null, prev: null, changed: null, specs: null });
  if (description && runMemo.scatter !== scatter) {
    const prev = runMemo.prev;
    setRunMemo({
      scatter,
      prev: description,
      changed: {
        headline: prev ? prev.headline !== description.headline : false,
        sentences: diffTexts(prev?.sentences.map((x) => x.text) ?? null, description.sentences.map((x) => x.text)),
      },
      // the canvases get the specs without the backend's stats box (shown once, below)
      specs: { scatter: stripStatsPanel(scatter), line: stripStatsPanel(line) },
    });
  }
  const landed = runMemo.scatter === scatter ? runMemo : null;
  const changed = landed?.changed ?? null;
  const specs = landed?.specs ?? null;

  const files = cols ? groupBySource(cols).length : 0;
  const plottable = cols ? cols.length - 1 : 0;

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <Mark />
          <h1 className="brand__name">{PRODUCT_NAME}</h1>
        </div>
        {cols && (
          <div className="dataset">
            <label className="dataset__label" htmlFor="pick-dataset">Dataset</label>
            {/* One choice today (the folder the backend serves); the control is
                ready for more datasets once the API can list them. */}
            <select id="pick-dataset" className="chip chip--dataset" value="current" onChange={() => {}}>
              <option value="current">
                {files} {files === 1 ? "file" : "files"} · {plottable} columns
              </option>
            </select>
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
          <Step n={1} title="Choose two things to compare" help={HELP[1]}>
            <Controls cols={cols} value={sel} onChange={setSel} meta={runMeta} />
          </Step>
        )}
        {runError && (
          <p role="status" className="status status--error">
            {runError.detail ?? runError.message}
          </p>
        )}
        {sel && (
          <Step n={2} title="Look at them two ways" help={HELP[2]} busy={running}>
            <div className={`charts${!specs ? " charts--pending" : ""}`} ref={chartsRef} {...(!specs ? { "aria-hidden": true } : {})}>
              {!specs ? (
                <div className="chart-figure">
                  <div
                    className="chart-skeleton"
                    style={{ aspectRatio: `${parseSize(chartSize).width} / ${parseSize(chartSize).height}` }}
                  />
                </div>
              ) : (
                <>
                  <figure className="chart-figure">
                    <div className="chart-figure__head">
                      <button type="button" className="btn btn--ghost btn--small" onClick={() => scatterChart.current?.reset()}>
                        Reset view
                      </button>
                    </div>
                    <Chart spec={specs.scatter} label="Scatter plot" canvasRef={scatterCanvas} chartRef={scatterChart} />
                    <figcaption className="chart-caption">
                      Each dot is one {keyLabel}. The dashed line is the best straight-line fit through them — the closer the dots hug it, the higher r.
                    </figcaption>
                  </figure>
                  <StatsBar stats={scatter.stats} />
                  <figure className="chart-figure">
                    <div className="chart-figure__head">
                      <button type="button" className="btn btn--ghost btn--small" onClick={() => lineChart.current?.reset()}>
                        Reset view
                      </button>
                    </div>
                    <Chart spec={specs.line} label="Line chart" chartRef={lineChart} />
                    <figcaption className="chart-caption">
                      The same columns over time. If both simply climb {keyLabel} after {keyLabel}, that alone can make the dots line up on the left.
                    </figcaption>
                  </figure>
                </>
              )}
            </div>
          </Step>
        )}
        {description && (
          <Step n={3} title="Read what the numbers say" help={HELP[3]} busy={running}>
            <StatsBar stats={scatter.stats} defaultOpen={false} />
            <Verdict description={description} changed={changed?.headline} />
            <Sentences sentences={description.sentences} changed={changed?.sentences} />
          </Step>
        )}
        {description && (
          <Step n={4} title="Save what you found" help={HELP[4]} busy={running} last>
            <Actions
              scatterSpec={scatter}
              canvasRef={scatterCanvas}
              names={{ x: forSel.x, y: forSel.y }}
              labels={{ x: labelOf(cols, forSel.x), y: labelOf(cols, forSel.y) }}
              stats={scatter.stats}
            />
          </Step>
        )}
      </main>
    </div>
  );
}
