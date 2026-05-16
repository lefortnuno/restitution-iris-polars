"""
Settings DEV léger — SQLite + Celery synchrone + sans app `documents` (pgvector).
Utilisé pour valider rapidement la migration pandas→polars sans Docker/Postgres/Redis.

Lancement :
    set DJANGO_SETTINGS_MODULE=config.settings_dev
    python manage.py migrate
    python manage.py runserver 0.0.0.0:8000
"""

from .settings import *  # noqa: F401,F403

# --- DB locale ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.dev.sqlite3",
    }
}

# --- App `documents` réactivée pour le endpoint /api/skills/ (lit des .md, pas la DB).
# On skippe ses migrations pour éviter le crash pgvector sur SQLite.
# Les endpoints /api/documents/ qui touchent la DB échoueront → c'est normal en dev SQLite.
MIGRATION_MODULES = {"documents": None}

# --- URLs sans les routes documents (qui importent VectorField) ---
ROOT_URLCONF = "config.urls_dev"

# --- Celery en mode synchrone (pas de Redis requis) ---
# IMPORTANT : sans STORE_EAGER_RESULT, AsyncResult(task_id) reste PENDING à vie
# car les résultats EAGER ne sont pas écrits dans le backend par défaut.
import pathlib as _pl
_CELERY_RESULTS_DIR = BASE_DIR / "celery_results_dev"
_pl.Path(_CELERY_RESULTS_DIR).mkdir(parents=True, exist_ok=True)

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TASK_STORE_EAGER_RESULT = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "file://" + str(_CELERY_RESULTS_DIR).replace("\\", "/")
