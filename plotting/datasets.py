"""Named, isolated tables. Legacy cross-file loading remains in data.py."""
import csv
import math
from dataclasses import dataclass
from pathlib import Path

from plotting.data import display_name

DATA_ROOT = Path(__file__).resolve().parent.parent / "Data_Clean_UP" / "data"


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

    def table(self):
        """Read one table; preserve row alignment instead of joining unrelated files."""
        with self.path.open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            headers = reader.fieldnames or []
            rows = list(reader)
        if not headers or any(not h.strip() for h in headers) or len(set(headers)) != len(headers):
            raise ValueError("CSV headers must be nonempty and unique")
        if not rows:
            raise ValueError("dataset has no observations")
        if any(None in row or any(v is None for v in row.values()) for row in rows):
            raise ValueError("CSV rows must have the same number of fields as the header")
        columns = {}
        for name in headers:
            try:
                values = [float(row[name]) if row[name].strip() else None for row in rows]
            except ValueError:
                continue  # text is not offered as a numeric axis
            if any(v is not None and not math.isfinite(v) for v in values):
                raise ValueError(f"column '{name}' contains nonfinite values")
            if any(v is not None for v in values):
                columns[name] = values
        if self.generated_key:
            if self.key in headers:
                raise ValueError(f"generated ordering column '{self.key}' conflicts with a CSV column")
            columns[self.key] = list(range(1, len(rows) + 1))
        if self.key not in columns or any(v is None for v in columns[self.key]):
            raise ValueError("ordering column must contain a number for every observation")
        return columns

    def label(self, name):
        return self.key_label if name == self.key else display_name(name)

    def columns(self):
        table = self.table()
        names = [self.key] + [name for name in table if name != self.key]
        return [{"name": name, "label": self.label(name),
                 "source": "(join key)" if name == self.key else self.path.name}
                for name in names]

    def metadata(self):
        table = self.table()
        return {"id": self.id, "name": self.name, "description": self.description,
                "kind": "bundled", "row_count": len(table[self.key]),
                "key": self.key, "key_label": self.key_label,
                "default_x": self.default_x, "default_y": self.default_y,
                "columns": self.columns()}

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
    )
}


def get_dataset(dataset_id):
    try:
        return DATASETS[dataset_id]
    except KeyError:
        raise UnknownDataset(f"unknown dataset '{dataset_id}'") from None


def list_datasets():
    return [dataset.metadata() for dataset in DATASETS.values()]
