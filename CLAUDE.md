# CLAUDE.md — IRIS Restitution Platform

## Vue d'ensemble

Plateforme de requêtage, analyse et visualisation de données. L'utilisateur configure des requêtes via une UI visuelle ; Django les exécute (via un parser Lark custom), traite les résultats avec Pandas/GeoPandas, les enrichit optionnellement via un LLM (Groq), et retourne des données structurées pour affichage React (tableaux, graphes, cartes, exports).

---

## Architecture

```
React Frontend (TypeScript)
    ↓ Axios / REST
Nginx (reverse proxy — 80/443)
    ├─ /backend/ → Django API (port 8000)
    ├─ /api/     → Django API (port 8000)   ← les deux préfixes sont routés
    └─ /         → React App (port 5173 dev)

Django Backend
    ├─ PostgreSQL 15   (données persistantes + vecteurs RAG via pgvector)
    ├─ Redis 7         (cache + broker Celery)
    └─ Celery Worker   (tâches async : requêtes, LLM, indexation RAG)
```

---

## Stack Technique

### Backend (`api_restitution/`)

| Composant       | Tech                          | Version          |
|-----------------|-------------------------------|------------------|
| Framework       | Django                        | 4.2.4            |
| API             | Django REST Framework         | 3.15.2           |
| Auth            | djangorestframework-simplejwt | latest           |
| BDD             | PostgreSQL                    | 15 (alpine)      |
| Task queue      | Celery                        | 5.5.1            |
| Broker          | Redis                         | 7 (alpine)       |
| LLM             | Groq API                      | 0.37.1           |
| Data            | Pandas / NumPy                | 2.3.0            |
| Géospatial      | GeoPandas / Shapely / PyProj  | 1.1.1/2.1.1/3.7.1|
| Parser          | Lark                          | 1.2.2            |
| Serveur prod    | Gunicorn                      | 23.0.0           |
| Runtime         | Python                        | 3.11             |

### Frontend (`restitution_ui/`)

| Composant     | Tech                        | Version   |
|---------------|-----------------------------|-----------|
| Framework     | React                       | 18.3.1    |
| Langage       | TypeScript                  | 4.9.5     |
| Style         | TailwindCSS                 | 3.0.0     |
| Routing       | react-router-dom            | 7.6.0     |
| HTTP          | Axios                       | 1.9.0     |
| Server state  | @tanstack/react-query       | 5.76.1    |
| Forms         | react-hook-form + zod       | 7.56.4    |
| Tables        | @tanstack/react-table       | 8.21.2    |
| Cartes        | Leaflet + react-leaflet     | 1.9.4/4.2.1|
| Graphes       | Chart.js + react-chartjs-2  | 4.4.8/5.3.0|
| Export PDF    | jsPDF + html2canvas         | 3.0.1/1.4.1|
| Export Excel  | xlsx                        | 0.18.5    |
| UI            | Radix UI                    | various   |
| Validation    | Zod                         | 3.25.32   |

---

## Structure du Projet

```
Restitution_IRIS/
├── api_restitution/           # Backend Django
│   ├── config/                # settings, URLs, Celery, WSGI
│   ├── restitutions/          # App principale
│   │   ├── lark/              # Grammaire Lark custom
│   │   ├── recuperation.py    # Récupération des données
│   │   ├── structures.py      # Gestion des structures
│   │   ├── llama.py           # Intégration Groq LLM (+ RAG retrieval à venir)
│   │   └── tasks.py           # Tâches Celery async
│   ├── customUsers/           # Modèle utilisateur custom
│   ├── requirements.txt
│   └── Dockerfile
│
├── restitution_ui/            # Frontend React
│   ├── src/
│   │   ├── pages/             # Restitution, Visualisation, AddForm, UpdateForm, DuplicateForm
│   │   ├── components/        # forms, tables, graphs, modals, exports
│   │   ├── context/           # Contexts React (formats, jointures, filtres, llmmodeles…)
│   │   └── types/             # Types TypeScript
│   └── Dockerfile             # Multi-stage: Node 18 build → Nginx Alpine
│
├── nginx/conf/nginx.conf      # Reverse proxy (route /backend/ et /api/ vers Django)
├── aws_restt/docker-compose.yml  # Compose production AWS EC2
├── docker-compose.yml         # Compose développement local
├── Jenkinsfile                # Pipeline CI/CD Jenkins (local Windows)
└── .gitlab-ci.yml             # Pipeline GitLab CI (deploy AWS EC2)
```

---

## Modèles Domaine

| Modèle                | Rôle                                                          |
|-----------------------|---------------------------------------------------------------|
| `Restitution`         | Entité principale : configuration d'une requête nommée        |
| `Format`              | Source de données / table à requêter                          |
| `Jointure`            | JOIN entre Formats (LEFT, RIGHT, INNER, FULL)                 |
| `Filtre_population`   | Clause WHERE (`>`, `>=`, `<`, `<=`, `==`, `!=`, `%`)          |
| `Operation`           | Agrégat ou expression (avg, sum, max, min, median, percentile)|
| `Affichage`           | Paramètres de visualisation                                   |
| `LlmModele`           | Modèle Groq sélectionné pour l'analyse IA                     |

**Flux d'exécution :**
1. L'utilisateur configure une `Restitution` dans l'UI
2. Frontend → `lancer_traitement_restitution/` → Celery exécute la requête SQL (Lark)
3. Résultats traités par Pandas, enrichis par Groq LLM (`lancer_llm_async/`)
4. JSON structuré retourné au frontend

---

## API Endpoints

```
POST /token/                                                  # JWT login
POST /token_refresh/                                          # Refresh JWT

GET    /api/restitutions/                                     # Liste (6/page, public)
POST   /api/restitutions/                                     # Créer (auth)
GET    /api/restitutions/{id}/                                # Détail
PUT    /api/restitutions/{id}/                                # Mise à jour complète (auth)
PATCH  /api/restitutions/{id}/                                # Mise à jour partielle (auth)
DELETE /api/restitutions/{id}/                                # Supprimer (auth)
GET    /api/restitutions/{id}/get_full_data/                  # Données complètes avec relations
POST   /api/restitutions/{id}/lancer_traitement_restitution/  # Exécuter requête (async)
POST   /api/restitutions/{id}/lancer_llm_async/               # Analyse LLM (async)
POST   /api/restitutions/bulk_delete/                         # Suppression multiple

GET    /api/users/                                            # Liste utilisateurs (public)
POST   /api/users/                                            # Créer utilisateur (public)
GET    /admin/                                                # Django admin (staff)
```

---

## Variables d'Environnement

### Backend

| Variable                 | Défaut                       | Description              |
|--------------------------|------------------------------|--------------------------|
| `DEBUG`                  | `1`                          | `1` dev / `0` prod       |
| `SECRET_KEY`             | (clé dev non sécurisée)      | Clé secrète Django       |
| `POSTGRES_DB`            | `iris_restitution`           | Nom BDD                  |
| `POSTGRES_USER`          | `postgres`                   | Utilisateur BDD          |
| `POSTGRES_PASSWORD`      | `root`                       | Mot de passe BDD         |
| `POSTGRES_HOST`          | `localhost` / `dbb` (docker) | Hôte BDD                 |
| `REDIS_URL`              | `redis://localhost:6379/0`   | Broker Celery            |
| `REDIS_RES_URL`          | `redis://localhost:6379/1`   | Backend résultats Celery |
| `GROQ_API_KEY`           | —                            | Obligatoire pour le LLM  |

### Frontend

| Variable                 | Description                                  |
|--------------------------|----------------------------------------------|
| `REACT_APP_API_BASE_URL` | URL API backend (varie selon l'environnement)|
| `REACT_APP_API_TOKEN`    | JWT pré-généré pour l'auth                   |

URLs par environnement :
- Dev local Python : `http://192.168.56.1:1234/api/`
- Dev Docker local : `REACT_APP_API_BASE_URL=/backend/`  ← valeur active dans `.env`
- AWS prod : `REACT_APP_API_BASE_URL=/backend/`

---

## Conventions

- **Nommage :** Variables et fonctions en **français** (`nom`, `affichage`, `restitution`, `jointure`, `filtre`, `champ`…)
- **Python :** snake_case
- **TypeScript / JavaScript :** camelCase pour identifiants, PascalCase pour composants
- **Pagination :** 6 éléments/page (fixe)
- **Async :** Celery retourne un task_id immédiatement ; le frontend poll jusqu'à SUCCESS/FAILURE
- **Taille fichier :** 200 MB max (`client_max_body_size` Nginx)
- **JWT :** 365 jours en dev (réduire en prod)

---

## Sécurité — Ne pas introduire davantage

1. `SECRET_KEY` et mot de passe BDD codés en dur dans `docker-compose.yml`
2. `CORS_ALLOW_ALL_ORIGINS = True` — à restreindre en prod
3. JWT 365 jours — à réduire en prod
4. Credentials admin visibles dans `Jenkinsfile`
5. `DEBUG=1` ne doit jamais partir en production

---

## LLM Groq

Modèles configurables via `LlmModele` :
- `qwen/qwen3-32b` — 6 000 TPM
- `llama-3.3-70b-versatile` — 12 000 TPM

Chunking map-reduce implémenté dans `llama.py`. Limite : 300 lignes max envoyées au LLM.

---

## Venv Virtuel (dev local)

```bash
cd "C:\Users\AC2I\Desktop\IRIS\RESTT SOUTENANCE\Restitution_IRIS\api_restitution"
C:\Users\AC2I\Envs\iris_rest\Scripts\activate
```

---

---

# Architecture LLM + RAG + Skills — Implémentée

## Vue d'ensemble du flux

```
Restitution exécutée (Celery)
    → données calculées
    → lancer_llm_async.delay(payload)
        → initialisation_argument()
            ├─ detecter_skill(colonnes)  ou  skill utilisateur
            ├─ get_skill_prompt(skill)   → prompt système expert
            ├─ retrieve_context(titre+description, categorie, document_ids)
            │       └─ pgvector cosine similarity → top-5 chunks
            └─ obtenir_reponse_llama_groq()
                    ├─ cas simple : 1 appel Groq
                    └─ cas volumineux : map-reduce multi-chunks
```

---

## 1. Skills (`documents/rag/skills.py`)

**4 skills de base** : `financier`, `geographique`, `temporel`, `general`  
**Skills custom** : fichiers `.md` dans `documents/rag/skills_templates/` — créés/modifiés via l'UI

### Détection automatique (`skill = 'auto'`)
`detecter_skill(colonnes)` compte les mots-clés présents dans les noms de colonnes :
- `financier` : montant, paiement, retard, solde, facture, crédit, taux…
- `geographique` : région, ville, lat, lon, zone, pays, wilaya…
- `temporel` : date, mois, annee, periode, trimestre, timestamp…
- `general` : défaut si aucun signal

### Override utilisateur
Si `LlmModele.skill != 'auto'`, la détection automatique est court-circuitée.  
Configurable dans l'UI via le sélecteur de skill du formulaire de restitution.

### Prompt système
`get_skill_prompt(skill)` charge le fichier `.md` du skill (rechargé à chaque appel → édition à chaud).  
Fallback sur un prompt par défaut embarqué si aucun fichier custom.  
Le prompt est **préfixé** avant les contraintes de format dans le message système Groq.

---

## 2. RAG (`documents/rag/retrieval.py`)

Vector store : **pgvector** dans PostgreSQL (extension existante)  
Embeddings : **sentence-transformers** `paraphrase-multilingual-mpnet-base-v2` (local, multilingue)

### Deux modes de retrieval

| Condition | Comportement |
|-----------|-------------|
| `document_ids` fournis (sélection manuelle) | Récupère **tous** les chunks de ces docs, triés par position |
| Pas de sélection manuelle | Recherche sémantique **cosine similarity** top-5 parmi les docs indexés, filtrés par catégorie du skill actif (`general` → pas de filtre catégorie) |

Si aucun doc indexé ou erreur → `contexte_rag = ""` → comportement LLM inchangé (pas de plantage).

### Intégration dans le prompt
Le contexte RAG est injecté en tête du prompt utilisateur :
```
[CONTEXTE MÉTIER PERTINENT]
<chunks>

[ENTRÉES DISPONIBLES]
Schéma / Calculs / Filtres / Affichage / Titre / Description
```

---

## 3. LLM Groq (`restitutions/llama.py`)

### Rate limiting par modèle

| Modèle | TPM | Budget/chunk |
|--------|-----|-------------|
| `qwen/qwen3-32b` | 6 000 | 1 800 tokens |
| `llama-3.3-70b-versatile` | 12 000 | 3 500 tokens |

### Stratégie d'appel
- **Cas simple** (total ≤ token_limit) : 1 appel Groq, résultat JSON direct
- **Cas volumineux** : map-reduce
  - **MAP** : chaque chunk → analyse partielle JSON `{synthese_partielle, tendances, anomalies}`
  - Pause calculée entre chunks : `tokens_envoyés / (TPM/60) + marge`
  - **REDUCE** : synthèse finale des analyses partielles → JSON complet

### Format de sortie
```json
{
  "titre_analyse": "",
  "tendances_cles": [],
  "anomalies_possibles": [],
  "resume_executif": "",
  "ton_analyse_personnel": ""
}
```

---

## 4. Documents (`documents/`)

### Modèles
- `Document` : titre, fichier (media/), catégorie (`general`/`financier`/`geographique`/`temporel`), statut (`en_attente`/`indexation`/`indexe`/`erreur`), nb_chunks
- `DocumentChunk` : texte, embedding (pgvector), position, FK → Document

### Indexation (Celery)
Signal `post_save` → `indexer_document.delay(id)` automatiquement à l'upload.  
Pipeline : lecture fichier (PDF via pdfplumber / TXT) → chunking (~500 tokens, overlap) → embeddings → stockage pgvector → `statut = 'indexe'`

### API
```
POST   /api/documents/              # Upload (multipart)
GET    /api/documents/              # Liste + statut (polling frontend)
PATCH  /api/documents/{id}/         # Modifier titre/catégorie
DELETE /api/documents/{id}/         # Supprime doc + chunks
DELETE /api/documents/bulk_delete/  # Suppression multiple
```

### Frontend
Géré depuis la page principale (mode "Base Doc") : upload via modal, liste avec statut temps réel (polling TanStack Query toutes les 3s si indexation en cours), édition titre/catégorie, suppression unitaire et bulk.
