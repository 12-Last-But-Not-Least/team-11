# Spec: Graph Explorer Frontend

Status: APPROVED (2026-10-12); implemented on branch feature/frontend-explorer; finish review: ship. Intent: `docs/intent/frontend.md`. API contract: `USAGE.md`.

## Objective

A single-page React frontend over the existing graphing API, built for an intro data science or statistics student asking "are these two things related, and can I say so?"

It is a general chart explorer at its base (pick any two columns, see scatter and line charts) with one specialization a generic chart tool lacks: every statistic is paired with a plain-language sentence produced by fixed threshold rules.

**Happy path (the demo):**

1. Open the app. A chart is already drawn, using the first valid column pair reported by the API. No empty state.
2. Pick an x and a y column from labeled dropdowns. Both charts update.
3. See the scatter (with fit line and stats box) and the line-over-time chart in the same window, side by side.
4. Read the verdict and the sentences in step 3: what r, r², p and n mean here, in words. The statistics themselves sit once, in a foldable table under the charts.
5. Hover a point to see its year and values; zoom, pan, and Reset view.
6. Adjust a setting (chart size) and, in step 4, download the scatter (SVG via the shared exporter, or PNG) or copy the statistics for a write-up.

**Why it stands out:** the student leaves knowing not just that r = 0.98, but that both series share a time trend and that the scatter alone can mislead.

## Tech Stack

- React 19 with JavaScript (no TypeScript), built with Vite 8. (Spec originally said React 18 + ESLint; the current Vite template ships React 19 and oxlint, accepted on 2026-10-12 rather than pinning backwards.)
- Plain CSS modules; no component library.
- Canvas drawing reuses `interactive.js`, wrapped in one React component.
- Backend: the existing FastAPI app, **unchanged**. Frontend and backend are separate processes on separate ports; the frontend talks to the API over HTTP with CORS (already open in `main.py`).
- Dev tooling: Node 20+, Vitest + React Testing Library + jsdom.

## Commands

Two terminals, always.

```bash
# terminal 1: backend API on http://127.0.0.1:8000
uvicorn main:app --reload

# terminal 2: frontend, from frontend/
npm install
npm run dev          # Vite dev server on http://127.0.0.1:5173
npm run build        # production bundle in frontend/dist/
npm run preview      # serves dist/ on http://127.0.0.1:4173 (demo mode)
npm test             # vitest run --coverage
npm run lint         # oxlint

# backend tests
python -m pytest -q
```

The API base URL is read from `VITE_API_URL` (default `http://127.0.0.1:8000`), set in `frontend/.env.example`. Demo mode is `npm run build && npm run preview` next to a running `uvicorn`.

## Project Structure

```
frontend/
  index.html
  vite.config.js
  package.json
  .env.example           → VITE_API_URL=http://127.0.0.1:8000 (copy to .env locally)
  src/
    main.jsx             → React root
    App.jsx              → layout: Controls | Scatter + Description | LineChart
    api.js               → fetch wrappers for /columns, /plot/scatter, /plot/line
    columns.js           → pure: group columns by source, pick default pair
    describe.js          → pure: stats object → plain-language sentences
    export.js            → canvas → PNG download
    components/
      Controls.jsx       → dataset group, x/y selects, size, download button
      Chart.jsx          → wraps interactive.js around a <canvas>; props: url
      Description.jsx    → renders describe() output
    (root `interactive.js` / `svg_export.js` imported via `server.fs.allow`)
  tests/
    columns.test.js
    describe.test.js
    Description.test.jsx
    App.test.jsx         → happy path with mocked fetch
docs/intent/frontend.md  → confirmed intent
SPEC.md                  → this file
tasks/                   → plan.md and todo.md (next phase)
```

## Layout

**Visual direction: Guided Worksheet** (chosen 2026-10-12; a refinement of the "Notebook Cell" pick after the owner judged it too generic). Four numbered steps down a left rail, each with a "?" help button that toggles the step's guidance (owner evaluation round 1, 2026-10-12, removed the always-visible hint sentences and the header tagline): 1 Choose two things to compare (pickers with file/years meta), 2 Look at them two ways (stacked: scatter, then the foldable 2-row statistics table, then the line chart, each chart with a Reset view button and a teaching caption; the backend's in-canvas stats box is filtered out of the draw commands), 3 Read what the numbers say (a second, folded-by-default statistics bar on top, then the one-line verdict, Weak–Moderate–Strong ruler for r, bulleted sentences with glossary-underlined terms), 4 Save what you found (download SVG/PNG, copy the statistics). The rule-driven caution cards of the earlier step 4 were removed as not meaningful (they fired for every pair); the shared-trend message lives in the line chart's caption and step 2's help. Color system "data-ink + Triton": UCSD navy ink, the scatter's blue (#2563eb) for all structure and interaction, the line chart's red for cautions, Triton gold in exactly two accents (verdict rule, strength marker); navy is never a fill; faint graph-paper grid in the rail. Atkinson Hyperlegible Next + JetBrains Mono. Direction contract: `.impeccable/surfaces/frontend-src-app-jsx.md`. Figma: https://www.figma.com/design/hwFRPONo9qUnkF8smnBhIz (frame 12:2 is current; 7:2 teal draft and 2:2 notebook variant are superseded).

**Decision: one window, no tabs, for v1.** One scrolling page. Since evaluation round 2 the charts stack vertically (scatter, statistics, line) so the page is about 2000px tall at 1440; steps 3–4 follow below.

The description appears under the scatter only. The line chart's job is to show the shared trend; a second block of sentences would dilute the one that matters.

Reasoning recorded from the owner: one window serves the student who opens the app and wants everything at once with no clicks, which is the v1 vision. Tabs serve a student who wants to focus on one chart in depth. Both are valid; v1 optimizes for convenience.

**Path to tabs later:** `Chart.jsx` and `Description.jsx` take all state as props and own no layout. A future "focus" route can mount one chart full-width with the same components. Nothing in v1 should assume both charts are mounted.

## Description rules (fixed, in `describe.js`)

| Input | Sentence |
|---|---|
| \|r\| >= 0.7 | "Strong {positive/negative} relationship (r = …)." |
| 0.4 <= \|r\| < 0.7 | "Moderate {positive/negative} relationship (r = …)." |
| \|r\| < 0.4 | "Weak or no linear relationship (r = …)." |
| r² | "{pct}% of the variation in {y} moves with {x} (r² = …)." |
| p < 0.001 | "Very unlikely to be chance (p < 0.001)." |
| p < 0.05 | "Unlikely to be chance (p = …)." |
| p >= 0.05 | "Could be chance (p = …)." |
| n < 30 | "Small sample (n = {n}); treat with caution." |
| (shared time trend) | Not a sentence: stated in the line chart's caption and step 2's help text (the caution card version was removed in evaluation round 1). |

Thresholds are exported constants at the top of the file. No other logic.

## Code Style

Function components with hooks, named exports, one component per file. Pure functions take data and return data; fetching and DOM effects stay in components or `api.js`.

```jsx
// components/Description.jsx
import { describe } from "../describe.js";

export function Description({ stats, xLabel, yLabel }) {
  if (!stats) return null;
  const lines = describe(stats, { x: xLabel, y: yLabel });
  return (
    <section aria-label="What the statistics mean">
      {lines.map((text) => <p key={text}>{text}</p>)}
    </section>
  );
}
```

Naming: `PascalCase` components, `camelCase` functions and variables, `UPPER_SNAKE` constants. Two-space indent, semicolons, double quotes. oxlint with the Vite template defaults.

## Testing Strategy

- **Unit (Vitest)**: `columns.js` and `describe.js` are pure and fully covered, including every threshold boundary (r = 0.7, p = 0.05, n = 29/30).
- **Component (Vitest + React Testing Library)**: `Description` renders one paragraph per rule that fires. `App` happy path with a mocked `fetch`: loads columns, renders two charts, changes an axis, sees the description update. The canvas itself is stubbed in jsdom.
- **Backend (pytest, existing)**: unchanged. The frontend branch does not touch backend tests.
- **Happy path in a real browser**: walked manually before each commit, following the six steps above. Stretch: one Playwright test for the same six steps.
- No tests for `interactive.js` (inherited, out of scope).

## Boundaries

**Always**
- Read column names from `/columns`; never hardcode a dataset or column name in the frontend.
- Pass explicit `x` and `y` on every API call.
- Run `npm test`, `npm run lint`, and `pytest -q` before committing.
- Keep interpretation to the threshold table above.

**Ask first**
- Backend changes outside the dataset-support work authorized on 2026-10-18
  (plan: `tasks/dataset-support.md`).
- Adding a runtime dependency beyond `react` and `react-dom`.
- Changing the layout from one window to tabs or pages.

**Never**
- Point at external databases. CSV uploads are now in scope under
  `tasks/dataset-support.md`; they are not implemented by the first backend unit.
- Commit `node_modules/`, `dist/`, `.env`, or credentials.
- Remove or weaken existing backend tests.

## Success Criteria

- [x] With `uvicorn` and `npm run dev` both running, the six happy-path steps work at `http://127.0.0.1:5173` with no console errors (verified 2026-10-12).
- [x] `npm run build && npm run preview` serves the built page on 4173 (verified).
- [x] Renaming or adding a CSV in `Data_Clean_UP/data/final/` changes the dropdowns with no frontend code change (verified with a temporary file).
- [x] r², p-value and n each have a rule-table sentence; every field in the stats table has a one-line glossary definition on hover/focus.
- [x] Both charts update within one second of an axis change on localhost.
- [x] Vitest: 104 tests pass; `describe.js`, `columns.js`, `checks.js`, `glossary.js` at 100% line coverage.
- [x] pytest: existing 16 tests still pass (nothing on the backend changed).
- [x] `.gitignore` covers `node_modules/`, `dist/`, and `.env` (but not `.env.example`).

## Stretch (not required for done)

- Year-over-year change transform (`?transform=diff`) so r visibly drops. Needs backend owner agreement; the frontend's flag-gated "try it" card was removed in evaluation round 1 and would be re-added with the feature.
- ~~Playwright happy-path test.~~ Done: `frontend/e2e/happy-path.spec.js`, `npm run test:e2e`.
- A "focus" view per chart (the tabs option), reusing `Chart.jsx` and `Description.jsx`.
- Single-process deployment: FastAPI serves `frontend/dist/` as static files so one command runs everything and CORS can be closed. Deferred until the backend owner agrees; not needed for development or the demo.

## Open Questions

1. ~~Product name.~~ Decided 2026-10-12: **"Coincidence? I Think Not"** (from Poorva's demo), a single constant in `App.jsx` plus the page title.
2. Datasets: the header "Dataset" control lists `GET /datasets`. Selection loads dataset-scoped columns and defaults, then refreshes plots, statistics, interpretations, and exports together. Old results are hidden while switching; late responses are ignored. The frontend never hardcodes dataset names. CSV imports and additional sourced defaults are tracked in `tasks/dataset-support.md`.
