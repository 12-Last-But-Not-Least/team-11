"""Cross-check frontend/src/stats.js (+ render.js) against stats.py (+ plotting/render.py).

Shared inputs live in testdata/parity/stats_cases.json. For each case Python
computes a result and Node evaluates the JS twin via scripts/parity_js.mjs;
numeric fields must agree within a tight tolerance so the browser charts cannot
silently drift from /stats and /plot/*.
"""
from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CASES = json.loads((ROOT / "testdata" / "parity" / "stats_cases.json").read_text())
NODE = shutil.which("node")

sys.path.insert(0, str(ROOT))
from plotting.render import build_scatter  # noqa: E402
from stats import (  # noqa: E402
    correlation_stats,
    leave_one_out_correlation,
    year_over_year_correlation,
)


def _js(kind: str, case: dict) -> dict:
    if not NODE:
        pytest.skip("node is required for JS↔Python parity")
    payload = json.dumps({"kind": kind, "case": case})
    proc = subprocess.run(
        [NODE, str(ROOT / "scripts" / "parity_js.mjs")],
        input=payload,
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=False,
    )
    if proc.returncode != 0:
        raise AssertionError(f"parity_js failed: {proc.stderr or proc.stdout}")
    return json.loads(proc.stdout)


def _close(a, b, *, rel=1e-9, abs_=1e-12, path=""):
    if a is None and b is None:
        return
    if isinstance(a, bool) and isinstance(b, bool):
        assert a is b, f"{path}: {a!r} != {b!r}"
        return
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if math.isnan(a) and math.isnan(b):
            return
        assert math.isclose(float(a), float(b), rel_tol=rel, abs_tol=abs_), (
            f"{path}: {a!r} != {b!r}"
        )
        return
    if isinstance(a, dict) and isinstance(b, dict):
        assert set(a) == set(b), f"{path}: keys {set(a)} != {set(b)}"
        for key in a:
            _close(a[key], b[key], rel=rel, abs_=abs_, path=f"{path}.{key}" if path else key)
        return
    assert a == b, f"{path}: {a!r} != {b!r}"


@pytest.mark.parametrize("case", CASES["correlation"], ids=lambda c: c["id"])
def test_correlation_js_matches_python(case):
    if case.get("error"):
        with pytest.raises(ValueError, match="constant"):
            correlation_stats(case["x"], case["y"])
        js = _js("correlation", case)
        assert js["ok"] is False
        assert "constant" in js["error"]
        return

    py = correlation_stats(case["x"], case["y"])
    js = _js("correlation", case)
    assert js["ok"] is True
    # p-values can differ slightly (scipy vs Lanczos); allow a looser abs tol.
    for key, val in py.items():
        if key == "p_value":
            _close(val, js["result"][key], rel=1e-6, abs_=1e-9, path=key)
        else:
            _close(val, js["result"][key], path=key)


@pytest.mark.parametrize("case", CASES["year_over_year"], ids=lambda c: c["id"])
def test_year_over_year_js_matches_python(case):
    py = year_over_year_correlation(case["years"], case["x"], case["y"])
    js = _js("year_over_year", case)
    assert js["ok"] is True
    _close(py, js["result"], rel=1e-6, abs_=1e-9)


@pytest.mark.parametrize("case", CASES["leave_one_out"], ids=lambda c: c["id"])
def test_leave_one_out_js_matches_python(case):
    py = leave_one_out_correlation(case["x"], case["y"])
    js = _js("leave_one_out", case)
    assert js["ok"] is True
    _close(py, js["result"], rel=1e-6, abs_=1e-9)


@pytest.mark.parametrize("case", CASES["render"], ids=lambda c: c["id"])
def test_scatter_render_js_matches_python_axes(case):
    stats = correlation_stats(case["x"], case["y"])
    py_spec = build_scatter(case["x"], case["y"], stats, width=case["width"], height=case["height"])
    js = _js("render", case)
    assert js["ok"] is True
    result = js["result"]
    assert result["width"] == py_spec["width"]
    assert result["height"] == py_spec["height"]
    assert result["n_points"] == len(case["x"])
    assert result["n_circles"] == len(case["x"])
    _close(py_spec["data"]["x_axis"]["min"], result["x_axis"]["min"], path="x.min")
    _close(py_spec["data"]["x_axis"]["max"], result["x_axis"]["max"], path="x.max")
    _close(py_spec["data"]["y_axis"]["min"], result["y_axis"]["min"], path="y.min")
    _close(py_spec["data"]["y_axis"]["max"], result["y_axis"]["max"], path="y.max")
    _close(py_spec["data"]["fit"]["x_min"], result["fit"]["x_min"], path="fit.x_min")
    _close(py_spec["data"]["fit"]["x_max"], result["fit"]["x_max"], path="fit.x_max")
