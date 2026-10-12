# Spec: Graph Explorer Frontend

Status: DRAFT v3, awaiting approval. Intent: `docs/intent/frontend.md`. API contract: `USAGE.md`.

## Objective

A single-page React frontend over the existing graphing API, built for an intro data science or statistics student asking "are these two things related, and can I say so?"

It is a general chart explorer at its base (pick any two columns, see scatter and line charts) with one specialization a generic chart tool lacks: every statistic is paired with a plain-language sentence produced by fixed threshold rules.

**Happy path (the demo):**

1. Open the app. A chart is already drawn, using the first valid column pair reported by the API. No empty state.
2. Pick an x and a y column from labeled dropdowns. Both charts update.
3. See the scatter (with fit line and stats box) and the line-over-time chart in the same window, side by side.
4. Read the description under the scatter: what r, r², p and n mean here, in words.
5. Hover a point to see its year and values.
6. Adjust a setting (chart size) and download the scatter as a PNG for a write-up.

**Why it stands out:** the student leaves knowing not just that r = 0.98, but that both series share a time trend and that the scatter alone can mislead.

## Tech Stack

- React 18 with JavaScript (no TypeScript), built with Vite.
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
npm run lint         # eslint .

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
    lib/
      interactive.js     → moved from repo root, unchanged
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

**Visual direction: Guided Worksheet** (chosen 2026-10-12; a refinement of the "Notebook Cell" pick after the owner judged it too generic). Four numbered steps down a left rail: 1 Choose two things to compare (pickers with file/years meta), 2 Look at them two ways (scatter + line with teaching captions), 3 Read what the numbers say (one-line verdict, Weak–Moderate–Strong ruler for r, bulleted sentences with glossary-underlined terms, stats table), 4 Before you conclude (rule-driven caution cards: shared time trend, small sample; plus the year-over-year "try it" stretch). Color system "data-ink + Triton": UCSD navy ink, the scatter's blue (#2563eb) for all structure and interaction, the line chart's red for cautions, Triton gold in exactly two accents (verdict rule, strength marker); navy is never a fill; faint graph-paper grid in the rail. Atkinson Hyperlegible Next + JetBrains Mono. Direction contract: `.impeccable/surfaces/frontend-src-app-jsx.md`. Figma: https://www.figma.com/design/hwFRPONo9qUnkF8smnBhIz (frame 12:2 is current; 7:2 teal draft and 2:2 notebook variant are superseded).

**Decision: one window, no tabs, for v1.** One scrolling page; steps 1–2 fit the first 900px at 1440 wide, steps 3–4 follow below.

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
| year is on an axis, or both selected columns come from year-keyed data | "Both series change over time. A shared trend can produce a strong r without any causal link." |

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

Naming: `PascalCase` components, `camelCase` functions and variables, `UPPER_SNAKE` constants. Two-space indent, semicolons, double quotes. ESLint with the Vite React defaults.

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
- Any backend change at all (including the year-over-year transform or a static-file mount).
- Adding a runtime dependency beyond `react` and `react-dom`.
- Changing the layout from one window to tabs or pages.

**Never**
- Accept file uploads or point at external databases.
- Commit `node_modules/`, `dist/`, `.env`, or credentials.
- Remove or weaken existing backend tests.

## Success Criteria

- [ ] With `uvicorn` and `npm run dev` both running, the six happy-path steps work at `http://127.0.0.1:5173` with no console errors.
- [ ] `npm run build && npm run preview` works the same way against the running API (demo mode).
- [ ] Renaming or adding a CSV in `Data_Clean_UP/data/final/` changes the dropdowns with no frontend code change.
- [ ] Every stats field shown has a sentence next to it from the rule table.
- [ ] Both charts update within one second of an axis change on localhost.
- [ ] Vitest: all tests pass; `describe.js` and `columns.js` at 100% line coverage.
- [ ] pytest: existing 16 tests still pass (nothing on the backend changed).
- [ ] `.gitignore` covers `node_modules/`, `dist/`, and `.env` (but not `.env.example`).

## Stretch (not required for done)

- Year-over-year change transform (`?transform=diff`) so r visibly drops. Needs backend owner agreement.
- Playwright happy-path test.
- A "focus" view per chart (the tabs option), reusing `Chart.jsx` and `Description.jsx`.
- Single-process deployment: FastAPI serves `frontend/dist/` as static files so one command runs everything and CORS can be closed. Deferred until the backend owner agrees; not needed for development or the demo.

## Open Questions

1. Product name. None chosen yet. Page title is "Graph Explorer" as a placeholder until the team picks one; it is a single constant in `App.jsx`.
