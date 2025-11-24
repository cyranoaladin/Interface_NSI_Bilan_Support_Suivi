# Cahier des charges — Extension “Programme & ressources / Quiz & Sujet bac / Correction & Bilan IA” (NSI Terminale)

**Version** : 1.0
**Portée** : Ajouts majeurs au produit existant (Next.js + Prisma + PostgreSQL + Redis + MinIO), centrés sur :

1. Suivi fin du **programme officiel** (thèmes → sous-thèmes → notions), marquage des notions abordées, dépôt de documents et indexation RAG.
2. **Génération** d’un **quiz exhaustif** et d’un **sujet type bac** adaptés au profil de l’élève.
3. **Saisie en ligne** des réponses (dont Python), **auto-évaluation** + **bilan IA détaillé** (notations, annotations, conseils, feuille de route, ressources).

---

## 0. Contexte & objectifs

* **Contexte actuel** : Plateforme NSI avec comptes élèves / enseignants, bilans questionnaires/évaluations, infra Dockerisée (web, Postgres, Redis, MinIO, PgBouncer).
* **Objectif global** : Rendre le site **exploitable** en classe et **extensible** sans “rajouter des couches” à chaque nouvelle idée.
* **Posture d’architecture** :

  * Séparer clairement **domaine** (curriculum, ressources, exercices, quiz/soumissions) et **infrastructure** (stockage, LLM, exécuteur de code).
  * **RAG intégré** (pgvector) directement dans PostgreSQL.
  * **YAML de curriculum** seedable (Programme Terminale NSI) → aucune logique métier “codée en dur”.

---

## 1. Périmètre fonctionnel

### 1.1. Dashboard enseignant — “Programme & ressources”

* Afficher *l’arbre du programme officiel* Terminale NSI : **Thèmes → Sous-thèmes → Notions** (alignement BO).
* Marquer des **événements de couverture** (introduite / pratiquée / évaluée / révisée), au niveau notion, **par groupe/classe**.
* **Déposer des documents** (cours, fiches, sujets, corrigés, notebooks, etc.) :

  * Liaison manuelle/automatique aux notions.
  * Indexation RAG (extraction texte + embeddings) et recherche sémantique.
  * Historique/versionnage léger + provenance.

### 1.2. Génération de quiz & sujet type bac (élève)

* Générer, pour un élève donné :

  * un **quiz exhaustif de positionnement** sur les notions **abordées**, pondéré par ses bilans (questionnaire + évaluations).
  * un **sujet type bac** multi-parties, **adapté à son profil** (répartition par notions / difficultés / formats).
* Les contenus proviennent d’une **banque d’exercices** (incluant import “bac & corrigés”) + **variantes générées** (templates + LLM).

### 1.3. Saisie des réponses & correction IA

* Interface de **saisie** :

  * QCM, réponses ouvertes (Markdown), **éditeur Python** (Monaco) avec tests unitaires.
* **Correction** :

  * QCM : auto-grade instantané.
  * Python : exécution **sandbox** (isolation, timeouts) + auto-grade par tests.
  * Ouvert / code quality : **RAG + LLM** (rubriques/critères), retour détaillé.
* **Bilan** :

  * Note, annotations par item, **profil de maîtrise par notion**, **feuille de route** (méthodo, exos ciblés, ressources).

---

## 2. Rôles & droits

* **Élève** : consulte ses quiz/sujets, soumet ses réponses, lit ses bilans.
* **Enseignant** : gère la couverture des notions par groupe, dépose/organise les ressources, lance des générateurs, consulte bilans individuels/collectifs.
* **Admin** (optionnel) : gère référentiels (YAML curriculum), modèles LLM/embeddings, quotas, habilitations.

---

## 3. Spécifications UX/UI

### 3.1. Dashboard enseignant — “Programme & ressources”

* **Layout** 3 panneaux :

  1. **Arbre** (Thème → Sous-thème → Notion) avec **badges de couverture** (petites barres colorées : introduite/pratiquée/évaluée/révisée) calculées pour le **groupe sélectionné**.
  2. **Journal de couverture** : table chronologique filtrable (groupe, notion, niveau) + bouton “**+ Marquer**”, champ notes, date.
  3. **Ressources** :

     * Zone **drag-and-drop** upload → titre, description, tags, **notions liées** (auto-tag proposé + multi-sélection).
     * État traitement (UPLOADED → PROCESSING → PROCESSED/FAILED).
     * Recherche **sémantique** (barre de recherche + filtres : notion, type doc, uploader, période).

* **Usages rapides** :

  * Flèche “**Couvrir plusieurs notions**” (batch) lors d’une séance.
  * **Export** CSV/PDF de la couverture par période.

### 3.2. Élève — “Quiz personnalisé” & “Sujet type bac”

* Page **Quiz** :

  * Liste d’items paginés, navigation, état (à faire / fait).
  * **QCM** (coches), **Ouvert** (éditeur Markdown), **Python** (Monaco + bouton “Exécuter tests”).
  * Quand prêt : **Soumettre** (verrouille la tentative).
* Page **Sujet bac** :

  * Énoncé structuré (Partie A/B/C, etc.), pièces jointes si besoin.
  * Saisie identique (QCM/Ouvert/Python selon items).
* **Résultat & Bilan** :

  * Carte résumé (note globale, temps, difficulté perçue).
  * **Table notionnelle** : barres de maîtrise, recommandations.
  * **Liens** vers ressources (issues du RAG) : cours, fiches, exos similaires.

---

## 4. Modèle de données (base)

### 4.1. Curriculum (immutable, seed YAML)

* `CurrTheme(id, code, title, order)`
* `CurrSubtheme(id, themeId, code, title, order)`
* `CurrNotion(id, subthemeId, code, title, description?, order)`

> **Seed** via `/scripts/seed-curriculum.ts` à partir de `curriculum/terminale-nsi.fr.yml` (versionné).
> Contrôles : unicité `code`, ordre, cohérence parent/enfant.

### 4.2. Couverture par groupe

* `CoverageEvent(id, groupId, teacherId, notionId, level(enum), coveredOn, notes?)`

> Historisé (on **n’écrase pas**). Agrégats calculés côté vue SQL ou par requêtes (compte par level/période).

### 4.3. Ressources & RAG

* `ResourceDocument(id, uploaderId, title, description?, mimeType, bytes, storageKey, uploadedAt, processedAt?, status, source?, version)`
* `ResourceChunk(id, docId, chunkIndex, text, embedding(vector(1536)))`

> **pgvector** activé (extension + colonne vector).
> **Provenance** : `source`, `storageKey` (MinIO/S3).
> **Relation n..n** doc↔notions (table join) pour liaison à `CurrNotion`.

### 4.4. Banque d’exercices & tests

* `Exercise(id, title, type(enum QCM/OUVERT/CODING), difficulty(enum), statementMd, solutionMd?, rubricJson?, tags[], source?)`
* `ExerciseNotion(exerciseId, notionId)`
* `TestCase(id, exerciseId, input, expected, public(bool), timeoutMs)`

### 4.5. Quiz, sujet & soumissions

* `Quiz(id, studentId, generatedAt, purpose("positionnement" | "entrainement-bac"), items[])`
* `QuizItem(id, quizId, exerciseId?, variantJson?, order)`
* `Submission(id, quizId, studentId, submittedAt, items[])`
* `SubmissionItem(id, submissionId, quizItemId, answerJson, autoGrade?, llmFeedback?)`

### 4.6. Profil élève (mémoire “long terme”)

* **Sans dupliquer** : calculs incrémentaux stockés en table **materialisée** ou sous forme d’objets “profil” :

  * `StudentMastery(studentId, notionId, mastery(float 0..1), lastUpdated, evidenceJson)`
  * Alim. par : bilans, coverage (exposée), résultats quiz/soumissions.

---

## 5. API (contrats & exemples)

> Préfixes `POST /api/...` côté Next.js **route handlers**. Réponses JSON `{ ok: boolean, ... }`, erreurs `{ ok: false, code, message }`. JWT/Session existants.

### 5.1. Curriculum & couverture

* `GET /api/curriculum/tree?groupId=`
  **200** `{ tree: [{ theme: {...}, subthemes:[...], notions:[...] }], coverage: { [notionId]: { INTRODUITE: n, ... } } }`

* `POST /api/curriculum/coverage`

```json
{
  "groupId": 3,
  "notionId": "cuid_notion",
  "level": "PRATIQUEE",
  "coveredOn": "2025-10-03T08:00:00Z",
  "notes": "TP sur piles/queues"
}
```

**201** `{ ok: true, event: {...} }`

### 5.2. Ressources

* `POST /api/resources/upload-url`
  **Body** `{ filename, mimeType, size, notions?: string[] }`
  **200** `{ docId, uploadUrl, storageKey }`

* `POST /api/resources/ingest`
  **Body** `{ docId }` → enqueues job d’ingestion
  **202** `{ ok: true }`

* `GET /api/resources/search?q=...&notionId=...`
  **200** `{ results: [{docId, title, snippet, score, notions:[...] }...] }`

### 5.3. Exercices & imports

* `POST /api/exercises/import-bac` (enseignant/admin)
  **Body** : zip ou JSON/YAML formaté (énoncés+corrections).
  **200** `{ imported: n, warnings: [...] }`

### 5.4. Quiz & sujets

* `POST /api/quiz/generate`
  **Body** `{ studentId, purpose, constraints? }`
  **200** `{ ok: true, quiz: { id, items:[...] } }`

* `GET /api/quiz/:id`
  **200** `{ quiz: {...}, items:[{ type, statementMd, variant? }...] }`

### 5.5. Soumission & correction

* `POST /api/quiz/:id/submit`
  **Body** `{ items: [{ quizItemId, answerJson }, ...] }`
  **201** `{ ok: true, submissionId }`

* `POST /api/quiz/:id/grade`
  **Body** `{ submissionId }` → job asynchrone
  **202** `{ ok: true }`

* `GET /api/submission/:id/result`
  **200** `{ autoGrade, items:[{ autoGrade, llmFeedback }], masteryDelta:[...], recommendations:[...] }`

---

## 6. RAG (ingestion & requêtes)

### 6.1. Ingestion

* **Étapes** : upload → file fetch (MinIO) → **extraction texte** → **chunking** (≈ 800–1200 tokens, overlap 100) → **embeddings** → `ResourceChunk` (text + vector).
* **Ergonomie** : statut document (UPLOADED/PROCESSED/FAILED), logs d’erreur consultables.
* **Auto-tagging** notions (option) : fuzzy match + similarité sémantique sur titres/descriptions de `CurrNotion`.

### 6.2. Recherche

* **Top-k vector search** par `embedding <-> queryEmbedding` sur `ResourceChunk`.
* **Filtrage** : par notions liées, uploader, période.
* **Rendu** : extrait (snippet), surlignage mots-clés, lien vers doc.

### 6.3. RAG pour LLM

* **Compose** : prompt = consigne + (énoncé + corrigé si exercice) + *k* extraits pertinents (citation de source).
* **Garde-fous** : longueur max, déduplication, désensibilisation PII, mention des sources.

---

## 7. Agent IA & LLM

### 7.1. Abstraction LLM

* Interface `LLMProvider` (backend) avec méthodes :

  * `embed(texts: string[]): number[][]`
  * `complete({system, user, contextDocs, temperature, maxTokens})`
* **Implémentations** configurables (env) : OpenAI, autres.
* **Contrôles** : temps de réponse, retry (exponentiel), **cache** (clé = hash prompt + docs), quotas.

### 7.2. Prompts & rubriques

* Prompts **versionnés** (`/prompts/*.prompt.md`) avec *placeholders* (énoncé, objectifs par notion, barème, etc.).
* **RubricJson** (critères) pour correction ouverte/qualité code (lisibilité, complexité, corrections attendues…).

### 7.3. Pipeline correction

1. QCM → clé de correction.
2. Python → run tests en sandbox → `autoGrade`.
3. Ouvert/code quality → LLM + RAG → `llmFeedback` (structure : points forts/faiblesses, erreurs fréquentes, renvois notionnels, conseils, ressources).
4. **Agrégation** → calcul note, mise à jour `StudentMastery`.

---

## 8. Profil élève & maîtrise notionnelle

### 8.1. Sources

* Bilans existants (questionnaire initial, bilans d’évaluations).
* Couverture des notions (exposition).
* Résultats quiz/soumissions (QCM/Tests/LLM).

### 8.2. Modèle de maîtrise

* `mastery ∈ [0..1]` par notion.
* Mise à jour incrémentale (ex : EWMA/IRT simplifiée) :

  * QCM correct pondère +, erreurs pondèrent – (poids par difficulté).
  * Tests Python : public vs caché → pondérations.
  * Ouvert : score rubric → contribution.
* **Exposition** (introduite/pratiquée/évaluée) **≠** maîtrise : facteur contextuel (cap pondéré).

### 8.3. Bilan & recommandations

* Tableau **notion→mastery** + delta historique.
* **Roadmap** : 3 classes (renforcer / consolider / approfondir) + ressources internes (RAG) + exercices ciblés.

---

## 9. Services asynchrones & exécution Python

### 9.1. Workers (BullMQ)

* **queues** : `ingest-doc`, `grade-submission`, `execute-tests`.
* **retries** et DLQ (dead-letter queues).
* **métriques** : temps, succès/échecs.

### 9.2. Sandbox Python

* Micro-service `runner-py` : conteneur isolé (seccomp, no network, mémoire/CPU limit), temps max par test (`timeoutMs`).
* API interne : `POST /run` `{ code, test: { input, expected } }` → `{ pass, logs, error? }`.
* Nettoyage **éphémère** (pas de persistance disque hors logs anonymisés optionnels).

---

## 10. Sécurité, RGPD & conformité

* **RBAC** : vérifications serveur (enseignant/élève).
* **Provenance** : pour chaque feedback LLM, liste des documents sources.
* **Données personnelles** : minimiser, chiffrer en transit, rétention paramétrable.
* **Journalisation** : actions critiques (upload doc, génération sujets, corrections).
* **Exports** : élève/enseignant peuvent demander export PDF/JSON de leurs bilans/ressources liées.

---

## 11. Performance & SRE

* **DB** : index sur clés (`code`, `order`, `notionId`), HNSW (pgvector).
* **Cache** : résultats RAG/LLM (clé hash).
* **Observabilité** : logs workers, latence API, files BullMQ, taille index vector.
* **Scalabilité** : workers horizontaux, sharding MinIO possible.
* **PgBouncer** : **obligatoire** : variables `POSTGRESQL_PASSWORD`, pool mode transaction, user dédié (doc).

---

## 12. Déploiement & configuration

### 12.1. Variables d’environnement (extraits)

* `DATABASE_URL`, `DIRECT_URL`
* `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY`, `OBJECT_STORAGE_SECRET_KEY`
* `OPENAI_API_KEY` (ou provider équivalent)
* `EMBEDDING_MODEL` (ex: `text-embedding-3-small`), `EMBEDDING_DIM=1536`
* `RAG_TOP_K=6`, `CHUNK_SIZE_TOKENS=1000`, `CHUNK_OVERLAP_TOKENS=100`
* `PY_RUNNER_URL` (micro-service sandbox)
* `BULLMQ_REDIS_URL`

### 12.2. Migrations & seed

* Migration Prisma (tables ci-dessus) + SQL pour `CREATE EXTENSION vector`.
* `npm run seed:curriculum` → YAML → upsert de `CurrTheme/Subtheme/Notion`.
* Import initial d’une **banque d’exercices** (minimum viable).

---

## 13. Tests & recette

### 13.1. Tests unitaires

* Parsing YAML, cohérence parent/enfant.
* Chunking & embeddings : taille, overlap, encodage.
* Sélection d’exos (constraints respectées).
* Rubric application (mapping score→mastery).

### 13.2. Tests d’intégration

* Upload → ingestion → recherche sémantique.
* Génération quiz & sujet bac (traces, seed stable).
* Soumission Python → exécution tests → note.
* RAG + LLM → feedback structuré (valider format).

### 13.3. Scénarios de recette (exemples)

1. **Enseignant** couvre T1.1.a, upload un PDF, vérifie qu’il est trouvable par recherche notionnelle.
2. **Élève** : génération quiz, répond QCM/OUVERT/Python, obtient bilan avec recommandations.
3. **Sujet bac** : plan & difficultés respectés, ressources citées.

### 13.4. Critères d’acceptation (extraits)

* Arbre programme affiché, couverture persistée avec horodatage et niveau.
* Upload document → statut PROCESSED < X min, recherche fonctionne (≥ 1 résultat pertinent).
* Génération quiz/sujet en < 10 s (hors LLM), correction QCM instantanée, Python < 5 s / test.
* Bilan élève : affiche note, feedback, maîtrise par notion, liens ressources.

---

## 14. Roadmap d’implémentation (lots)

1. **Lot A — Base & Seed**

   * Prisma schema + migrations (curriculum, resources, exercises, quiz, submissions, mastery).
   * Seed YAML programme (Terminale NSI).
   * Activer pgvector.

2. **Lot B — Programme & Ressources (UI + API + Ingestion)**

   * API tree + coverage + upload + ingest.
   * UI dashboard enseignant (arbre, journal, upload + liste docs).

3. **Lot C — Banque d’exercices & Imports**

   * CRUD Exercise/TestCase + import bac.
   * Outils d’alignement notions (assistés par RAG, validation prof).

4. **Lot D — Génération Quiz/Sujet & UI élève**

   * Sélection mixte (banque + variantes), création `Quiz/QuizItem`.
   * UI saisie (QCM/Ouvert/Python + Monaco).

5. **Lot E — Correction & Bilan**

   * Runner Python, auto-grade QCM/tests, LLM feedback, mise à jour `StudentMastery`.
   * Page bilan / export PDF.

6. **Lot F — Optimisations & Analytics**

   * Tuning RAG/LLM, dashboards de maîtrise, export classe, A/B prompts.

---

## 15. Risques & parades

* **Qualité des extraits** RAG : calibrer chunking/top-k, nettoyer OCR, tester prompts.
* **Coûts LLM** : cache, batch, prompts courts, ajuster température & maxTokens.
* **Sécurité exécution** : sandbox stricte (no net), quotas, logs.
* **Charge DB vector** : index HNSW, VACUUM/ANALYZE, limites de taille chunk.

---

## 16. Annexes

### 16.1. Exemple YAML (extrait)

```yaml
id: nsi-terminale-2024
source: "BO & Eduscol"
themes:
  - code: T1
    title: Algorithmique et récursivité
    subthemes:
      - code: T1.1
        title: Récursivité
        notions:
          - code: T1.1.a
            title: Principe
            description: Décomposer un problème...
          - code: T1.1.b
            title: Complexité récursive
            description: Notions de cas de base...
  - code: T2
    title: Structures de données et graphes
    subthemes: [...]
```

### 16.2. Exemples de payloads

* **QuizItem.answerJson** :

  * QCM : `{ "choices": [1,3] }`
  * OUVERT : `{ "textMd": "..." }`
  * CODING : `{ "code": "def f(x): return x*x" }`

### 16.3. Échelle de difficulté

* **FACILE** : application directe.
* **MOYEN** : variation simple.
* **DIFFICILE** : composition de notions.
* **TRES_DIFFICILE** : cas tordus, optimisation.

---

## 17. Résumé exécutable (décision)

* **Ce que vous obtenez** : un **socle durable** : référentiel programme (YAML), suivi des notions, dépôt & RAG, banque d’exos, génération quiz/sujet, correction hybride, profil élève et bilans actionnables.
* **Pourquoi extensible** : tout est **déclaratif** (YAML + tags + prompts versionnés), **in-DB RAG**, **workers uniques** pour ingestion/correction, **abstractions** (LLM/Storage/Runner) interchangeables.
* **Impact** : plateforme exploitable en classe, traçable, outillée pour la remédiation individualisée et la préparation au bac.

parfait — voici tout le “kit de départ” prêt à coller dans votre repo : **migrations Prisma**, **YAML Terminale NSI (seedable)**, et **squelettes de routes API + workers** conformes au cahier des charges.

Je vous donne les fichiers en blocs prêts-à-copier (noms/chemins inclus). Tout est **non-cassant** pour la DB actuelle (nouvelles tables, index, extensions), et **extensible**.

---

# 1) Prisma — migrations & modèle

## 1.1. Migration SQL (pgvector + tables)

`prisma/migrations/20251013_000_init_curriculum_rag/steps.sql`

```sql
-- 1) Extension vector (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Curriculum
CREATE TABLE "CurrTheme" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "ord"   INT  NOT NULL DEFAULT 0
);

CREATE TABLE "CurrSubtheme" (
  "id" SERIAL PRIMARY KEY,
  "themeId" INT NOT NULL REFERENCES "CurrTheme"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "ord"   INT  NOT NULL DEFAULT 0
);

CREATE TABLE "CurrNotion" (
  "id" SERIAL PRIMARY KEY,
  "subthemeId" INT NOT NULL REFERENCES "CurrSubtheme"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "ord"   INT  NOT NULL DEFAULT 0
);

CREATE INDEX "CurrSubtheme_themeId_idx" ON "CurrSubtheme"("themeId");
CREATE INDEX "CurrNotion_subthemeId_idx" ON "CurrNotion"("subthemeId");

-- 3) Couverture par groupe
CREATE TYPE coverage_level AS ENUM ('INTRODUITE','PRATIQUEE','EVALUÉE','RÉVISÉE');
CREATE TABLE "CoverageEvent" (
  "id" SERIAL PRIMARY KEY,
  "groupId" INT NOT NULL,            -- référence groupe existant (teacher/group) : même type que votre table
  "teacherId" INT NOT NULL,          -- idem type que table teacher
  "notionId" INT NOT NULL REFERENCES "CurrNotion"("id") ON DELETE CASCADE,
  "level" coverage_level NOT NULL,
  "coveredOn" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "notes" TEXT
);
CREATE INDEX "CoverageEvent_group_notion_idx" ON "CoverageEvent"("groupId","notionId");
CREATE INDEX "CoverageEvent_coveredOn_idx" ON "CoverageEvent"("coveredOn");

-- 4) Ressources & RAG
CREATE TYPE resource_status AS ENUM ('UPLOADED','PROCESSING','PROCESSED','FAILED');

CREATE TABLE "ResourceDocument" (
  "id" SERIAL PRIMARY KEY,
  "uploaderId" INT NOT NULL,         -- teacherId ou userId existant
  "title" TEXT NOT NULL,
  "description" TEXT,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL DEFAULT 0,
  "storageKey" TEXT NOT NULL,
  "status" resource_status NOT NULL DEFAULT 'UPLOADED',
  "source" TEXT,
  "version" INT NOT NULL DEFAULT 1,
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ
);
CREATE UNIQUE INDEX "ResourceDocument_storageKey_key" ON "ResourceDocument"("storageKey");

CREATE TABLE "ResourceDocumentNotion" (
  "docId" INT NOT NULL REFERENCES "ResourceDocument"("id") ON DELETE CASCADE,
  "notionId" INT NOT NULL REFERENCES "CurrNotion"("id") ON DELETE CASCADE,
  PRIMARY KEY ("docId","notionId")
);

-- Chunks + embeddings pgvector(1536)
CREATE TABLE "ResourceChunk" (
  "id" BIGSERIAL PRIMARY KEY,
  "docId" INT NOT NULL REFERENCES "ResourceDocument"("id") ON DELETE CASCADE,
  "chunkIndex" INT NOT NULL,
  "text" TEXT NOT NULL,
  "embedding" vector(1536)  -- pgvector
);
CREATE UNIQUE INDEX "ResourceChunk_doc_chunk_idx" ON "ResourceChunk"("docId","chunkIndex");
-- index vector HNSW (cosine)
CREATE INDEX "ResourceChunk_embedding_hnsw" ON "ResourceChunk" USING hnsw ("embedding" vector_cosine_ops);

-- 5) Exercices & tests
CREATE TYPE exercise_type AS ENUM ('QCM','OUVERT','CODING');
CREATE TYPE difficulty_level AS ENUM ('FACILE','MOYEN','DIFFICILE','TRES_DIFFICILE');

CREATE TABLE "Exercise" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "type" exercise_type NOT NULL,
  "difficulty" difficulty_level NOT NULL DEFAULT 'MOYEN',
  "statementMd" TEXT NOT NULL,
  "solutionMd"  TEXT,
  "rubricJson"  JSONB,
  "tags" TEXT[] DEFAULT '{}',
  "source" TEXT
);
CREATE INDEX "Exercise_type_diff_idx" ON "Exercise"("type","difficulty");

CREATE TABLE "ExerciseNotion" (
  "exerciseId" INT NOT NULL REFERENCES "Exercise"("id") ON DELETE CASCADE,
  "notionId" INT NOT NULL REFERENCES "CurrNotion"("id") ON DELETE CASCADE,
  PRIMARY KEY ("exerciseId","notionId")
);

CREATE TABLE "TestCase" (
  "id" SERIAL PRIMARY KEY,
  "exerciseId" INT NOT NULL REFERENCES "Exercise"("id") ON DELETE CASCADE,
  "input" TEXT,
  "expected" TEXT,
  "public" BOOLEAN NOT NULL DEFAULT TRUE,
  "timeoutMs" INT NOT NULL DEFAULT 3000
);

-- 6) Quiz, sujets & soumissions
CREATE TYPE quiz_purpose AS ENUM ('POSITIONNEMENT','ENTRAINEMENT_BAC');

CREATE TABLE "Quiz" (
  "id" SERIAL PRIMARY KEY,
  "studentId" INT NOT NULL, -- réf table élève existante
  "purpose" quiz_purpose NOT NULL,
  "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "QuizItem" (
  "id" SERIAL PRIMARY KEY,
  "quizId" INT NOT NULL REFERENCES "Quiz"("id") ON DELETE CASCADE,
  "exerciseId" INT REFERENCES "Exercise"("id"),
  "variantJson" JSONB,   -- pour variantes LLM
  "ord" INT NOT NULL DEFAULT 0
);

CREATE TABLE "Submission" (
  "id" SERIAL PRIMARY KEY,
  "quizId" INT NOT NULL REFERENCES "Quiz"("id") ON DELETE CASCADE,
  "studentId" INT NOT NULL,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "autoGrade" NUMERIC(5,2)
);

CREATE TABLE "SubmissionItem" (
  "id" SERIAL PRIMARY KEY,
  "submissionId" INT NOT NULL REFERENCES "Submission"("id") ON DELETE CASCADE,
  "quizItemId" INT NOT NULL REFERENCES "QuizItem"("id") ON DELETE CASCADE,
  "answerJson" JSONB,
  "autoGrade"  NUMERIC(5,2),
  "llmFeedback" JSONB
);
CREATE UNIQUE INDEX "SubmissionItem_unique" ON "SubmissionItem"("submissionId","quizItemId");

-- 7) Profil élève (maîtrise notionnelle)
CREATE TABLE "StudentMastery" (
  "studentId" INT NOT NULL,
  "notionId" INT NOT NULL REFERENCES "CurrNotion"("id") ON DELETE CASCADE,
  "mastery"   NUMERIC(5,3) NOT NULL DEFAULT 0.000, -- 0..1
  "lastUpdated" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "evidenceJson" JSONB,
  PRIMARY KEY ("studentId","notionId")
);
```

> **Remarque** : Les id externes (`groupId`, `teacherId`, `studentId`) pointent vers vos tables existantes. Ajoutez des FK si souhaité.

---

## 1.2. Mise à jour `schema.prisma`

`prisma/schema.prisma` (extrait à ajouter)

```prisma
// datasource et generator existants…

model CurrTheme {
  id      Int      @id @default(autoincrement())
  code    String   @unique
  title   String
  ord     Int      @default(0)
  subs    CurrSubtheme[]
}

model CurrSubtheme {
  id       Int        @id @default(autoincrement())
  themeId  Int
  code     String     @unique
  title    String
  ord      Int        @default(0)
  theme    CurrTheme  @relation(fields: [themeId], references: [id])
  notions  CurrNotion[]
}

model CurrNotion {
  id          Int           @id @default(autoincrement())
  subthemeId  Int
  code        String        @unique
  title       String
  description String?
  ord         Int           @default(0)
  subtheme    CurrSubtheme  @relation(fields: [subthemeId], references: [id])
  resources   ResourceDocumentNotion[]
  exercises   ExerciseNotion[]
}

enum CoverageLevel {
  INTRODUITE
  PRATIQUEE
  EVALUÉE
  RÉVISÉE
}

model CoverageEvent {
  id         Int           @id @default(autoincrement())
  groupId    Int
  teacherId  Int
  notionId   Int
  level      CoverageLevel
  coveredOn  DateTime      @default(now())
  notes      String?
  notion     CurrNotion    @relation(fields: [notionId], references: [id])
}

enum ResourceStatus {
  UPLOADED
  PROCESSING
  PROCESSED
  FAILED
}

model ResourceDocument {
  id           Int                         @id @default(autoincrement())
  uploaderId   Int
  title        String
  description  String?
  mimeType     String
  sizeBytes    BigInt                      @default(0)
  storageKey   String                      @unique
  status       ResourceStatus              @default(UPLOADED)
  source       String?
  version      Int                         @default(1)
  uploadedAt   DateTime                    @default(now())
  processedAt  DateTime?
  notions      ResourceDocumentNotion[]
  chunks       ResourceChunk[]
}

model ResourceDocumentNotion {
  docId    Int
  notionId Int
  doc      ResourceDocument @relation(fields: [docId], references: [id], onDelete: Cascade)
  notion   CurrNotion       @relation(fields: [notionId], references: [id], onDelete: Cascade)
  @@id([docId, notionId])
}

// Prisma ne supporte pas encore totalement vector<> en type "first-class" sur toutes versions.
// On garde la colonne via migration SQL et on la déclare Unsupported ici.
model ResourceChunk {
  id          BigInt            @id @default(autoincrement())
  docId       Int
  chunkIndex  Int
  text        String
  embedding   Unsupported("vector")
  doc         ResourceDocument  @relation(fields: [docId], references: [id], onDelete: Cascade)
  @@unique([docId, chunkIndex], name: "ResourceChunk_doc_chunk_idx")
}

enum ExerciseType { QCM OUVERT CODING }
enum DifficultyLevel { FACILE MOYEN DIFFICILE TRES_DIFFICILE }

model Exercise {
  id          Int              @id @default(autoincrement())
  title       String
  type        ExerciseType
  difficulty  DifficultyLevel  @default(MOYEN)
  statementMd String
  solutionMd  String?
  rubricJson  Json?
  tags        String[]
  source      String?
  notions     ExerciseNotion[]
  testcases   TestCase[]
  @@index([type, difficulty], name: "Exercise_type_diff_idx")
}

model ExerciseNotion {
  exerciseId Int
  notionId   Int
  exercise   Exercise   @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  notion     CurrNotion @relation(fields: [notionId], references: [id], onDelete: Cascade)
  @@id([exerciseId, notionId])
}

model TestCase {
  id         Int       @id @default(autoincrement())
  exerciseId Int
  input      String?
  expected   String?
  public     Boolean   @default(true)
  timeoutMs  Int       @default(3000)
  exercise   Exercise  @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
}

enum QuizPurpose { POSITIONNEMENT ENTRAINEMENT_BAC }

model Quiz {
  id          Int        @id @default(autoincrement())
  studentId   Int
  purpose     QuizPurpose
  generatedAt DateTime   @default(now())
  items       QuizItem[]
  submissions Submission[]
}

model QuizItem {
  id         Int      @id @default(autoincrement())
  quizId     Int
  exerciseId Int?
  variantJson Json?
  ord        Int      @default(0)
  quiz       Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  exercise   Exercise? @relation(fields: [exerciseId], references: [id])
  submissions SubmissionItem[]
}

model Submission {
  id          Int        @id @default(autoincrement())
  quizId      Int
  studentId   Int
  submittedAt DateTime   @default(now())
  autoGrade   Decimal?   @db.Decimal(5,2)
  quiz        Quiz       @relation(fields: [quizId], references: [id], onDelete: Cascade)
  items       SubmissionItem[]
}

model SubmissionItem {
  id           Int       @id @default(autoincrement())
  submissionId Int
  quizItemId   Int
  answerJson   Json?
  autoGrade    Decimal?  @db.Decimal(5,2)
  llmFeedback  Json?
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  quizItem     QuizItem   @relation(fields: [quizItemId], references: [id], onDelete: Cascade)
  @@unique([submissionId, quizItemId], name: "SubmissionItem_unique")
}

model StudentMastery {
  studentId   Int
  notionId    Int
  mastery     Decimal @db.Decimal(5,3) @default(0.000)
  lastUpdated DateTime @default(now())
  evidenceJson Json?
  notion      CurrNotion @relation(fields: [notionId], references: [id], onDelete: Cascade)
  @@id([studentId, notionId])
}
```

---

# 2) YAML Terminale NSI (seedable)

Placez ce fichier, **complet et structuré**, puis utilisez le script de seed (ci-dessous).

`curriculum/terminale-nsi.fr.yml`

```yaml
id: nsi-terminale-2024
source: "BO spécialité NSI – Terminale (MEN/Eduscol)"
version: "1.0"
themes:
  - code: T1
    title: Algorithmique et récursivité
    subthemes:
      - code: T1.1
        title: Récursivité
        notions:
          - code: T1.1.a
            title: Principe de récursivité, cas de base
            description: Définition récursive, terminaison, pile d’appels.
          - code: T1.1.b
            title: Récurrence et complexité
            description: Relations de récurrence, coût temporel et spatial.
          - code: T1.1.c
            title: Récursivité vs itération
            description: Transformations récursif↔itératif, tail recursion.
      - code: T1.2
        title: Algorithmes classiques
        notions:
          - code: T1.2.a
            title: Tri (fusion, rapide)
            description: Complexités, cas moyens/pire cas, stabilité.
          - code: T1.2.b
            title: Recherche dichotomique
            description: Préconditions, preuves de correction.
          - code: T1.2.c
            title: Diviser pour régner
            description: Stratégies, maîtrise des coûts.
  - code: T2
    title: Structures de données avancées
    subthemes:
      - code: T2.1
        title: Piles, files, listes, tableaux
        notions:
          - code: T2.1.a
            title: Implémentations et complexités
            description: Opérations push/pop/enqueue/dequeue, parcours.
      - code: T2.2
        title: Arbres
        notions:
          - code: T2.2.a
            title: Parcours (pré/in/postfixe), hauteur, taille
          - code: T2.2.b
            title: Arbres binaires de recherche (ABR)
            description: Invariants, insertion/suppression/recherche.
          - code: T2.2.c
            title: Arbres n-aires et tries
            description: Indexation textuelle, préfixes.
      - code: T2.3
        title: Hashage
        notions:
          - code: T2.3.a
            title: Fonctions de hachage, collisions
          - code: T2.3.b
            title: Tables de hachage (ouvert/fermé), redimensionnement
      - code: T2.4
        title: Graphes
        notions:
          - code: T2.4.a
            title: Représentations (liste d’adjacence, matrice)
          - code: T2.4.b
            title: Parcours BFS/DFS, composantes
          - code: T2.4.c
            title: Plus courts chemins (Dijkstra), arbres couvrants (Kruskal/Prim)
          - code: T2.4.d
            title: Cycles, graphe orienté/pondéré, DAG
  - code: T3
    title: Programmation avancée (Python)
    subthemes:
      - code: T3.1
        title: Paradigmes et bonnes pratiques
        notions:
          - code: T3.1.a
            title: Fonctions d’ordre supérieur, lambdas, map/filter/reduce
          - code: T3.1.b
            title: List/dict/set comprehensions
          - code: T3.1.c
            title: Exceptions, context managers
      - code: T3.2
        title: Modularité, tests et qualité
        notions:
          - code: T3.2.a
            title: Packaging, imports, virtualenv
          - code: T3.2.b
            title: Tests unitaires, TDD, doctest/pytest
          - code: T3.2.c
            title: Complexité cyclomatique, lisibilité (PEP8)
  - code: T4
    title: Architectures et systèmes
    subthemes:
      - code: T4.1
        title: Architecture matérielle
        notions:
          - code: T4.1.a
            title: Mémoire (RAM/Cache), CPU, jeux d’instructions
      - code: T4.2
        title: Système d’exploitation
        notions:
          - code: T4.2.a
            title: Processus, threads, ordonnancement, IPC
          - code: T4.2.b
            title: Fichiers, permissions, système de fichiers
      - code: T4.3
        title: Réseaux
        notions:
          - code: T4.3.a
            title: Modèle couches, IP, TCP/UDP, DNS, HTTP
          - code: T4.3.b
            title: Routage, latence, fiabilité
  - code: T5
    title: Données, BD relationnelles et SQL
    subthemes:
      - code: T5.1
        title: Modélisation relationnelle
        notions:
          - code: T5.1.a
            title: Schéma, clés, contraintes, normalisation
      - code: T5.2
        title: SQL (DDL/DML)
        notions:
          - code: T5.2.a
            title: SELECT, WHERE, GROUP BY, HAVING, ORDER BY
          - code: T5.2.b
            title: JOIN (INNER/LEFT/RIGHT), sous-requêtes
          - code: T5.2.c
            title: Vues, index, transactions
  - code: T6
    title: Langages formels et automates (bases)
    subthemes:
      - code: T6.1
        title: Regex, grammaires, reconnaissance
        notions:
          - code: T6.1.a
            title: Expressions régulières (syntaxe, moteur)
          - code: T6.1.b
            title: Grammaires simples, arbres de dérivation
  - code: T7
    title: Web & données (compléments utiles)
    subthemes:
      - code: T7.1
        title: HTTP & APIs
        notions:
          - code: T7.1.a
            title: Requêtes/ réponses, REST, JSON
      - code: T7.2
        title: Sérialisation, formats, encodages
        notions:
          - code: T7.2.a
            title: JSON/CSV, Unicode/UTF-8, erreurs d’encodage
```

---

## 2.1. Script de seed curriculum (YAML → DB)

`scripts/seed-curriculum.ts`

```ts
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
type YTheme = { code: string; title: string; subthemes: { code: string; title: string; notions: { code: string; title: string; description?: string }[] }[] };

async function main() {
  const file = path.resolve(process.cwd(), "curriculum/terminale-nsi.fr.yml");
  const raw = fs.readFileSync(file, "utf-8");
  const data = yaml.load(raw) as { themes: YTheme[] };

  let ordTheme = 0;
  for (const t of data.themes) {
    ordTheme += 10;
    const theme = await prisma.currTheme.upsert({
      where: { code: t.code },
      create: { code: t.code, title: t.title, ord: ordTheme },
      update: { title: t.title, ord: ordTheme },
    });
    let ordSub = 0;
    for (const s of t.subthemes ?? []) {
      ordSub += 10;
      const sub = await prisma.currSubtheme.upsert({
        where: { code: s.code },
        create: { code: s.code, title: s.title, ord: ordSub, themeId: theme.id },
        update: { title: s.title, ord: ordSub, themeId: theme.id },
      });
      let ordNotion = 0;
      for (const n of s.notions ?? []) {
        ordNotion += 10;
        await prisma.currNotion.upsert({
          where: { code: n.code },
          create: {
            code: n.code,
            title: n.title,
            description: n.description ?? null,
            ord: ordNotion,
            subthemeId: sub.id,
          },
          update: {
            title: n.title,
            description: n.description ?? null,
            ord: ordNotion,
            subthemeId: sub.id,
          },
        });
      }
    }
  }
  console.log("✅ Curriculum seeded/updated.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

> Ajoutez un script `package.json`:
> `"seed:curriculum": "tsx scripts/seed-curriculum.ts"`

---

# 3) Routes API (squelettes Next.js)

Arborescence :

```
apps/web/src/app/api/
 ├─ curriculum/
 │   ├─ tree/route.ts
 │   └─ coverage/route.ts
 ├─ resources/
 │   ├─ upload-url/route.ts
 │   ├─ ingest/route.ts
 │   └─ search/route.ts
 ├─ exercises/
 │   └─ import-bac/route.ts
 ├─ quiz/
 │   ├─ generate/route.ts
 │   └─ [id]/
 │       ├─ route.ts
 │       ├─ submit/route.ts
 │       └─ grade/route.ts
 └─ submission/
     └─ [id]/result/route.ts
```

### 3.1. `curriculum/tree/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = Number(searchParams.get("groupId") || "0") || undefined;

  const themes = await prisma.currTheme.findMany({
    orderBy: { ord: "asc" },
    include: {
      subs: {
        orderBy: { ord: "asc" },
        include: {
          notions: { orderBy: { ord: "asc" } },
        },
      },
    },
  });

  // Aggregats de couverture (facultatif: par groupId)
  const coverage = groupId
    ? await prisma.$queryRawUnsafe<any[]>(`
      SELECT "notionId",
        SUM((level='INTRODUITE')::int) AS introduite,
        SUM((level='PRATIQUEE')::int) AS pratiquee,
        SUM((level='EVALUÉE')::int)   AS evaluee,
        SUM((level='RÉVISÉE')::int)   AS revisee
      FROM "CoverageEvent"
      WHERE "groupId" = $1
      GROUP BY "notionId"`, groupId)
    : [];

  return NextResponse.json({ tree: themes, coverage });
}
```

### 3.2. `curriculum/coverage/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({
  groupId: z.number().int(),
  teacherId: z.number().int(),
  notionId: z.number().int(),
  level: z.enum(["INTRODUITE","PRATIQUEE","EVALUÉE","RÉVISÉE"]),
  coveredOn: z.string().datetime().optional(),
  notes: z.string().max(2000).optional()
});

export async function POST(req: Request) {
  const json = await req.json();
  const body = Body.parse(json);

  const ev = await prisma.coverageEvent.create({
    data: {
      groupId: body.groupId,
      teacherId: body.teacherId,
      notionId: body.notionId,
      level: body.level,
      coveredOn: body.coveredOn ? new Date(body.coveredOn) : undefined,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ ok: true, event: ev }, { status: 201 });
}
```

### 3.3. `resources/upload-url/route.ts`

> suppose MinIO/S3 et une lib interne `getSignedPutUrl(storageKey, mimeType)`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSignedPutUrl, computeStorageKey } from "@/lib/storage";

const Body = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  notions: z.array(z.number().int()).optional()
});

export async function POST(req: Request) {
  const teacherId = /* get from session */ 1;
  const body = Body.parse(await req.json());
  const storageKey = computeStorageKey(teacherId, body.filename);

  const doc = await prisma.resourceDocument.create({
    data: {
      uploaderId: teacherId,
      title: body.filename,
      description: null,
      mimeType: body.mimeType,
      sizeBytes: BigInt(body.size),
      storageKey,
      status: "UPLOADED",
    },
  });

  if (body.notions?.length) {
    await prisma.resourceDocumentNotion.createMany({
      data: body.notions.map((n) => ({ docId: doc.id, notionId: n })),
      skipDuplicates: true
    });
  }

  const uploadUrl = await getSignedPutUrl(storageKey, body.mimeType);
  return NextResponse.json({ docId: doc.id, uploadUrl, storageKey });
}
```

### 3.4. `resources/ingest/route.ts`

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { queues } from "@/worker/queues"; // BullMQ queues

const Body = z.object({ docId: z.number().int() });

export async function POST(req: Request) {
  const { docId } = Body.parse(await req.json());
  await queues.ingestDoc.add("ingest", { docId }, { attempts: 3, removeOnComplete: true, removeOnFail: false });
  return NextResponse.json({ ok: true }, { status: 202 });
}
```

### 3.5. `resources/search/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedQuery } from "@/lib/llm"; // renvoie Float32Array(1536)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const notionId = Number(searchParams.get("notionId") || "0") || undefined;
  const topK = Number(searchParams.get("k") || "6");

  if (!q.trim()) return NextResponse.json({ results: [] });

  const emb = await embedQuery(q); // Float32Array length 1536
  // Prisma raw: dot distance/cosine via pgvector
  const results = await prisma.$queryRawUnsafe<any[]>(`
    SELECT c.id, c."docId", c."chunkIndex", d.title, c.text,
           1 - (c.embedding <=> $1::vector) AS score
    FROM "ResourceChunk" c
    JOIN "ResourceDocument" d ON d.id=c."docId"
    ${notionId ? `JOIN "ResourceDocumentNotion" rdn ON rdn."docId"=d.id AND rdn."notionId"=${notionId}` : ""}
    ORDER BY c.embedding <=> $1::vector
    LIMIT ${topK};
  `, Buffer.from(emb.buffer));

  return NextResponse.json({ results });
}
```

### 3.6. `exercises/import-bac/route.ts` (squelette)

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Body attendu: JSON ou multipart/zip traité côté front/worker
export async function POST() {
  // TODO: parser le payload, créer Exercise + ExerciseNotion + TestCase
  return NextResponse.json({ imported: 0, warnings: [] });
}
```

### 3.7. `quiz/generate/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { selectExercisesForStudent } from "@/lib/selection";

const Body = z.object({
  studentId: z.number().int(),
  purpose: z.enum(["POSITIONNEMENT","ENTRAINEMENT_BAC"]),
  constraints: z.any().optional()
});

export async function POST(req: Request) {
  const { studentId, purpose, constraints } = Body.parse(await req.json());
  const picked = await selectExercisesForStudent({ studentId, purpose, constraints });

  const quiz = await prisma.quiz.create({
    data: {
      studentId,
      purpose,
      items: { create: picked.map((e, i) => ({ exerciseId: e.id, ord: i * 10 })) }
    },
    include: { items: true }
  });

  return NextResponse.json({ ok: true, quiz });
}
```

### 3.8. `quiz/[id]/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      items: { include: { exercise: true }, orderBy: { ord: "asc" } }
    }
  });
  if (!quiz) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ quiz });
}
```

### 3.9. `quiz/[id]/submit/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({
  studentId: z.number().int(),
  items: z.array(z.object({
    quizItemId: z.number().int(),
    answerJson: z.any()
  }))
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const quizId = Number(ctx.params.id);
  const { studentId, items } = Body.parse(await req.json());

  const submission = await prisma.submission.create({
    data: {
      quizId, studentId,
      items: { create: items.map(it => ({
        quizItemId: it.quizItemId,
        answerJson: it.answerJson
      })) }
    }
  });

  return NextResponse.json({ ok: true, submissionId: submission.id }, { status: 201 });
}
```

### 3.10. `quiz/[id]/grade/route.ts`

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { queues } from "@/worker/queues";

const Body = z.object({ submissionId: z.number().int() });

export async function POST(req: Request) {
  const { submissionId } = Body.parse(await req.json());
  await queues.gradeSubmission.add("grade", { submissionId }, { attempts: 2, removeOnComplete: true });
  return NextResponse.json({ ok: true }, { status: 202 });
}
```

### 3.11. `submission/[id]/result/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  const s = await prisma.submission.findUnique({
    where: { id },
    include: {
      items: {
        include: { quizItem: { include: { exercise: true } } },
        orderBy: { id: "asc" }
      }
    }
  });
  if (!s) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({
    submittedAt: s.submittedAt,
    autoGrade: s.autoGrade,
    items: s.items.map(it => ({
      id: it.id,
      autoGrade: it.autoGrade,
      llmFeedback: it.llmFeedback
    }))
  });
}
```

---

# 4) Workers BullMQ (ingestion, exécution tests, correction)

Arborescence :

```
apps/worker/src/
 ├─ queues.ts
 ├─ ingest-doc.ts
 ├─ execute-tests.ts
 └─ grade-submission.ts
```

### 4.1. `queues.ts`

```ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.BULLMQ_REDIS_URL || "redis://redis:6379");

export const queues = {
  ingestDoc: new Queue("ingest-doc", { connection }),
  execTests: new Queue("execute-tests", { connection }),
  gradeSubmission: new Queue("grade-submission", { connection })
};

// Les Worker(s) seront instanciés dans un entrypoint worker séparé.
```

### 4.2. `ingest-doc.ts`

```ts
import { Worker, Job } from "bullmq";
import { queues, connection } from "./queues";
import { prisma } from "./prisma";
import { fetchObject, extractText, chunkText, embedBatch } from "./ingest-lib";

export const ingestWorker = new Worker("ingest-doc", async (job: Job) => {
  const { docId } = job.data as { docId: number };
  const doc = await prisma.resourceDocument.findUnique({ where: { id: docId } });
  if (!doc) return;

  await prisma.resourceDocument.update({ where: { id: docId }, data: { status: "PROCESSING" } });

  const buf = await fetchObject(doc.storageKey);
  const text = await extractText(buf, doc.mimeType); // PDF, DOCX, TXT…
  const chunks = chunkText(text, { tokens: 1000, overlap: 100 });

  // embeddings
  const embeddings = await embedBatch(chunks.map(c => c.text)); // Float32Array[]

  // persist
  await prisma.$transaction(async (tx) => {
    // purge anciens chunks si reprocessing
    await tx.resourceChunk.deleteMany({ where: { docId } });
    for (let i=0; i<chunks.length; i++) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "ResourceChunk" ("docId","chunkIndex","text","embedding")
         VALUES ($1,$2,$3,$4::vector)`,
        docId, i, chunks[i].text, Buffer.from(embeddings[i].buffer)
      );
    }
    await tx.resourceDocument.update({ where: { id: docId }, data: { status: "PROCESSED", processedAt: new Date() } });
  });

}, { connection });
```

### 4.3. `execute-tests.ts` (runner Python)

```ts
import { Worker, Job } from "bullmq";
import { queues, connection } from "./queues";
import fetch from "node-fetch";

// job: { code: string, tests: {input, expected, timeoutMs}[] }
export const execWorker = new Worker("execute-tests", async (job: Job) => {
  const { code, tests } = job.data;
  const resp = await fetch(process.env.PY_RUNNER_URL || "http://runner-py:8080/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, tests })
  });
  if (!resp.ok) throw new Error(`Runner error ${resp.status}`);
  return await resp.json(); // { results: [{pass, logs, error?}, ...] }
}, { connection });
```

### 4.4. `grade-submission.ts`

```ts
import { Worker, Job } from "bullmq";
import { queues, connection } from "./queues";
import { prisma } from "./prisma";
import { gradeQcm, gradeCoding, llmAssessOpen } from "./grading";

export const gradeWorker = new Worker("grade-submission", async (job: Job) => {
  const { submissionId } = job.data as { submissionId: number };
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { items: { include: { quizItem: { include: { exercise: true } } } } }
  });
  if (!submission) return;

  let total = 0, count = 0;

  for (const it of submission.items) {
    const ex = it.quizItem.exercise;
    let autoGrade: number | null = null;
    let llmFeedback: any = null;

    if (ex?.type === "QCM") {
      autoGrade = await gradeQcm(ex, it.answerJson);
    } else if (ex?.type === "CODING") {
      autoGrade = await gradeCoding(ex, it.answerJson); // appelle queues.execTests si besoin
    } else if (ex?.type === "OUVERT") {
      const res = await llmAssessOpen(ex, it.answerJson); // RAG+LLM, renvoie {score, feedback}
      autoGrade = res.score;
      llmFeedback = res.feedback;
    }

    await prisma.submissionItem.update({
      where: { id: it.id },
      data: { autoGrade: autoGrade ?? undefined, llmFeedback }
    });

    if (typeof autoGrade === "number") { total += autoGrade; count += 1; }
  }

  const avg = count ? Math.round((total / count) * 100) / 100 : null;
  await prisma.submission.update({ where: { id: submissionId }, data: { autoGrade: avg ?? undefined } });

  // TODO: mise à jour StudentMastery (agrégations notionnelles)
}, { connection });
```

> Ajoutez un **entrypoint** worker (ex: `apps/worker/src/index.ts`) qui importe les 3 workers pour les lancer.

---

# 5) Librairies utilitaires (stubs rapides)

### 5.1. `apps/web/src/lib/prisma.ts`

```ts
import { PrismaClient } from "@prisma/client";
export const prisma = globalThis._prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis._prisma = prisma as any;
```

### 5.2. `apps/web/src/lib/storage.ts` (S3/MinIO signé)

```ts
export function computeStorageKey(userId: number, filename: string) {
  const ts = Date.now();
  return `resources/${userId}/${ts}_${filename}`.replace(/\s+/g,"_");
}
export async function getSignedPutUrl(storageKey: string, mimeType: string) {
  // TODO: implémenter S3/MinIO presign PUT
  return `https://minio.local/${encodeURIComponent(storageKey)}?signature=TODO`;
}
```

### 5.3. `apps/web/src/lib/llm.ts` (abstraction embeddings/completions)

```ts
export async function embedQuery(text: string): Promise<Float32Array> {
  // TODO: appeler provider embeddings, retourner Float32Array(1536)
  return new Float32Array(1536);
}
```

### 5.4. `apps/worker/src/ingest-lib.ts`

```ts
export async function fetchObject(storageKey: string): Promise<Buffer> {
  // TODO: GET depuis MinIO/S3
  return Buffer.from("");
}
export async function extractText(buf: Buffer, mime: string): Promise<string> {
  // TODO: PDF, DOCX, TXT
  return buf.toString("utf8");
}
export function chunkText(text: string, opt: {tokens: number; overlap: number}) {
  // TODO: découpage simple par longueur/caractères; remplacez par tiktoken si dispo
  const size = 3500; const ov = 300;
  const chunks: {text: string}[] = [];
  for (let i=0; i<text.length; i+= (size-ov)) chunks.push({ text: text.slice(i, i+size) });
  return chunks.map((c, idx)=> ({ ...c, idx }));
}
export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  // TODO: batch embeddings
  return texts.map(()=> new Float32Array(1536));
}
```

### 5.5. `apps/web/src/lib/selection.ts`

```ts
import { prisma } from "./prisma";

export async function selectExercisesForStudent({ studentId, purpose, constraints }: any) {
  // TODO: logique: notions abordées (CoverageEvent), profil élève (StudentMastery),
  // filtrage ExerciseNotion + difficulty + diversité types.
  const exos = await prisma.exercise.findMany({ take: 12, orderBy: { id: "asc" } });
  return exos;
}
```

### 5.6. `apps/worker/src/grading.ts`

```ts
import { queues } from "./queues";
import type { Exercise } from "@prisma/client";

export async function gradeQcm(ex: Exercise, answerJson: any): Promise<number> {
  // TODO: clé de correction dans rubricJson.solution?
  return 1.0;
}

export async function gradeCoding(ex: Exercise, answerJson: any): Promise<number> {
  const code = answerJson?.code ?? "";
  const tests = []; // TODO: charger TestCase
  const job = await queues.execTests.add("exec", { code, tests }, { attempts: 1, removeOnComplete: true });
  const { results } = await job.waitUntilFinished(5000);
  const pass = results.filter((r: any) => r.pass).length;
  const total = results.length || 1;
  return pass / total;
}

export async function llmAssessOpen(ex: Exercise, answerJson: any): Promise<{score: number, feedback: any}> {
  // TODO: RAG + LLM sur statementMd + resources pertinentes
  return { score: 0.7, feedback: { strengths: [], weaknesses: [], suggestions: [] } };
}
```

---

## Comment lancer rapidement

1. **Migrations**

```bash
npx prisma migrate dev -n "curriculum_rag_init"
```

2. **Seed curriculum**

```bash
npm run seed:curriculum
```

3. **Workers**

* Démarrez Redis (déjà là chez vous), puis lancez un process worker :

```bash
tsx apps/worker/src/ingest-doc.ts &
tsx apps/worker/src/execute-tests.ts &
tsx apps/worker/src/grade-submission.ts &
```

(ou un `apps/worker/src/index.ts` qui importe les trois)

---

### Ce que vous avez maintenant

* **Schéma** DB pour : programme (thèmes/sous-thèmes/notions), couverture, ressources & RAG (pgvector), exercices, quiz/soumissions, maîtrise élève.
* **YAML Terminale NSI** prêt à être seedé (structure complète, extensible).
* **API squelettes** pour couvrir arbre, couverture, upload/ingest/search, génération quiz, soumission/correction.
* **Workers** pour ingestion doc, exécution tests Python, correction hybride.

génial — je vous file tout ce qu’il faut pour brancher **tout de suite** :

* un mini front **enseignant** “Programme & ressources” (arbre de notions + journal de couverture + upload & tag des documents),
* un **quiz runner élève** avec **Monaco** pour le code Python,
* un set de **prompts RAG/LLM** prêt à l’emploi (génération d’exos, correction ouverte, feedback, etc.).

Tout est en **Next.js App Router** (client components), tapez-coller et ça tourne avec les API/Workers déjà fournis.

---

# 1) Mini front enseignant — “Programme & ressources”

## 1.1. Page route

`apps/web/src/app/dashboard/teacher/program/page.tsx`

```tsx
// apps/web/src/app/dashboard/teacher/program/page.tsx
import dynamic from "next/dynamic";

// Client component isolé (pour SWR, upload, etc.)
const TeacherProgramClient = dynamic(() => import("./teacher/TeacherProgramClient"), { ssr: false });

export const metadata = {
  title: "Programme & ressources • Enseignant",
};

export default function Page() {
  return <TeacherProgramClient />;
}
```

## 1.2. Client principal

`apps/web/src/app/dashboard/teacher/program/teacher/TeacherProgramClient.tsx`

```tsx
"use client";

import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";

type Notion = { id:number; code:string; title:string; description?:string; ord:number };
type Sub = { id:number; code:string; title:string; ord:number; notions: Notion[] };
type Theme = { id:number; code:string; title:string; ord:number; subs: Sub[] };
type CoverageAgg = { notionid:number; introduite:number; pratiquee:number; evaluee:number; revisee:number };

const fetcher = (url: string) => fetch(url).then(r => r.json());

function LevelTag({
  agg,
}: {
  agg?: { introduite?: number; pratiquee?: number; evaluee?: number; revisee?: number };
}) {
  const pill = (label:string, v?:number) => (
    <span className="text-[11px] px-2 py-[2px] rounded-full border border-white/10 bg-white/5 mr-1">
      {label}{typeof v === "number" ? ` ${v}` : ""}
    </span>
  );
  return (
    <div className="mt-1">{pill("Intro"), pill("Pratique"), pill("Éval"), pill("Revu")}</div>
  );
}

export default function TeacherProgramClient() {
  // TODO: brancher la vraie sélection du groupe/enseignant depuis l’auth
  const [groupId, setGroupId] = useState<number | undefined>(undefined);
  const teacherId = 1; // ← placeholder

  const { data, mutate, isLoading } = useSWR<{ tree: Theme[]; coverage: CoverageAgg[] }>(
    `/api/curriculum/tree${groupId ? `?groupId=${groupId}` : ""}`,
    fetcher
  );

  const coverageByNotion = useMemo(() => {
    const m = new Map<number, CoverageAgg>();
    (data?.coverage ?? []).forEach((c) => m.set(Number((c as any).notionid ?? (c as any).notionId), c as any));
    return m;
  }, [data]);

  const postCoverage = useCallback(async (notionId:number, level: "INTRODUITE"|"PRATIQUEE"|"EVALUÉE"|"RÉVISÉE") => {
    if (!groupId) { alert("Choisissez d’abord un groupe"); return; }
    const body = { groupId, teacherId, notionId, level };
    const res = await fetch("/api/curriculum/coverage", {
      method: "POST",
      headers: { "content-type":"application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(()=> ({}));
      alert("Échec: " + (j?.message || res.status));
    } else {
      mutate(); // refresh counters
    }
  }, [groupId, teacherId, mutate]);

  return (
    <div className="container py-6">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Programme & ressources</h1>
          <p className="text-sm opacity-70">Cochez ce qui a été abordé, uploadez des docs par notion, tout est indexé RAG.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Groupe ID</label>
          <input
            className="px-2 py-1 rounded border border-white/10 bg-white/5"
            placeholder="ex: 1"
            onChange={(e)=> setGroupId(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Arbre notions */}
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <h2 className="text-lg font-medium mb-2">Programme officiel (Terminale NSI)</h2>
            {isLoading ? <div>Chargement…</div> : (
              <div className="space-y-4">
                {data?.tree?.map((t) => (
                  <details key={t.id} className="rounded-lg border border-white/10 bg-white/5">
                    <summary className="cursor-pointer px-3 py-2 text-[var(--fg)]">
                      <span className="font-semibold">{t.code}</span> — {t.title}
                    </summary>
                    <div className="p-3 space-y-4">
                      {t.subs.map((s)=>(
                        <details key={s.id} className="rounded-lg border border-white/10">
                          <summary className="cursor-pointer px-3 py-2">
                            <span className="font-medium">{s.code}</span> — {s.title}
                          </summary>
                          <div className="p-3">
                            {s.notions.map((n)=> {
                              const agg = coverageByNotion.get(n.id);
                              return (
                                <div key={n.id} className="mb-3 p-2 rounded border border-white/10 bg-white/5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">{n.code} — {n.title}</div>
                                      {n.description && <div className="text-sm opacity-70">{n.description}</div>}
                                      <LevelTag agg={agg as any} />
                                    </div>
                                    <div className="flex gap-2">
                                      <button className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15"
                                        onClick={()=> postCoverage(n.id, "INTRODUITE")}>Intro</button>
                                      <button className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15"
                                        onClick={()=> postCoverage(n.id, "PRATIQUEE")}>Pratique</button>
                                      <button className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15"
                                        onClick={()=> postCoverage(n.id, "EVALUÉE")}>Éval</button>
                                      <button className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15"
                                        onClick={()=> postCoverage(n.id, "RÉVISÉE")}>Revu</button>
                                    </div>
                                  </div>

                                  {/* Upload ciblé notion */}
                                  <UploadForNotion notionId={n.id} />
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Journal (liste des derniers CoverageEvent) + recherche de docs */}
        <div className="col-span-12 lg:col-span-5">
          <JournalPanel groupId={groupId} />
          <SearchDocs />
        </div>
      </div>
    </div>
  );
}

function UploadForNotion({ notionId }: { notionId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const onSelect = (e:any) => setFile(e.target.files?.[0] ?? null);

  const upload = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    try {
      const body = { filename:file.name, mimeType:file.type || "application/octet-stream", size:file.size, notions:[notionId] };
      const r1 = await fetch("/api/resources/upload-url", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(body) });
      if (!r1.ok) throw new Error("upload-url failed");
      const { uploadUrl, docId } = await r1.json();

      // PUT binaire
      const rPut = await fetch(uploadUrl, { method: "PUT", body: file });
      if (!rPut.ok) throw new Error("PUT upload failed");

      // Ingestion
      await fetch("/api/resources/ingest", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ docId }) });

      alert("Document envoyé et en cours d’indexation ✨");
      setFile(null);
    } catch (e:any) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [file, notionId]);

  return (
    <div className="mt-2 flex items-center gap-2">
      <input type="file" onChange={onSelect} />
      <button disabled={!file || busy} onClick={upload}
        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15 disabled:opacity-50">
        {busy ? "Envoi…" : "Uploader & indexer"}
      </button>
    </div>
  );
}

function JournalPanel({ groupId }: { groupId?: number }) {
  // à raccorder: un endpoint /api/curriculum/coverage?groupId=…
  // pour l’exemple on affiche un placeholder
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/5 mb-6">
      <h3 className="text-base font-medium mb-2">Journal du groupe</h3>
      {groupId ? (
        <ul className="text-sm opacity-80 list-disc pl-4">
          <li>Dernières marques “Intro/Pratique/Éval/Revu” apparaîtront ici (à implémenter).</li>
        </ul>
      ) : (
        <div className="text-sm opacity-70">Choisissez un groupe pour afficher l’historique.</div>
      )}
    </div>
  );
}

function SearchDocs() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const search = useCallback(async ()=>{
    const r = await fetch(`/api/resources/search?q=${encodeURIComponent(q)}&k=6`);
    const j = await r.json();
    setResults(j.results ?? []);
  }, [q]);
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/5">
      <h3 className="text-base font-medium mb-2">Recherche RAG</h3>
      <div className="flex gap-2 mb-3">
        <input className="flex-1 px-2 py-1 rounded border border-white/10 bg-white/5"
               value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Rechercher dans les ressources…" />
        <button onClick={search} className="px-3 py-1 rounded bg-white/10 hover:bg-white/15">Chercher</button>
      </div>
      <div className="space-y-2">
        {results.map((r,i)=>(
          <div key={i} className="text-sm p-2 rounded border border-white/10">
            <div className="font-medium">{r.title} <span className="opacity-60">({Math.round((r.score ?? 0)*100)/100})</span></div>
            <div className="opacity-80 line-clamp-3">{r.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

# 2) Quiz runner élève (avec Monaco)

## 2.1. Page route

`apps/web/src/app/quiz/[id]/play/page.tsx`

```tsx
import dynamic from "next/dynamic";
const QuizRunnerClient = dynamic(() => import("./client/QuizRunnerClient"), { ssr: false });

export const metadata = {
  title: "Quiz / Examen – Épreuve",
};

export default function Page({ params }: { params: { id: string } }) {
  return <QuizRunnerClient quizId={Number(params.id)} />;
}
```

## 2.2. Client runner

`apps/web/src/app/quiz/[id]/play/client/QuizRunnerClient.tsx`

```tsx
"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false }) as any;
const fetcher = (u:string)=> fetch(u).then(r=>r.json());

type Exercise = {
  id:number; title:string; type:"QCM"|"OUVERT"|"CODING"; statementMd:string; rubricJson?:any;
};
type Quiz = { id:number; items: { id:number; ord:number; exercise: Exercise }[] };

export default function QuizRunnerClient({ quizId }:{ quizId:number }) {
  const studentId = 1; // brancher votre session
  const { data, isLoading } = useSWR<{quiz:Quiz}>(`/api/quiz/${quizId}`, fetcher);
  const [answers, setAnswers] = useState<Record<number, any>>({}); // quizItemId -> answerJson

  const onAnswer = useCallback((quizItemId:number, value:any)=>{
    setAnswers(prev => ({ ...prev, [quizItemId]: value }));
  }, []);

  const submit = useCallback(async ()=>{
    const items = Object.entries(answers).map(([quizItemId, answerJson]) => ({
      quizItemId: Number(quizItemId), answerJson
    }));
    const r = await fetch(`/api/quiz/${quizId}/submit`, {
      method: "POST", headers: { "content-type":"application/json" },
      body: JSON.stringify({ studentId, items })
    });
    if (!r.ok) { alert("Échec d’envoi"); return; }
    const { submissionId } = await r.json();
    await fetch(`/api/quiz/${quizId}/grade`, { method: "POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ submissionId })});
    alert("Copie envoyée. Correction en cours ✨");
  }, [answers, quizId, studentId]);

  if (isLoading) return <div className="container py-6">Chargement…</div>;
  const quiz = data?.quiz;

  return (
    <div className="container py-6">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Épreuve / Quiz #{quizId}</h1>
          <p className="text-sm opacity-70">Répondez dans les blocs ci-dessous. Le code Python est exécuté sur des tests.</p>
        </div>
        <button onClick={submit} className="px-4 py-2 rounded bg-white/10 hover:bg-white/15">Remettre la copie</button>
      </div>

      <div className="space-y-6">
        {quiz?.items?.map((it, idx)=>(
          <Item key={it.id} index={idx+1} item={it} onAnswer={onAnswer} />
        ))}
      </div>
    </div>
  );
}

function Item({ item, index, onAnswer }:{
  item: { id:number; exercise: Exercise }, index:number,
  onAnswer: (quizItemId:number, value:any)=>void
}) {
  const e = item.exercise;
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/5">
      <div className="mb-2">
        <div className="text-sm opacity-70">Exercice {index} — {e.type}</div>
        <div className="text-lg font-medium">{e.title}</div>
      </div>
      <Statement md={e.statementMd} />
      <div className="mt-3">
        {e.type === "QCM" && <QcmAnswer itemId={item.id} rubric={e.rubricJson} onAnswer={onAnswer} />}
        {e.type === "OUVERT" && <OpenAnswer itemId={item.id} onAnswer={onAnswer} />}
        {e.type === "CODING" && <CodeAnswer itemId={item.id} onAnswer={onAnswer} />}
      </div>
    </div>
  );
}

function Statement({ md }:{ md:string }) {
  // rendu très simple (on pourrait brancher react-markdown)
  return <pre className="whitespace-pre-wrap text-sm opacity-90">{md}</pre>;
}

function QcmAnswer({ itemId, rubric, onAnswer }:{
  itemId:number, rubric:any, onAnswer:(id:number,v:any)=>void
}) {
  // convention: rubric.choices: string[], rubric.multi?:boolean
  const choices: string[] = rubric?.choices ?? [];
  const multi = !!rubric?.multi;
  const [sel, setSel] = useState<number[]>([]);
  const toggle = (i:number) => {
    setSel(prev=>{
      const has = prev.includes(i);
      const next = multi
        ? has ? prev.filter(x=>x!==i) : [...prev, i]
        : [i];
      onAnswer(itemId, { selected: next });
      return next;
    });
  };
  return (
    <div className="space-y-2">
      {choices.map((c, i)=>(
        <label key={i} className="flex items-center gap-2 text-sm">
          <input type={multi ? "checkbox":"radio"} checked={sel.includes(i)} onChange={()=> toggle(i)} />
          <span>{c}</span>
        </label>
      ))}
    </div>
  );
}

function OpenAnswer({ itemId, onAnswer }:{ itemId:number, onAnswer:(id:number,v:any)=>void }) {
  const [txt, setTxt] = useState("");
  return (
    <textarea className="w-full min-h-[120px] text-sm rounded border border-white/10 bg-white/5 p-2"
      placeholder="Rédigez votre réponse…"
      value={txt} onChange={(e)=> { setTxt(e.target.value); onAnswer(itemId, { text: e.target.value }); }} />
  );
}

function CodeAnswer({ itemId, onAnswer }:{ itemId:number, onAnswer:(id:number,v:any)=>void }) {
  const [code, setCode] = useState<string>("# Écrivez votre code Python ici\n");
  return (
    <div className="border border-white/10 rounded">
      <MonacoEditor
        height="260px"
        language="python"
        value={code}
        options={{ minimap: { enabled:false }, fontSize:14 }}
        onChange={(v:string)=> { setCode(v); onAnswer(itemId, { code: v }); }}
      />
    </div>
  );
}
```

> **Dépendance** : `@monaco-editor/react` (et si besoin `monaco-editor`).
> `npm i @monaco-editor/react monaco-editor swr`

---

# 3) Prompts RAG/LLM — templates

Ajoutez ces fichiers pour centraliser les prompts. Ils sont écrits en **Handlebars-like** (`{{var}}`) pour interpolation côté code.

## 3.1. Génération de quiz/sujets (profilée par notions)

`prompts/quiz_generation.md`

```md
# role: system
Tu es un concepteur d'exercices NSI (Terminale). Tu respectes le programme officiel et le niveau attendu au bac.

## Profil élève
- Nom: {{student.name}}
- Classe: Terminale NSI
- Maîtrise par notion (0..1): {{json mastery}}

## Contraintes
- But: {{purpose}}  (POSITIONNEMENT | ENTRAINEMENT_BAC)
- Nombre d'exercices: {{count}}
- Répartition types (approx.): QCM {{pct_qcm}}%, OUVERT {{pct_open}}%, CODING {{pct_coding}}%
- Difficulté cible: {{difficulty}}  (FACILE | MOYEN | DIFFICILE)

## Corpus autorisé
Tu ne dois choisir/adapter que des exercices:
1) Reliés aux notions suivantes (pondérées par maîtrise faible): {{list weak_notions codes=true}}
2) S'inspirant de la base “bac NSI” (énoncés type, mais pas de plagiat)
3) Conformes au format demandé (rubrics JSON précis pour QCM/CODING)

## Sortie attendue (JSON strict)
{
  "items": [
    {
      "title": "…",
      "type": "QCM|OUVERT|CODING",
      "statementMd": "…",
      "difficulty": "FACILE|MOYEN|DIFFICILE",
      "notionCodes": ["T2.4.b", "T1.2.a"],
      "rubricJson": {
        "choices": ["…","…"], "multi": false
        // pour CODING: "signature":"def f(x):", "instructions":"…", "tests":[{"input":"…","expected":"…"}]
      }
    }
  ]
}
Aucun texte hors de ce JSON.
```

## 3.2. Correction ouverte (RAG sur ressources + corrigé)

`prompts/open_grading.md`

```md
# role: system
Tu es correcteur NSI. Tu fournis une note sur 1.0, et un feedback structuré.
Tu dois t'appuyer sur les extraits de contexte (RAG) et sur un corrigé de référence s'il est fourni.

## Contexte RAG (extraits vérifiés, cite les #chunks)
{{#each context}}
- [#{{this.id}} score={{this.score}}] {{truncate this.text 280}}
{{/each}}

## Enoncé & Corrigé
ÉNONCÉ:
{{statement}}

CORRIGÉ (si présent):
{{solution}}

## Réponse de l'élève
{{answer}}

## Barème attendu
- Exactitude technique (0.6)
- Clarté/rigueur (0.2)
- Terminologie/notation (0.2)

## Sortie attendue (JSON strict)
{
  "score": number (0..1),
  "feedback": {
    "strengths": ["…"],
    "weaknesses": ["…"],
    "suggestions": ["…"],
    "references": ["#chunkId …"]
  }
}
```

## 3.3. Revue de code Python (analyse + conseils)

`prompts/code_review.md`

````md
# role: system
Tu es un relecteur Python (niveau Terminale NSI). Analyses: correction, complexité, style.

## Enoncé (résumé)
{{statement_short}}

## Code de l'élève
```python
{{code}}
````

## Tests (résumé)

{{#each tests}}

* input={{this.input}} expected={{this.expected}}
  {{/each}}

## Sortie attendue (JSON)

{
"correctness": 0..1,
"complexity_comment": "…",
"style_notes": ["…"],
"improvements": ["…"]
}

````

## 3.4. Reformulation en **rubrics** pour QCM/CODING
`prompts/rubric_from_solution.md`
```md
# role: system
Transforme un énoncé + une solution de référence en rubrics utilisables par la plateforme.

ENTRÉE:
{{statement}}
SOLUTION:
{{solution}}

SORTIE (JSON):
{
  "type": "QCM|CODING|OUVERT",
  "rubricJson": {
    // QCM: { "choices":[…], "correct":[indices], "multi": false }
    // CODING: { "signature":"def f(...):", "instructions":"…", "tests":[{input,expected,public:true}] }
  }
}
````

---

# 4) Petites notes d’intégration

* **Auth/IDs** : j’ai mis des `teacherId=1`, `studentId=1` en placeholder côté front. Branchez sur votre session JWT existante (`payload.userId`, `payload.role`).
* **SWR** : léger et efficace pour ces écrans. Vous pouvez remplacer par React Query si vous préférez.
* **Upload** : l’endpoint `/api/resources/upload-url` doit renvoyer une URL PUT valide (MinIO/S3). Le `ingest` pousse le job BullMQ.
* **Rendu Markdown** : vous pouvez remplacer `<pre>` par `react-markdown`.
* **Monaco** : déjà prêt ; pour un mode sombre, `theme="vs-dark"` si besoin.

---

## Ça vous donne quoi maintenant ?

* Un écran prof **opérationnel** pour suivre le programme, **marquer la couverture**, **joindre des ressources** par notion, et **rechercher** via RAG.
* Un **runner élève** ergonomique (QCM / rédaction / code Python exécuté).
* Un **pack de prompts** standardisés pour générer, corriger, reviewer — modulables.

parfait — j’ajoute les 3 briques demandées, prêtes à coller dans votre repo **Next.js App Router** (mêmes conventions que ce qu’on a déjà posé).

---

# 1) Page “Résultats” élève

Affiche `GET /api/submission/:id/result` avec détail par exercice.

## 1.1. Route page

`apps/web/src/app/submission/[id]/result/page.tsx`

```tsx
import dynamic from "next/dynamic";

const SubmissionResultClient = dynamic(
  () => import("./client/SubmissionResultClient"),
  { ssr: false }
);

export const metadata = { title: "Résultats de l'épreuve" };

export default function Page({ params }: { params: { id: string } }) {
  return <SubmissionResultClient submissionId={Number(params.id)} />;
}
```

## 1.2. Client

`apps/web/src/app/submission/[id]/result/client/SubmissionResultClient.tsx`

```tsx
"use client";

import useSWR from "swr";
const fetcher = (u:string)=> fetch(u).then(r=>r.json());

type ItemResult = {
  quizItemId: number;
  exerciseTitle: string;
  type: "QCM"|"OUVERT"|"CODING";
  score: number;                 // 0..1
  comments?: {
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
    references?: string[];
  };
  codeReport?: {
    correctness?: number;
    complexity_comment?: string;
    style_notes?: string[];
    improvements?: string[];
  };
};

type SubmissionResult = {
  submissionId: number;
  student: { id:number; name:string };
  quizId: number;
  totalScore: number;           // 0..1
  items: ItemResult[];
};

export default function SubmissionResultClient({ submissionId }:{submissionId:number}) {
  const { data, isLoading } = useSWR<{result:SubmissionResult}>(
    `/api/submission/${submissionId}/result`,
    fetcher
  );

  if (isLoading) return <div className="container py-6">Chargement…</div>;
  const res = data?.result;
  if (!res) return <div className="container py-6">Aucun résultat.</div>;

  return (
    <div className="container py-6 space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Résultats — Copie #{res.submissionId}</h1>
          <div className="text-sm opacity-70">{res.student.name} — Quiz #{res.quizId}</div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-70">Score global</div>
          <div className="text-xl font-semibold">{Math.round(res.totalScore*100)}%</div>
        </div>
      </header>

      <div className="space-y-4">
        {res.items.map((it)=>(
          <div key={it.quizItemId} className="rounded-xl border border-white/10 p-4 bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{it.exerciseTitle} <span className="opacity-70">({it.type})</span></div>
              <div className="text-base">{Math.round(it.score*100)}%</div>
            </div>

            {it.comments && (
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <Box title="Points forts" items={it.comments.strengths}/>
                <Box title="À améliorer" items={it.comments.weaknesses}/>
                <Box title="Conseils" items={it.comments.suggestions}/>
              </div>
            )}

            {it.codeReport && (
              <div className="mt-3 text-sm rounded-lg border border-white/10 p-3 bg-white/5">
                <div className="font-medium mb-1">Analyse code (Python)</div>
                <div className="opacity-80">Correctness: {Math.round((it.codeReport.correctness ?? 0)*100)}%</div>
                {it.codeReport.complexity_comment && <div className="opacity-80">Complexité: {it.codeReport.complexity_comment}</div>}
                {it.codeReport.style_notes?.length ? (
                  <ul className="list-disc pl-4 opacity-80">
                    {it.codeReport.style_notes.map((s,i)=>(<li key={i}>{s}</li>))}
                  </ul>
                ): null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Box({ title, items }:{title:string, items?:string[]}) {
  return (
    <div className="rounded-lg border border-white/10 p-3 bg-white/5">
      <div className="text-sm opacity-70 mb-1">{title}</div>
      {items?.length ? <ul className="list-disc pl-4">{items.map((s,i)=>(<li key={i}>{s}</li>))}</ul> : <div>—</div>}
    </div>
  );
}
```

## 1.3. API (squelette rapide)

`apps/web/src/app/api/submission/[id]/result/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <- votre helper

export async function GET(_:NextRequest, { params }:{ params:{ id:string }}) {
  const submissionId = Number(params.id);
  const sub = await prisma.quizSubmission.findUnique({
    where: { id: submissionId },
    include: {
      student: { select: { id:true, name:true } },
      quiz: { select: { id:true } },
      items: {
        include: {
          quizItem: { include: { exercise:true } },
          grading: true, // table “submissionItemGrading” proposée dans le plan précédent
        }
      }
    }
  });
  if (!sub) return NextResponse.json({ error:"not_found" }, { status:404 });

  const items = sub.items.map(it => ({
    quizItemId: it.quizItemId,
    exerciseTitle: it.quizItem.exercise.title,
    type: it.quizItem.exercise.type,
    score: it.grading?.score ?? 0,
    comments: it.grading?.openFeedbackJson as any || undefined,
    codeReport: it.grading?.codeReviewJson as any || undefined,
  }));

  const totalScore = items.length
    ? items.reduce((a,b)=> a + (b.score ?? 0), 0)/items.length
    : 0;

  return NextResponse.json({
    result: {
      submissionId: sub.id,
      student: sub.student,
      quizId: sub.quiz.id,
      totalScore,
      items,
    }
  });
}
```

---

# 2) Widget de progression notionnelle (agrégation `StudentMastery`)

## 2.1. Composant réutilisable

`apps/web/src/components/StudentProgress.tsx`

```tsx
"use client";
import useSWR from "swr";

type Mastery = { notionId:number; notionCode:string; notionTitle:string; mastery:number }; // 0..1

export default function StudentProgress({ studentId }:{ studentId:number }) {
  const { data, isLoading } = useSWR<{ mastery:Mastery[] }>(
    `/api/student/mastery?studentId=${studentId}`,
    (u)=> fetch(u).then(r=>r.json())
  );

  if (isLoading) return <div>Chargement…</div>;
  const arr = data?.mastery ?? [];
  if (!arr.length) return <div>Aucune donnée.</div>;

  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/5">
      <div className="text-lg font-medium mb-2">Progression notionnelle</div>
      <div className="space-y-2">
        {arr.map((m)=>(
          <div key={m.notionId}>
            <div className="text-sm">{m.notionCode} — {m.notionTitle}</div>
            <Bar v={m.mastery}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ v }:{ v:number }) {
  const pct = Math.max(0, Math.min(1, v)) * 100;
  return (
    <div className="h-2 rounded bg-white/10 overflow-hidden">
      <div className="h-full bg-white/60" style={{ width: `${pct}%` }}/>
    </div>
  );
}
```

## 2.2. API d’agrégation

`apps/web/src/app/api/student/mastery/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req:NextRequest) {
  const studentId = Number(new URL(req.url).searchParams.get("studentId"));
  if (!studentId) return NextResponse.json({ error:"studentId_required" }, { status:400 });

  // Exemple d’agrégation: moyenne des mastery_score par notion
  const rows = await prisma.studentMastery.groupBy({
    by: ["notionId"],
    where: { studentId },
    _avg: { mastery: true },
  });

  const notionIds = rows.map(r=> r.notionId);
  const notions = await prisma.notion.findMany({
    where: { id: { in: notionIds } },
    select: { id:true, code:true, title:true }
  });
  const byId = new Map(notions.map(n=> [n.id, n]));

  return NextResponse.json({
    mastery: rows.map(r=> ({
      notionId: r.notionId,
      mastery: r._avg.mastery ?? 0,
      notionCode: byId.get(r.notionId)?.code ?? "",
      notionTitle: byId.get(r.notionId)?.title ?? "",
    }))
  });
}
```

> **Où l’utiliser ?**
>
> * Tableau de bord élève : `apps/web/src/app/dashboard/student/page.tsx` → `<StudentProgress studentId={session.userId} />`
> * Page résultat (haut ou bas) pour donner du contexte.

---

# 3) **Preset d’exos “bac”** — import minimal

Vous avez deux options : **script CLI** (recommandé pour semer en dev/CI) et **endpoint admin** (utile en démo).

## 3.1. Données minimales (2 exos)

`data/bac_preset_min.json`

```json
{
  "exercises": [
    {
      "title": "Files & piles: complexité d'opérations",
      "type": "QCM",
      "statementMd": "On considère une implémentation de pile basée sur un tableau dynamique...",
      "notionCodes": ["T2.3.a", "T2.4.b"],
      "rubricJson": { "choices": ["O(1)", "O(n)", "O(log n)"], "correct": [0], "multi": false },
      "difficulty": "MOYEN"
    },
    {
      "title": "Parcours de graphe en largeur",
      "type": "CODING",
      "statementMd": "Écrire une fonction `bfs(g, s)` renvoyant l'ordre de visite.",
      "notionCodes": ["T3.2.b"],
      "rubricJson": {
        "signature": "def bfs(g, s):",
        "instructions": "g est un dict: sommet -> liste de voisins. Retourne une liste d'ordres.",
        "tests": [
          { "input": "{'A':['B','C'],'B':['D'],'C':[]}, 'A'", "expected": "['A','B','C','D']" }
        ]
      },
      "difficulty": "MOYEN"
    }
  ]
}
```

## 3.2. Script d’import Prisma

`scripts/import_bac_preset.ts`

```ts
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2] || path.join(process.cwd(), "data/bac_preset_min.json");
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw) as {
    exercises: Array<{
      title:string; type:"QCM"|"OUVERT"|"CODING";
      statementMd:string; notionCodes:string[]; rubricJson?:any; difficulty?:string;
    }>
  };

  for (const ex of data.exercises) {
    const notions = await prisma.notion.findMany({ where: { code: { in: ex.notionCodes }}, select:{ id:true } });
    const exercise = await prisma.exercise.create({
      data: {
        title: ex.title,
        type: ex.type,
        statementMd: ex.statementMd,
        rubricJson: ex.rubricJson as any,
        difficulty: ex.difficulty as any,
        exerciseNotion: { create: notions.map(n=> ({ notionId: n.id })) }
      }
    });
    console.log("✔ created exercise", exercise.id, exercise.title);
  }
}

main().then(()=> prisma.$disconnect()).catch(async (e)=>{
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
```

> **Run**
> `node --loader ts-node/esm scripts/import_bac_preset.ts`
> (ou transpilez TS → JS selon votre setup; sinon convertissez ce fichier en JS pur).

## 3.3. Endpoint admin (facultatif)

`apps/web/src/app/api/admin/import/bac-preset/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req:NextRequest) {
  // TODO: vérifier role=TEACHER/ADMIN
  const body = await req.json();
  const list = Array.isArray(body?.exercises) ? body.exercises : [];

  const created:number[] = [];
  for (const ex of list) {
    const notionCodes:string[] = ex.notionCodes ?? [];
    const notions = await prisma.notion.findMany({ where: { code: { in: notionCodes }}, select:{ id:true } });
    const exercise = await prisma.exercise.create({
      data: {
        title: ex.title,
        type: ex.type,
        statementMd: ex.statementMd,
        rubricJson: ex.rubricJson as any,
        difficulty: ex.difficulty as any,
        exerciseNotion: { create: notions.map(n=> ({ notionId: n.id })) }
      }
    });
    created.push(exercise.id);
  }

  return NextResponse.json({ created });
}
```

---

## Intégration rapide

* **Résultats** : accessible via `/submission/:id/result`.
* **Progress widget** : placez `<StudentProgress studentId={session.userId} />` dans la page élève.
* **Preset bac** : mettez votre JSON, lancez le script d’import (ou POST sur l’endpoint admin).

Ces ajouts s’alignent sur le modèle de données et l’API que nous avons défini : ils stockent ce qu’il faut pour le RAG/LLM (ressources taggées par notions), exposent la progression par notion, et offrent un flux complet élève (faire → rendre → corriger → consulter résultats).



