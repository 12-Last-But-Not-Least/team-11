---
name: Graph Explorer
description: A guided four-step worksheet that pairs every correlation statistic with a plain-language sentence.
colors:
  ink: "#182b49"
  muted: "#4a5568"
  rule: "#dbe2ec"
  grid: "#e3e8f0"
  rail: "#f3f5f9"
  white: "#ffffff"
  tooltip: "#1f1f1f"
  blue: "#2563eb"
  blue-tint: "#e8efff"
  blue-mid: "#93b4f7"
  blue-deep: "#1e3a8a"
  blue-hover: "#1d4fd8"
  red: "#c62828"
  red-tint: "#fdecec"
  red-deep: "#7f1d1d"
  gold: "#ffcd00"
  chip-border: "#cbd5e1"
  scale-weak: "#d5deea"
typography:
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  brand:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "24px"
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
  subtitle:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "20px"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  caption:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  meta:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.06em"
  label-micro:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "22px"
    fontFeature: "tabular-nums"
  mono-label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  mono-tick:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "16px"
    fontFeature: "tabular-nums"
rounded:
  hairline: "2px"
  highlight: "3px"
  control: "6px"
  panel: "8px"
  pill: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "20px"
  xl: "24px"
  body: "28px"
  gutter: "40px"
  read-gap: "48px"
components:
  button-ghost:
    backgroundColor: "{colors.white}"
    textColor: "{colors.blue}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-ghost-hover:
    backgroundColor: "{colors.blue-tint}"
    textColor: "{colors.blue}"
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
    textColor: "{colors.white}"
  chip-select:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 36px 10px 14px"
  chip-select-mono:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.control}"
    padding: "10px 36px 10px 14px"
  chip-static:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  step-number:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    size: "36px"
  header-mark:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "7px"
    size: "30px"
  rail:
    backgroundColor: "{colors.rail}"
    width: "112px"
  verdict-panel:
    backgroundColor: "{colors.blue-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "14px 20px 16px 24px"
  check-warn:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red-deep}"
    rounded: "{rounded.panel}"
    padding: "14px 16px"
    width: "400px"
  check-try:
    backgroundColor: "{colors.blue-tint}"
    textColor: "{colors.blue-deep}"
    rounded: "{rounded.panel}"
    padding: "14px 16px"
    width: "400px"
  stats-table:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.panel}"
    padding: "10px 16px 12px"
  chart-frame:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.control}"
  glossary-tooltip:
    backgroundColor: "{colors.tooltip}"
    textColor: "{colors.white}"
    typography: "{typography.meta}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    width: "260px"
  status-error:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red-deep}"
    typography: "{typography.caption}"
    padding: "12px 40px"
---

# Design System: Graph Explorer

## Overview

**Creative North Star: "The Guided Worksheet"**

Graph Explorer is a white page with one numbered path down its left edge. Four steps (choose, look, read, check) sit on a 112px rail ruled like faint graph paper, and everything a student reads is set in Atkinson Hyperlegible Next in UCSD navy ink. The page refuses the category default of a sidebar of selects beside chart cards and the earlier notebook costume of In/Out prompts; the structure itself is the teaching device, and the chrome borrows from nothing.

The palette is "data-ink + Triton": the page takes its one structural color from the scatter chart it hosts, so the backend-drawn canvases and the page around them read as a single system. Navy is ink only and is never used as a fill. The scatter's blue carries every structural and interactive element; the line chart's red is reserved for cautions; and Triton gold appears in exactly two places as a wink, never as a band or a background. Depth is conveyed by tint and hairline, not by shadow.

Density is calm and laptop-scaled. The page is capped at 1440px, step bodies breathe at 28px, numbers and file names switch to JetBrains Mono, and the only motion is a marker sliding to a new r, a pale highlight on sentences that changed, and a shimmer while a run is in flight.

**Key Characteristics:**
- One structural color (the scatter's blue) shared by page chrome and canvas
- Navy is text, never a fill; near-black is reserved for the glossary tooltip
- Flat surfaces: tints, 1px rules and 1.5px outlines carry all depth
- Two radii, 6px for controls and 8px for panels; circles for step numbers and badges
- Hyperlegible sans for reading, monospace for every number, column and file name
- Gold in exactly two places: the verdict rule and the strength marker

## Colors

A white page inked in navy, structured in the scatter chart's blue, cautioned in the line chart's red, winked at in Triton gold.

### Primary
- **Scatter Blue** (`{colors.blue}`): every structural and interactive element: numbered step circles, the header mark, rail connector (via its mid tint), picker labels, underlined glossary terms, ghost-button outline and text, primary-button fill, the strong band of the strength scale, the r label above the marker, the caret, the list bullets in step 3 and the "running…" and "Copied" notes.
- **Scatter Blue Tint** (`{colors.blue-tint}`): the verdict panel ground, the ghost button hover, text selection, the step-4 "try it" card, and the changed-sentence highlight.
- **Scatter Blue Mid** (`{colors.blue-mid}`): the 2px rail connector between step circles, the moderate band of the strength scale, and the scrollbar thumb.
- **Scatter Blue Deep** (`{colors.blue-deep}`): body text inside the blue "try it" card only.
- **Scatter Blue Hover** (`{colors.blue-hover}`): the primary button's hover fill. It is a literal in App.css rather than a token in tokens.css; lift it when the primary button gains a second home.

### Secondary
- **Line-Chart Red** (`{colors.red}`): the badge of a caution card and nothing else.
- **Line-Chart Red Tint** (`{colors.red-tint}`): the ground of caution cards and the error status bar.
- **Line-Chart Red Deep** (`{colors.red-deep}`): body text inside caution cards and the error status bar.

### Tertiary
- **Triton Gold** (`{colors.gold}`): exactly two places: the 5px rule on the left edge of the verdict panel and the 16px strength-scale marker (ringed in 2.5px navy so it sits on the pale bands).

### Neutral
- **UCSD Navy Ink** (`{colors.ink}`): all reading text, the marker ring, and chip text. Never a background, never a fill.
- **Slate Muted** (`{colors.muted}`): taglines, step hints, chart captions, picker meta lines, the verdict note, scale ticks and the stats caption; also the chevron stroke in the select chip.
- **Hairline Rule** (`{colors.rule}`): 1px borders on the header, between steps, around chart canvases, the stats table and the skeleton.
- **Graph-Paper Grid** (`{colors.grid}`): the 24px grid lines on the rail.
- **Rail Paper** (`{colors.rail}`): the rail's ground, the skeleton shimmer's dark stop, and the scrollbar track.
- **White** (`{colors.white}`): page, chips, chart canvases, buttons at rest, and text on blue or red fills.
- **Tooltip Near-Black** (`{colors.tooltip}`): the glossary tooltip ground, the one dark fill on the page; it is deliberately not navy.
- **Chip Border** (`{colors.chip-border}`): the 1px stroke on select chips.
- **Weak Band** (`{colors.scale-weak}`): the weak segment of the strength scale.

### Named Rules
**The Ink-Not-Fill Rule.** Navy is for reading text and the marker ring only. Filled navy reads as black and was found heavy; a dark fill, when one is needed, is the tooltip near-black.

**The One-Structure Rule.** Anything structural or interactive is the scatter chart's blue or one of its three tints. A new control, badge, link or panel does not get a new hue.

**The Caution-Only Red Rule.** Red appears only on caution cards and the error status. Nothing decorative, nothing positive, is red.

**The Two Golds Rule.** Triton gold lives on the verdict rule and the strength marker, each a few pixels wide. It is never a band, a background, or a third element.

## Typography

**Display Font:** Atkinson Hyperlegible Next (with system-ui, Segoe UI, sans-serif), weights 400/500/600/700, loaded from Google Fonts
**Body Font:** Atkinson Hyperlegible Next (same family; there is no separate display face)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo), weights 400/500

**Character:** A hyperlegible humanist sans does all the reading at modest sizes, and a monospace takes over the moment a value is a number, a column, a file name or a scale tick, so the student can see at a glance which parts are data.

### Hierarchy
- **Headline** (Bold 700, 22px, 28px): the verdict sentence in step 3. The largest type on the page.
- **Brand** (Bold 700, 20px, 24px): the product name in the header only.
- **Title** (SemiBold 600, 18px, 24px): step titles, with the hint beside them at Caption size in muted.
- **Subtitle** (SemiBold 600, 15px, 20px): caution and "try it" card titles, in ink.
- **Body** (Regular 400, 16px, 24px): the three plain-language sentences (600px column) and chip text at 15px Medium.
- **Caption** (Regular 400, 14px, 20px): chart captions (max 64ch), step hints, verdict note (max 52ch), card bodies, button labels at Medium, the tagline.
- **Meta** (Regular 400, 13px, 18px): tooltip text, the sentences hint, the "Copied" note, dataset label at Medium.
- **Label** (Medium 500, 12px, 0.06em, uppercase): picker labels in blue; the "(across)" and "(up)" hint inside them returns to sentence case with no tracking.
- **Label Micro** (Medium 500, 11px, 0.08em, uppercase): the stats table caption in muted.
- **Mono** (Regular 400, 13px, 22px, tabular): the stats table.
- **Mono Label** (Medium 500, 12px): the r readout above the marker (blue), the tooltip term name (white), the "running…" note; Regular for picker meta lines in muted and the mono size chip at 14px.
- **Mono Tick** (Regular 400, 11px, tabular): the Weak / Moderate / Strong ticks under the scale.

### Named Rules
**The Mono-Is-Data Rule.** Numbers, column names, file names, chart sizes and scale ticks are JetBrains Mono; prose is never mono, and a number inside a sentence stays in the sentence's face.

**The One-Headline Rule.** 22px Bold is the verdict sentence and nothing else; the page has one headline and it is a plain-language claim, not a statistic.

## Layout

The page is a single centered column capped at 1440px with no mobile layout (the demo width is 1280 and wider). The header runs full width at 18px vertical and 40px horizontal padding over a 1px rule. Below it, each step is a flex row: a fixed 112px rail on the left (step circle at 24px from the top, 2px connector down to the next) and a fluid body padded 24px top, 28px sides and bottom. Steps are separated by the same 1px rule, and the rail carries a 24px graph-paper grid offset by -1px so its lines meet the page edge.

Spacing is an even rhythm: 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 40 and 48. Pickers wrap at a 320px basis and cap at 420px; the two charts sit in a wrapping flex row with a 20px gap whose basis is 86% of the chosen canvas width and whose max is the full width, so a 620×440 pair sits side by side unscaled at 1440, shrinks by at most 14% at 1280, and any larger size stacks instead of blurring. Step 3 pairs a 600px sentence column with the stats table at a 48px gap; the strength scale is a fixed 444px; caution cards are 400px wide in a 16px row. Chart canvases are drawn by the backend at their native size and are never upscaled.

## Elevation & Depth

This system is flat. There are no drop shadows anywhere; depth is tint and hairline. Panels (verdict, caution, "try it") are tinted grounds with no border; tables, chart canvases and the loading skeleton are white with a 1px rule border; chips carry a 1px chip-border stroke and ghost buttons a 1.5px blue outline. The one dark surface is the glossary tooltip (near-black on white, placed 8px below its term at z-index 10). The changed-sentence highlight uses a 4px zero-blur spread in the same tint as its background to bleed the highlight past the line box; it is a bleed, not a shadow, and inside the already-tinted verdict panel it is white.

### Named Rules
**The No-Shadow Rule.** Nothing casts a shadow. New surfaces earn separation with a tint (blue-tint, red-tint, rail) or a 1px rule, never with box-shadow.

**The Busy-Dims Rule.** While a run is in flight, the previous canvases dim to 60% over 150ms and a rail-to-white shimmer (1.2s linear) stands in for missing ones; neither animates under prefers-reduced-motion.

## Shapes

Two radii do almost all the work: controls (chips, buttons, chart frames, tooltip, skeleton) are 6px, and panels (verdict, caution and "try it" cards, stats table) are 8px. Counters are circles: 36px step numbers, 22px card badges, the 16px gold marker. Scale bands are 10px pills at 5px radius with a 2px gap between bands. Inline highlights round softly (2px on a focused term, 3px on a changed sentence). The header mark is a 30px rounded square at 7px, matching the favicon exactly. Strokes are 1px (rules, chip borders, chart frames), 1.5px (ghost outline, mark fit-line), 2px (rail connector, focus ring) and 2.5px (marker ring). Icons are authored 16px SVG paths at 1.75px stroke in currentColor, never glyphs.

## Components

### Buttons
Quiet, outlined, text-forward; they read as part of the sentence they sit beside.
- **Shape:** gently rounded (6px), 9px 14px padding, 14px Medium label, inline-flex with an 8px gap to a 16px icon.
- **Ghost (default):** white fill, 1.5px blue border, blue text. Used for Swap and all three download / copy actions. `btn--small` (5px 10px, 13px, 1px border) for the per-chart "Reset view".
- **Hover / Focus:** ghost hover fills blue-tint; focus-visible is a 2px blue outline offset 2px. No transition on buttons.
- **Icon buttons:** the 24px round "?" help button on every step title (blue on transparent, blue-tint when hovered or open) and the "Statistics" fold toggle (blue text with a rotating chevron).

### Chips
A native select dressed as an outlined chip; the chevron is an inline SVG in muted.
- **Style:** white, 1px chip-border, 6px radius, 10px 14px padding with 36px right room for the chevron, 15px Medium ink text.
- **Variants:** `chip--mono` (14px JetBrains Mono, the chart-size picker); `chip--dataset` (14px, the one-option dataset select in the header).
- **Focus:** 2px blue outline offset 2px.
- **Picker:** label above in 12px uppercase blue (muted for chart size), a 6px gap, then the mono meta line "file · 12 years · 2007–2018" in muted.

### Cards / Containers
- **Verdict panel:** blue-tint ground, 8px radius, 14px 20px 16px 24px padding, 20px below; a 5px Triton-gold rule pinned to its left edge (overflow hidden clips it to the corner). Headline at the top, then a row of the strength scale and a 52ch muted note at a 24px gap.
- **Statistics bar:** 1px rules above and below, a "Statistics" toggle (14px Medium blue, chevron rotates open), then a two-row table in 13px/22px tabular mono: one column per stat, underlined glossary terms in muted as headers, values beneath. Appears twice: between the scatter and the line chart (open by default) and at the top of step 3 (folded by default).
- **Chart frame:** a right-aligned small ghost "Reset view" button above; the backend canvas at 100% width, 1px rule border, 6px radius, white; a 14px muted caption (max 64ch) 10px below. The backend's in-canvas stats box is filtered out before drawing.
- **Help note:** a 14px/20px muted paragraph (max 72ch) with a 1px blue-mid left rule, shown under a step title while its "?" is open.
- **Shadow Strategy:** none; see Elevation & Depth.

### Inputs / Fields
The only inputs are the select chips above. Caret is blue, selection is blue-tint on ink.

### Navigation
The rail is the navigation: a 112px column in rail paper with a 24px grid, a 36px blue circle carrying the step number in 16px Bold white, and a 2px blue-mid connector to the next step (omitted on the last). The header is brand (mark, name) left and the one-option dataset select right, over a 1px rule. There are no links and no mobile treatment.

### Strength Scale
A 444px ruler placing r on Weak / Moderate / Strong. Three 10px pill bands (weak band, blue-mid, blue) sized by the describe.js thresholds with a 2px gap; a 16px gold marker ringed in 2.5px navy at the r position, sliding on `left` over 200ms ease-out; the r readout in 12px blue mono right-aligned above the marker; tick labels in 11px tabular mono below. Reduced motion removes the slide.

### Glossary Term
Any defined term inside a sentence or the stats table is blue with a 1px underline offset 3px and a help cursor. On hover or focus a 260px tooltip appears 8px below: near-black ground, white 13px/18px text, the term name above it in 12px Medium mono, 6px radius. Escape closes it.

### Changed-Sentence Highlight
After a re-run, the verdict headline and any sentence whose text changed take a blue-tint ground with a 4px spread of the same tint and a 3px radius, transitioning in over 200ms ease-out and holding until the next run lands; inside the verdict panel the highlight is white. Disabled under prefers-reduced-motion.

## Do's and Don'ts

### Do:
- **Do** use the scatter's blue (`{colors.blue}`) and its tints for any new structural or interactive element; the page and the canvases share one hue.
- **Do** keep navy as text: 16/24 body in ink, muted for secondary prose.
- **Do** set every number, column name, file name and scale tick in JetBrains Mono with tabular figures.
- **Do** separate surfaces with a tint or a 1px rule, and give controls 6px and panels 8px corners.
- **Do** author icons as 16px SVG paths at 1.75px stroke in currentColor.
- **Do** keep motion to 200ms ease-out on state changes and disable it under prefers-reduced-motion.

### Don't:
- **Don't** fill anything with navy; a dark surface is the tooltip near-black.
- **Don't** add box-shadow to any surface.
- **Don't** use red for anything but an error status.
- **Don't** add a third use of Triton gold, or widen either existing one into a band or background.
- **Don't** scale a chart canvas; it is drawn at its chosen pixel size, and the charts stack vertically.
- **Don't** introduce a mobile layout, a sidebar of controls, or notebook In/Out chrome.
