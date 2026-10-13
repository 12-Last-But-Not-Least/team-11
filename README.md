# Warm_up_project

CSE 210 warm-up: a graphing tool for intro data-science students. It plots any two columns of a dataset as a scatter and a line chart, and pairs every statistic with a plain-language sentence from fixed rules, so the student can judge whether two trends are really related.

## Layout

| Folder / file | What it is |
|---|---|
| `main.py`, `plotting/`, `stats.py` | FastAPI backend: joins the CSVs on `year`, computes correlation stats, returns canvas draw commands (`USAGE.md` has the API contract) |
| `Data_Clean_UP/` | Cleaning notebook, raw and normalized CSVs (drop a CSV with a `year` column into `data/final/` to add data) |
| `interactive.js`, `svg_export.js`, `canvas_svg_demo.html` | Shared browser scripts: canvas replay with zoom/pan/hover, SVG export, and a vanilla demo page |
| `frontend/` | React + Vite app: the four-step guided worksheet (choose, look, read, check) |
| `SPEC.md`, `docs/intent/`, `PRODUCT.md`, `tasks/` | Frontend spec, confirmed intent, product record, implementation plan |

## Run it

Two terminals.

```bash
# 1. backend (API on http://127.0.0.1:8000, docs at /docs)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload
```

```bash
# 2. frontend (http://127.0.0.1:5173)
cd frontend && npm install && npm run dev
```

The frontend reads the API address from `VITE_API_URL` (see `frontend/.env.example`; the default is the address above).

## Test it

```bash
.venv/bin/python -m pytest -q        # backend (16 tests)
cd frontend && npm test              # frontend (Vitest + Testing Library, with coverage)
cd frontend && npm run lint          # oxlint
cd frontend && npm run test:e2e      # Playwright happy path (uses the installed Chrome; starts both servers if needed)
node test_svg_export.js              # SVG exporter
```

## Design decisions

`DESIGN_DECISIONS.md` explains the backend's render-spec approach. `SPEC.md` and `.impeccable/surfaces/` hold the frontend's spec and visual direction; the mockup is in Figma (linked from `SPEC.md`).
