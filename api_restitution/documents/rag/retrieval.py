import logging
from typing import Optional

from pgvector.django import CosineDistance

from documents.models import DocumentChunk
from documents.rag.modele import get_modele

logger = logging.getLogger('documents')


def retrieve_context(
    query_text: str,
    top_k: int = 5,
    categorie: Optional[str] = None,
    document_ids: Optional[list] = None,
) -> str:
    """
    Récupère les chunks pertinents.
    - Si document_ids est fourni → chunks de ces documents uniquement (tri par position).
    - Sinon → recherche sémantique parmi les docs indexés (filtrage par catégorie optionnel).
    Retourne une chaîne vide si rien à retourner.
    """
    try:
        qs = DocumentChunk.objects.filter(document__statut='indexe')

        if document_ids:
            qs = qs.filter(document__id__in=document_ids).order_by('document_id', 'position')
            textes = list(qs.values_list('texte', flat=True))
            logger.info(f"[RAG] {len(textes)} chunk(s) depuis {len(document_ids)} doc(s) pré-sélectionné(s)")
            return "\n\n---\n\n".join(textes)

        if categorie and categorie not in ('auto', 'general'):
            qs = qs.filter(document__categorie=categorie)

        if not qs.exists():
            return ""

        vecteur = get_modele().encode(query_text).tolist()
        chunks = qs.order_by(CosineDistance('embedding', vecteur))[:top_k]
        textes = [c.texte for c in chunks]
        logger.info(f"[RAG] {len(textes)} chunk(s) récupéré(s) pour : {query_text[:60]!r}")
        return "\n\n---\n\n".join(textes)

    except Exception as exc:
        logger.error(f"[RAG] Erreur retrieval : {exc}")
        return ""
