from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document
from .serializers import DocumentSerializer
from documents.rag.skills import (
    get_all_skills, get_skill_prompt, save_skill_prompt,
    create_skill, delete_skill, BASE_SKILLS,
)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    pagination_class = None

    def get_permissions(self):
        if self.request.method in ('POST', 'PATCH', 'DELETE'):
            return [IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]

    def partial_update(self, request, *args, **kwargs):
        allowed = {'titre', 'categorie'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        serializer = self.get_serializer(self.get_object(), data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def perform_destroy(self, instance):
        if instance.fichier:
            instance.fichier.delete(save=False)
        instance.delete()

    @action(detail=False, methods=['delete'], url_path='bulk_delete',
            permission_classes=[IsAdminUser])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids or not isinstance(ids, list):
            return Response({"error": "Une liste d'IDs est requise."},
                            status=status.HTTP_400_BAD_REQUEST)
        documents = Document.objects.filter(id__in=ids)
        for doc in documents:
            if doc.fichier:
                doc.fichier.delete(save=False)
        count = documents.count()
        documents.delete()
        return Response({"message": f"{count} document(s) supprimé(s)."},
                        status=status.HTTP_200_OK)


class SkillsView(APIView):
    """
    GET    /api/skills/           → liste tous les skills + prompts
    GET    /api/skills/<skill>/   → détail d'un skill
    POST   /api/skills/           → crée un skill custom  (admin)
    PUT    /api/skills/<skill>/   → modifie le prompt      (admin)
    DELETE /api/skills/<skill>/   → supprime ou réinitialise (admin)
    """

    def get_permissions(self):
        if self.request.method in ('POST', 'PUT', 'DELETE'):
            return [IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]

    def get(self, request, skill=None):
        all_skills = get_all_skills()
        if skill:
            if skill not in all_skills:
                return Response({"error": f"Skill inconnu : {skill}"},
                                status=status.HTTP_404_NOT_FOUND)
            return Response({
                "skill": skill,
                "prompt": get_skill_prompt(skill),
                "is_base": skill in BASE_SKILLS,
            })
        return Response([
            {
                "skill": s,
                "prompt": get_skill_prompt(s),
                "is_base": s in BASE_SKILLS,
            }
            for s in all_skills
        ])

    def post(self, request, skill=None):
        skill_name = request.data.get('skill', '').strip().lower()
        prompt = request.data.get('prompt', '').strip()
        if not prompt:
            return Response({"error": "Le prompt ne peut pas être vide."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            create_skill(skill_name, prompt)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"skill": skill_name, "prompt": get_skill_prompt(skill_name), "is_base": False},
            status=status.HTTP_201_CREATED,
        )

    def put(self, request, skill=None):
        all_skills = get_all_skills()
        if skill not in all_skills:
            return Response({"error": f"Skill inconnu : {skill}"},
                            status=status.HTTP_404_NOT_FOUND)
        prompt = request.data.get('prompt', '').strip()
        if not prompt:
            return Response({"error": "Le prompt ne peut pas être vide."},
                            status=status.HTTP_400_BAD_REQUEST)
        save_skill_prompt(skill, prompt)
        return Response({"skill": skill, "prompt": get_skill_prompt(skill), "is_base": skill in BASE_SKILLS})

    def delete(self, request, skill=None):
        all_skills = get_all_skills()
        if not skill or skill not in all_skills:
            return Response({"error": f"Skill inconnu : {skill}"},
                            status=status.HTTP_404_NOT_FOUND)
        try:
            result = delete_skill(skill)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        if result["reset"]:
            return Response({"status": "reset", "skill": skill,
                             "prompt": get_skill_prompt(skill)})
        return Response(status=status.HTTP_204_NO_CONTENT)
