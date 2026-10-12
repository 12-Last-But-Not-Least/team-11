// Product name is a placeholder until the team picks one (candidate from
// Poorva's demo: "Coincidence? I Think Not"). Single constant on purpose.
export const PRODUCT_NAME = "Graph Explorer";
export const TAGLINE = "Are these two things related? Find out in four steps.";

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

export default function App() {
  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <Mark />
          <div>
            <h1 className="brand__name">{PRODUCT_NAME}</h1>
            <p className="brand__tagline">{TAGLINE}</p>
          </div>
        </div>
      </header>
    </div>
  );
}
