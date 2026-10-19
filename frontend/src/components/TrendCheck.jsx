import { StrengthScale } from "./StrengthScale.jsx";
import { SentenceText } from "./Sentences.jsx";

/**
 * "Does the trend explain it?" — compares level r with year-over-year r on
 * matching strength rulers (the project's main causation-check lesson).
 */
export function TrendCheck({ trend }) {
  if (!trend) return null;
  const { levels, yoy, takeaway, summary } = trend;
  return (
    <section className="check check--try" aria-label="Does the trend explain it?">
      <h3 className="check__title">Does the trend explain it?</h3>
      <p className="check__lead">
        Both series may simply climb year after year. Compare correlation of the levels with correlation of the annual changes.
      </p>
      {yoy ? (
        <div className="check-compare">
          <StrengthScale
            compact
            caption="Levels (original)"
            position={levels.position}
            rLabel={levels.rLabel}
            band={levels.band}
          />
          <StrengthScale
            compact
            caption="Year-over-year changes"
            position={yoy.position}
            rLabel={yoy.rLabel}
            band={yoy.band}
          />
        </div>
      ) : null}
      {takeaway && <p className="check__takeaway">{takeaway}</p>}
      <p className="check__summary">
        <SentenceText sentence={summary} />
      </p>
    </section>
  );
}
