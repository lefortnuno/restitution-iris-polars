import os

from rest_framework import serializers

from .models import Document

EXTENSIONS_AUTORISEES = {'.pdf', '.txt'}


class DocumentSerializer(serializers.ModelSerializer):
    nb_chunks = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'titre', 'fichier', 'categorie', 'statut', 'nb_chunks', 'created_at', 'updated_at']
        read_only_fields = ['statut', 'created_at', 'updated_at']

    def get_nb_chunks(self, obj):
        return obj.chunks.count()

    def validate_fichier(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in EXTENSIONS_AUTORISEES:
            raise serializers.ValidationError(
                f"Type de fichier non supporté : {ext}. Seuls PDF et TXT sont acceptés."
            )
        return value
