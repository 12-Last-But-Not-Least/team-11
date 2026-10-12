import { useId, useState } from "react";
import { STAT_ROWS } from "../glossary.js";
import { formatStat } from "../format.js";
import { Term } from "./Term.jsx";

/** The statistics once, as a two-row table under the charts, folded by a toggle. */
export function StatsBar({ stats }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <div className="statsbar">
      <button type="button" className="statsbar__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <svg className={`statsbar__chev${open ? " statsbar__chev--open" : ""}`} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Statistics
      </button>
      {open && (
        <table id={id} className="statsgrid" aria-label="Statistics">
          <thead>
            <tr>
              {STAT_ROWS.map(([key, term]) => (
                <th key={key} scope="col"><Term>{term}</Term></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {STAT_ROWS.map(([key]) => (
                <td key={key}>{formatStat(key, stats[key])}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
