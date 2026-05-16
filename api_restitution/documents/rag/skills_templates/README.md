# Skills — Templates de prompts

Chaque fichier `.md` de ce dossier définit le prompt système d'un skill IA.
Ces prompts sont **préfixés** au prompt de base lors des analyses LLM quand le skill correspondant est actif (détecté automatiquement ou choisi manuellement).

## Fichiers attendus

- `financier.md`
- `geographique.md`
- `temporel.md`
- `general.md`

## Pattern recommandé

Chaque fichier suit une structure en 3 sections :

```md
## Rôle
<qui est l'analyste et son domaine d'expertise>

## Focus
<ce qu'il doit observer dans les données>

## Ton
<ton et style de communication attendus>
```

## Édition

Ces fichiers sont :
- **Éditables à la main** (via un éditeur texte, Notepad, VS Code, Word en mode texte…)
- **Éditables via l'interface web** à la page `/skills`
- Rechargés à chaque analyse (pas besoin de redémarrer Celery)

## Fallback

Si un fichier est absent ou vide, un prompt par défaut est utilisé (défini dans `documents/rag/skills.py`).
