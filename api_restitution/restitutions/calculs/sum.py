from typing import List, Dict, Union, Optional
import polars as pl


def sum_postgres_style(
    data: Union[List[Dict], "pl.DataFrame"],
    champ_somme: str,
    champ_groupe: Optional[Union[str, List[str]]] = None
) -> Union[float, int, List[tuple]]:
    """
    Calcule la somme façon PostgreSQL, avec groupement possible.

    Reproduit le comportement pandas `sum(min_count=1)` : retourne None pour
    un groupe entièrement vide (toutes valeurs nulles ou aucune ligne).

    :param data: Liste de dictionnaires ou polars.DataFrame
    :param champ_somme: Colonne cible pour le calcul
    :param champ_groupe: str ou list[str] pour groupement
    :return: Somme globale ou list[dict] pour somme groupée
    """
    df = data if isinstance(data, pl.DataFrame) else pl.DataFrame(data)

    if champ_groupe:
        if df.is_empty() or champ_somme not in df.columns:
            return []
        group_keys = [champ_groupe] if isinstance(champ_groupe, str) else list(champ_groupe)

        agg = (
            df.lazy()
            .group_by(group_keys, maintain_order=True)
            .agg([
                pl.col(champ_somme).sum().alias(champ_somme),
                pl.col(champ_somme).is_not_null().sum().alias("__non_null_count"),
            ])
            .collect()
        )

        records = []
        for row in agg.iter_rows(named=True):
            non_null = row.pop("__non_null_count")
            if non_null == 0:
                row[champ_somme] = None
            records.append(row)
        return records

    if df.is_empty() or champ_somme not in df.columns:
        return [{champ_somme: None}]

    col = df.get_column(champ_somme)
    if col.drop_nulls().len() == 0:
        return [{champ_somme: None}]
    return [{champ_somme: col.sum()}]
