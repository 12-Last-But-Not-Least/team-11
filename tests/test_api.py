import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from main import app
from plotting import data
from plotting.render import nice_ticks
from stats import correlation_stats, year_over_year_correlation

client = TestClient(app)


def _inside(spec):
    """All circle/polyline coordinates must sit inside the canvas."""
    for c in spec["commands"]:
        pts = [(c["x"], c["y"])] if c["op"] == "circle" else c.get("points", [])
        for x, y in pts:
            assert 0 <= x <= spec["width"] and 0 <= y <= spec["height"]


def _texts(spec):
    return [c["text"] for c in spec["commands"] if c["op"] == "text"]


def test_nice_ticks_cover_range_and_are_clean():
    lo, hi, ticks, dec = nice_ticks(0.0, 1.0)
    assert (lo, hi) == (0.0, 1.0) and len(ticks) == 6 and dec == 1
    lo, hi, ticks, _ = nice_ticks(-37, 1234)
    assert lo <= -37 and hi >= 1234


# ---------------------------------------------------------------- defaults --
def test_default_scatter():
    spec = client.get("/plot/scatter").json()
    rows = data.select(["iphone_norm", "falls_norm"])
    assert sum(c["op"] == "circle" for c in spec["commands"]) == len(rows["year"])
    assert sum(c["op"] == "polyline" for c in spec["commands"]) == 1  # fit line
    expected = correlation_stats(rows["iphone_norm"], rows["falls_norm"])
    assert math.isclose(spec["stats"]["r"], expected["r"])
    assert any(f"{expected['r']:.4f}" in t for t in _texts(spec))
    _inside(spec)


def test_default_line_has_two_series_and_stats():
    spec = client.get("/plot/line").json()
    assert sum(c["op"] == "polyline" for c in spec["commands"]) == 2
    assert "Correlation stats" in _texts(spec)
    assert "2007" in _texts(spec) and "2018" in _texts(spec)
    _inside(spec)


def test_size_params():
    spec = client.get("/plot/scatter?width=1000&height=600").json()
    assert (spec["width"], spec["height"]) == (1000, 600)
    assert client.get("/plot/scatter?width=10").status_code == 422


def test_stats_endpoint():
    r = client.get("/stats").json()
    assert r["n"] == len(data.select(["iphone_norm"])["year"])
    r2 = client.get("/stats?x=falls_norm&y=iphone_norm").json()
    assert math.isclose(r["r"], r2["r"])


# --------------------------------------------------------- column selection --
def test_columns_endpoint():
    cols = {c["name"]: c for c in client.get("/columns").json()}
    assert cols["year"]["source"] == "(join key)"
    assert {"iphone_norm", "falls_norm", "deaths_norm"} <= set(cols)
    assert cols["iphone_norm"]["source"] == "iphone_normalized.csv"
    # iphone_vs_falls_normalized.csv has no year column, so it is not joinable
    assert all(c["source"] != "iphone_vs_falls_normalized.csv" for c in cols.values())


def test_switch_axes():
    a = client.get("/plot/scatter?x=iphone_norm&y=falls_norm").json()
    b = client.get("/plot/scatter?x=falls_norm&y=iphone_norm").json()
    assert math.isclose(a["stats"]["r"], b["stats"]["r"])  # r is symmetric...
    assert a["stats"]["slope"] != b["stats"]["slope"]       # ...the fit is not
    assert a["meta"]["x_label"] == b["meta"]["y_label"]


def test_scatter_with_year_on_an_axis():
    spec = client.get("/plot/scatter?x=year&y=falls_norm").json()
    assert spec["meta"]["x_label"] == "Year"
    _inside(spec)


def test_line_single_y_and_three_y():
    one = client.get("/plot/line?x=year&y=falls_norm").json()
    assert sum(c["op"] == "polyline" for c in one["commands"]) == 1
    three = client.get("/plot/line?y=iphone_norm&y=falls_norm&y=deaths_norm").json()
    assert [s["name"] for s in three["data"]["series"]][:2] == [
        "iPhone sales (normalized)", "Fall deaths (normalized)"]
    assert len(three["data"]["series"]) == 3


def test_unknown_column_is_422_and_lists_options():
    for url in ("/plot/scatter?x=nope", "/plot/line?y=nope", "/stats?y=nope"):
        r = client.get(url)
        assert r.status_code == 422
        assert "iphone_norm" in r.json()["detail"]


def test_same_column_on_both_axes_is_allowed():
    assert client.get("/plot/scatter?x=iphone_norm&y=iphone_norm").status_code == 200


def test_post_endpoints_removed():
    assert client.post("/plot/scatter", json={"x": [1, 2], "y": [1, 2]}).status_code == 405


# ------------------------------------------------- cross-file join on year --
@pytest.fixture
def two_files(tmp_path, monkeypatch):
    (tmp_path / "a.csv").write_text("year,alpha\n2000,1\n2001,2\n2002,3\n2003,5\n",
                                    encoding="utf-8-sig")
    (tmp_path / "b.csv").write_text("year,beta,label\n2001,10,x\n2002,30,y\n2003,20,z\n2004,50\n",
                                    encoding="utf-8-sig")
    (tmp_path / "c.csv").write_text("no_year,gamma\n1,2\n", encoding="utf-8-sig")
    monkeypatch.setattr(data, "FINAL", tmp_path)
    data.clear_cache()
    yield
    data.clear_cache()


def test_columns_join_on_year_across_files(two_files):
    names = [c["name"] for c in client.get("/columns").json()]
    assert names == ["year", "alpha", "beta"]  # 'label' is non-numeric, c.csv has no year
    rows = data.select(["alpha", "beta"])
    assert rows["year"] == [2001, 2002, 2003]  # only years present in both
    assert rows["alpha"] == [2, 3, 5] and rows["beta"] == [10, 30, 20]
    spec = client.get("/plot/scatter?x=alpha&y=beta").json()
    assert spec["stats"]["n"] == 3
    assert spec["data"]["series"][0]["points"][0]["label"].startswith("2001\n")


def test_no_years_in_common_is_422(tmp_path, monkeypatch):
    (tmp_path / "a.csv").write_text("year,alpha\n2000,1\n2001,2\n", encoding="utf-8-sig")
    (tmp_path / "b.csv").write_text("year,beta\n2010,1\n2011,2\n", encoding="utf-8-sig")
    monkeypatch.setattr(data, "FINAL", tmp_path)
    data.clear_cache()
    try:
        r = client.get("/plot/scatter?x=alpha&y=beta")
        assert r.status_code == 422 and "no years in common" in r.json()["detail"]
    finally:
        data.clear_cache()


# ------------------------------------------------------------ interactivity --
def test_spec_has_layers_and_interactive_data():
    for kind in ("scatter", "line"):
        spec = client.get(f"/plot/{kind}").json()
        assert {c["layer"] for c in spec["commands"]} == {"static", "plot"}
        d = spec["data"]
        a = d["plot_area"]
        assert a["left"] < a["right"] and a["top"] < a["bottom"]
        assert d["x_axis"]["min"] < d["x_axis"]["max"] and d["y_axis"]["ticks"]
        assert all(p["label"] for s in d["series"] for p in s["points"])
    scatter = client.get("/plot/scatter").json()["data"]
    assert scatter["fit"] and scatter["series"][0]["points"][0]["label"].startswith("2007\n")
    line = client.get("/plot/line").json()["data"]
    assert [s["name"] for s in line["series"]] == [
        "iPhone sales (normalized)", "Fall deaths (normalized)"]
    assert line["x_axis"]["from_data"] is True


def test_data_points_match_pixel_commands():
    spec = client.get("/plot/scatter").json()
    d, a = spec["data"], spec["data"]["plot_area"]
    xa, ya = d["x_axis"], d["y_axis"]
    circles = [c for c in spec["commands"] if c["op"] == "circle"]
    for p, c in zip(d["series"][0]["points"], circles):
        px = a["left"] + (p["x"] - xa["min"]) / (xa["max"] - xa["min"]) * (a["right"] - a["left"])
        py = a["bottom"] - (p["y"] - ya["min"]) / (ya["max"] - ya["min"]) * (a["bottom"] - a["top"])
        assert abs(px - c["x"]) < 0.01 and abs(py - c["y"]) < 0.01

# -------------------------------------------- year-over-year correlation --
def test_yoy_correlation():
    # Changes: X = [1, 2, 3], Y = [2, 4, 6]
    result = year_over_year_correlation(
        [2020, 2021, 2022, 2023],
        [0, 1, 3, 6],
        [0, 2, 6, 12],
    )

    assert result["n"] == 3
    assert result["r"] == pytest.approx(1.0)
    assert result["p_value"] == pytest.approx(0.0)
    assert result["reason"] is None


def test_yoy_skips_missing_years():
    # Exclude the two-year change from 2021 to 2023.
    # Remaining changes: X = [1, 2, 3], Y = [2, 4, 6]
    result = year_over_year_correlation(
        [2020, 2021, 2023, 2024, 2025],
        [0, 1, 100, 102, 105],
        [0, 2, 50, 54, 60],
    )

    assert result["n"] == 3
    assert result["r"] == pytest.approx(1.0)
    assert result["reason"] is None


def test_yoy_constant_changes():
    # X increases by 2 every year, so its changes have no variation.
    result = year_over_year_correlation(
        [2020, 2021, 2022, 2023],
        [0, 2, 4, 6],
        [0, 1, 3, 6],
    )

    assert result == {
        "n": 3,
        "r": None,
        "p_value": None,
        "reason": "constant_changes",
    }


def test_yoy_insufficient_changes():
    # Three years provide only two paired changes.
    result = year_over_year_correlation(
        [2020, 2021, 2022],
        [0, 1, 3],
        [0, 2, 6],
    )

    assert result == {
        "n": 2,
        "r": None,
        "p_value": None,
        "reason": "insufficient_changes",
    }