import { StrengthScale } from "./StrengthScale.jsx";

export function Verdict({ description, changed = false }) {
  const { headline, position, rLabel, band } = description;
  return (
    <section className={`verdict${changed ? " verdict--changed" : ""}`} aria-label="Verdict">
      <h3 className="verdict__headline">{headline}</h3>
      <div className="verdict__row">
        <StrengthScale position={position} rLabel={rLabel} band={band} />
        <p className="verdict__note">
          r measures how closely the dots follow one straight line, from −1 to 1.
          {band === "strong" && " Here they follow it very closely."}
          {band === "moderate" && " Here they follow it only loosely."}
          {band === "weak" && " Here they barely follow it at all."}
        </p>
      </div>
    </section>
  );
}
