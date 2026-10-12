from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from plotting import build_line, build_scatter
from plotting.data import KEY, available_columns, display_name, select
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


def _rows(*names):
    """Selected columns joined on year; bad column names / no overlap become HTTP 422."""
    try:
        return select(list(dict.fromkeys(names)))  # dedupe, keep order
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _stats(a, b):
    try:
        return correlation_stats(a, b)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.get("/columns", response_model=list[Column])
def columns():
    """Every column that can be used on an axis, and the file it comes from."""
    return available_columns()


@app.get("/stats", response_model=Stats)
def get_stats(x: str = DEFAULT_X, y: str = DEFAULT_Y):
    rows = _rows(x, y)
    return _stats(rows[x], rows[y])


@app.get("/plot/scatter", response_model=RenderSpec)
def scatter(x: str = DEFAULT_X, y: str = DEFAULT_Y,
            width: int = Width, height: int = Height):
    rows = _rows(x, y)
    xl, yl = display_name(x), display_name(y)
    return build_scatter(rows[x], rows[y], _stats(rows[x], rows[y]),
                         f"{yl} vs. {xl}", xl, yl, width, height,
                         labels=[str(v) for v in rows[KEY]])


@app.get("/plot/line", response_model=RenderSpec)
def line(x: str = KEY, y: list[str] = Query([DEFAULT_X, DEFAULT_Y]),
         width: int = Width, height: int = Height):
    """One line per `y` column against `x` (repeat `y` for more lines).

    Stats: correlation of the first two `y` columns, or of `x` against `y` when
    only one `y` is given.
    """
    rows = _rows(x, *y)
    ys = list(dict.fromkeys(y))
    stats = _stats(rows[ys[0]], rows[ys[1]]) if len(ys) > 1 else _stats(rows[x], rows[ys[0]])
    xl = display_name(x)
    if len(ys) == 1:
        title, yl = f"{display_name(ys[0])} vs. {xl}", display_name(ys[0])
    else:
        title = f"Line chart by {xl}"
        yl = "Normalized value (0-1)" if all(c.endswith("_norm") for c in ys) else "Value"
    series = [(display_name(c), rows[c]) for c in ys]
    return build_line(rows[x], series, stats, title, xl, yl, width, height)
