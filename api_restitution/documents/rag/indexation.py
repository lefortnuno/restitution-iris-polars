import logging

import pdfplumber

from documents.models import Document, DocumentChunk
from documents.rag.modele import get_modele

logger = logging.getLogger('documents')


def extraire_texte(chemin: str) -> str:
    if chemin.lower().endswith('.pdf'):
        with pdfplumber.open(chemin) as pdf:
            return '\n'.join(page.extract_text() or '' for page in pdf.pages)
    with open(chemin, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()


def decouper_en_chunks(texte: str, taille: int = 400, overlap: int = 50) -> list[str]:
    mots = texte.split()
    chunks, debut = [], 0
    while debut < len(mots):
        chunk = ' '.join(mots[debut: debut + taille])
        if len(chunk.strip()) > 30:
            chunks.append(chunk)
        debut += taille - overlap
    return chunks


def indexer(document_id: int) -> None:
    document = Document.objects.get(id=document_id)
    document.statut = 'indexation'
    document.save(update_fields=['statut'])

    try:
        document.chunks.all().delete()

        texte = extraire_texte(document.fichier.path)
        if not texte.strip():
            raise ValueError("Aucun texte extrait du document.")

        chunks = decouper_en_chunks(texte)
        if not chunks:
            raise ValueError("Aucun chunk généré.")

        modele = get_modele()
        vecteurs = modele.encode(chunks, show_progress_bar=False, batch_size=32)

        DocumentChunk.objects.bulk_create([
            DocumentChunk(
                document=document,
                texte=chunk,
                embedding=vecteur.tolist(),
                position=i,
            )
            for i, (chunk, vecteur) in enumerate(zip(chunks, vecteurs))
        ])

        document.statut = 'indexe'
        document.save(update_fields=['statut'])
        logger.info(f"[RAG] Document {document_id} indexé — {len(chunks)} chunks.")

    except Exception as exc:
        logger.error(f"[RAG] Échec indexation document {document_id} : {exc}")
        document.statut = 'erreur'
        document.save(update_fields=['statut'])
        raise
