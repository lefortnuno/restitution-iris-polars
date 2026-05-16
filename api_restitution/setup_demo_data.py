"""
Script de setup données démo pour tester la migration pandas→polars sur SQLite.

Crée :
  - 2 tables d'entrepôt : AUDIT_FINANCIER, CREDIT_CREANCE (avec données)
  - 2 Restitutions prêtes à lancer :
      * "Demo SUM par codeT" (AUDIT_FINANCIER, group_by codeT, sum(montent))
      * "Demo VARIANCE CRD"  (CREDIT_CREANCE, group_by Code_Tiers, variance(CRD))

Usage :
  set DJANGO_SETTINGS_MODULE=config.settings_dev
  python setup_demo_data.py
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_dev")
os.environ.setdefault("GROQ_API_KEY", "dummy")
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model
from restitutions.models import (
    Restitutions, Formats, Affichages, LLMModeles, Champs,
    Operations, Expressions,
)


# ---------- 1. Tables d'entrepôt ----------

def create_warehouse_tables():
    with connection.cursor() as cur:
        cur.execute('DROP TABLE IF EXISTS "AUDIT_FINANCIER"')
        cur.execute('''
            CREATE TABLE "AUDIT_FINANCIER" (
                "date" TEXT,
                "codeT" TEXT,
                "montent" INTEGER,
                "compt" TEXT,
                "lat" INTEGER,
                "lon" INTEGER,
                "money" INTEGER
            )
        ''')
        audit_rows = [
            ("2024-01-15", "A", 1500, "C001", 48, 2, 100),
            ("2024-02-10", "A", 2300, "C001", 48, 2, 150),
            ("2024-03-05", "A", 1800, "C002", 48, 2, 120),
            ("2024-01-20", "B", 3200, "C003", 45, 5, 200),
            ("2024-02-15", "B", 2900, "C003", 45, 5, 180),
            ("2024-03-12", "B", 3500, "C004", 45, 5, 220),
            ("2024-01-25", "C", 800, "C005", 50, 8, 60),
            ("2024-02-20", "C", 1200, "C005", 50, 8, 90),
            ("2024-03-18", "C", 950, "C006", 50, 8, 75),
            ("2024-04-01", "C", 1100, "C006", 50, 8, 85),
            ("2024-04-15", "A", 2700, "C001", 48, 2, 170),
            ("2024-04-22", "B", 4100, "C004", 45, 5, 260),
        ]
        cur.executemany(
            'INSERT INTO "AUDIT_FINANCIER" ("date","codeT","montent","compt","lat","lon","money") '
            'VALUES (?,?,?,?,?,?,?)',
            audit_rows,
        )

        cur.execute('DROP TABLE IF EXISTS "CREDIT_CREANCE"')
        cur.execute('''
            CREATE TABLE "CREDIT_CREANCE" (
                "Code_Tiers" TEXT,
                "Nom_Tiers" TEXT,
                "Num_Engag" TEXT,
                "Nb_Impayes" INTEGER,
                "Duree_jour" INTEGER,
                "CRD" REAL,
                "Mnt_Impaye" REAL,
                "Date_ARRETE" TEXT,
                "Flag_restructure" INTEGER
            )
        ''')
        credit_rows = [
            ("T001", "Alpha SARL",  "E001", 2,  30, 15000.50,  500.0, "2024-03-31", 0),
            ("T001", "Alpha SARL",  "E002", 0,   0, 12000.00,    0.0, "2024-03-31", 0),
            ("T001", "Alpha SARL",  "E003", 5,  90, 22000.75, 1200.0, "2024-03-31", 1),
            ("T002", "Beta SA",     "E004", 1,  15,  8500.00,  200.0, "2024-03-31", 0),
            ("T002", "Beta SA",     "E005", 3,  60, 18000.00,  900.0, "2024-03-31", 0),
            ("T003", "Gamma SAS",   "E006", 0,   0,  5000.00,    0.0, "2024-03-31", 0),
            ("T003", "Gamma SAS",   "E007", 4,  75, 25000.40, 1800.5, "2024-03-31", 1),
            ("T003", "Gamma SAS",   "E008", 2,  45, 14000.00,  600.0, "2024-03-31", 0),
            ("T004", "Delta SARL",  "E009", 7, 120, 35000.00, 2500.0, "2024-03-31", 1),
            ("T004", "Delta SARL",  "E010", 1,  20,  9500.00,  150.0, "2024-03-31", 0),
            ("T005", "Epsilon SA",  "E011", 0,   0,  3500.00,    0.0, "2024-03-31", 0),
            ("T005", "Epsilon SA",  "E012", 6, 100, 28000.00, 2100.0, "2024-03-31", 1),
        ]
        cur.executemany(
            'INSERT INTO "CREDIT_CREANCE" ("Code_Tiers","Nom_Tiers","Num_Engag","Nb_Impayes",'
            '"Duree_jour","CRD","Mnt_Impaye","Date_ARRETE","Flag_restructure") '
            'VALUES (?,?,?,?,?,?,?,?,?)',
            credit_rows,
        )
    print(f"[OK] AUDIT_FINANCIER : 12 lignes")
    print(f"[OK] CREDIT_CREANCE  : 12 lignes")


# ---------- 2. Helper pour construire une opération fonc(champ) ----------

def _build_op_func(restitution, func: str, alias: str, champ_ref: str):
    """
    Construit une opération nommée `alias` exécutant `func(champ_ref)`.
    Le group_by est injecté automatiquement par tasks.py depuis les Champs non-op.

    Génère 2 Expressions enchaînées :
      Expression 1 : valeur=func, operateur_arithmetique="("
      Expression 2 : valeur=champ_ref, operateur_arithmetique=")"
    Ce qui flatten en : "func(champ_ref)"
    """
    op = Operations.objects.create(restitution=restitution, as_nom=alias)
    Expressions.objects.create(
        operation=op, valeur=func, operateur_arithmetique="(",
    )
    Expressions.objects.create(
        operation=op, valeur=champ_ref, operateur_arithmetique=")",
    )
    return op


# ---------- 3. Restitutions prêtes ----------

def create_restitutions(user):
    Restitutions.objects.filter(nom__startswith="Demo ").delete()

    # ---- Restitution 1 : SUM(montent) par codeT ----
    r1 = Restitutions.objects.create(
        nom="Demo SUM montent par codeT",
        description="Test polars sum_postgres_style groupé sur AUDIT_FINANCIER",
        status_llm=False,
        created_by=user,
    )
    Affichages.objects.create(restitution=r1, nom_affichage="Tableau simple")
    LLMModeles.objects.create(restitution=r1, libelle_llm="qwen/qwen3-32b", skill="auto")
    Formats.objects.create(restitution=r1, id_structure=1, name_structure="AUDIT_FINANCIER")
    # Champ de groupement (nom != op.as_nom → tasks.py l'ajoute au GROUP BY)
    Champs.objects.create(restitution=r1, nom="AUDIT_FINANCIER.codeT", as_nom="codeT",
                          type="manual", typeAttribut="varchar")
    # Champ résultat (nom == op.as_nom → reconnu comme colonne calculée)
    Champs.objects.create(restitution=r1, nom="somme_montent", as_nom="somme_montent",
                          type="manual", typeAttribut="integer")
    _build_op_func(r1, "sum", "somme_montent", "AUDIT_FINANCIER.montent")
    print(f"[OK] Restitution #{r1.id} : {r1.nom}")

    # ---- Restitution 2 : VAR(CRD) par Code_Tiers ----
    r2 = Restitutions.objects.create(
        nom="Demo VARIANCE CRD par Code_Tiers",
        description="Test polars variance_postgres_style groupé sur CREDIT_CREANCE",
        status_llm=False,
        created_by=user,
    )
    Affichages.objects.create(restitution=r2, nom_affichage="Tableau simple")
    LLMModeles.objects.create(restitution=r2, libelle_llm="qwen/qwen3-32b", skill="auto")
    Formats.objects.create(restitution=r2, id_structure=5, name_structure="CREDIT_CREANCE")
    Champs.objects.create(restitution=r2, nom="CREDIT_CREANCE.Code_Tiers", as_nom="Code_Tiers",
                          type="manual", typeAttribut="varchar")
    Champs.objects.create(restitution=r2, nom="var_CRD", as_nom="var_CRD",
                          type="manual", typeAttribut="FLOAT")
    _build_op_func(r2, "var", "var_CRD", "CREDIT_CREANCE.CRD")
    print(f"[OK] Restitution #{r2.id} : {r2.nom}")

    return [r1, r2]


if __name__ == "__main__":
    User = get_user_model()
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        admin = User.objects.create_superuser(username="admin", email="admin@test.local", password="admin")

    print("=== Création tables entrepôt ===")
    create_warehouse_tables()
    print()
    print("=== Création restitutions démo ===")
    rs = create_restitutions(admin)
    print()
    print("=== OK ===")
    print(f"Tu peux tester via :")
    for r in rs:
        print(f"  POST http://127.0.0.1:8001/api/restitutions/{r.id}/lancer_traitement_restitution/")
    print(f"  ou via le frontend http://localhost:8002/")
