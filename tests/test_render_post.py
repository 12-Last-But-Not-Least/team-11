import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from main import app
from plotting import data
from stats import correlation_stats

client = TestClient(app)
X, Y = "iphone_norm", "falls_norm"


def _stats(x=X, y=Y):
    rows = data.select([x, y])
    s = correlation_stats(rows[x], rows[y])
    return {k: s[k] for k in ("n", "r", "r_squared", "t", "df", "p_value", "slope", "intercept")}


def _post(path, body, **params):
    return client.post(path, json=body, params={"x": X, "y": Y, **params})


@pytest.mark.parametrize("route", ["/render/scatter", "/render/line"])
def test_valid_preview_returns_render_spec(route):
    body = _stats()
    params = {"x": "year", "y": [X, Y]} if route.endswith("line") else {}
    res = client.post(route, json=body, params=params or {"x": X, "y": Y})
    assert res.status_code == 200
    spec = res.json()
    assert spec["commands"] and spec["stats"]["n"] == body["n"]


def _bad(**override):
    return {**_stats(), **override}


@pytest.mark.parametrize("body", [
    pytest.param(_bad(extra=1), id="extra_field"),
    pytest.param(_bad(n=2, df=0), id="n_below_3"),
    pytest.param(_bad(df=1), id="df_not_n_minus_2"),
    pytest.param(_bad(r_squared=0.01), id="r_squared_not_r_squared"),
    pytest.param(_bad(t=-abs(_stats()["t"])), id="t_sign_mismatch"),
    pytest.param(_bad(r=1.0, r_squared=1.0), id="perfect_r_with_t"),
    pytest.param(_bad(t=None), id="null_t_when_not_perfect"),
    pytest.param(_bad(p_value=1.5), id="p_out_of_range"),
    pytest.param(_bad(n=_stats()["n"] + 1, df=_stats()["n"] - 1), id="n_mismatch_rows"),
])
def test_invalid_preview_is_422(body):
    assert _post("/render/scatter", body).status_code == 422


@pytest.mark.parametrize("token", ["NaN", "Infinity", "-Infinity"])
def test_non_finite_json_is_422(token):
    raw = '{"n":12,"r":%s,"r_squared":0.5,"t":1,"df":10,"p_value":0.1,"slope":1,"intercept":0}' % token
    res = client.post("/render/scatter", content=raw, params={"x": X, "y": Y},
                      headers={"content-type": "application/json"})
    assert res.status_code == 422


def test_overflowing_regression_range_is_422():
    assert _post("/render/scatter", _bad(slope=1e308, intercept=1e308)).status_code == 422


# ----------------------------------------------------------- loader quirks --
@pytest.fixture
def folder(tmp_path, monkeypatch):
    monkeypatch.setattr(data, "FINAL", tmp_path)
    data.clear_cache()
    yield tmp_path
    data.clear_cache()


def test_loader_bom_empty_cells_and_duplicates(folder):
    (folder / "a.csv").write_text("year,alpha,dup\n2000,1,1\n2001,,2\n2002,3,3\n", encoding="utf-8-sig")
    (folder / "b.csv").write_text("year,dup,beta\n2000,99,5\n2001,99,6\n2002,99,7\n", encoding="utf-8")
    cols = {c["name"]: c["source"] for c in data.available_columns()}
    assert cols["dup"] == "a.csv"  # first definition wins
    assert data.select(["alpha"])["year"] == [2000, 2002]  # empty cell dropped


def test_loader_drops_whole_column_when_year_is_not_an_integer(folder):
    (folder / "a.csv").write_text("year,alpha\n2000.0,1\n2001.0,2\n", encoding="utf-8")
    assert [c["name"] for c in data.available_columns()] == ["year"]


def test_repo_data_exposes_expected_columns():
    data.clear_cache()
    names = {c["name"] for c in data.available_columns()}
    assert {"year", "falls_norm", "iphone_norm", "iphone_units_sold_millions_norm", "deaths_norm"} <= names
