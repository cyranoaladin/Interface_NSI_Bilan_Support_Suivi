# Notes d’audit — Extension « Programme & Quiz »

Date: 2025-10-16
Portée: cadrer l’extension sans casser l’existant. Vérifs effectuées sur monorepo, données, vecteurs, S3, workers, CI/tests.

---

## 1) Stack & architecture
- Monorepo npm workspaces: `apps/web` (Next.js 14 App Router, TS), `apps/worker` (Node workers BullMQ). Pas de `packages/*` détecté.
- Node/Docker:
  - Web: Dockerfile multi-stage (Node 22), Next build, Prisma generate.
  - Worker: Node 20 + stack LaTeX/LibreOffice/Tesseract (héritage), BullMQ.
- Infra (Docker Compose): Postgres 15 (pgvector), PgBouncer, Redis 7, MinIO, Web, Worker, Prometheus+Grafana.

## 2) Données & Prisma (existant)
- `prisma/schema.prisma` (PostgreSQL):
  - Auth/élèves/enseignants: `Student(email PK)`, `Teacher(email PK)`, `Group`, `TeacherOnGroup`.
  - Bilan/questionnaire: `Attempt`, `Score`, `Tag`, `Report`, `Bilan`, `StudentProfileData`.
  - Évaluations: `Evaluation`, `EvaluationBilan`.
  - RAG: modèle `Document` mappé sur table `documents` (via `@@map("documents")`).
- Remarque: pas de modèle Prisma pour les `chunks` vectoriels (cf. section 3); accès via SQL brut.

## 3) Vecteurs & RAG
- Extension/vector: migration `prisma/migrations/20250904_rag_init.sql` crée:
  - `documents(id uuid, source text, path text, title text, meta jsonb)`
  - `chunks(id uuid, document_id uuid FK -> documents, text text, embedding vector(768), meta jsonb)`
  - Index: `ivfflat` (cosine) sur `chunks.embedding` avec `lists=100`.
- Dimension: 768 conforme (VECTOR_DIM=768).
- Embeddings provider:
  - `apps/web/src/lib/env.ts`: `EMBEDDING_PROVIDER` par défaut `gemini`; `GEMINI_EMBEDDINGS_MODEL=text-embedding-004`; `VECTOR_DIM=768`.
  - `apps/web/src/lib/vector.ts`: Gemini prioritaire, fallback HF; requêtes SQL: `SELECT text FROM chunks ORDER BY embedding <=> $1::vector LIMIT $2`.
- Ingestion & recherche:
  - Upload RAG: `POST /api/rag/upload` enregistre un fichier sur volume et crée une ligne dans `documents`, puis enqueue `rag_ingest` (Redis). Sanity: rate-limit basique.
  - Recherche RAG: deux voies coexistent:
    1) Recherche vectorielle via `semanticSearch()` (utilisée par génération de bilans LLM).
    2) Route `/api/rag/search` actuelle basée sur un mapping de fichiers (non vectoriel) — à unifier à terme.
- Écart détecté: aucune implémentation Worker active trouvée pour la queue `rag_ingest` (tagging/ingestion de chunks côté worker à ajouter dans l’extension).

## 4) Stockage fichiers (S3/MinIO)
- Variables utilisées: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_FORCE_PATH_STYLE`.
  - Présentes dans `apps/web/src/lib/env.ts` et propagées via `infra/docker-compose.yml`.
  - Client S3 côté web (`apps/web/src/lib/s3.ts`) et côté worker (upload PDF).
- Invariants: pas de renommage des variables S3 ni de buckets.

## 5) Workers & queues BullMQ (existant)
- Queues existantes:
  - `generate_reports`, `generate_reports_fast` dans `apps/worker/src/index.js` (pipeline bilans PDF, React-PDF, S3, OpenAI/Gemini fallback, Prometheus).
- Queues mentionnées côté web sans worker correspondant:
  - `rag_ingest` (à créer côté worker dans l’extension).
- Observabilité: métriques Prometheus optionnelles exposées par worker (histos LLM, render, S3). Sentry initialisé si `SENTRY_DSN`.

## 6) Auth/RBAC & sessions
- Cookie `session` JWT via `apps/web/src/app/api/auth/login/route.ts`; rôles `TEACHER`/`STUDENT`.
- Endpoints bilan protègent selon l’auteur/élève.
- Rate-limiting Redis sur login et upload RAG.

## 7) Tests & qualité
- Unitaires: Jest configuré (`apps/web/jest.config.js` + `jest.int.config.js`). Suites présentes pour UI/lib. `npm run test` côté web enchaîne unitaires + Playwright E2E.
- E2E: Playwright configuré (`apps/web/playwright.config.ts`).
- Lint: script `lint` défini dans `apps/web/package.json` mais dépendance `eslint` non détectée dans `devDependencies` — dette technique (risque CI).
- Prettier/Husky: non détectés (pas de config évidente).

## 8) CI/CD
- Aucune config `.github/workflows/*.yml` détectée dans le repo audité.
- Compose local OK; images base officielles. Pas de pipeline CI public repéré; à créer/compléter pour l’extension (lint/test/build + guards Prisma).

## 9) Sécurité & conformité
- Secrets: gérés via env/compose; pas de secrets en clair dans le code (OK). `.env.example` non trouvé — à fournir (flags sans secrets) dans l’étape 4.
- JWT: `JWT_SECRET` requis (Zod); cookies HTTP-only; pas de CSRF explicite sur nouvelles routes — à prévoir pour POST sensibles si exposés au navigateur.
- Upload: taille/MIME partiellement contrôlés; sanitation basique; à renforcer (limites, antivirus si besoin, quotas).

## 10) Points d’attention (dettes/risques)
- RAG ingestion incomplet: queue `rag_ingest` non consommée par worker → ingestion/chunking/embeddings à implémenter (extension).
- Double filière RAG (mapping fichiers vs. vecteur) à clarifier; conserver la voie vectorielle pour l’extension, sans créer de nouvelle table.
- Lint manquant (eslint non installé) peut faire échouer un job CI lint; ajouter dépendance/config minimale.
- `.env.example` manquant; ajout nécessaire avec flags OFF par défaut.
- Aucune CI trouvée; ajouter pipeline minimal (lint/test/build) + guard Prisma add-only.
- Cohérence des modèles: `Document` mappé, pas de modèle `Chunk` dans Prisma (choix volontaire car `vector` Unsupported) — poursuivre via SQL brut.

## 11) Conformité aux invariants (OK/NOK)
- Embeddings: GEMINI + VECTOR_DIM=768 → OK (config et SQL).
- Réutilisation `documents`/`chunks` → OK (existant); ne pas créer de nouvelle table vector.
- S3: réutilisation des variables actuelles → OK.
- Prisma: extension add-only requise pour l’extension → faisable (modèles nouveaux sans toucher à l’existant).
- RBAC/session: JWT existant → OK; middleware par rôle déjà en place sur endpoints critiques.
- Flags: inexistants aujourd’hui → à ajouter: `FEATURE_CURRICULUM`, `FEATURE_QUIZ`, `FEATURE_RAG`, `FEATURE_ADMIN` (OFF par défaut).

## 12) Recommandations d’exécution (prochaines étapes)
- Étape 2: consolider le CDC avec décisions validées (GEMINI/768; reuse `documents/chunks`; flags; endpoints; RBAC; checklists).
- Étape 3: ajouter modèles Prisma « add-only » (Curriculum/Quiz/Mastery/DocumentNotion) et générer migration (sans toucher à `vector`).
- Étape 4: ajouter `.env.example` + docs quick-start des flags (OFF par défaut).
- Étape 5+: implémenter workers `ingest-doc` (chunking + embeddings GEMINI 768), `execute-tests`, `grade-submission`.

