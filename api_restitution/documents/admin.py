from django.contrib import admin
from .models import Document, DocumentChunk


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['titre', 'categorie', 'statut', 'created_at']
    list_filter = ['categorie', 'statut']
    readonly_fields = ['statut', 'created_at', 'updated_at']


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['document', 'position']
    list_filter = ['document']
    readonly_fields = ['embedding']
