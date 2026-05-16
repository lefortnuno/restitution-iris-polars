"""
URLs DEV — inclut /api/skills/ (lit des .md, pas la DB → fonctionne sur SQLite).
Les routes /api/documents/ qui touchent la DB Document échouent → normal en dev.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf.urls.static import static

from config import settings
from documents.views import SkillsView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token_refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("api/restitutions/", include("restitutions.urls")),
    path("api/users/", include("customUsers.urls")),
    # Skills uniquement (pas de DB requise) — pour que le selecteur IA fonctionne
    path("api/skills/", SkillsView.as_view(), name="skills-list"),
    path("api/skills/<str:skill>/", SkillsView.as_view(), name="skill-detail"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
