import logging

from sentence_transformers import SentenceTransformer

logger = logging.getLogger('documents')

NOM_MODELE = 'paraphrase-multilingual-mpnet-base-v2'
_modele: SentenceTransformer | None = None


def get_modele() -> SentenceTransformer:
    global _modele
    if _modele is None:
        logger.info(f"[RAG] Chargement du modèle {NOM_MODELE}...")
        _modele = SentenceTransformer(NOM_MODELE)
        logger.info("[RAG] Modèle chargé.")
    return _modele
