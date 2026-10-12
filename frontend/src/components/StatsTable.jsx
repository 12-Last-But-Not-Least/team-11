import { STAT_ROWS } from "../glossary.js";
import { formatStat } from "../format.js";
import { Term } from "./Term.jsx";

export function StatsTable({ stats }) {
  return (
    <table className="stats" aria-label="The statistics">
      <caption className="stats__caption">The statistics</caption>
      <tbody>
        {STAT_ROWS.map(([key, term]) => (
          <tr key={key}>
            <td className="stats__key"><Term>{term}</Term></td>
            <td className="stats__value">{formatStat(key, stats[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
