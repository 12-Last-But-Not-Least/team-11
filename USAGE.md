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

All plot endpoints return a **render spec** (see below). Optional `width` / `height` query params (300-4000 / 200-4000, default 800x500). Read endpoints use GET; CSV imports use POST. Named datasets include bundled CSVs and temporary uploaded tables. Requests without `dataset_id` use the legacy CSV loader in `Data_Clean_UP/data/final/`.

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
| ctrl + wheel / ⌘ + wheel / trackpad pinch | zoom both axes around the cursor, by how far you scroll (`ZOOM_SPEED` in `interactive.js` sets the speed) |
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

### Named datasets

`GET /datasets` returns five bundled examples (iPhone/falls, ice cream/sharks, Palmer Penguins, Old Faithful, and New York Air Quality) plus temporary imports,
including IDs, names, descriptions, row counts, numeric columns, ordering key,
default X/Y axes, and import warnings.
Use `dataset_id` on every request to select a table independently of other
clients:

```text
/columns?dataset_id=iphone-falls
/plot/scatter?dataset_id=icecream-sharks
/plot/line?dataset_id=icecream-sharks
/stats?dataset_id=iphone-falls&x=iphone_units_sold_millions_norm&y=deaths_norm
```

Omitted axes use the selected dataset's defaults; the default line X is its
ordering key. Explicit X/Y choices still work. Plot `meta` includes
`dataset_id` and `dataset_name`. Unknown dataset IDs return 404; unknown columns
and unusable analyses return 422. Statistics require at least three complete,
finite pairs with nonconstant axes. Missing cells are excluded for the selected
columns, identically in the default scatter, line, and statistics responses.

Each named dataset is isolated: matching column names do not join tables.
The monthly example uses 1–12 for January–December. No automatic normalization
is applied by the loader; the two existing examples were already normalized.
Expansion to 3–5 defaults with documented original sources is deferred until
dataset switching and CSV import are implemented.

The frontend Dataset dropdown lists this catalog and switches the full
worksheet. Switching resets axes to the dataset defaults and chart size to
800 × 500. Old results and exports are hidden until both new plots succeed;
late responses cannot overwrite a newer selection. If loading fails, select
another dataset to recover. Export filenames include the dataset ID and copied
statistics include its name. Requests without `dataset_id` retain the legacy
behavior below.

### Importing a CSV

Choose a file in **CSV file**, then click **Import CSV**. A successful import
appears in the Dataset dropdown and is selected automatically. Invalid uploads
show an error without replacing the current dataset or its results.

- UTF-8 comma-delimited CSV, optionally with a BOM; filename must end in `.csv`.
- A header is required. Header whitespace is trimmed; empty/duplicate headers
  and mismatched field counts are rejected. Quoted fields and blank lines work.
- At least two nonconstant numeric columns must share three complete rows.
  Empty cells and `NA` (case-insensitive) are treated as missing; affected rows are omitted only for selections using
  those columns. Text/mixed columns are excluded from the imported table and unavailable
  as axes, with a note shown in the UI. NaN/infinity are rejected.
- A complete numeric `year` column orders observations. Otherwise rows keep
  their file order using a generated row index. Dates and month names are not
  automatically parsed. No normalization or imputation is applied.
- All numeric CSV columns, including `rownames`, can be default axes.
  Defaults are the first usable pair in CSV column order, falling back
  to `year` as an axis if necessary. Users can change axes after import.

API: `POST /datasets?filename=observations.csv` with `Content-Type: text/csv`
and the **raw file bytes as the request body** (not JSON or multipart).
Returns **201** with dataset metadata or **422** for validation failures.

Imports are temporary: numeric tables and metadata stay in backend memory,
with no uploaded files written to disk. All clients using the same backend
can access uploaded datasets, including after a page reload. Backend restarts,
redeployments, and hosting spin-down clear uploads; keep the original CSV to
import again. Closing a browser does not clear uploads.

Run a single backend process/worker because this registry is not shared across
workers. GitHub Pages serves the frontend; imports still require the separately
hosted API. Old files in `local_data/datasets/` are no longer read.
Reimporting the same filename creates a separate dataset. No rename/deletion
UI is included yet.

Tests isolate the in-memory registry; browser tests use ports 8001/5174 and do not reuse
your running development servers.

### Legacy folder-based loading

Drop a CSV into `Data_Clean_UP/data/final/` and restart the server. No code changes.

- The file needs a `year` column (the join key). Files without one are ignored.
- Every other column with only numbers becomes available on `/columns` and on both axes. Text columns are skipped. Empty cells are allowed; that year is left out of any chart using that column.
- Column names must be unique across files. If two files have the same column name, the first file alphabetically wins.
- Optional: add a friendly axis/legend name for a column to `DISPLAY_NAMES` in `plotting/data.py`. Otherwise the column name with underscores replaced by spaces is used.
- To change the default chart (what `/plot/scatter` and `/plot/line` show with no params), edit `DEFAULT_X` / `DEFAULT_Y` at the top of `main.py`.
- If the new data is keyed by something other than year, change `KEY` in `plotting/data.py`. The join, the hover labels and the tests all follow it, though the test fixtures write `year` columns and would need updating.

Nothing in `plotting/render.py` or `stats.py` knows about iPhones or falls. Tick marks are computed from the data range, so un-normalized data (any range, negatives included) works. Integer x values with 20 or fewer points (e.g. years) get one tick per point.

**Adding another chart type** (bar, histogram, ...): add a `build_<name>` function in `plotting/render.py` that returns the same spec (reuse `_Frame` for axes/grid/labels), then add an endpoint in `main.py`. If you only use the existing ops, the frontend needs no changes.
