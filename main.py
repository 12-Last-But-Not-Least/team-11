from math import isclose, isfinite
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, model_validator
from starlette.responses import JSONResponse

from plotting import build_line, build_scatter
from plotting.data import KEY, available_columns, display_name, select

app = FastAPI(title="Warm-up Graphing API",
              description="Returns canvas draw commands for scatter and line charts. "
                          "Pick any columns from the data folder for the axes.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"])

DEFAULT_X = "iphone_norm"
DEFAULT_Y = "falls_norm"

Width = Query(800, ge=300, le=4000)
Height = Query(500, ge=200, le=4000)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    if request.url.path in {"/render/scatter", "/render/line"}:
        # Python's JSON parser also accepts NaN/Infinity tokens and overflowing
        # exponents. A validation error must not echo those as invalid JSON.
        errors = jsonable_encoder(exc.errors(), custom_encoder={
            float: lambda value: value if isfinite(value) else str(value)})
        return JSONResponse(status_code=422, content={"detail": errors})
    return await request_validation_exception_handler(request, exc)


class Stats(BaseModel):
    n: int
    r: float
    r_squared: float
    t: Optional[float]
    df: int
    p_value: float
    slope: float
    intercept: float


class YearOverYearStats(BaseModel):
    n: int
    r: Optional[float]
    p_value: Optional[float]
    reason: Optional[str]


class LeaveOneOutStats(BaseModel):
    r_min: Optional[float]
    r_max: Optional[float]
    valid_count: int
    undefined_count: int
    reason: Optional[str]


class ExpandedStats(Stats):
    year_over_year: YearOverYearStats
    leave_one_out: LeaveOneOutStats


class PreviewStats(Stats):
    """Structurally checked, untrusted browser results for a transient preview.

    These checks do not establish that the supplied results describe the data.
    The render routes never persist or recompute the supplied statistics.
    """
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    n: int = Field(ge=3, strict=True)
    df: int = Field(ge=1, strict=True)
    r: float = Field(ge=-1, le=1)
    r_squared: float = Field(ge=0, le=1)
    p_value: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def consistent_fields(self):
        if self.df != self.n - 2:
            raise ValueError("df must equal n - 2")
        if not isclose(self.r_squared, self.r * self.r, rel_tol=0, abs_tol=1e-9):
            raise ValueError("r_squared must equal r * r")
        if abs(self.r) == 1:
            if self.t is not None or self.p_value != 0:
                raise ValueError("perfect correlation requires t=null and p_value=0")
        elif self.t is None:
            raise ValueError("t may be null only for perfect correlation")
        elif self.t * self.r < 0 or (self.r == 0 and self.t != 0):
            raise ValueError("t must have the same sign as r")
        return self


class RenderSpec(BaseModel):
    width: int
    height: int
    commands: list[dict[str, Any]]
    stats: Stats
    data: dict[str, Any]
    meta: dict[str, str]


class ExpandedRenderSpec(RenderSpec):
    stats: ExpandedStats


class Column(BaseModel):
    name: str
    label: str
    source: str


class JoinedData(BaseModel):
    key: str
    values: dict[str, list[float]]
    labels: dict[str, str]


def _rows(*names):
    """Selected columns joined on year; bad column names / no overlap become HTTP 422."""
    try:
        return select(list(dict.fromkeys(names)))  # dedupe, keep order
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _stats(a, b, years):
    # Only the legacy routes need the server-side statistics stack.
    from stats import correlation_stats, year_over_year_correlation, leave_one_out_correlation

    try:
        result = correlation_stats(a, b)
        result["year_over_year"] = year_over_year_correlation(years, a, b)
        result["leave_one_out"] = leave_one_out_correlation(a, b)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _finite_rows(*names):
    rows = _rows(*names)
    if any(not isfinite(value) for values in rows.values() for value in values):
        raise HTTPException(status_code=422, detail="selected columns must contain only finite numbers")
    return rows


def _preview_values(stats, rows):
    if stats.n != len(rows[KEY]):
        raise HTTPException(status_code=422, detail="n must match the selected joined row count")
    return stats.model_dump()


def _finite_spec(value):
    if isinstance(value, float):
        return isfinite(value)
    if isinstance(value, dict):
        return all(_finite_spec(v) for v in value.values())
    if isinstance(value, list):
        return all(_finite_spec(v) for v in value)
    return True


def _preview_render(builder, *args):
    """Return 422 rather than invalid JSON for unsupported numeric ranges."""
    try:
        spec = builder(*args)
        if not _finite_spec(spec):
            raise ValueError("nonfinite chart coordinates")
        return spec
    except (ArithmeticError, ValueError) as e:
        raise HTTPException(status_code=422, detail="numeric range is unsupported by the chart renderer") from e


def _scatter_spec(rows, x, y, stats, width, height):
    xl, yl = display_name(x), display_name(y)
    return build_scatter(rows[x], rows[y], stats,
                         f"{yl} vs. {xl}", xl, yl, width, height,
                         labels=[str(v) for v in rows[KEY]])


def _line_spec(rows, x, ys, stats, width, height):
    xl = display_name(x)
    if len(ys) == 1:
        title, yl = f"{display_name(ys[0])} vs. {xl}", display_name(ys[0])
    else:
        title = f"Line chart by {xl}"
        yl = "Normalized value (0-1)" if all(c.endswith("_norm") for c in ys) else "Value"
    series = [(display_name(c), rows[c]) for c in ys]
    return build_line(rows[x], series, stats, title, xl, yl, width, height)


@app.get("/columns", response_model=list[Column])
def columns():
    """Every column that can be used on an axis, and the file it comes from."""
    return available_columns()


@app.get("/data", response_model=JoinedData)
def get_data(column: list[str] = Query([DEFAULT_X, DEFAULT_Y], min_length=1)):
    """Joined raw numbers for browser statistics; repeat `column` to select.

    The join key and the legacy chart display names are always included.
    This route does not calculate statistics or generate chart layouts.
    """
    rows = _finite_rows(*column)
    return {"key": KEY, "values": rows,
            "labels": {name: display_name(name) for name in rows}}


@app.get("/stats", response_model=ExpandedStats)
def get_stats(x: str = DEFAULT_X, y: str = DEFAULT_Y):
    rows = _rows(x, y)
    return _stats(rows[x], rows[y], rows[KEY])


@app.get("/plot/scatter", response_model=ExpandedRenderSpec)
def scatter(x: str = DEFAULT_X, y: str = DEFAULT_Y,
            width: int = Width, height: int = Height):
    rows = _rows(x, y)
    return _scatter_spec(rows, x, y, _stats(rows[x], rows[y], rows[KEY]), width, height)


@app.get("/plot/line", response_model=ExpandedRenderSpec)
def line(x: str = KEY, y: list[str] = Query([DEFAULT_X, DEFAULT_Y]),
         width: int = Width, height: int = Height):
    """One line per `y` column against `x` (repeat `y` for more lines).

    Stats: correlation of the first two `y` columns, or of `x` against `y` when
    only one `y` is given.
    """
    rows = _rows(x, *y)
    ys = list(dict.fromkeys(y))
    stats = _stats(rows[ys[0]], rows[ys[1]], rows[KEY]) if len(ys) > 1 else _stats(rows[x], rows[ys[0]], rows[KEY])
    return _line_spec(rows, x, ys, stats, width, height)


@app.post("/render/scatter", response_model=RenderSpec)
def render_scatter(stats: PreviewStats, x: str = DEFAULT_X, y: str = DEFAULT_Y,
                   width: int = Width, height: int = Height):
    """Render untrusted browser statistics with the original Python layout.

    Values are a transient preview, not verified statistical results. The
    selected data are reloaded by column name; no uploaded data are accepted,
    no statistics are calculated, and nothing is persisted.
    """
    rows = _finite_rows(x, y)
    values = _preview_values(stats, rows)
    # The interactive renderer evaluates the fit over the whole data domain.
    # Reject even finite inputs if that evaluation would overflow.
    if any(not isfinite(values["slope"] * v + values["intercept"])
           for v in (min(rows[x]), max(rows[x]))):
        raise HTTPException(status_code=422, detail="regression range is unsupported by the chart renderer")
    return _preview_render(_scatter_spec, rows, x, y, values, width, height)


@app.post("/render/line", response_model=RenderSpec)
def render_line(stats: PreviewStats, x: str = KEY,
                y: list[str] = Query([DEFAULT_X, DEFAULT_Y], min_length=1),
                width: int = Width, height: int = Height):
    """Original Python layout with transient, untrusted browser statistics.

    As in the legacy line route, the browser supplies statistics for the first
    two distinct `y` columns, or for `x` against `y` when only one is selected.
    The server checks the schema and row count, not the statistical truth.
    Nothing is persisted and no statistics are calculated here.
    """
    rows = _finite_rows(x, *y)
    ys = list(dict.fromkeys(y))
    return _preview_render(_line_spec, rows, x, ys,
                           _preview_values(stats, rows), width, height)
