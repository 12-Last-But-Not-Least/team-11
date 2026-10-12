---
version: 1
slug: "frontend-src-app-jsx"
primary_target: "frontend/src/App.jsx"
related_targets: []
---

## Surface

Graph Explorer main page (`frontend/src/App.jsx`). Mode: Operate. Audience: intro data science / stats student on a laptop, mid-assignment, new to this kind of dataset. Task: pick two columns, see scatter + line, read what the stats mean in plain words, run the causation checks, download the figure. Constraints: backend untouched; chart canvases keep the backend's colors (blue data, gray dashed fit, white ground); no mobile layout; days-long build.

## Direction contract

THESIS: The page is a guided worksheet for someone who has never read a correlation before: four numbered steps down one rail (choose, look, read, check), with the plain-language verdict placed before any statistic and the causation checks built in as a step, not a footnote. It refuses both the category default (sidebar of selects beside chart cards) and the earlier Jupyter costume (In/Out prompts): the structure teaches, the chrome borrows from nothing.

OWN-WORLD ("data-ink + Triton", chosen 2026-10-12): White page. Ink is UCSD navy (#182b49) for reading text only; it is never used as a fill (filled navy reads as black and the owner found it heavy). Every structural and interactive element (numbered step circles, header mark, rail connector, axis labels, underlined terms, verdict panel tint #e8efff, buttons, strength-scale fill, step-4 'try it' card) uses the scatter chart's own blue (#2563eb) so the page and the canvases read as one system. Cautions use the line chart's red (#c62828 on #fdecec) and nothing else is red. Triton gold (#ffcd00) appears in exactly two places: a 5px rule on the left edge of the verdict panel and the strength-scale marker; never as a band or background, so it stays a wink and not a university page. The 112px left rail carries a faint 24px graph-paper grid (#e3e8f0) behind the step circles. Type is Atkinson Hyperlegible Next for everything a student reads (headline Bold 22, step titles SemiBold 18, body 16/24) and JetBrains Mono for numbers, column names, file names and the strength-scale labels. Pickers and buttons are 6px-radius outlined chips, no shadows. Charts keep backend colors and sit in a 1px #dbe2ec frame with a one-sentence caption under each.

STORY: The student lands on a page that already shows a chart and a numbered path. They swap columns in step 1 (each picker states its file, n and key range), see both views in step 2 and read the captions that tell them what to look for, see the statistics once under the charts, get a one-line verdict in step 3 with the number placed on a Weak–Moderate–Strong ruler and every term defined on hover, and in step 4 save or copy what they found. Each step's "?" explains it on demand. They leave with a sentence they can defend in a write-up.

FIRST VIEWPORT (1440×900): header 80px: blue scatter-glyph mark (three dots on a dashed fit line), "Coincidence? I Think Not", no tagline; a "Dataset" select at right with one option (the loaded folder). Every step title carries a 24px "?" help button that toggles a muted guidance note (no always-visible hints). Step 1 (≈180px): X and Y picker cards (420px each, label + chip + mono meta line "file · 12 years · 2007–2018"), a Swap ghost button between them, chart-size chip at right. Step 2: scatter and line canvases at the chosen size (default 620×440: side by side unscaled at 1440, shrunk by at most 14% at 1280 before the pair stacks; larger sizes stack rather than scale), each with a small "Reset view" ghost button above it and a caption below; the backend's in-canvas stats box is filtered out of the draw commands, and the statistics appear once as a foldable two-row table ("Statistics" toggle at left) under the charts.

SIGNATURE INTERACTION: changing a picker re-runs steps 2–4 together. The verdict headline and any sentence whose text changed hold a pale blue highlight until the next run lands. The strength-scale marker slides along the ruler to the new |r| (200ms). Hovering any underlined term shows its one-line glossary card. Hover on a chart point shows a mono tooltip with year and values.

FORM: Guided Worksheet, an owner-steered refinement of the chosen Notebook Cell direction (same topology, original identity). Seed key 12f30110, kind pick, build path code. Figma: https://www.figma.com/design/hwFRPONo9qUnkF8smnBhIz node 12:2 (data-ink + Triton, current); node 7:2 is the teal draft and 2:2 the superseded notebook variant, both kept for comparison.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
