from django.db import models
from pgvector.django import VectorField


class Document(models.Model):
    STATUT = [
        ('en_attente', 'En attente'),
        ('indexation', 'Indexation en cours'),
        ('indexe', 'Indexé'),
        ('erreur', 'Erreur'),
    ]
    CATEGORIE = [
        ('general', 'Général'),
        ('financier', 'Financier'),
        ('geographique', 'Géographique'),
        ('temporel', 'Temporel'),
    ]

    titre = models.CharField(max_length=255)
    fichier = models.FileField(upload_to='documents/')
    categorie = models.CharField(max_length=20, choices=CATEGORIE, default='general')
    statut = models.CharField(max_length=20, choices=STATUT, default='en_attente')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.titre


class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    texte = models.TextField()
    embedding = VectorField(dimensions=768)
    position = models.IntegerField()

    class Meta:
        ordering = ['position']

    def __str__(self):
        return f"Chunk #{self.position} — {self.document.titre}"
