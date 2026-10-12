// Display formatting for the backend's stats values (table only; sentences
// format their own numbers in describe.js).
export function formatStat(key, value) {
  if (value === null || value === undefined) return "—";
  switch (key) {
    case "n":
    case "df":
      return String(value);
    case "r":
    case "r_squared":
      return value.toFixed(4);
    case "t":
      return value.toFixed(2);
    case "p_value":
      return value < 0.001 ? value.toExponential(2) : value.toFixed(4);
    default:
      return value.toFixed(3);
  }
}
