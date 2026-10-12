# Frontend intent (confirmed 2026-10-12)

Confirmed with Yinuo Zhou after an interview. Specs and plans are downstream of this file; if they disagree with it, this file wins until it is updated.

## Statement of intent

- **Outcome:** A browser frontend for the core graph service: pick columns, see scatter and line charts, read fixed-rule descriptions of the stats, adjust basic settings.
- **User:** An intro data science or statistics student (COGS 108 level) holding the question "are these two things related, and can I say so?"
- **Why now:** CSE 210 warm-up demo, shown as a video to course staff and the student body. It needs a debatable idea, not just a working pipeline.
- **Success:** One happy path works end to end without anyone explaining the UI: open the app, a chart is already there, pick two columns, see both chart types, read the plain-language description, tweak a setting or two, leave with what you need.
- **Constraint:** Days, not weeks. Interpretation is hardcoded conditionals (thresholds on r and p), never adaptive or judgment-style. Backend changes: at most one small addition, only if cheap and agreed with the backend owner.
- **Out of scope:** Data upload or external databases, accounts, mobile layout, extra chart types, polished zoom and pan, any analysis beyond fixed thresholds.

## How the product stands out

A generic chart tool shows the data. This one shows the data *and* helps the student judge whether two trends are really related. The iPhone-sales-vs-fall-deaths dataset is the worked example (a strong correlation driven by a shared time trend), not the product.

## Design rules that follow

1. The frontend never hardcodes a dataset or column name. It reads `GET /columns`, groups by source file, and opens on the first valid pair. Swapping CSVs on the server must need no frontend change.
2. Always pass explicit `x` and `y` to the API; never rely on the backend defaults in `main.py`.
3. Plain-language stats come from a small lookup table (e.g. |r| >= 0.7 "strong", p < 0.05 "unlikely to be chance"). No model, no heuristics beyond the table.
4. The UI is purpose-built for the intro-stats student: vocabulary matches their course (r, r², p-value, n), and every number has a sentence next to it.

## Stretch (not core)

- A single "year-over-year change" transform so the student can watch r drop when the shared time trend is removed. Needs one backend query param. Cut it if the backend owner is unavailable.

## Open design questions (to resolve in the spec)

- Scatter and line chart: side by side in one window, or separate tabs?
- Where the plain-language description lives: beside the chart, under the stats box, or both?
- Which "settings" are exposed: axis choice, chart size, and what else?
