from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from config import settings
from django.conf.urls.static import static

from documents.views import SkillsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token_refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('api/restitutions/', include("restitutions.urls")),
    path("api/users/", include("customUsers.urls")),
    path("api/documents/", include("documents.urls")),
    path("api/skills/", SkillsView.as_view(), name='skills-list'),
    path("api/skills/<str:skill>/", SkillsView.as_view(), name='skill-detail'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)