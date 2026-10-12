"""Data layer: every CSV in Data_Clean_UP/data/final/ that has a `year` column.

All numeric columns from those files form one table keyed by year, so any
column can go on any axis, even across files. To add data, drop a CSV with a
`year` column into that folder; nothing in the code needs to change.
"""
import csv
from functools import lru_cache
from pathlib import Path

FINAL = Path(__file__).resolve().parent.parent / "Data_Clean_UP" / "data" / "final"
KEY = "year"

# Nicer axis/legend names; anything not listed falls back to "column name with spaces".
DISPLAY_NAMES = {
    "year": "Year",
    "iphone_norm": "iPhone sales (normalized)",
    "iphone_units_sold_millions_norm": "iPhone sales (normalized)",
    "falls_norm": "Fall deaths (normalized)",
    "deaths_norm": "Fall deaths (normalized)",
}


class UnknownColumn(ValueError):
    pass


def display_name(column):
    return DISPLAY_NAMES.get(column, column.replace("_", " "))


@lru_cache(maxsize=1)
def _load():
    """Return {column: {"source": filename, "values": {year: float}}}, in file order."""
    columns = {}
    for path in sorted(FINAL.glob("*.csv")):
        with open(path, encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f))
        if not rows or KEY not in rows[0]:
            continue  # no year to join on
        for col in rows[0]:
            if col == KEY or col in columns:
                continue
            try:
                values = {int(r[KEY]): float(r[col]) for r in rows if r[col] != ""}
            except ValueError:
                continue  # not a numeric column
            if values:
                columns[col] = {"source": path.name, "values": values}
    return columns


def clear_cache():
    _load.cache_clear()


def available_columns():
    """[{'name', 'label', 'source'}, ...] with `year` first."""
    cols = [{"name": KEY, "label": display_name(KEY), "source": "(join key)"}]
    cols += [{"name": n, "label": display_name(n), "source": c["source"]}
             for n, c in _load().items()]
    return cols


def select(names):
    """Rows (years) where every requested column has a value.

    Returns {"year": [...], <name>: [...], ...}, sorted by year, so columns from
    different files line up. Raises UnknownColumn / ValueError on bad input.
    """
    table = _load()
    for n in names:
        if n != KEY and n not in table:
            valid = ", ".join([KEY] + list(table))
            raise UnknownColumn(f"unknown column '{n}'. Available columns: {valid}")
    wanted = [table[n]["values"] for n in names if n != KEY]
    years = sorted(set.intersection(*(set(v) for v in wanted))) if wanted else []
    if not years:
        raise ValueError("the selected columns have no years in common")
    out = {KEY: years}
    for n in names:
        out[n] = years if n == KEY else [table[n]["values"][y] for y in years]
    return out
