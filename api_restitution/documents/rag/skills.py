import re
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "skills_templates"

BASE_SKILLS = ['financier', 'geographique', 'temporel', 'general']
SKILL_CHOICES = ['auto'] + BASE_SKILLS  # conservé pour compatibilité

_KEYWORDS: dict[str, list[str]] = {
    'financier':    ['montant', 'paiement', 'retard', 'solde', 'facture', 'credit',
                     'debit', 'agios', 'taux', 'interets', 'encours', 'echeance',
                     'versement', 'virement', 'remboursement'],
    'geographique': ['region', 'ville', 'lat', 'lon', 'zone', 'territoire',
                     'pays', 'commune', 'departement', 'wilaya', 'localite',
                     'adresse', 'geom', 'coordonnees'],
    'temporel':     ['date', 'mois', 'annee', 'periode', 'trimestre', 'semestre',
                     'exercice', 'jour', 'heure', 'timestamp', 'created_at', 'updated_at'],
}

_DEFAULT_PROMPTS: dict[str, str] = {
    'financier':    "## Rôle\nTu es un expert en analyse financière et bancaire.\n\n## Focus\nIdentifie les risques, anomalies de paiement et indicateurs de performance financière.\n\n## Ton\nAnalytique et rigoureux.",
    'geographique': "## Rôle\nTu es un expert en analyse géospatiale.\n\n## Focus\nIdentifie les disparités régionales et concentrations géographiques.\n\n## Ton\nAnalytique et précis.",
    'temporel':     "## Rôle\nTu es un expert en analyse de séries temporelles.\n\n## Focus\nIdentifie tendances, saisonnalités et ruptures.\n\n## Ton\nAnalytique et structuré.",
    'general':      "## Rôle\nTu es un analyste de données senior.\n\n## Focus\nDégage les tendances principales et anomalies.\n\n## Ton\nProfessionnel, clair et neutre.",
}


def get_all_skills() -> list[str]:
    """Retourne les skills de base + tous les fichiers .md custom trouvés."""
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    skills = set(BASE_SKILLS)
    for f in TEMPLATES_DIR.glob("*.md"):
        if f.stem != "README":
            skills.add(f.stem)
    return sorted(skills)


def detecter_skill(colonnes: list[str]) -> str:
    """Détecte le skill pertinent à partir des noms de colonnes (base skills uniquement)."""
    colonnes_lower = [c.lower() for c in colonnes]
    scores: dict[str, int] = {skill: 0 for skill in _KEYWORDS}
    for skill, keywords in _KEYWORDS.items():
        for col in colonnes_lower:
            for kw in keywords:
                if kw in col:
                    scores[skill] += 1
    meilleur = max(scores, key=lambda s: scores[s])
    return meilleur if scores[meilleur] > 0 else 'general'


def get_skill_prompt(skill: str) -> str:
    """
    Charge le prompt depuis le fichier .md.
    Rechargé à chaque appel → édition à chaud.
    Fallback sur _DEFAULT_PROMPTS pour les skills de base.
    """
    fichier = TEMPLATES_DIR / f"{skill}.md"
    if fichier.exists():
        contenu = fichier.read_text(encoding='utf-8').strip()
        if contenu:
            return contenu
    return _DEFAULT_PROMPTS.get(skill, "")


def save_skill_prompt(skill: str, prompt: str) -> None:
    """Crée ou met à jour le fichier .md d'un skill."""
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    fichier = TEMPLATES_DIR / f"{skill}.md"
    fichier.write_text(prompt.strip() + "\n", encoding='utf-8')


def create_skill(skill_name: str, prompt: str) -> None:
    """Crée un nouveau skill custom. Lève ValueError si nom invalide ou déjà existant."""
    skill_name = skill_name.strip().lower()
    if not re.match(r'^[a-z][a-z0-9_]{1,29}$', skill_name):
        raise ValueError("Nom invalide : lettres minuscules, chiffres et _ uniquement, 2–30 caractères.")
    if skill_name == 'auto':
        raise ValueError("Le nom 'auto' est réservé.")
    fichier = TEMPLATES_DIR / f"{skill_name}.md"
    if fichier.exists():
        raise ValueError(f"Le skill '{skill_name}' existe déjà. Utilisez PUT pour le modifier.")
    save_skill_prompt(skill_name, prompt)


def delete_skill(skill_name: str) -> dict:
    """
    Supprime un skill custom (fichier .md).
    Pour un skill de base : réinitialise au prompt par défaut (supprime le fichier custom).
    """
    fichier = TEMPLATES_DIR / f"{skill_name}.md"
    is_base = skill_name in BASE_SKILLS
    if not fichier.exists() and not is_base:
        raise ValueError(f"Skill '{skill_name}' introuvable.")
    if fichier.exists():
        fichier.unlink()
    return {"reset": is_base}
