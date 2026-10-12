import { useEffect, useRef, useState } from "react";
import { api as defaultApi } from "./api.js";
import { defaultPair, groupBySource, isKey, labelOf } from "./columns.js";
import { describeStats } from "./describe.js";
import { runChecks } from "./checks.js";
import { FEATURES } from "./features.js";
import { Verdict } from "./components/Verdict.jsx";
import { Sentences } from "./components/Sentences.jsx";
import { StatsTable } from "./components/StatsTable.jsx";
import { CheckCard } from "./components/CheckCard.jsx";
import { Actions } from "./components/Actions.jsx";
import { diffTexts } from "./diffSentences.js";
import { keyRange } from "./runMeta.js";
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

export default function App({ api = defaultApi, features = FEATURES }) {
  const [cols, setCols] = useState(null);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null); // { x, y, size }
  const scatterCanvas = useRef(null);

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
  const { forSel, scatter, line, running, error: runError } = useRun(api, sel, key?.name ?? "year");

  // steps 3–4 describe the landed run (forSel), not a selection still in flight
  const description = scatter && forSel
    ? describeStats(scatter.stats, { x: labelOf(cols, forSel.x), y: labelOf(cols, forSel.y) })
    : null;
  const range = keyRange(scatter);
  const runMeta = range ? { ...range, keyLabel } : null;

  // Changed-since-last-run flags, recomputed only when a new scatter lands
  // (state derived from props, the React-sanctioned setState-in-render form).
  const [runMemo, setRunMemo] = useState({ scatter: null, prev: null, changed: null });
  if (description && runMemo.scatter !== scatter) {
    const prev = runMemo.prev;
    setRunMemo({
      scatter,
      prev: description,
      changed: {
        headline: prev ? prev.headline !== description.headline : false,
        sentences: diffTexts(prev?.sentences.map((x) => x.text) ?? null, description.sentences.map((x) => x.text)),
      },
    });
  }
  const changed = runMemo.scatter === scatter ? runMemo.changed : null;

  const checks = scatter && forSel
    ? runChecks(scatter.stats, {
        keyLabel,
        keyed: true, // every column in this backend is joined on the key
        keyOnAxis: forSel.x === key?.name || forSel.y === key?.name,
        features,
      })
    : [];
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
            <Controls cols={cols} value={sel} onChange={setSel} meta={runMeta} />
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
            <div className="charts" style={{ "--chart-w": `${scatter.width}px` }}>
              <figure className="chart-figure">
                <Chart spec={scatter} label="Scatter plot" canvasRef={scatterCanvas} />
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
        {description && (
          <Step n={3} title="Read what the numbers say" hint="Plain words first, the statistics beside them." busy={running}>
            <Verdict description={description} changed={changed?.headline} />
            <div className="read">
              <Sentences sentences={description.sentences} changed={changed?.sentences} />
              <StatsTable stats={scatter.stats} />
            </div>
          </Step>
        )}
        {description && (
          <Step n={4} title="Before you conclude" hint="Checks this tool runs for you." busy={running} last>
            <div className="checks">
              {checks.map((card) => (
                <CheckCard key={card.id} card={card} />
              ))}
            </div>
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
