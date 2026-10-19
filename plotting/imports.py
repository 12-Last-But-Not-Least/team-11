"""CSV validation and temporary datasets; no external databases."""
import io
from pathlib import Path
from uuid import uuid4
from threading import Lock

from plotting.datasets import Dataset, parse_csv

IMPORTS = {}  # dataset ID -> in-memory dataset
STORE_LOCK = Lock()


def default_axes(numeric, key):
    """Choose the first usable numeric pair in CSV column order."""
    candidates = [name for name, values in numeric.items()
                  if name != key
                  and len({v for v in values if v is not None}) > 1]
    if key == "year" and len(set(numeric["year"])) > 1:
        candidates.append("year")
    for i, x in enumerate(candidates):
        for y in candidates[i + 1:]:
            complete = [(a, b) for a, b in zip(numeric[x], numeric[y]) if a is not None and b is not None]
            if len(complete) >= 3 and len({a for a, _ in complete}) > 1 and len({b for _, b in complete}) > 1:
                return x, y
    raise ValueError("CSV needs two nonconstant numeric columns with at least three complete paired rows")


def import_csv(content: bytes, filename: str):
    """Validate a table and keep it in memory until the backend restarts."""
    filename = Path(filename.replace("\\", "/")).name
    if not filename.lower().endswith(".csv"):
        raise ValueError("Choose a .csv file")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise ValueError("CSV must be UTF-8 encoded") from None
    if "\x00" in text:
        raise ValueError("CSV must contain text, not binary data")
    numeric, ignored, key, generated_key = parse_csv(io.StringIO(text, newline=""))
    if len(numeric[key]) < 3:
        raise ValueError("CSV must contain at least three data rows")
    pair = default_axes(numeric, key)
    use_year = not generated_key

    warnings = []
    if ignored:
        warnings.append("Not available as numeric axes: " + ", ".join(ignored))
    if any(v is None for values in numeric.values() for v in values):
        warnings.append("Rows with missing selected values are excluded from plots and statistics.")
    dataset_id = "import-" + uuid4().hex
    manifest = dict(id=dataset_id, name=Path(filename).stem,
                    description=f"Imported from {filename}. Original values; no normalization applied. "
                                + ("Ordered by year." if use_year else "Row order does not represent time."),
                    key=key, key_label="Year" if use_year else "Row number",
                    default_x=pair[0], default_y=pair[1], generated_key=not use_year,
                    kind="imported", source_name=filename, warnings=warnings)
    dataset = Dataset(path=Path(filename), values=numeric, **manifest)
    metadata = dataset.metadata()
    with STORE_LOCK:
        IMPORTS[dataset_id] = dataset
    return metadata


def load_import(dataset_id):
    with STORE_LOCK:
        return IMPORTS.get(dataset_id)


def list_imports():
    with STORE_LOCK:
        return list(IMPORTS.values())
