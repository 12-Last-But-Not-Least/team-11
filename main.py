from typing import Any, Optional
import math
import numpy as np

from fastapi import FastAPI, HTTPException, Query, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel

from plotting import build_line, build_scatter
from plotting.data import KEY, available_columns, display_name, select
from plotting.datasets import UnknownDataset, get_dataset, list_datasets
from plotting.imports import import_csv
from stats import correlation_stats

app = FastAPI(title="Warm-up Graphing API",
              description="Returns canvas draw commands for scatter and line charts. "
                          "Pick any columns from the data folder for the axes.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"])

DEFAULT_X = "iphone_norm"
DEFAULT_Y = "falls_norm"

Width = Query(800, ge=300, le=4000)
Height = Query(500, ge=200, le=4000)


class Stats(BaseModel):
    n: int
    r: float
    r_squared: float
    t: Optional[float]
    df: int
    p_value: float
    slope: float
    intercept: float


class RenderSpec(BaseModel):
    width: int
    height: int
    commands: list[dict[str, Any]]
    stats: Stats
    data: dict[str, Any]
    meta: dict[str, str]


class Column(BaseModel):
    name: str
    label: str
    source: str


class DatasetInfo(BaseModel):
    id: str
    name: str
    description: str
    kind: str
    row_count: int
    key: str
    key_label: str
    default_x: str
    default_y: str
    columns: list[Column]
    warnings: list[str] = []


def _dataset(dataset_id, session_id=None):
    if dataset_id is None:
        return None
    try:
        return get_dataset(dataset_id, session_id)
    except UnknownDataset as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


def _rows(*names, dataset=None):
    """Select complete observations; keep year joins only for legacy requests."""
    try:
        loader = dataset.select if dataset else select
        return loader(list(dict.fromkeys(names)))  # dedupe, keep order
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _stats(a, b):
    try:
        with np.errstate(over="raise", invalid="raise", divide="raise"):
            result = correlation_stats(a, b)
        if any(value is not None and not math.isfinite(value) for value in result.values()):
            raise ValueError("Selected values exceed the numerical range for analysis; rescale these columns")
        return result
    except FloatingPointError as e:
        raise HTTPException(status_code=422, detail="Selected values exceed the numerical range for analysis; rescale these columns") from e
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.get("/datasets", response_model=list[DatasetInfo])
def datasets(session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    return list_datasets(session_id)


@app.post("/datasets", response_model=DatasetInfo, status_code=201)
async def upload_dataset(request: Request, filename: str = Query(...),
                         session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    """Raw UTF-8 CSV body, with filename as a query parameter (not multipart)."""
    if not session_id:
        raise HTTPException(status_code=400, detail="A dataset session is required for imports")
    content = await request.body()
    try:
        return await run_in_threadpool(import_csv, content, filename, session_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.get("/columns", response_model=list[Column])
def columns(dataset_id: Optional[str] = None,
            session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    """Every column that can be used on an axis, and the file it comes from."""
    dataset = _dataset(dataset_id, session_id)
    return dataset.columns() if dataset else available_columns()


@app.get("/stats", response_model=Stats)
def get_stats(x: Optional[str] = None, y: Optional[str] = None,
              dataset_id: Optional[str] = None,
            session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    dataset = _dataset(dataset_id, session_id)
    x = x if x is not None else (dataset.default_x if dataset else DEFAULT_X)
    y = y if y is not None else (dataset.default_y if dataset else DEFAULT_Y)
    rows = _rows(x, y, dataset=dataset)
    return _stats(rows[x], rows[y])


@app.get("/plot/scatter", response_model=RenderSpec)
def scatter(x: Optional[str] = None, y: Optional[str] = None,
            width: int = Width, height: int = Height, dataset_id: Optional[str] = None,
            session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    dataset = _dataset(dataset_id, session_id)
    x = x if x is not None else (dataset.default_x if dataset else DEFAULT_X)
    y = y if y is not None else (dataset.default_y if dataset else DEFAULT_Y)
    rows = _rows(x, y, dataset=dataset)
    label = dataset.label if dataset else display_name
    xl, yl = label(x), label(y)
    spec = build_scatter(rows[x], rows[y], _stats(rows[x], rows[y]),
                         f"{yl} vs. {xl}", xl, yl, width, height,
                         labels=[str(int(v)) if float(v).is_integer() else str(v) for v in rows[dataset.key if dataset else KEY]])
    if dataset:
        spec["meta"].update(dataset_id=dataset.id, dataset_name=dataset.name)
    return spec


@app.get("/plot/line", response_model=RenderSpec)
def line(x: Optional[str] = None, y: Optional[list[str]] = Query(None),
         width: int = Width, height: int = Height, dataset_id: Optional[str] = None,
            session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    """One line per `y` column against `x` (repeat `y` for more lines).

    Stats: correlation of the first two `y` columns, or of `x` against `y` when
    only one `y` is given.
    """
    dataset = _dataset(dataset_id, session_id)
    x = x if x is not None else (dataset.key if dataset else KEY)
    if y is None:
        y = [dataset.default_x, dataset.default_y] if dataset else [DEFAULT_X, DEFAULT_Y]
    rows = _rows(x, *y, dataset=dataset)
    ys = list(dict.fromkeys(y))
    stats = _stats(rows[ys[0]], rows[ys[1]]) if len(ys) > 1 else _stats(rows[x], rows[ys[0]])
    label = dataset.label if dataset else display_name
    xl = label(x)
    if len(ys) == 1:
        title, yl = f"{label(ys[0])} vs. {xl}", label(ys[0])
    else:
        title = f"Line chart by {xl}"
        yl = "Normalized value (0-1)" if all(c.endswith("_norm") for c in ys) else "Value"
    series = [(label(c), rows[c]) for c in ys]
    spec = build_line(rows[x], series, stats, title, xl, yl, width, height)
    if dataset:
        spec["meta"].update(dataset_id=dataset.id, dataset_name=dataset.name)
    return spec
