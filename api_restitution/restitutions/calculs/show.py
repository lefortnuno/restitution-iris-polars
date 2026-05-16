from typing import List, Dict, Union, Optional
import polars as pl


def show_postgres_style(
    data: Union[List[Dict], "pl.DataFrame"],
    champ: str,
    champ_groupe: Optional[Union[str, List[str]]] = None
) -> Union[float, int, List[tuple]]:
    """
    Projette une ou plusieurs colonnes (équivalent SELECT).

    :param data: Liste de dictionnaires ou polars.DataFrame
    :param champ: Colonne cible à afficher
    :param champ_groupe: str ou list[str] : autres colonnes à afficher
    :return: Liste de dicts {colonne: valeur}
    """
    df = data if isinstance(data, pl.DataFrame) else pl.DataFrame(data)
    champs_valides = [champ]

    if champ_groupe:
        if isinstance(champ_groupe, str):
            champs_valides.append(champ_groupe)
        elif isinstance(champ_groupe, list):
            champs_valides.extend(champ_groupe)

    if df.is_empty():
        return []

    champs = [c for c in champs_valides if c in df.columns]

    if not champs:
        return []

    return df.select(champs).to_dicts()
