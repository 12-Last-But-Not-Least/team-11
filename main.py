from math import isclose, isfinite
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request, Header
from fastapi.encoders import jsonable_encoder
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, model_validator
from starlette.responses import JSONResponse

from plotting import build_line, build_scatter
from plotting.data import KEY, available_columns, display_name, select
from plotting.datasets import UnknownDataset, get_dataset, list_datasets
from plotting.imports import import_csv

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
    year_over_year: Optional[YearOverYearStats] = None
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
    is_yearly: bool
    dataset_id: Optional[str] = None
    dataset_name: Optional[str] = None


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
    """Keep observations within a named table or use the legacy year join."""
    try:
        loader = dataset.select if dataset else select
        return loader(list(dict.fromkeys(names)))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _calendar_years(rows, dataset):
    if dataset is not None and dataset.key != KEY:
        return None
    years = rows[KEY]
    if len(set(years)) != len(years) or any(not float(year).is_integer() for year in years):
        return None
    return years


def _stats(a, b, years=None):
    # Only the legacy routes need the server-side statistics stack.
    from stats import correlation_stats, year_over_year_correlation, leave_one_out_correlation
    import numpy as np

    try:
        with np.errstate(over="raise", invalid="raise", divide="raise"):
            result = correlation_stats(a, b)
            result["year_over_year"] = year_over_year_correlation(years, a, b) if years is not None else None
            result["leave_one_out"] = leave_one_out_correlation(a, b)
        if not _finite_spec(result):
            raise ValueError("Selected values exceed the numerical range for analysis; rescale these columns")
        return result
    except FloatingPointError as e:
        raise HTTPException(status_code=422, detail="Selected values exceed the numerical range for analysis; rescale these columns") from e
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _finite_rows(*names, dataset=None):
    rows = _rows(*names, dataset=dataset)
    if any(not isfinite(value) for values in rows.values() for value in values):
        raise HTTPException(status_code=422, detail="selected columns must contain only finite numbers")
    return rows


def _preview_values(stats, rows, key=KEY):
    if stats.n != len(rows[key]):
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


def _scatter_spec(rows, x, y, stats, width, height, dataset=None):
    label = dataset.label if dataset else display_name
    key = dataset.key if dataset else KEY
    xl, yl = label(x), label(y)
    spec = build_scatter(rows[x], rows[y], stats,
                         f"{yl} vs. {xl}", xl, yl, width, height,
                         labels=[str(int(v)) if float(v).is_integer() else str(v) for v in rows[key]])
    if dataset:
        spec["meta"].update(dataset_id=dataset.id, dataset_name=dataset.name)
    return spec


def _line_spec(rows, x, ys, stats, width, height, dataset=None):
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


@app.get("/datasets", response_model=list[DatasetInfo])
def datasets(session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    return list_datasets(session_id)


@app.post("/datasets", response_model=DatasetInfo, status_code=201)
async def upload_dataset(request: Request, filename: str = Query(...),
                         session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    """Validate a raw UTF-8 CSV body and keep it in temporary server memory."""
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


@app.get("/data", response_model=JoinedData, response_model_exclude_none=True)
def get_data(column: Optional[list[str]] = Query(None, min_length=1),
             dataset_id: Optional[str] = None,
             session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    """Joined raw numbers for browser statistics; repeat `column` to select.

    The join key and the legacy chart display names are always included.
    This route does not calculate statistics or generate chart layouts.
    """
    dataset = _dataset(dataset_id, session_id)
    if column is None:
        column = [dataset.default_x, dataset.default_y] if dataset else [DEFAULT_X, DEFAULT_Y]
    rows = _finite_rows(*column, dataset=dataset)
    label = dataset.label if dataset else display_name
    return {"key": dataset.key if dataset else KEY, "values": rows,
            "labels": {name: label(name) for name in rows},
            "is_yearly": _calendar_years(rows, dataset) is not None,
            "dataset_id": dataset.id if dataset else None,
            "dataset_name": dataset.name if dataset else None}


@app.get("/stats", response_model=ExpandedStats)
def get_stats(x: Optional[str] = None, y: Optional[str] = None,
              dataset_id: Optional[str] = None,
              session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    dataset = _dataset(dataset_id, session_id)
    x = x if x is not None else (dataset.default_x if dataset else DEFAULT_X)
    y = y if y is not None else (dataset.default_y if dataset else DEFAULT_Y)
    rows = _rows(x, y, dataset=dataset)
    return _stats(rows[x], rows[y], _calendar_years(rows, dataset))


@app.get("/plot/scatter", response_model=ExpandedRenderSpec)
def scatter(x: Optional[str] = None, y: Optional[str] = None,
            width: int = Width, height: int = Height, dataset_id: Optional[str] = None,
            session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    dataset = _dataset(dataset_id, session_id)
    x = x if x is not None else (dataset.default_x if dataset else DEFAULT_X)
    y = y if y is not None else (dataset.default_y if dataset else DEFAULT_Y)
    rows = _rows(x, y, dataset=dataset)
    return _preview_render(_scatter_spec, rows, x, y,
                           _stats(rows[x], rows[y], _calendar_years(rows, dataset)), width, height, dataset)


@app.get("/plot/line", response_model=ExpandedRenderSpec)
def line(x: Optional[str] = None, y: Optional[list[str]] = Query(None, min_length=1),
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
    years = _calendar_years(rows, dataset)
    stats = _stats(rows[ys[0]], rows[ys[1]], years) if len(ys) > 1 else _stats(rows[x], rows[ys[0]], years)
    return _preview_render(_line_spec, rows, x, ys, stats, width, height, dataset)


@app.post("/render/scatter", response_model=RenderSpec)
def render_scatter(stats: PreviewStats, x: Optional[str] = None, y: Optional[str] = None,
                   width: int = Width, height: int = Height, dataset_id: Optional[str] = None,
                   session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    """Render untrusted browser statistics with the original Python layout.

    Values are a transient preview, not verified statistical results. The
    selected data are reloaded by column name; no uploaded data are accepted,
    no statistics are calculated, and nothing is persisted.
    """
    dataset = _dataset(dataset_id, session_id)
    x = x if x is not None else (dataset.default_x if dataset else DEFAULT_X)
    y = y if y is not None else (dataset.default_y if dataset else DEFAULT_Y)
    rows = _finite_rows(x, y, dataset=dataset)
    values = _preview_values(stats, rows, dataset.key if dataset else KEY)
    # The interactive renderer evaluates the fit over the whole data domain.
    # Reject even finite inputs if that evaluation would overflow.
    if any(not isfinite(values["slope"] * v + values["intercept"])
           for v in (min(rows[x]), max(rows[x]))):
        raise HTTPException(status_code=422, detail="regression range is unsupported by the chart renderer")
    return _preview_render(_scatter_spec, rows, x, y, values, width, height, dataset)


@app.post("/render/line", response_model=RenderSpec)
def render_line(stats: PreviewStats, x: Optional[str] = None,
                y: Optional[list[str]] = Query(None, min_length=1),
                width: int = Width, height: int = Height, dataset_id: Optional[str] = None,
                session_id: Optional[str] = Header(None, alias="X-Dataset-Session")):
    """Original Python layout with transient, untrusted browser statistics.

    As in the legacy line route, the browser supplies statistics for the first
    two distinct `y` columns, or for `x` against `y` when only one is selected.
    The server checks the schema and row count, not the statistical truth.
    Nothing is persisted and no statistics are calculated here.
    """
    dataset = _dataset(dataset_id, session_id)
    x = x if x is not None else (dataset.key if dataset else KEY)
    if y is None:
        y = [dataset.default_x, dataset.default_y] if dataset else [DEFAULT_X, DEFAULT_Y]
    rows = _finite_rows(x, *y, dataset=dataset)
    ys = list(dict.fromkeys(y))
    return _preview_render(_line_spec, rows, x, ys,
                           _preview_values(stats, rows, dataset.key if dataset else KEY), width, height, dataset)
