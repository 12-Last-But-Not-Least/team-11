"""Named, isolated tables. Legacy cross-file loading remains in data.py."""
import csv
import math
from dataclasses import dataclass
from pathlib import Path

from plotting.data import display_name

DATA_ROOT = Path(__file__).resolve().parent.parent / "Data_Clean_UP" / "data"


def is_missing(value):
    """Blank cells and the conventional CSV NA marker represent missing values."""
    return value.strip().upper() in {"", "NA"}


def parse_csv(stream, key=None, generated_key=False):
    """Read numeric columns and an ordering key, preserving missing-row alignment."""
    try:
        reader = csv.reader(stream, strict=True)
        headers = next(reader, [])
        headers = [header.strip() for header in headers]
        if not headers or any(not h for h in headers) or len(set(headers)) != len(headers):
            raise ValueError("CSV headers must be nonempty and unique")
        rows = []
        for line, row in enumerate(reader, start=2):
            if not row:  # permit blank lines
                continue
            if len(row) != len(headers):
                raise ValueError(f"Row {line} has {len(row)} fields; expected {len(headers)}")
            rows.append(row)
    except csv.Error as e:
        raise ValueError(f"Malformed CSV: {e}") from None
    if not rows:
        raise ValueError("dataset has no observations")

    numeric = {}
    ignored = []
    for index, name in enumerate(headers):
        values = []
        is_numeric = True
        for row in rows:
            cell = row[index].strip()
            if is_missing(cell):
                values.append(None)
                continue
            try:
                value = float(cell)
            except ValueError:
                is_numeric = False
                continue
            if not math.isfinite(value):
                raise ValueError(f"Column '{name}' contains nonfinite values (NaN or infinity)")
            values.append(value)
        if is_numeric and any(v is not None for v in values):
            numeric[name] = values
        else:
            ignored.append(name)

    if key is None:
        generated_key = not ("year" in numeric and all(v is not None for v in numeric["year"]))
        key = "row_number" if generated_key else "year"
        while generated_key and key in headers:
            key = "_" + key
    if generated_key:
        if key in headers:
            raise ValueError(f"generated ordering column '{key}' conflicts with a CSV column")
        numeric[key] = list(range(1, len(rows) + 1))
    if key not in numeric or any(v is None for v in numeric[key]):
        raise ValueError("ordering column must contain a number for every observation")
    return numeric, ignored, key, generated_key


class UnknownDataset(ValueError):
    pass


@dataclass(frozen=True)
class Dataset:
    id: str
    name: str
    description: str
    path: Path
    key: str
    key_label: str
    default_x: str
    default_y: str
    generated_key: bool = False
    kind: str = "bundled"
    source_name: str = ""
    warnings: tuple[str, ...] = ()
    values: dict[str, list[float | None]] | None = None

    def table(self):
        """Read one table; preserve row alignment instead of joining unrelated files."""
        if self.values is not None:
            return self.values
        with self.path.open(encoding="utf-8-sig", newline="") as stream:
            columns, _, _, _ = parse_csv(stream, self.key, self.generated_key)
        return columns

    def label(self, name):
        return self.key_label if name == self.key else display_name(name)

    def columns(self):
        table = self.table()
        names = [self.key] + [name for name in table if name != self.key]
        return [{"name": name, "label": self.label(name),
                 "source": "(join key)" if name == self.key else (self.source_name or self.path.name)}
                for name in names]

    def metadata(self):
        table = self.table()
        return {"id": self.id, "name": self.name, "description": self.description,
                "kind": self.kind, "row_count": len(table[self.key]),
                "key": self.key, "key_label": self.key_label,
                "default_x": self.default_x, "default_y": self.default_y,
                "columns": self.columns(), "warnings": list(self.warnings)}

    def select(self, names):
        table = self.table()
        for name in names:
            if name not in table:
                raise ValueError(f"unknown column '{name}' in dataset '{self.id}'. "
                                 f"Available columns: {', '.join(table)}")
        indexes = [i for i in range(len(table[self.key]))
                   if all(table[name][i] is not None for name in names)]
        if len(indexes) < 3:
            raise ValueError("at least three paired observations are required")
        indexes.sort(key=lambda i: table[self.key][i])
        return {name: [table[name][i] for i in indexes]
                for name in dict.fromkeys([self.key, *names])}


DATASETS = {
    dataset.id: dataset for dataset in (
        Dataset("iphone-falls", "iPhone sales vs. fall deaths",
                "Existing yearly example; both measurements are min-max normalized (0–1). "
                "Source: repository cleaning output normalized_merged_set.csv.",
                DATA_ROOT / "final" / "normalized_merged_set.csv", "year", "Year",
                "iphone_units_sold_millions_norm", "deaths_norm"),
        Dataset("icecream-sharks", "Ice cream vs. shark attacks",
                "Existing monthly example; both measurements are min-max normalized (0–1). "
                "Rows run January through December. Source: repository cleaning output "
                "normalized_icecream_sharks_merged.csv.",
                DATA_ROOT / "final" / "normalized_icecream_sharks_merged.csv",
                "month_index", "Month index (Jan=1)", "ice_cream_index_norm", "attacks_norm", True),
        Dataset("palmer-penguins", "Palmer Penguins",
                "Palmer Archipelago penguins, 2007-2009; source: palmerpenguins (CC0). "
                "Flipper length in mm and body mass in g; original values. "
                "Row order does not represent time.",
                DATA_ROOT / "final" / "penguins.csv", "row_number", "Row number",
                "flipper_length_mm", "body_mass_g", True,
                warnings=("Rows with missing selected values are excluded from plots and statistics.",)),
        Dataset("old-faithful", "Old Faithful",
                "Old Faithful eruption duration and waiting time, both in minutes. "
                "Source: R datasets / Rdatasets; original values.",
                DATA_ROOT / "final" / "faithful.csv", "rownames", "Row number",
                "eruptions", "waiting"),
        Dataset("air-quality", "New York Air Quality",
                "Daily New York measurements, May-September 1973. "
                "Ozone in ppb and solar radiation in Langleys. "
                "Source: R datasets / Rdatasets; original values.",
                DATA_ROOT / "final" / "airquality.csv", "rownames", "Row number",
                "ozone", "solar_r",
                warnings=("Rows with missing selected values are excluded from plots and statistics.",)),
    )
}


def get_dataset(dataset_id):
    if dataset_id in DATASETS:
        return DATASETS[dataset_id]
    from plotting.imports import load_import
    imported = load_import(dataset_id)
    if imported is not None:
        return imported
    raise UnknownDataset(f"unknown dataset '{dataset_id}'")


def list_datasets():
    from plotting.imports import list_imports
    return [dataset.metadata() for dataset in [*DATASETS.values(), *list_imports()]]
