# Design decisions

## Why canvas graphing

- Canvas is drawn in the browser, so Python cannot draw on it directly. We have the backend produce a **render spec**: a JSON list of canvas-style draw commands in pixel coordinates. The frontend replays them with about 30 lines of JS (see `USAGE.md`).
- All the real work (axis ranges, nice ticks, scaling, flipping y, the regression line, the stats box) lives in one tested Python module, `plotting/render.py`. The frontend stays thin and cannot disagree with the backend about the numbers.
- Canvas needs no chart library on the page and draws thousands of points quickly. A DOM/SVG approach gets slow as point counts grow.
- Because the output is data, not an image, the frontend can restyle it, scale it, or later add hover / tooltips by keeping the points it draws. PNG images from the server would not allow that.
- Trade-off: canvas output is not accessible to screen readers or searchable like SVG. For a warm-up project this is acceptable. If it matters later, the same spec could be converted to SVG, since each op maps directly to an SVG element.
- Trade-off: the spec is sized for a specific width / height. Requesting a new size re-renders on the server (cheap), rather than scaling on the client.

## Interactivity (zoom, pan, hover)

- Interaction runs in the browser: a server round trip per mouse move would feel laggy. The backend's job is to make it easy, so the spec carries a `data` block (plot-area bounds, axis ranges, every point's data value, hover label) next to the pixel `commands`.
- Commands are tagged `static` or `plot`. When you zoom, titles, legend and the stats box stay put while the grid, ticks and points are redrawn from `data`.
- Server-side zoom (re-fetching a spec per zoom range) was considered and rejected. It adds latency to every pan and zoom, and the dataset has 12 rows. It could be added later as `x_min`/`x_max` query params if datasets get large.
- `interactive.js` is an example, not a requirement. The frontend team can replace it, since the contract is the spec.

## Why FastAPI

- Pydantic models give automatic request validation and typed responses. Bad input becomes a clear HTTP 422 instead of a crash.
- `/docs` generates interactive API documentation for free, so frontend teammates can try endpoints without reading code.
- `stats.py` stays plain Python / NumPy. The API is a thin layer around it, so the same functions can be used in notebooks or scripts.
- Scalability: handlers are plain functions, so we can add async I/O, a database or file uploads later without restructuring. The rendering code has no FastAPI dependency, so it can move behind a different framework or a job queue if needed.
- Axes are chosen with query params (`x`, `y`) against the CSVs in the data folder. We removed the POST endpoints because users cannot add their own data. Taking data in a request body would only add an attack surface (huge arrays) with no benefit.
- All CSVs in `final/` are joined on `year` into one table, so any column can go on any axis, even across files. Adding a dataset means dropping in a CSV.

## Other choices

- **Line chart stats**: `stats.py` computes a correlation between two variables. The default line chart (two series over year) shows the iPhone-vs-falls stats, the same as the scatter.
- **Stats appear twice**: drawn as text commands (so the chart is self-contained) and as a `stats` field (so the frontend can display them in its own UI).
- **Right-hand panel**: the legend and stats box sit in a reserved margin so they never cover data points.
- **CORS is open** for development. Restrict `allow_origins` before any real deployment.
- **The default dataset is normalized to 0-1** by the cleaning notebook. Rendering is generic and works on any numeric range.
