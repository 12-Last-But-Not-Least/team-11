// One numbered step on the left rail. Owns no state and no data.
export function Step({ n, title, hint, last = false, children }) {
  const id = `step-${n}-title`;
  return (
    <section className={`step${last ? " step--last" : ""}`} aria-labelledby={id}>
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
          {hint && <p className="step__hint">{hint}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
