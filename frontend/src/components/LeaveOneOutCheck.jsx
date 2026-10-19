import { SentenceText } from "./Sentences.jsx";

/** Map r in [−1, 1] to a 0–100% position on the leave-one-out track. */
function toPct(r) {
  return ((r + 1) / 2) * 100;
}

function RRange({ r, rMin, rMax }) {
  const left = toPct(Math.min(rMin, rMax));
  const right = toPct(Math.max(rMin, rMax));
  return (
    <div
      className="rrange"
      role="img"
      aria-label={`Leave-one-out r ranges from ${rMin.toFixed(3)} to ${rMax.toFixed(3)}; full r is ${r.toFixed(3)}`}
    >
      <div className="rrange__track" aria-hidden="true">
        <span className="rrange__span" style={{ left: `${left}%`, width: `${Math.max(right - left, 0.5)}%` }} />
        <span className="rrange__dot" style={{ left: `${toPct(r)}%` }} />
      </div>
      <div className="rrange__ticks" aria-hidden="true">
        <span>−1</span>
        <span>0</span>
        <span>1</span>
      </div>
      <p className="rrange__legend" aria-hidden="true">
        Band = leave-one-out range · Dot = full r ({r.toFixed(2)})
      </p>
    </div>
  );
}

/** Caution-style card: how sensitive r is to dropping individual points. */
export function LeaveOneOutCheck({ leaveOneOut }) {
  if (!leaveOneOut) return null;
  const { r, rMin, rMax, summary } = leaveOneOut;
  return (
    <section className="check check--warn" aria-label="Does one point drive this?">
      <h3 className="check__title">Does one point drive this?</h3>
      {rMin != null && rMax != null && <RRange r={r} rMin={rMin} rMax={rMax} />}
      <p className="check__summary">
        <SentenceText sentence={summary} />
      </p>
    </section>
  );
}
