from django.db.models.signals import post_save
from django.dispatch import receiver

from documents.models import Document


@receiver(post_save, sender=Document)
def declencher_indexation(sender, instance, created, **kwargs):
    if created and instance.fichier:
        from documents.tasks import indexer_document
        indexer_document.delay(instance.id)
