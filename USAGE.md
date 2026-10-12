# Using the graphing API

## Run it

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

- API at `http://127.0.0.1:8000`
- Interactive docs (try every endpoint in the browser): `http://127.0.0.1:8000/docs`
- Tests: `python -m pytest -q`

## Endpoints

All plot endpoints return a **render spec** (see below). Optional `width` / `height` query params (300-4000 / 200-4000, default 800x500). Everything is GET; all data comes from the CSVs in `Data_Clean_UP/data/final/`.

| Path | What it returns |
|---|---|
| `GET /columns` | every column usable on an axis (`name`, display `label`, source `file`). Use it to fill the axis dropdowns. |
| `GET /plot/scatter?x=<col>&y=<col>` | scatter of `y` against `x` with least-squares line and stats box. Defaults: `x=iphone_norm`, `y=falls_norm`. |
| `GET /plot/line?x=<col>&y=<col>&y=<col>` | one line per `y`, drawn in x order. Repeat `y` for more lines. Defaults: `x=year`, `y=iphone_norm&y=falls_norm`. |
| `GET /stats?x=<col>&y=<col>` | just the stats dict from `stats.py` for those two columns |

Examples:

```
/plot/scatter?x=iphone_norm&y=falls_norm        # the default chart
/plot/scatter?x=falls_norm&y=iphone_norm        # axes swapped
/plot/scatter?x=year&y=falls_norm               # trend over time
/plot/line?x=year&y=falls_norm                  # a single line
/plot/line?y=iphone_norm&y=falls_norm&y=deaths_norm
```

**Switching what is on the axes** = change the `x` / `y` query params (the column names come from `/columns`). Columns from different files can be mixed: all files are joined on `year`, and only years present in every selected column are plotted (so `n` in the stats is that count).

**Stats:** for a scatter, the correlation of `x` against `y`. For a line chart with 2+ `y` columns, the correlation of the first two `y` columns; with one `y`, the correlation of `x` against `y`.

**Errors (HTTP 422, with a message):** unknown column (the message lists the valid ones), no years in common, a constant column (correlation is undefined), width/height out of range.

## The render spec

```json
{
  "width": 800, "height": 500,
  "commands": [ ... ],
  "stats": { "n": 12, "r": 0.98, "r_squared": 0.96, "t": 15.1, "df": 10,
             "p_value": 3e-8, "slope": 1.0, "intercept": 0.0 },
  "data": { ... },
  "meta": { "title": "...", "x_label": "...", "y_label": "..." }
}
```

`commands` are in draw order. Coordinates are canvas pixels already (y flipped, margins applied), so the frontend does no math. The stats box is also drawn as text commands in the right-hand margin, and `stats` is returned separately in case the frontend wants it elsewhere.

| op | fields |
|---|---|
| `rect` | `x, y, w, h, fill`, optional `stroke, width` |
| `line` | `x1, y1, x2, y2, stroke, width` |
| `polyline` | `points: [[x, y], ...], stroke, width`, optional `dash: [on, off]` |
| `circle` | `x, y, r, fill`, optional `stroke, width` |
| `text` | `x, y, text, font, fill, align`, optional `rotate` (degrees, around x,y) |

Every command also has `"layer": "static"` (background, titles, axis labels, legend, stats box) or `"plot"` (grid, ticks, axes, points, lines). A static frontend can ignore `layer` and replay everything. An interactive one replays only the static commands and redraws the plot layer itself (see below).

### `data` block (for zoom / pan / hover)

```json
"data": {
  "plot_area": { "left": 70, "right": 590, "top": 50, "bottom": 440 },
  "x_axis": { "min": 0.0, "max": 1.0, "ticks": [0, 0.2, ...], "decimals": 1, "from_data": false },
  "y_axis": { ... same shape ... },
  "series": [ { "name": "data", "kind": "points" | "line", "color": "#2563eb", "radius": 4.5,
                "line_width": 2.5,
                "points": [ { "x": 0.73, "y": 0.62, "label": "2014\niPhone units sold ...: 0.7302\n..." } ] } ],
  "fit": { "slope": 0.89, "intercept": -0.01, "x_min": 0.0, "x_max": 1.0, "color": "#6b7280" }
}
```

- `plot_area` and the axis `min`/`max` map data values to pixels: `px = left + (x - xmin) / (xmax - xmin) * (right - left)`, and y is flipped. Zooming and panning just change the visible min/max.
- `label` is the hover tooltip text (lines separated by `\n`). On the default scatter the first line is the year.
- `from_data` is true when the axis ticks sit on the data points (e.g. years), so a frontend can keep those ticks while zoomed.
- `fit` is `null` on line charts.

## Interactive charts (zoom, pan, hover)

`interactive.js` is a dependency-free example frontend built on the `data` block:

```html
<canvas id="c"></canvas>
<script src="interactive.js"></script>
<script>
  InteractiveChart.load(document.getElementById("c"), "http://127.0.0.1:8000/plot/scatter");
</script>
```

| Action | Result |
|---|---|
| mouse wheel | scrolls the page as usual; over the plot, a hint says how to zoom |
| ctrl + wheel / ⌘ + wheel / trackpad pinch | zoom both axes around the cursor |
| add shift / add alt to the above | zoom x only / y only |
| drag | pan |
| hover | tooltip for the nearest point (within ~14 px) |
| double-click | reset |

`chart.zoom(0.8)` / `chart.zoom(1.25)` / `chart.reset()` are available for buttons. Load any axis combination by passing its URL, e.g. `.../plot/scatter?x=year&y=falls_norm`; to switch axes, call `load` again with the new URL. Touch / pinch is not implemented. All the interaction runs in the browser, with no server calls after the first load.

## Frontend: drawing it on a canvas

This is all the frontend needs (`<canvas id="c"></canvas>`):

```js
async function draw(url) {
  const spec = await (await fetch(url)).json();
  const canvas = document.getElementById("c");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  for (const c of spec.commands) {
    ctx.save();
    ctx.setLineDash(c.dash || []);
    if (c.op === "rect") {
      ctx.fillStyle = c.fill; ctx.fillRect(c.x, c.y, c.w, c.h);
      if (c.stroke) { ctx.strokeStyle = c.stroke; ctx.lineWidth = c.width || 1; ctx.strokeRect(c.x, c.y, c.w, c.h); }
    } else if (c.op === "line") {
      ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2);
      ctx.strokeStyle = c.stroke; ctx.lineWidth = c.width; ctx.stroke();
    } else if (c.op === "polyline") {
      ctx.beginPath(); c.points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.strokeStyle = c.stroke; ctx.lineWidth = c.width; ctx.stroke();
    } else if (c.op === "circle") {
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
      ctx.fillStyle = c.fill; ctx.fill();
      if (c.stroke) { ctx.strokeStyle = c.stroke; ctx.lineWidth = c.width || 1; ctx.stroke(); }
    } else if (c.op === "text") {
      ctx.translate(c.x, c.y); ctx.rotate((c.rotate || 0) * Math.PI / 180);
      ctx.font = c.font; ctx.fillStyle = c.fill; ctx.textAlign = c.align;
      ctx.fillText(c.text, 0, 0);
    }
    ctx.restore();
  }
}
draw("http://127.0.0.1:8000/plot/scatter");
```

CORS is open (`*`) so a frontend served from another port can call the API. Tighten `allow_origins` in `main.py` before deploying anywhere real.

## Adding or switching datasets

Drop a CSV into `Data_Clean_UP/data/final/` and restart the server. No code changes.

- The file needs a `year` column (the join key). Files without one are ignored.
- Every other column with only numbers becomes available on `/columns` and on both axes. Text columns are skipped. Empty cells are allowed; that year is left out of any chart using that column.
- Column names must be unique across files. If two files have the same column name, the first file alphabetically wins.
- Optional: add a friendly axis/legend name for a column to `DISPLAY_NAMES` in `plotting/data.py`. Otherwise the column name with underscores replaced by spaces is used.
- To change the default chart (what `/plot/scatter` and `/plot/line` show with no params), edit `DEFAULT_X` / `DEFAULT_Y` at the top of `main.py`.
- If the new data is keyed by something other than year, change `KEY` in `plotting/data.py`. The join, the hover labels and the tests all follow it, though the test fixtures write `year` columns and would need updating.

Nothing in `plotting/render.py` or `stats.py` knows about iPhones or falls. Tick marks are computed from the data range, so un-normalized data (any range, negatives included) works. Integer x values with 20 or fewer points (e.g. years) get one tick per point.

**Adding another chart type** (bar, histogram, ...): add a `build_<name>` function in `plotting/render.py` that returns the same spec (reuse `_Frame` for axes/grid/labels), then add an endpoint in `main.py`. If you only use the existing ops, the frontend needs no changes.
