from typing import List, Dict, Union, Optional
import numpy as np
import polars as pl


def cast_numpy_types(obj):
    if isinstance(obj, dict):
        return {k: cast_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [cast_numpy_types(x) for x in obj]
    elif isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    else:
        return obj


def percentile_postgres_style(
    data: Union[List[Dict], "pl.DataFrame"],
    column: str,
    percentile: float,
    group_by: Optional[Union[str, List[str]]] = None
) -> Union[Optional[float], List[Dict]]:
    """
    Calcule le percentile (type PERCENTILE_CONT) avec ou sans GROUP BY.

    :param data: Liste de dictionnaires ou polars.DataFrame
    :param column: Nom de la colonne à analyser
    :param percentile: Float entre 0 et 1 (ex: 0.5 pour médiane)
    :param group_by: str ou list[str] pour le groupement
    :return: float (global) ou List[Dict] pour groupé
    """
    if not (0 <= percentile <= 1):
        raise ValueError("Le percentile doit être entre 0 et 1")

    def compute_percentile(values: List[float]) -> Optional[float]:
        return round(float(np.percentile(values, percentile * 100)), 2) if values else 0.0

    df = data if isinstance(data, pl.DataFrame) else pl.DataFrame(data)
    if df.is_empty() or column not in df.columns:
        return 0.0

    df = df.drop_nulls(subset=[column])

    if group_by:
        if isinstance(group_by, str):
            group_by = [group_by]

        for col in group_by:
            if col not in df.columns:
                return 0.0

        result = []
        for keys, sub in df.group_by(group_by, maintain_order=True):
            values = sub.get_column(column).to_list()
            entry = {}
            if isinstance(keys, tuple):
                for k, v in zip(group_by, keys):
                    entry[k] = v
            else:
                entry[group_by[0]] = keys
            entry[column] = round(compute_percentile(values), 2)
            result.append(entry)

        return cast_numpy_types(result)

    values = df.get_column(column).to_list()
    return [{column: compute_percentile(values)}]
