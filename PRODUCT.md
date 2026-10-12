# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18 + JavaScript, built with Vite, plain CSS. No chart library: charts are drawn on `<canvas>` from render specs the backend returns, via the existing `interactive.js`. Frontend and backend (FastAPI, Python) run as separate processes; see SPEC.md.

## Users

Primary: a student in an intro data science or statistics course (COGS 108 level) who has two yearly series and is asking "are these two things related, and can I say so in my write-up?" They open the app on a laptop, in a browser, usually mid-assignment.

Secondary (evaluators, not users): CSE 210 course staff and fellow students watching a recorded video demo.

## Product Purpose

A chart explorer that pairs every statistic with a plain-language sentence, so the student leaves knowing not only that r = 0.98 but what that does and does not mean. Success: the six-step happy path in SPEC.md works end to end without anyone explaining the UI, and a demo viewer comes away with a debatable idea (strong correlations can come from a shared time trend), not just a working pipeline.

## Positioning

A generic chart tool shows the data. This one shows the data *and* helps the student judge whether two trends are really related, by showing the scatter and the time series side by side and describing the statistics in fixed, honest, course-vocabulary sentences. The interpretation is deliberately rule-based (thresholds on r, p, n), never adaptive or "AI judgment".

## Operating Context

- Backend: FastAPI service reading CSVs in `Data_Clean_UP/data/final/`, joining on `year`, returning canvas draw commands plus a `data` block and stats (`USAGE.md`).
- Worked example dataset: iPhone units sold vs. US fall deaths, 2007–2018, both min-max normalized. It is an example, not the product; the frontend must never hardcode it.
- Demo: screen-recorded video on a laptop (1280 px and wider). No mobile layout required.
- Course: CSE 210 warm-up project, group work, days-long build.

## Capabilities and Constraints

- Pick any x and y column from `GET /columns`; scatter with least-squares fit and stats box; line chart over time; hover tooltips; chart size; PNG download.
- Description rules and thresholds are fixed in SPEC.md.
- Backend is owned by a teammate and is not changed on this branch.
- Out of scope: data upload, external databases, accounts, extra chart types, polished zoom/pan, mobile.
- Undecided: product name ("Graph Explorer" placeholder). Whether the course forbids UI frameworks or chart libraries is unverified; chart libraries are avoided by choice.

## Brand Commitments

None yet. No name, logo, or house style exists. The backend's chart colors (`#2563eb` blue, `#dc2626` red, `#16a34a` green, `#9333ea` purple, gray fit line, white chart background) are baked into the render spec and will appear inside the canvases regardless of page styling.

## Evidence on Hand

- Real dataset and cleaning notebook: `Data_Clean_UP/`.
- Real stats from the backend (r, r², t, df, p, slope, intercept) for any column pair.
- No testimonials, users, or usage data exist; do not fabricate any.

## Product Principles

1. The student should never need the UI explained; the opening screen already shows a chart.
2. Every number gets a sentence; the sentence comes from a visible rule, not a model.
3. Scatter and time series are shown together because the comparison is the lesson.
4. The frontend assumes nothing about the dataset; swapping CSVs must need no code change.
5. Course vocabulary (r, r², p-value, n) is used as-is; no invented jargon.

## Accessibility & Inclusion

Keyboard-operable controls and readable contrast on a laptop screen. Canvas charts are not screen-reader accessible (inherited backend trade-off, recorded in DESIGN_DECISIONS.md); the plain-language description partly compensates by stating the key numbers as text.
