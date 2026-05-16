from typing import Iterator, Optional, Union
from django.db import connection
from django.apps import apps
import polars as pl


def is_number(value):
    """
    Vérifie si une valeur peut être convertie en float.
    """
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def _build_requete_sql(
    formats: list,
    champs: list,
    jointures: list = None,
    filtres: list = None,
    filtres_date: list = None,
) -> str:
    """
    Construit la requête SQL à partir des objets métier.
    Extrait pour être partagée entre fetch all et fetch stream.
    """
    list_formats = [f.get("name_structure") for f in formats if f.get("name_structure")]
    list_champs = ", ".join(champs)
    list_champs_date, list_jointures, list_filtres, list_jointure_tables, list_cross_joins = [], [], [], [], []

    if jointures:
        for cpt, j in enumerate(jointures):
            table1 = j["reference1"]["format"]
            champ1 = j["reference1"]["attribut"]
            table2 = j["reference2"]["format"]
            champ2 = j["reference2"]["attribut"]

            join_types = {
                "FJ": "FULL JOIN",
                "IJ": "INNER JOIN",
                "RJ": "RIGHT JOIN",
                "LJ": "LEFT JOIN",
            }

            join_prefix = join_types.get(j["type"], "")
            if cpt != 0 and table1 not in list_jointure_tables:
                jointure = f"{join_prefix} {table1} ON TRUE"
                list_jointures.append(jointure)
                list_jointure_tables.append(table1)
            jointure = f"{join_prefix} {table2} ON {table1}.{champ1} = {table2}.{champ2}"
            list_jointures.append(jointure)
            if cpt == 0:
                list_jointure_tables.append(table1)
            if table2 not in list_jointure_tables:
                list_jointure_tables.append(table2)

    if filtres:
        for f in filtres:
            champs_cible = f["champs_cible"]
            comp = f['operateur_comparaison']
            param = f["parametre"]

            if len(champs_cible.split(".")) >= 2:
                champs_cible = f'{champs_cible.split(".")[0]}."{champs_cible.split(".")[1]}"'

            if comp == "==":
                comp = "="

            if not is_number(param):
                param = f"'{param}'"

            condition = f"{champs_cible} {comp} {param}"

            if f.get("operateur_logique"):
                op_log = f["operateur_logique"].upper()
                op_log = "OR" if op_log == "OU" else "AND" if op_log == "ET" else ""
                condition = f"{op_log} {condition}"

            list_filtres.append(condition)

    formats_non_jointes = set(list_formats) - set(list_jointure_tables)
    for table in formats_non_jointes:
        list_cross_joins.append(f"CROSS JOIN {table}")

    where_clause = " ".join(list_filtres)

    if list_jointures:
        base_table = list_jointure_tables[0]
        join_clause = " ".join(list_jointures + list_cross_joins)
    else:
        base_table = list_formats[0]
        list_cross_joins = [cj for cj in list_cross_joins if f"CROSS JOIN {base_table}" != cj]
        join_clause = " ".join(list_cross_joins)

    requete_sql = f"SELECT {list_champs} FROM {base_table} {join_clause} "

    if filtres_date:
        list_champs_date = " AND ".join(filtres_date)
        if where_clause:
            requete_sql += f"WHERE {where_clause} AND {list_champs_date}"
        else:
            requete_sql += f"WHERE {list_champs_date}"
    else:
        if where_clause:
            requete_sql += f"WHERE {where_clause}"

    return requete_sql


def recuperer_donnees_entrepot(formats: list, champs: list, jointures: list = None, filtres: list = None, filtres_date: list = None):
    """
    Récupère les données depuis un entrepôt de données dynamique.
    API historique : retourne {"requete_sql": ..., "api_data": list[dict]}.
    """
    requete_sql = _build_requete_sql(formats, champs, jointures, filtres, filtres_date)
    return executeur_requete(requete_sql)


def recuperer_donnees_entrepot_stream(
    formats: list,
    champs: list,
    jointures: list = None,
    filtres: list = None,
    filtres_date: list = None,
    chunk_size: int = 10000,
    as_dataframe: bool = True,
):
    """
    Variante streaming de `recuperer_donnees_entrepot`.
    Construit la même requête SQL puis délègue à `executeur_requete_stream`.

    :param chunk_size: Taille des batches lus depuis le curseur (fetchmany).
    :param as_dataframe: True → retourne un polars.DataFrame consolidé.
                         False → retourne un itérateur de batches polars.DataFrame.
    """
    requete_sql = _build_requete_sql(formats, champs, jointures, filtres, filtres_date)
    return executeur_requete_stream(
        requete_sql,
        chunk_size=chunk_size,
        as_dataframe=as_dataframe,
    )


def executeur_requete(requete_sql: str):
    """
    Exécute une requête SQL brute et retourne les résultats sous forme de liste de dictionnaires.
    """
    with connection.cursor() as cursor:
        cursor.execute(requete_sql)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        return {
            "requete_sql": requete_sql,
            "api_data": [dict(zip(columns, row)) for row in rows],
        }


def _iter_cursor_batches(cursor, chunk_size: int) -> Iterator[list]:
    """Yield batches of rows via fetchmany() until le curseur est vide."""
    while True:
        rows = cursor.fetchmany(chunk_size)
        if not rows:
            break
        yield rows


def executeur_requete_stream(
    requete_sql: str,
    chunk_size: int = 10000,
    as_dataframe: bool = True,
) -> Union[dict, Iterator["pl.DataFrame"]]:
    """
    Streaming d'une requête SQL — utilise `cursor.fetchmany(chunk_size)`
    pour éviter de charger toute la table en RAM.

    Deux modes :
    - as_dataframe=True (défaut) : consomme tous les batches et retourne
      {"requete_sql": str, "df": pl.DataFrame}. Reste memory-friendly grâce
      au streaming + concat en colonnes (vs liste de millions de dicts).
    - as_dataframe=False : retourne un itérateur de polars.DataFrame
      (un par batch). Utile pour map-reduce / pipelines incrémentaux.
    """
    if as_dataframe:
        cursor = connection.cursor()
        try:
            cursor.execute(requete_sql)
            columns = [col[0] for col in cursor.description]
            chunks: list[pl.DataFrame] = []
            for batch in _iter_cursor_batches(cursor, chunk_size):
                chunks.append(pl.DataFrame(batch, schema=columns, orient="row"))
        finally:
            cursor.close()

        if not chunks:
            df = pl.DataFrame(schema={c: pl.Object for c in columns}) if columns else pl.DataFrame()
        else:
            df = pl.concat(chunks, how="vertical_relaxed")

        return {"requete_sql": requete_sql, "df": df}

    def _generator() -> Iterator[pl.DataFrame]:
        cursor = connection.cursor()
        try:
            cursor.execute(requete_sql)
            columns = [col[0] for col in cursor.description]
            for batch in _iter_cursor_batches(cursor, chunk_size):
                yield pl.DataFrame(batch, schema=columns, orient="row")
        finally:
            cursor.close()

    return _generator()
