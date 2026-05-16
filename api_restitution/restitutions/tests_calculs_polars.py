"""
Tests de non-régression pandas → polars pour les modules `calculs/`.

Stratégie : on conserve l'ancienne implémentation pandas en local, puis on
compare bit-à-bit avec la nouvelle implémentation polars sur des jeux de
données représentatifs (vide, single row, all-null, mix, group_by string,
group_by list).
"""

import math
import unittest
from typing import List, Dict, Optional, Union

import numpy as np
import pandas as pd

from restitutions.calculs.variance import variance_postgres_style
from restitutions.calculs.percentiles import percentile_postgres_style
from restitutions.calculs.sum import sum_postgres_style
from restitutions.calculs.show import show_postgres_style


# ---------- Implémentations pandas de référence (anciennes versions) ----------

def _variance_pandas(data, column, sample=True, group_by=None):
    df = pd.DataFrame(data)
    if df.empty or column not in df:
        return [{column: 0.0}]
    ddof = 1 if sample else 0
    if group_by:
        if isinstance(group_by, str):
            group_by = [group_by]
        for col in group_by:
            if col not in df.columns:
                return [{column: 0.0}]
        result = (
            df.groupby(group_by)[column]
            .apply(lambda x: round(x.var(ddof=ddof), 2) if len(x) >= 2 else 0.0)
            .reset_index()
        )
        return [
            {**{k: row[k] for k in group_by}, column: row[column]}
            for _, row in result.iterrows()
        ]
    values = df[column].dropna()
    if len(values) < 2:
        return [{column: 0.0}]
    return [{column: round(float(values.var(ddof=ddof)), 2)}]


def _percentile_pandas(data, column, percentile, group_by=None):
    def _cp(values):
        return round(float(np.percentile(values, percentile * 100)), 2) if values else 0.0
    df = pd.DataFrame(data)
    if df.empty or column not in df:
        return 0.0
    df = df.dropna(subset=[column])
    if group_by:
        if isinstance(group_by, str):
            group_by = [group_by]
        for col in group_by:
            if col not in df.columns:
                return 0.0
        result = (
            df.groupby(group_by)[column]
            .apply(lambda x: round(_cp(x.tolist()), 2))
            .reset_index()
        )
        return [
            {**{k: row[k] for k in group_by}, column: row[column]}
            for _, row in result.iterrows()
        ]
    return [{column: _cp(df[column].tolist())}]


def _sum_pandas(data, champ_somme, champ_groupe=None):
    df = pd.DataFrame(data)
    if champ_groupe:
        result_df = df.groupby(champ_groupe)[champ_somme].sum(min_count=1).reset_index()
        return result_df.to_dict(orient="records")
    total = df[champ_somme].sum(min_count=1)
    total = total.item() if hasattr(total, "item") else total
    return [{champ_somme: total}]


def _show_pandas(data, champ, champ_groupe=None):
    df = pd.DataFrame(data)
    champs_valides = [champ]
    if champ_groupe:
        if isinstance(champ_groupe, str):
            champs_valides.append(champ_groupe)
        elif isinstance(champ_groupe, list):
            champs_valides.extend(champ_groupe)
    champs = [c for c in champs_valides if c in df.columns]
    return df[champs].to_dict(orient="records")


# ---------- Helpers de comparaison ----------

def _norm_value(v):
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if hasattr(v, "item"):
        try:
            v = v.item()
        except Exception:
            pass
    if isinstance(v, float):
        return round(v, 2)
    return v


def _norm_records(records):
    out = []
    for rec in records:
        if isinstance(rec, dict):
            out.append({k: _norm_value(v) for k, v in rec.items()})
        else:
            out.append(_norm_value(rec))
    return out


def _assert_same(pandas_res, polars_res):
    a = _norm_records(pandas_res) if isinstance(pandas_res, list) else _norm_value(pandas_res)
    b = _norm_records(polars_res) if isinstance(polars_res, list) else _norm_value(polars_res)
    if isinstance(a, list) and isinstance(b, list):
        a = sorted(a, key=lambda d: tuple(sorted(d.items(), key=lambda kv: str(kv[0]))))
        b = sorted(b, key=lambda d: tuple(sorted(d.items(), key=lambda kv: str(kv[0]))))
    assert a == b, f"\nPandas:  {a}\nPolars:  {b}"


# ---------- Jeux de données ----------

DATA_BASIC = [
    {"region": "Nord", "ville": "A", "val": 10},
    {"region": "Nord", "ville": "B", "val": 20},
    {"region": "Sud",  "ville": "C", "val": 30},
    {"region": "Sud",  "ville": "D", "val": 40},
    {"region": "Sud",  "ville": "E", "val": 50},
]

DATA_WITH_NULLS = [
    {"region": "Nord", "val": 10},
    {"region": "Nord", "val": None},
    {"region": "Sud",  "val": None},
    {"region": "Sud",  "val": 50},
    {"region": "Est",  "val": None},
    {"region": "Est",  "val": None},
]

DATA_SINGLE = [{"region": "Nord", "val": 42}]
DATA_EMPTY: List[Dict] = []


# ---------- Tests ----------

class VarianceTests(unittest.TestCase):
    def test_global(self):
        _assert_same(_variance_pandas(DATA_BASIC, "val"), variance_postgres_style(DATA_BASIC, "val"))

    def test_groupby_str(self):
        _assert_same(
            _variance_pandas(DATA_BASIC, "val", group_by="region"),
            variance_postgres_style(DATA_BASIC, "val", group_by="region"),
        )

    def test_groupby_list(self):
        _assert_same(
            _variance_pandas(DATA_BASIC, "val", group_by=["region"]),
            variance_postgres_style(DATA_BASIC, "val", group_by=["region"]),
        )

    def test_pop_variance(self):
        _assert_same(
            _variance_pandas(DATA_BASIC, "val", sample=False, group_by="region"),
            variance_postgres_style(DATA_BASIC, "val", sample=False, group_by="region"),
        )

    def test_empty(self):
        _assert_same(_variance_pandas(DATA_EMPTY, "val"), variance_postgres_style(DATA_EMPTY, "val"))

    def test_single_row(self):
        _assert_same(
            _variance_pandas(DATA_SINGLE, "val", group_by="region"),
            variance_postgres_style(DATA_SINGLE, "val", group_by="region"),
        )

    def test_missing_column(self):
        _assert_same(
            _variance_pandas(DATA_BASIC, "inexistant"),
            variance_postgres_style(DATA_BASIC, "inexistant"),
        )


class PercentileTests(unittest.TestCase):
    def test_global_median(self):
        _assert_same(
            _percentile_pandas(DATA_BASIC, "val", 0.5),
            percentile_postgres_style(DATA_BASIC, "val", 0.5),
        )

    def test_global_p90(self):
        _assert_same(
            _percentile_pandas(DATA_BASIC, "val", 0.9),
            percentile_postgres_style(DATA_BASIC, "val", 0.9),
        )

    def test_groupby_str(self):
        _assert_same(
            _percentile_pandas(DATA_BASIC, "val", 0.5, group_by="region"),
            percentile_postgres_style(DATA_BASIC, "val", 0.5, group_by="region"),
        )

    def test_groupby_with_nulls(self):
        _assert_same(
            _percentile_pandas(DATA_WITH_NULLS, "val", 0.5, group_by="region"),
            percentile_postgres_style(DATA_WITH_NULLS, "val", 0.5, group_by="region"),
        )

    def test_invalid_percentile(self):
        with self.assertRaises(ValueError):
            percentile_postgres_style(DATA_BASIC, "val", 1.5)


class SumTests(unittest.TestCase):
    def test_global(self):
        _assert_same(
            _sum_pandas(DATA_BASIC, "val"),
            sum_postgres_style(DATA_BASIC, "val"),
        )

    def test_groupby_str(self):
        _assert_same(
            _sum_pandas(DATA_BASIC, "val", champ_groupe="region"),
            sum_postgres_style(DATA_BASIC, "val", champ_groupe="region"),
        )

    def test_groupby_list(self):
        _assert_same(
            _sum_pandas(DATA_BASIC, "val", champ_groupe=["region", "ville"]),
            sum_postgres_style(DATA_BASIC, "val", champ_groupe=["region", "ville"]),
        )

    def test_all_null_group_returns_none(self):
        # Pandas avec min_count=1 sur groupe tout-null retourne NaN → None après normalisation
        _assert_same(
            _sum_pandas(DATA_WITH_NULLS, "val", champ_groupe="region"),
            sum_postgres_style(DATA_WITH_NULLS, "val", champ_groupe="region"),
        )


class ShowTests(unittest.TestCase):
    def test_simple(self):
        _assert_same(
            _show_pandas(DATA_BASIC, "val"),
            show_postgres_style(DATA_BASIC, "val"),
        )

    def test_with_group(self):
        _assert_same(
            _show_pandas(DATA_BASIC, "val", champ_groupe="region"),
            show_postgres_style(DATA_BASIC, "val", champ_groupe="region"),
        )

    def test_with_group_list(self):
        _assert_same(
            _show_pandas(DATA_BASIC, "val", champ_groupe=["region", "ville"]),
            show_postgres_style(DATA_BASIC, "val", champ_groupe=["region", "ville"]),
        )

    def test_missing_column(self):
        _assert_same(
            _show_pandas(DATA_BASIC, "inexistant"),
            show_postgres_style(DATA_BASIC, "inexistant"),
        )


class PolarsInputTests(unittest.TestCase):
    """Vérifie que les fonctions acceptent aussi un polars.DataFrame en entrée (path streaming)."""

    def test_variance_accepts_polars_df(self):
        import polars as pl
        df = pl.DataFrame(DATA_BASIC)
        _assert_same(
            variance_postgres_style(DATA_BASIC, "val", group_by="region"),
            variance_postgres_style(df, "val", group_by="region"),
        )

    def test_sum_accepts_polars_df(self):
        import polars as pl
        df = pl.DataFrame(DATA_BASIC)
        _assert_same(
            sum_postgres_style(DATA_BASIC, "val", champ_groupe="region"),
            sum_postgres_style(df, "val", champ_groupe="region"),
        )

    def test_percentile_accepts_polars_df(self):
        import polars as pl
        df = pl.DataFrame(DATA_BASIC)
        _assert_same(
            percentile_postgres_style(DATA_BASIC, "val", 0.5, group_by="region"),
            percentile_postgres_style(df, "val", 0.5, group_by="region"),
        )


if __name__ == "__main__":
    unittest.main()
