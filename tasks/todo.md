# Graph Explorer frontend — task list

Plan: `tasks/plan.md`. Spec: `SPEC.md`. Contract: `.impeccable/surfaces/frontend-src-app-jsx.md`.
Commands (from `frontend/`): `npm test`, `npm run lint`, `npm run build`, `npm run dev`. Backend: `uvicorn main:app --reload`, `python -m pytest -q`.

## Task 1: Scaffold the frontend ✅ (commit: see git log)

**Description:** Create `frontend/` with Vite + React 18 (JavaScript), ESLint, Vitest + RTL + jsdom, a `.env.example` with `VITE_API_URL`, `tokens.css` holding the contract's colors/type as custom properties, Google Fonts links with system fallbacks, and an `App` that renders the header (mark, product-name constant, subtitle). Decide how root scripts are imported (`server.fs.allow`) and prove it with a side-effect import of `interactive.js`.

**Acceptance criteria:**
- [x] `npm run dev` shows the header at 1440 wide matching the mockup's header row
- [x] `window.InteractiveChart` and `window.SvgChart` exist in the dev page (imported from the repo root, not copied)
- [x] `npm test` runs one smoke test (header renders the product-name constant)

**Verification:**
- [x] `npm test`, `npm run lint`, `npm run build` all exit 0
- [x] `git status` shows no `node_modules/` or `dist/` (gitignore)
- [x] Manual: header in browser

**Dependencies:** None
**Files likely touched:** `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/src/tokens.css`, `frontend/.env.example`, `frontend/tests/App.test.jsx`
**Estimated scope:** M (scaffold generator; ask owner before running it)

## Task 2: Column model and API client (TDD) ✅

**Description:** `columns.js`: `groupBySource(cols)`, `defaultPair(cols)` (first two non-`year` columns, preferring different source files), `labelOf(cols, name)`, `metaLine(cols, name)` ("file · n years · 2007–2018" needs years; use what `/columns` gives and leave years for a later enrichment). `api.js`: `getColumns()`, `getScatter({x,y,width,height})`, `getLine({x, ys, width, height})`, each turning a non-2xx into an `ApiError` with the backend's `detail`.

**Acceptance criteria:**
- [x] Tests cover: empty list, single column, same-source pair fallback, year excluded from defaults
- [x] `api.js` builds exactly the query strings the backend expects (repeat `y`)
- [x] 422 `detail` text reaches the caller unchanged

**Verification:**
- [x] `npm test` green; `columns.js` 100% line coverage
**Dependencies:** T1
**Files:** `src/columns.js`, `src/api.js`, `tests/columns.test.js`, `tests/api.test.js`
**Scope:** S

## Task 3: Step 1 — choose two things ✅

**Description:** `Controls.jsx` renders the X/Y picker cards (label, select chip, mono meta line), the Swap button, and the chart-size select, from `/columns`. App state `{x, y, size, run}`; the same column cannot be selected on both axes (option disabled). Rail + numbered step shell (`Step.jsx`) built here since step 1 is the first consumer.

**Acceptance criteria:**
- [x] On load, pickers show the `defaultPair`; no dataset or column name is hardcoded
- [x] Changing a picker or Swap updates App state (`run` counter deferred to T5 where it is first needed)
- [x] Keyboard: native selects and a real button; focus ring styled

**Verification:**
- [x] RTL tests with an injected fake api: options from fixture, disabled twin, swap, change, size, backend-down status
- [x] Manual against live API (dataset chip 3 files · 4 columns; pickers populated)
**Dependencies:** T2
**Files:** `src/components/Step.jsx`, `src/components/Controls.jsx`, `src/App.jsx`, `src/App.css`, `tests/Controls.test.jsx`
**Scope:** M

## Checkpoint A ✅ (2026-10-12)
- [x] `npm test` 32/32, `lint` clean, `build` clean; `pytest -q` 16 passed
- [x] Browser: header + step 1 from the real API at 1440px
- [x] Owner confirmed the course allows React

## Task 4: Step 2a — scatter chart ✅

**Description:** `Chart.jsx` wraps a `<canvas>` and an `InteractiveChart` instance created once per mount; new specs are swapped in (spec, canvas size, home/view/hover/drag reset, draw). Step 2 renders the scatter plate with its caption from the contract.

**Acceptance criteria:**
- [x] Changing pickers re-fetches the scatter and redraws without constructing a new `InteractiveChart`
- [x] Hover tooltip and zoom still work after axis changes (single instance by construction; adapter test)
- [x] Caption text matches the contract (key label read from /columns)

**Verification:**
- [x] Unit test: wrapper adapter against a fake class counts constructions = 1 across 3 spec swaps
- [x] Manual in browser with backend (live scatter in step 2)
**Dependencies:** T3
**Files:** `src/components/Chart.jsx`, `src/chartAdapter.js`, `src/App.jsx`, `tests/chartAdapter.test.js`
**Scope:** S

## Task 5: Step 2b — line chart, parallel fetch, states ✅

**Description:** Fetch scatter and line in parallel per run; keep the previous charts visible with a "running" mark until both land; drop stale responses by run id; show the backend's `detail` on 422 in a status line. Year-on-axis rule: line = other column vs year. Both plates bottom-aligned at equal height.

**Acceptance criteria:**
- [x] One picker change produces exactly two requests and one UI update
- [x] A slow earlier response never overwrites a newer one
- [x] 422 (e.g. constant column) shows the backend message, charts stay as they were

**Verification:**
- [x] RTL test with injected api: out-of-order resolution → latest wins; 422 → status text; busy mark
- [x] Manual: both charts live; year on an axis
**Dependencies:** T4
**Files:** `src/useRun.js`, `src/App.jsx`, `src/components/Status.jsx`, `tests/useRun.test.jsx`
**Scope:** M

## Task 6: describe.js (TDD) ✅

**Description:** Pure rules → `{ headline, band, sentences[] }`. Constants `STRONG=0.7`, `MODERATE=0.4`, `P_VERY=0.001`, `P_LIKELY=0.05`, `SMALL_N=30`. Sentences carry term markers (`{text, terms:[{term, start, end}]}`) so the UI can underline. Headline: "Strongly related — but that does not mean one causes the other." etc.

**Acceptance criteria:**
- [x] Boundary tests at r = ±0.7, ±0.4, p = 0.001, 0.05, n = 29/30
- [x] Negative r produces "negative" wording
- [x] `t === null` (perfect correlation) handled

**Verification:** `npm test`; 100% lines on `describe.js`
**Dependencies:** T1
**Files:** `src/describe.js`, `tests/describe.test.js`
**Scope:** S

## Task 7: glossary.js + Term tooltip ✅

**Description:** Fixed one-line definitions for r, r², p-value, n, t, df, slope, intercept. `Term.jsx` renders an underlined span with a tooltip on hover and keyboard focus (`aria-describedby`), positioned to stay inside the page.

**Acceptance criteria:**
- [x] Every stats-table key has a definition (test asserts the set)
- [x] Tooltip opens on focus, closes on blur/Escape

**Verification:** RTL test; manual keyboard pass
**Dependencies:** T1
**Files:** `src/glossary.js`, `src/components/Term.jsx`, `tests/Term.test.jsx`
**Scope:** S

## Task 8: Step 3 — read what the numbers say

**Description:** `Verdict.jsx` (headline + gold rule), `StrengthScale.jsx` (three bands, marker at |r| with mono label), `Sentences.jsx` (bullets with `Term`s), `StatsTable.jsx` (mono, underlined keys). Layout per contract: sentences 600px, table right, tooltip floats.

**Acceptance criteria:**
- [ ] Renders from `describe()` output and `spec.stats`; no inline logic beyond formatting
- [ ] Marker position = |r| × scale width; label shows r to 2 decimals

**Verification:** RTL test with a fixture stats object; manual vs. Figma frame 12:2
**Dependencies:** T5, T6, T7
**Files:** `src/components/Verdict.jsx`, `src/components/StrengthScale.jsx`, `src/components/Sentences.jsx`, `src/components/StatsTable.jsx`, `tests/Step3.test.jsx`
**Scope:** M

## Task 9: checks.js (TDD) ✅

**Description:** Pure rules → list of `{ kind: 'warn'|'try', title, body }`. Rules: shared-time-trend (year on an axis, or both columns year-keyed → always true for this backend; copy says "both change over time"), small sample (n < SMALL_N), and `try` only when `features.transform` is true.

**Acceptance criteria:**
- [x] Table-driven tests for each rule and for the empty case
**Verification:** `npm test`; 100% lines
**Dependencies:** T1
**Files:** `src/checks.js`, `tests/checks.test.js`
**Scope:** XS

## Task 10: Step 4 — before you conclude

**Description:** `CheckCard.jsx` (amber warn / blue try) rendered from `checks()`; actions row placeholder for T11.

**Acceptance criteria:**
- [ ] Cards reflect rules for the current stats; "try" card absent when the feature flag is off
**Verification:** RTL test; manual
**Dependencies:** T9, T5
**Files:** `src/components/CheckCard.jsx`, `src/App.jsx`, `tests/Step4.test.jsx`
**Scope:** S

## Checkpoint B
- [ ] Six-step happy path in the browser, no console errors
- [ ] Drop a renamed CSV into `data/final/`, restart uvicorn: pickers change, nothing else edited
- [ ] Owner review of the page against Figma 12:2

## Task 11: Downloads and copy

**Description:** "Download scatter (SVG)" via `window.SvgChart.download(spec, name)`; "Download (PNG)" via `canvas.toBlob`; "Copy the statistics" → clipboard text built by pure `exportText.js` (`statsToText(stats, labels)`).

**Acceptance criteria:**
- [ ] SVG file opens in a browser and shows the chart + stats box; file name includes both column names
- [ ] Clipboard text lists every stat with its label, one per line
**Verification:** unit test for `statsToText`; manual downloads; `node test_svg_export.js` still passes
**Dependencies:** T4, T8
**Files:** `src/exportText.js`, `src/components/Actions.jsx`, `tests/exportText.test.js`
**Scope:** S

## Task 12: Re-run choreography

**Description:** Running state marks on steps 2–4; sentences whose text changed since the previous run hold a highlight class until the next run (pure `diffSentences(prev, next)`); strength marker transitions 200ms; verdict highlight likewise.

**Acceptance criteria:**
- [ ] Highlight appears only on changed sentences; cleared on next run
- [ ] Reduced-motion media query disables the transitions
**Verification:** unit test for `diffSentences`; manual
**Dependencies:** T5, T8
**Files:** `src/diffSentences.js`, `src/components/Sentences.jsx`, `src/App.css`, `tests/diffSentences.test.js`
**Scope:** S

## Task 13: Contract polish and finish review

**Description:** Compare the live page to the direction contract and Figma 12:2 at 1440 and 1280 wide; fix spacing, type, rail grid, colors; run the design detector once; capture `.impeccable/review/desktop.png`; spawn the finish reviewer and act on its disposition; then the documenter writes `DESIGN.md`.

**Acceptance criteria:**
- [ ] Reviewer disposition recorded; material findings fixed or explicitly deferred
- [ ] `DESIGN.md` exists with tokens
**Verification:** screenshots in `.impeccable/review/`; all tests green
**Dependencies:** T1–T12
**Files:** `src/App.css`, `src/tokens.css`, `DESIGN.md`, `.impeccable/review/*`
**Scope:** M

## Checkpoint C: done
- [ ] All SPEC success criteria checked off in `SPEC.md`
- [ ] Vitest coverage targets met; pytest unchanged
- [ ] README gets a "Frontend" section with the two-terminal run instructions

## Stretch
- [ ] T14 Playwright happy-path test
- [ ] T15 Year-over-year transform (`?transform=diff`) — needs backend owner agreement; then enable `features.transform`
