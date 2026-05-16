from typing import List, Dict, Union, Optional
import polars as pl


def variance_postgres_style(
    data: Union[List[Dict], "pl.DataFrame"],
    column: str,
    sample: bool = True,
    group_by: Optional[Union[str, List[str]]] = None
) -> Union[Optional[float], List[Dict]]:
    """
    Calcule la variance façon PostgreSQL (VAR_SAMP ou VAR_POP) avec support GROUP BY.

    :param data: Liste de dicts ou polars.DataFrame
    :param column: Colonne numérique
    :param sample: True pour VAR_SAMP (n-1), False pour VAR_POP (n)
    :param group_by: str ou list[str] pour le groupement
    :return: float ou List[Dict]
    """
    df = data if isinstance(data, pl.DataFrame) else pl.DataFrame(data)

    if df.is_empty() or column not in df.columns:
        return [{column: 0.0}]

    ddof = 1 if sample else 0

    if group_by:
        if isinstance(group_by, str):
            group_by = [group_by]

        for col in group_by:
            if col not in df.columns:
                return [{column: 0.0}]

        agg = (
            df.lazy()
            .group_by(group_by, maintain_order=True)
            .agg(
                pl.col(column).drop_nulls().var(ddof=ddof).alias(column)
            )
            .collect()
        )

        records = []
        for row in agg.iter_rows(named=True):
            val = row[column]
            row[column] = round(float(val), 2) if val is not None else 0.0
            records.append(row)
        return records

    values = df.get_column(column).drop_nulls()
    if values.len() < 2:
        return [{column: 0.0}]
    var_val = values.var(ddof=ddof)
    if var_val is None:
        return [{column: 0.0}]
    return [{column: round(float(var_val), 2)}]
