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


if __name__ == "__main__":
    data = Path(__file__).parent / "Data_Clean_UP" / "data" / "final" / "iphone_vs_falls_normalized.csv"
    with open(data, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    iphone = [float(row["iphone_norm"]) for row in rows]
    falls = [float(row["falls_norm"]) for row in rows]

    for name, value in correlation_stats(iphone, falls).items():
        print(f"{name:>10}: {value}")