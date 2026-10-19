"""Named dataset API contract; legacy coverage remains in test_api.py."""
import math

import pytest
from fastapi.testclient import TestClient

from main import app
from plotting import datasets
from stats import correlation_stats

client = TestClient(app)


def test_catalog_has_existing_bundled_examples():
    response = client.get("/datasets")
    assert response.status_code == 200
    catalog = response.json()
    assert {d["id"] for d in catalog} == {"iphone-falls", "icecream-sharks", "palmer-penguins", "old-faithful", "air-quality"}
    assert len(catalog) == 5
    for dataset in catalog:
        params = {"dataset_id": dataset["id"]}
        columns = client.get("/columns", params=params).json()
        assert columns == dataset["columns"]
        assert dataset["kind"] == "bundled"
        assert dataset["description"]
        assert {dataset["default_x"], dataset["default_y"], dataset["key"]} <= {
            c["name"] for c in columns}
        scatter = client.get("/plot/scatter", params=params)
        line = client.get("/plot/line", params=params)
        stats = client.get("/stats", params=params)
        assert scatter.status_code == line.status_code == stats.status_code == 200
        assert scatter.json()["stats"] == line.json()["stats"] == stats.json()
        assert stats.json()["n"] == {"palmer-penguins": 342, "air-quality": 111}.get(dataset["id"], dataset["row_count"])
        assert scatter.json()["meta"]["dataset_id"] == dataset["id"]
        assert line.json()["meta"]["dataset_id"] == dataset["id"]
        assert len(scatter.json()["data"]["series"][0]["points"]) == stats.json()["n"]


@pytest.mark.parametrize("endpoint", ["/columns", "/stats", "/plot/scatter", "/plot/line"])
def test_unknown_dataset_is_404(endpoint):
    response = client.get(endpoint, params={"dataset_id": "missing"})
    assert response.status_code == 404
    assert "unknown dataset" in response.json()["detail"]


@pytest.mark.parametrize("endpoint", ["/stats", "/plot/scatter", "/plot/line"])
def test_column_from_another_dataset_is_rejected(endpoint):
    response = client.get(endpoint, params={"dataset_id": "icecream-sharks", "y": "deaths_norm"})
    assert response.status_code == 422
    assert "unknown column" in response.json()["detail"]


def test_months_have_numeric_order():
    monthly = client.get("/plot/line?dataset_id=icecream-sharks").json()
    assert [p["x"] for p in monthly["data"]["series"][0]["points"]] == list(range(1, 13))
    assert monthly["meta"]["x_label"] == "Month index (Jan=1)"


def register(tmp_path, monkeypatch, name, content):
    path = tmp_path / f"{name}.csv"
    path.write_text(content, encoding="utf-8")
    dataset = datasets.Dataset(name, name, "Test data", path, "row", "Row number", "x", "y", True)
    monkeypatch.setitem(datasets.DATASETS, name, dataset)
    return dataset


def test_identical_column_names_are_isolated_between_clients(tmp_path, monkeypatch):
    register(tmp_path, monkeypatch, "positive", "x,y\n1,1\n2,3\n3,4\n4,6\n")
    register(tmp_path, monkeypatch, "negative", "x,y\n1,6\n2,4\n3,3\n4,1\n")
    other_client = TestClient(app)
    first = client.get("/stats?dataset_id=positive").json()
    second = other_client.get("/stats?dataset_id=negative").json()
    assert first["r"] > 0.9 and second["r"] < -0.9
    assert client.get("/stats?dataset_id=positive").json() == first


def test_missing_pairs_are_filtered_identically_in_plots_and_stats(tmp_path, monkeypatch):
    register(tmp_path, monkeypatch, "missing", "x,y\n1,2\n2,\n,4\n4,5\n5,8\n")
    stats = client.get("/stats?dataset_id=missing").json()
    scatter = client.get("/plot/scatter?dataset_id=missing").json()
    line = client.get("/plot/line?dataset_id=missing").json()
    assert stats == scatter["stats"] == line["stats"]
    assert stats["n"] == 3
    assert math.isclose(stats["r"], correlation_stats([1, 4, 5], [2, 5, 8])["r"])
    assert [p["x"] for p in line["data"]["series"][0]["points"]] == [1, 4, 5]


@pytest.mark.parametrize("content,detail", [
    ("x,y\n1,2\n2,3\n", "at least three"),
    ("x,y\n1,2\n1,3\n1,4\n", "constant"),
    ("x,y\n1,2\n2,nan\n3,4\n", "nonfinite"),
])
def test_unusable_analysis_returns_422(tmp_path, monkeypatch, content, detail):
    register(tmp_path, monkeypatch, "invalid", content)
    for endpoint in ("/stats", "/plot/scatter", "/plot/line"):
        response = client.get(endpoint, params={"dataset_id": "invalid"})
        assert response.status_code == 422
        assert detail in response.json()["detail"]


def test_explicit_axes_and_single_series_use_selected_dataset():
    params = {"dataset_id": "iphone-falls", "x": "deaths_norm", "y": "iphone_units_sold_millions_norm"}
    stats = client.get("/stats", params=params).json()
    assert client.get("/plot/scatter", params=params).json()["stats"] == stats
    line = client.get("/plot/line", params=params).json()
    assert line["stats"] == stats
    assert len(line["data"]["series"]) == 1


@pytest.mark.parametrize("rows", ["1,2\n", "1,2\n2,3\n", "1,\n2,\n3,4\n"])
def test_named_datasets_require_three_complete_observations(tmp_path, monkeypatch, rows):
    register(tmp_path, monkeypatch, "small", "x,y\n" + rows)
    response = client.get("/stats?dataset_id=small")
    assert response.status_code == 422
    assert "at least three" in response.json()["detail"]
