import pytest
from fastapi.testclient import TestClient

from main import app
from plotting import imports
from plotting.datasets import DATASETS

client = TestClient(app)


def upload(content, filename="measurements.csv"):
    return client.post("/datasets", params={"filename": filename},
                       content=content, headers={"Content-Type": "text/csv"})


def test_upload_is_temporary_and_accessible_to_other_clients():
    response = upload(b"year,sales,cost\n2022,3,4\n2020,1,2\n2021,2,5\n")
    assert response.status_code == 201
    dataset = response.json()
    assert dataset["kind"] == "imported"
    assert dataset["key"] == "year"
    assert dataset["default_x"] == "sales" and dataset["default_y"] == "cost"
    assert dataset["id"] not in DATASETS
    other = TestClient(app)
    assert dataset in other.get("/datasets").json()
    assert imports.load_import(dataset["id"]).metadata() == dataset
    params = {"dataset_id": dataset["id"]}
    scatter = other.get("/plot/scatter", params=params).json()
    line = other.get("/plot/line", params=params).json()
    assert scatter["stats"] == line["stats"] == other.get("/stats", params=params).json()
    assert [p["x"] for p in line["data"]["series"][0]["points"]] == [2020, 2021, 2022]
    assert other.get("/columns", params=params).status_code == 200


def test_restart_loses_imports_but_keeps_bundled_datasets():
    dataset = upload(b"x,y\n1,2\n2,4\n3,5\n").json()
    imports.IMPORTS.clear()  # equivalent to starting a fresh backend process
    assert len(client.get("/datasets").json()) == len(DATASETS)
    assert client.get("/stats", params={"dataset_id": dataset["id"]}).status_code == 404
    assert client.get("/stats?dataset_id=iphone-falls").status_code == 200


def test_unkeyed_upload_keeps_missing_pairs_aligned_and_reports_text_columns():
    response = upload(b'\xef\xbb\xbfname, x ,y\r\n"A, one",1,2\r\nB,2,\r\nC,3,6\r\nD,4,5\r\n')
    assert response.status_code == 201
    dataset = response.json()
    assert dataset["row_count"] == 4
    assert dataset["key"] == "row_number"
    assert len(dataset["warnings"]) == 2
    assert "name" in dataset["warnings"][0]
    line = client.get("/plot/line", params={"dataset_id": dataset["id"]}).json()
    assert line["stats"]["n"] == 3
    assert [p["x"] for p in line["data"]["series"][0]["points"]] == [1, 3, 4]
    assert line["meta"]["x_label"] == "Row number"


def test_import_names_do_not_control_storage_and_repeated_imports_are_isolated():
    first = upload(b"x,y\n1,2\n2,4\n3,5\n", "../../measurements.csv").json()
    second = upload(b"x,y\n1,5\n2,4\n3,2\n", "../../measurements.csv").json()
    assert first["id"] != second["id"]
    assert first["name"] == "measurements"
    assert {dataset.id for dataset in imports.list_imports()} == {first["id"], second["id"]}
    assert client.get("/stats", params={"dataset_id": first["id"]}).json()["r"] > 0
    assert client.get("/stats", params={"dataset_id": second["id"]}).json()["r"] < 0
    assert imports.load_import("../../measurements") is None


@pytest.mark.parametrize("content,detail", [
    (b"", "headers"),
    (b"x,x\n1,2\n2,3\n3,4\n", "unique"),
    (b"x, \n1,2\n2,3\n3,4\n", "nonempty"),
    (b"x,y\n1,2,3\n2,3\n3,4\n", "Row 2"),
    (b'x,y\n"1,2\n2,3\n3,4\n', "Malformed"),
    (b"x,y\n1,2\n2,3\n", "three data rows"),
    (b"x,y\n1,2\n1,3\n1,4\n", "nonconstant"),
    (b"x,y\n1,\n,2\n3,4\n", "complete paired"),
    (b"x,y\n1,2\n2,NaN\n3,4\n", "NaN"),
    (b"x,y\n1,2\n2,inf\n3,4\n", "infinity"),
    (b"x,y\n1,\xff\n2,3\n3,4\n", "UTF-8"),
    (b"x,y\n1,\x00\n2,3\n3,4\n", "binary"),
])
def test_invalid_csv_never_publishes_a_dataset(content, detail):
    response = upload(content)
    assert response.status_code == 422
    assert detail in response.json()["detail"]
    assert not imports.list_imports()
    assert len(client.get("/datasets").json()) == len(DATASETS)


def test_csv_extension_is_required():
    assert upload(b"x,y\n1,2\n2,3\n3,4", "data.xlsx").status_code == 422


def test_generated_key_does_not_overwrite_existing_column():
    dataset = upload(b"row_number,x,y\nlabel,1,2\nlabel,2,4\nlabel,3,5\n").json()
    assert dataset["key"] == "_row_number"


def test_na_values_remain_numeric_across_requests():
    dataset = upload(b"species,x,y,year\nA,1,2,2007\nB,NA,NA,2007\nC,3,5,2008\nD,4,6,2008\n").json()
    params = {"dataset_id": dataset["id"], "x": "x", "y": "y"}
    assert dataset["default_x"] == "x" and dataset["default_y"] == "y"
    stats = client.get("/stats", params=params).json()
    assert stats["n"] == 3
    assert client.get("/plot/scatter", params=params).json()["stats"] == stats
    assert client.get("/plot/line", params={"dataset_id": dataset["id"], "y": ["x", "y"]}).json()["stats"] == stats
    assert imports.load_import(dataset["id"]).metadata() == dataset


def test_rownames_is_an_ordinary_numeric_column():
    dataset = upload(b"rownames,eruptions,waiting\n1,3,70\n2,2,50\n3,4,80\n").json()
    assert (dataset["default_x"], dataset["default_y"]) == ("rownames", "eruptions")
    assert "rownames" in {column["name"] for column in dataset["columns"]}
    assert imports.load_import(dataset["id"]).metadata() == dataset


def test_extreme_nondefault_axis_returns_validation_error_instead_of_server_error():
    dataset = upload(b"x,y,large\n1,2,1e300\n2,4,2e300\n3,5,3e300\n").json()
    for endpoint in ("/stats", "/plot/scatter", "/plot/line"):
        response = client.get(endpoint, params={"dataset_id": dataset["id"], "x": "x", "y": "large"})
        assert response.status_code == 422
        assert "rescale" in response.json()["detail"]
