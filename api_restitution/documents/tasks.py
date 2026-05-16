from celery import shared_task

from documents.rag.indexation import indexer


@shared_task(bind=True, name='documents.indexer_document')
def indexer_document(self, document_id: int):
    indexer(document_id)
