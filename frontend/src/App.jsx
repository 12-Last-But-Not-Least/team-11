import { useEffect, useRef, useState } from "react";
import { api as defaultApi } from "./api.js";
import { isKey, labelOf } from "./columns.js";
import { describeStats } from "./describe.js";
import { diffTexts } from "./diffSentences.js";
import { keyRange } from "./runMeta.js";
import { stripStatsPanel } from "./specFilter.js";
import { HELP } from "./help.js";
import { DEFAULT_SIZE, parseSize } from "./sizes.js";
import { useRun } from "./useRun.js";
import { Step } from "./components/Step.jsx";
import { Controls } from "./components/Controls.jsx";
import { Chart } from "./components/Chart.jsx";
import { StatsBar } from "./components/StatsBar.jsx";
import { Verdict } from "./components/Verdict.jsx";
import { Sentences } from "./components/Sentences.jsx";
import { Actions } from "./components/Actions.jsx";
import { ImportDataset } from "./components/ImportDataset.jsx";

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
  const [datasets, setDatasets] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importFormVersion, setImportFormVersion] = useState(0);
  const [cols, setCols] = useState(null);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null); // { datasetId, x, y, size }
  const scatterCanvas = useRef(null);
  const scatterChart = useRef(null);
  const lineChart = useRef(null);

  useEffect(() => {
    let live = true;
    api.getDatasets().then((items) => {
      if (!live) return;
      setDatasets(items);
      setDataset(items[0] ?? null);
    }).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [api]);

  useEffect(() => {
    if (!dataset) return;
    let live = true;
    api
      .getColumns(dataset.id)
      .then((c) => {
        if (!live) return;
        setCols(c);
        const pair = { x: dataset.default_x, y: dataset.default_y };
        setSel({ ...pair, datasetId: dataset.id, dataset, size: DEFAULT_SIZE });
      })
      .catch((e) => live && setError(e));
    return () => {
      live = false;
    };
  }, [api, dataset]);

  const chooseDataset = (id) => {
    setImportFormVersion((version) => version + 1);
    // A new object distinguishes a fresh visit from an earlier run of the same dataset.
    setDataset({ ...datasets.find((item) => item.id === id) });
    setCols(null);
    setSel(null);
    setError(null);
  };

  const importedDataset = (item) => {
    setDatasets((items) => [...items, item]);
    setDataset(item);
    setCols(null);
    setSel(null);
    setError(null);
  };

  const key = cols?.find(isKey);
  const keyLabel = (key?.label ?? "point").toLowerCase();
  const { forSel, scatter, line, running, error: runError } = useRun(api, sel, key?.name ?? "year");
  const currentRun = Boolean(sel && forSel && forSel.dataset === dataset);

  // steps 3–4 describe the landed run (forSel), not a selection still in flight
  const description = scatter && currentRun
    ? describeStats(scatter.stats, { x: labelOf(cols, forSel.x), y: labelOf(cols, forSel.y) })
    : null;
  const range = keyRange(scatter);
  const runMeta = range && currentRun ? { ...range, keyLabel } : null;

  // Changed-since-last-run flags, recomputed only when a new scatter lands
  // (state derived from props, the React-sanctioned setState-in-render form).
  const [runMemo, setRunMemo] = useState({ scatter: null, prev: null, changed: null, specs: null });
  if (description && runMemo.scatter !== scatter) {
    const prev = runMemo.dataset === dataset ? runMemo.prev : null;
    setRunMemo({
      dataset,
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

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <Mark />
          <h1 className="brand__name">{PRODUCT_NAME}</h1>
        </div>
        {datasets?.length > 0 && (
          <div className="dataset">
            <label className="dataset__label" htmlFor="pick-dataset">Dataset</label>
            <select id="pick-dataset" className="chip chip--dataset" disabled={importing} value={dataset?.id ?? ""} onChange={(e) => chooseDataset(e.target.value)}>
              {datasets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        )}
      </header>
      <main>
        {datasets && <ImportDataset key={importFormVersion} api={api} onImported={importedDataset} busy={importing} setBusy={setImporting} />}
        {!error && (!datasets || (dataset && !cols)) && <p role="status">Loading datasets…</p>}
        {datasets?.length === 0 && <p role="status">No datasets are available.</p>}
        {dataset && <p className="dataset-description">{dataset.description}</p>}
        {dataset?.warnings?.length > 0 && <ul className="dataset-description" aria-label="Dataset import notes">
          {dataset.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>}
        {error && (
          <p role="status" className="status status--error">
            Could not load dataset: {error.message}
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
        {(sel || specs) && (
          <Step n={2} title="Look at them two ways" help={HELP[2]} busy={running}>
            {(!specs || !currentRun) && sel && !runError && (
              <div className="charts charts--pending" aria-hidden="true" style={{ "--chart-w": `${parseSize(sel.size).width}px` }}>
                <div className="chart-figure"><div className="chart-skeleton" style={{ aspectRatio: `${parseSize(sel.size).width} / ${parseSize(sel.size).height}` }} /></div>
              </div>
            )}
            {specs && (
              // Keep canvas instances mounted to reuse their interaction listeners.
              // Hidden results are unavailable visually and to assistive technology.
              <div hidden={!currentRun}>
                <div className="charts" style={{ "--chart-w": `${scatter.width}px` }}>
                  <figure className="chart-figure">
                    <div className="chart-figure__head">
                      <button type="button" className="btn btn--ghost btn--small" onClick={() => scatterChart.current?.reset()}>
                        Reset view
                      </button>
                    </div>
                    <Chart spec={specs.scatter} label="Scatter plot" canvasRef={scatterCanvas} chartRef={scatterChart} />
                    <figcaption className="chart-caption">
                      Each dot is one observation. The dashed line is the best straight-line fit through them — the closer the dots hug it, the closer r is to −1 or +1.
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
                      The same columns ordered by {keyLabel}. A shared trend can make the dots line up on the left; row order alone does not imply time.
                    </figcaption>
                  </figure>
                </div>
              </div>
            )}
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
              dataset={dataset}
            />
          </Step>
        )}
      </main>
    </div>
  );
}
