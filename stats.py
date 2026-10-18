import csv
from pathlib import Path
import numpy as np
from scipy import stats as scipy_stats

def correlation_stats(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)

    if x.ndim != 1 or y.ndim != 1:
        raise ValueError("x and y must be one-dimensional")
    if len(x) != len(y):
        raise ValueError(f"x and y must be the same length (got {len(x)} and {len(y)})")
    if not (np.isfinite(x).all() and np.isfinite(y).all()):
        raise ValueError("x and y must not contain NaN or infinite values")

    n = len(x)
    dx = x - x.mean()
    dy = y - y.mean()
    sxx = np.sum(dx * dx)
    syy = np.sum(dy * dy)
    sxy = np.sum(dx * dy)
    if sxx == 0 or syy == 0:
        raise ValueError("correlation is undefined when x or y is constant")

    # r = sum((x - xbar)(y - ybar)) / sqrt(sum((x - xbar)^2) * sum((y - ybar)^2))
    r = sxy / np.sqrt(sxx * syy)
    r = float(np.clip(r, -1.0, 1.0))

    # t = r * sqrt(n - 2) / sqrt(1 - r^2), compared to a t distribution with n - 2 df
    df = n - 2
    if abs(r) == 1.0:
        t = None
        p_value = 0.0
    else:
        t = r * np.sqrt(df) / np.sqrt(1 - r * r)
        p_value = 2 * scipy_stats.t.sf(abs(t), df)

    # least-squares line
    slope = sxy / sxx
    intercept = y.mean() - slope * x.mean()

    return {
        "n": n,
        "r": r,
        "r_squared": r * r,
        "t": None if t is None else float(t),
        "df": df,
        "p_value": float(p_value),
        "slope": float(slope),
        "intercept": float(intercept),
    }

def year_over_year_correlation(years, x, y):
    """Calculate the correlation between changes across consecutive years."""
    years = np.asarray(years, dtype=float)
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)

    if any(values.ndim != 1 for values in (years, x, y)):
        raise ValueError("years, x and y must be one-dimensional")

    if not (len(years) == len(x) == len(y)):
        raise ValueError("years, x and y must have the same length")

    if not all(np.isfinite(values).all() for values in (years, x, y)):
        raise ValueError("years, x and y must contain only finite values")

    if not np.equal(years, np.floor(years)).all():
        raise ValueError("years must be integers")

    order = np.argsort(years)
    years, x, y = years[order], x[order], y[order]

    if np.any(np.diff(years) == 0):
        raise ValueError("years must be unique")

    # Include changes only between consecutive years
    consecutive = np.diff(years) == 1
    x_changes = np.diff(x)[consecutive]
    y_changes = np.diff(y)[consecutive]
    n = len(x_changes)

    # Require at least three paired annual changes for this feature
    if n < 3:
        return {
            "n": n,
            "r": None,
            "p_value": None,
            "reason": "insufficient_changes",
        }

    # Correlation is undefined if either set of changes is constant
    if (
        np.all(x_changes == x_changes[0])
        or np.all(y_changes == y_changes[0])
    ):
        return {
            "n": n,
            "r": None,
            "p_value": None,
            "reason": "constant_changes",
        }

    result = correlation_stats(x_changes, y_changes)

    return {
        "n": n,
        "r": result["r"],
        "p_value": result["p_value"],
        "reason": None,
    }


if __name__ == "__main__":
    data = Path(__file__).parent / "Data_Clean_UP" / "data" / "final" / "iphone_vs_falls_normalized.csv"
    with open(data, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    iphone = [float(row["iphone_norm"]) for row in rows]
    falls = [float(row["falls_norm"]) for row in rows]

    for name, value in correlation_stats(iphone, falls).items():
        print(f"{name:>10}: {value}")


    data = Path(__file__).parent / "Data_Clean_UP" / "data" / "final" / "normalized_merged_set.csv"
    

    with open(data, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    years = [int(row["year"]) for row in rows]
    iphone = [float(row["iphone_units_sold_millions_norm"]) for row in rows]
    falls = [float(row["deaths_norm"]) for row in rows]

    print("\nYear-over-year correlation:")
    result = year_over_year_correlation(years, iphone, falls)

    for name, value in result.items():
        print(f"{name:>10}: {value}")