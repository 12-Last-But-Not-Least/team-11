import { useId, useState } from "react";

/** One numbered step on the left rail with a toggleable help note. Owns no data. */
export function Step({ n, title, help, last = false, busy = false, active = false, stepRef = null, children }) {
  const id = `step-${n}-title`;
  const helpId = useId();
  const [open, setOpen] = useState(false);
  return (
    <section
      ref={stepRef}
      className={`step${last ? " step--last" : ""}${active ? " step--active" : ""}`}
      aria-labelledby={id}
      aria-busy={busy || undefined}
      aria-current={active ? "step" : undefined}
    >
      <div className="rail">
        <span className="step__num" aria-hidden="true">{n}</span>
        {!last && <span className="rail__line" aria-hidden="true" />}
      </div>
      <div className="step__body">
        <div className="step__head">
          <h2 id={id} className="step__title">
            <span className="visually-hidden">Step {n}: </span>
            {title}
          </h2>
          {help && (
            <button
              type="button"
              className="step__help-btn"
              aria-label={`Help for step ${n}`}
              aria-expanded={open}
              aria-controls={helpId}
              onClick={() => setOpen((o) => !o)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.6 7.9a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1 .8-1 1.5M10 14.2v.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {busy && <span className="step__running">running…</span>}
        </div>
        {help && open && (
          <p role="note" id={helpId} className="step__help">{help}</p>
        )}
        {children}
      </div>
    </section>
  );
}
