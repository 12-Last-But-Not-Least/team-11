import { MODERATE, STRONG } from "../describe.js";

/** r placed on a Weak / Moderate / Strong ruler; bands follow the thresholds. */
export function StrengthScale({ position, rLabel, band, caption = null, compact = false }) {
  const pct = `${position * 100}%`;
  return (
    <div className={`scale${compact ? " scale--compact" : ""}`} role="img" aria-label={`Strength of r: ${rLabel}, ${band}${caption ? `, ${caption}` : ""}`}>
      {caption && <p className="scale__caption">{caption}</p>}
      <div className="scale__bar" aria-hidden="true">
        <span className="scale__band scale__band--weak" style={{ width: `${MODERATE * 100}%` }} />
        <span className="scale__band scale__band--moderate" style={{ width: `${(STRONG - MODERATE) * 100}%` }} />
        <span className="scale__band scale__band--strong" style={{ width: `${(1 - STRONG) * 100}%` }} />
        <span className="scale__marker" data-testid="r-marker" style={{ left: pct }} />
        <span className="scale__label" style={{ left: pct }}>{rLabel}</span>
      </div>
      <div className="scale__ticks" aria-hidden="true">
        <span style={{ width: `${MODERATE * 100}%` }}>Weak 0–{MODERATE}</span>
        <span style={{ width: `${(STRONG - MODERATE) * 100}%` }}>Moderate {MODERATE}–{STRONG}</span>
        <span>Strong {STRONG}–1</span>
      </div>
    </div>
  );
}
