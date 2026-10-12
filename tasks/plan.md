# Implementation Plan: Graph Explorer frontend

Spec: `SPEC.md`. Design authority: `.impeccable/surfaces/frontend-src-app-jsx.md` (direction contract) and the Figma mockup (frame 12:2). Intent: `docs/intent/frontend.md`. Tasks: `tasks/todo.md`.

## Overview

A Vite + React 18 (JavaScript) single page under `frontend/` that talks to the existing FastAPI service over HTTP. Four numbered steps down a rail: choose two columns, look at scatter + line, read a rule-based verdict and sentences, run the causation checks. Charts are drawn by the repo's `interactive.js`; downloads reuse the repo's `svg_export.js`. The backend is not changed.

## What already exists and is reused

| File (repo root) | Owner | Reuse |
|---|---|---|
| `interactive.js` | backend team | canvas replay + zoom/pan/hover. **No destroy(); each `new InteractiveChart` adds a `window` mouseup listener.** |
| `svg_export.js` | Poorva | `SvgChart.toSvg(spec)` / `SvgChart.download(spec, name)`; has a Node test (`node test_svg_export.js`). |
| `canvas_svg_demo.html` | Poorva | vanilla reference page. Proves: instance reuse pattern, same-column guard, line mode = `x=year&y=a&y=b`, request-id guard against stale responses, 422 `detail` surfacing. Keep untouched. |

## Architecture decisions

- **One chart instance per canvas, reused across runs.** `Chart.jsx` constructs `InteractiveChart` once (in an effect) and on new specs assigns `chart.spec`, resizes the canvas, resets `home`/`view`/`hover`/`drag`, and calls `draw()` — the exact pattern from the demo. Never re-construct on re-render (listener leak).
- **Root scripts imported in place, not copied.** `frontend/vite.config.js` sets `server.fs.allow: ['..']` and `App` imports `../../interactive.js` and `../../svg_export.js` as side-effect modules (they attach to `window`). One source of truth shared with the demo page. Fallback if Vite refuses: a `frontend/src/lib/` symlink, never a copy.
- **Pure rule modules first, UI second.** `columns.js`, `describe.js`, `checks.js`, `glossary.js`, `exportText.js` take data and return data; they are the TDD targets and carry every threshold as an exported constant.
- **State lives in `App.jsx`** as one object `{ x, y, size, run }`; a `run` counter increments on every change and is the cache key for both fetches. Stale responses are dropped by comparing run ids (demo's `requestId` pattern).
- **Two fetches per run, landed together.** Scatter (`/plot/scatter?x&y&width&height`) and line (`/plot/line?x=year&y=x&y=y`) are fetched in parallel; the UI shows the loading state until both resolve so steps 2–4 update at once (contract: "re-runs steps 2–4 together").
- **Line chart when year is picked.** If `x` or `y` is `year`, the line chart plots the other column alone against year (`/plot/line?x=year&y=<col>`); the spec's line-stats rule then uses year vs that column, and step 4's shared-trend check still fires.
- **Downloads.** SVG via `SvgChart.download(spec)` (reuse); PNG via `canvas.toBlob`. "Copy the statistics" writes a plain-text block to the clipboard.
- **Tokens from the contract** in `src/tokens.css` as CSS custom properties (navy ink, chart blue, caution red, gold ×2, rail gray, grid). Fonts via Google Fonts `<link>` with `system-ui` / `ui-monospace` fallbacks so the page is still usable offline.
- **Testing.** Vitest + React Testing Library + jsdom. jsdom has no canvas: `InteractiveChart` is mocked in component tests; the wrapper's reuse logic is tested against a fake class. Backend pytest is untouched.
- **Year-over-year "try it" card** renders only when the API advertises the transform (stretch, needs backend owner). Until then the card is omitted, not disabled.

## Dependency graph

```
T1 scaffold + tokens + fonts
 ├── T2 columns.js + api.js (pure, TDD)
 │     └── T3 Step 1: pickers / swap / size (state in App)
 │           └── T4 Step 2a: scatter via Chart.jsx (instance reuse)
 │                 └── T5 Step 2b: line chart, loading + error states, stale-run guard
 ├── T6 describe.js (pure, TDD) ──┐
 ├── T7 glossary.js (pure) ───────┼── T8 Step 3 UI: verdict, strength scale, sentences, terms, stats table
 └── T9 checks.js (pure, TDD) ────┴── T10 Step 4 UI: caution cards
T11 exports (SVG/PNG/copy)        ← T4, T8
T12 re-run choreography + changed-highlight ← T5, T8
T13 contract polish + finish review + DESIGN.md ← all
Stretch: T14 Playwright happy path; T15 year-over-year transform (backend)
```

## Task list

### Phase 1: Foundation
- [x] T1 Scaffold `frontend/` (Vite React JS), tokens, fonts, lint, Vitest smoke test
- [x] T2 `columns.js` + `api.js` with tests
- [x] T3 Step 1 slice: pickers from live `/columns`, swap, size

### Checkpoint A ✅
- [x] `npm test`, `npm run lint`, `npm run build` clean; `pytest -q` still 16 passing
- [x] Browser: header + step 1 render from the real API; changing a picker updates the selects and meta line

### Phase 2: Core
- [x] T4 Step 2a: scatter canvas through `Chart.jsx`, caption
- [x] T5 Step 2b: line canvas, parallel fetch, loading/error, stale-run guard, year-on-axis rule
- [x] T6 `describe.js` (verdict, strength band, sentences) with boundary tests
- [x] T7 `glossary.js` + `Term.jsx` tooltip (hover + focus)
- [x] T8 Step 3 UI
- [x] T9 `checks.js` with tests
- [x] T10 Step 4 UI

### Checkpoint B
- [x] Happy path steps 1–4 in the browser against the running API, all requests 200
- [x] Swapping a CSV in `Data_Clean_UP/data/final/` changes the pickers with no frontend change
- [x] Review with owner before polish

### Phase 3: Finish
- [x] T11 Downloads (SVG via `svg_export.js`, PNG) + copy statistics
- [x] T12 Re-run choreography: loading marks, changed-sentence highlight, marker slide
- [x] T13 Polish against the direction contract; detector; finish review; DESIGN.md

### Checkpoint C: Done ✅
- [x] Every SPEC success criterion checked
- [x] Vitest coverage: `describe.js`, `columns.js`, `checks.js` at 100% lines
- [x] Commit per task with test evidence in the message

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `interactive.js` has no teardown; re-instantiation leaks `window` listeners | High (hover/drag bugs after a few runs) | One instance per canvas, swap spec (T4); unit test the wrapper with a fake class |
| Vite refuses imports from the repo root | Med | `server.fs.allow: ['..']`; fallback symlink in `src/lib/`; decided in T1 |
| jsdom has no canvas | Med | mock `InteractiveChart` in component tests; manual browser check in every checkpoint |
| Google Fonts offline during the demo | Low | system font fallbacks in tokens; demo machine pre-caches |
| Backend defaults hardcode iPhone columns | Low | frontend always sends explicit `x`/`y` (spec rule) |
| Both axes always year-keyed, so the shared-trend check fires for every pair | Low (honest) | wording says "both change over time"; rule and copy reviewed in T9 |
| Course may forbid UI frameworks | Med | unverified; owner to confirm before T4 (first React-heavy slice) |

## Open questions
- Product name. Poorva's demo is titled "Coincidence? I Think Not". Adopt it, or keep "Graph Explorer"? One constant in `App.jsx` either way.
- Download formats: SVG (reusing Poorva's exporter) and PNG both, or SVG only?
- Should Poorva's `canvas_svg_demo.html` stay at the repo root as the vanilla reference? (Plan assumes yes, untouched.)
