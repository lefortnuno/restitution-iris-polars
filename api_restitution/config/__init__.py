import sys

# Force UTF-8 sur stdout/stderr — évite UnicodeEncodeError "'charmap' codec can't encode"
# sur Windows quand on print() des emojis (📊 ❌ ✅ …) depuis Django/Celery.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, Exception):
        pass

from .celery import app as celery_app

__all__ = ['celery_app']
