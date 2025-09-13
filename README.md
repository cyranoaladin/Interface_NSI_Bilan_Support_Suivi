# Bilan Pédagogique NSI - PMF

Auteur : Alaeddine BEN RHOUMA
[![CI](https://github.com/cyranoaladin/Interface_NSI_Bilan_Support_Suivi/actions/workflows/ci.yml/badge.svg)](https://github.com/cyranoaladin/Interface_NSI_Bilan_Support_Suivi/actions/workflows/ci.yml)

Outil complet de bilan pédagogique pour élèves de Terminale NSI: questionnaire d'entrée, scoring, pré-analyse IA des réponses libres, génération de bilans (élève et enseignant) via LLM + RAG, compilation LaTeX/PDF, stockage S3 et envoi par e-mail.

## Table des Matières

- Architecture Générale
- Structure et Arborescence du Projet
- Infrastructure Docker Compose
- Base de Données
- Dépendances et Installation Locale
- Workflows et Logique Métier
- Philosophie et Décisions d'Architecture
- API et Routage
- Rôles, Permissions et Dashboards
- Observabilité et Monitoring
- Runbook Gestion des Alertes
- Sécurité & Conformité
- Robustesse & Exploitation (Production)
- CI/CD et Qualité du Code
- Sauvegarde et Restauration
- Déploiement en Production (VPS)

## Architecture Générale

- **Frontend (apps/web - Next.js 14 App Router)**: Affiche le questionnaire, collecte les réponses, expose des routes API pour authentification, scoring, génération RAG et déclenchement des bilans.
- **Backend**:
  - **Routes API Next.js** pour la logique synchrone (auth, enregistrement réponses, déclenchement de jobs).
  - **Worker autonome (apps/worker)** utilisant BullMQ/Redis pour exécuter le pipeline de génération (pré-analyse IA, RAG, prompts finaux, LaTeX/PDF, S3, e-mail).
- **Base de Données**: PostgreSQL (pgvector pour RAG), gérée via **Prisma**.
- **Cache & Jobs**: **Redis** + **BullMQ** pour file d'attente `generate_reports` et `rag_ingest`.
- **Services Externes**:
  - **OpenAI API** (gpt-4o, gpt-4o-mini) pour pré-analyse et génération des textes des bilans.
  - **Gemini Embeddings** (`text-embedding-004`, 768 dims) pour l’indexation RAG (fallback HuggingFace all-MiniLM-L6-v2).
  - **MinIO (S3)** pour stocker les PDF générés.
  - **SMTP (Nodemailer)** pour envoyer les bilans.

### Schéma d'architecture

```mermaid
flowchart LR
    user[Utilisateur (Élève/Enseignant)]
    web[Next.js App (apps/web)]
    api[API Next.js (App Router)]
    pgbouncer[PgBouncer]
    pg[(PostgreSQL + pgvector)]
    redis[(Redis)]
    bullmq[Files BullMQ]
    worker[Worker (apps/worker)]
    s3[(MinIO / S3)]
    openai[OpenAI]
    gemini[Gemini]
    prom[Prometheus]
    alertm[Alertmanager]
    graf[Grafana]
    smtp[SMTP]

    user -->|HTTP(S)| web
    web --> api
    api -->|SQL via| pgbouncer --> pg
    api <-->|Jobs| bullmq
    bullmq <-->|Broker| redis
    worker <-->|Jobs| bullmq
    worker -->|PDF| s3
    api -->|Upload RAG| s3
    api -->|LLM calls| openai
    api -->|LLM/RAG| gemini
    worker -->|LLM calls| openai
    worker -->|LLM/RAG| gemini

    prom -->|scrape /api/metrics| web
    prom --> alertm
    graf -->|query| prom
    alertm -->|mail| smtp
```

[Voir le diagramme en PNG](docs/images/architecture.png) si le rendu ci-dessus ne s'affiche pas.

## Structure et Arborescence du Projet

```text

/  (monorepo)
├─ apps/
│  ├─ web/                 # Application Next.js
│  │  ├─ app/              # App Router: pages UI & routes API
│  │  │  ├─ api/
│  │  │  │  ├─ auth/...    # login, magic link, callback, change-password
│  │  │  │  ├─ bilan/      # endpoints bilan (create, submit, generate text/pdf/email)
│  │  │  │  └─ rag/upload  # upload documents pour RAG
│  │  │  └─ ...
│  │  ├─ lib/
│  │  │  ├─ env.ts         # validation Zod des variables d'env
│  │  │  ├─ vector.ts      # semanticSearch + embeddings provider (Gemini/HF)
│  │  │  ├─ scoring/...    # nsi_qcm_scorer, pedago_nsi_indices
│  │  │  ├─ session.ts     # JWT session helpers
│  │  │  └─ ...
│  │  └─ ...
│  └─ worker/
│     └─ src/index.js      # Worker BullMQ: pipeline génération bilans & RAG
├─ data/
│  ├─ questionnaire_nsi_terminale.final.json   # Source de vérité du questionnaire + reporting.inputs + pre_analysis
│  └─ ...
├─ infra/
│  └─ docker-compose.yml    # Services: postgres (pgvector), redis, minio, web, worker
├─ prisma/
│  ├─ schema.prisma         # Schéma Prisma
│  └─ migrations/...        # Migrations SQL (documents/chunks vector etc.)
├─ scripts/
│  ├─ clean_all_csv.py                       # Standardisation CSV élèves (Première/Terminale)
│  ├─ clean_premiere_csv.py                  # Ancien nettoyage Première (conservé si utile)
│  ├─ clear_students.ts                      # Vidage élèves et liens
│  ├─ count_entities.ts                      # Compter Students/Teachers/Groups
│  ├─ create_test_student.ts                 # Créer un élève de test
│  ├─ create_test_students_per_group.ts      # Créer un élève test par groupe
│  ├─ fix_students_csv.js                    # Corrections CSV élèves
│  ├─ fix_teachers.ts                        # Corrections comptes enseignants
│  ├─ get_latest_teacher_report_id.ts        # Récupérer dernier report enseignant
│  ├─ ingest_rag.ts                          # Ingestion RAG (PDF → chunks + embeddings)
│  ├─ push_job_generate_reports.ts           # Lancer un job de génération
│  ├─ render_pdf_to_png.ts                   # Rendu PDF → PNG
│  ├─ render_pdf_via_http.ts                 # Rendu PDF via HTTP
│  ├─ reset_test_student_password.ts         # Reset mot de passe élève test
│  ├─ run_full_test_scenario.ts              # Scénario E2E complet scripté
│  ├─ sanitize_json_strings.js               # Sanitation JSON pour LaTeX/rapports
│  ├─ seed_production_data.ts                # Peuplement complet (groupes, enseignants, élèves)
│  ├─ seed_users_from_csv.ts                 # Peuplement utilisateurs depuis CSV
│  ├─ test_reporting_pipeline.ts             # Test pré‑analyse + payload final
│  └─ validate_groups_and_counts.ts          # Validation des effectifs/associations
├─ README.md
└─ ...

```

### Fichiers clés

- `data/questionnaire_nsi_terminale.final.json`
  - Définit les stages du questionnaire (volet connaissances, objectifs, profil pédagogique).
  - Contient la section `reporting`:
    - `pre_analysis`: étapes d’appel LLM (gpt-4o-mini) pour synthétiser les réponses libres → `pre_analysis.summary`.
    - `inputs`: schéma de payload final injecté dans les prompts finaux (student, context, scores_connaissances, indices_pedago, tags, risk_flags, answers_profile_raw, text_summary).
    - `rag.sources`: liste des documents à ingérer/consommer pour RAG.
    - `latex_templates`: templates LaTeX pour versions élève/enseignant.
    - `prompts.system_eleve` / `prompts.system_enseignant`.

## Infrastructure Docker Compose

La stack Docker (répertoire `infra/`) inclut:

- `postgres` (pgvector): base de données principale PostgreSQL (extension `pgvector` pour RAG).
- `pgbouncer`: pooler de connexions. En production, les services applicatifs pointent vers `pgbouncer:5432`. En développement/test (mode trust), la variable `DATABASE_URL` peut être simplifiée:

  ```bash
  # Développement/test via PgBouncer (mode trust)
  DATABASE_URL=postgresql://nsi@pgbouncer:5432/nsi
  ```

  Objectif: lisser les pics de connexions et améliorer la stabilité.

- `redis`: broker BullMQ (jobs asynchrones) et rate limiting.
- `minio`: stockage objet S3 des PDF générés.
- `web`: application Next.js (App Router) exposée sur `3000`.
- `worker`: exécute les jobs BullMQ (`generate_reports`, `rag_ingest`).
- `prometheus`: collecte les métriques depuis `web` (scrape `http://web:3000/api/metrics`).
- `grafana`: visualisation des métriques (dashboards pré‑provisionnés). Accès: `http://localhost:3001` (admin/admin en local).
- `alertmanager`: gestionnaire d’alertes (chaîne: Prometheus → Alertmanager → E‑mail SMTP).

Notes:

- Le fichier `infra/prometheus/prometheus.yml` pointe vers `/api/metrics` de `web`.
- Les règles d’alertes sont dans `infra/prometheus/rules.yml`.
- La configuration Alertmanager est dans `infra/alertmanager/config.yml` (récepteur e‑mail + webhook de log).

## Base de Données

### Schéma Prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Student {
  email                  String   @id
  givenName              String
  familyName             String
  classe                 String
  specialites            String
  active                 Boolean  @default(true)
  passwordHash           String
  passwordChangeRequired Boolean  @default(true)

  attempts    Attempt[]
  profileData StudentProfileData?
  groupId     String?
  group       Group?   @relation(fields: [groupId], references: [id])
  bilans      Bilan[]
}

model Attempt {
  id            String    @id @default(cuid())
  isActive      Boolean   @default(true)
  studentEmail  String
  student       Student   @relation(fields: [studentEmail], references: [email])
  questionnaire String
  startedAt     DateTime  @default(now())
  submittedAt   DateTime?
  status        String    @default("in_progress")
  scores        Score[]
  tags          Tag[]
  reports       Report[]
  groupId       String?
  group         Group?    @relation(fields: [groupId], references: [id])

  @@index([studentEmail])
}

model Score {
  id        String  @id @default(cuid())
  attemptId String
  attempt   Attempt @relation(fields: [attemptId], references: [id])
  domain    String
  pct       Float
  raw       Float
  weight    Float

  @@index([attemptId])
}

model Tag {
  id        String  @id @default(cuid())
  attemptId String
  attempt   Attempt @relation(fields: [attemptId], references: [id])
  code      String

  @@index([attemptId])
}

model Report {
  id          String    @id @default(cuid())
  attemptId   String
  attempt     Attempt   @relation(fields: [attemptId], references: [id])
  type        String // 'eleve' | 'enseignant'
  json        Json
  pdfUrl      String?
  publishedAt DateTime?

  @@index([attemptId])
}

model Teacher {
  email                  String   @id
  firstName              String
  lastName               String
  passwordHash           String
  passwordChangeRequired Boolean  @default(true)
  groups                 TeacherOnGroup[]
}

model Group {
  id           String           @id @default(cuid())
  name         String           @unique
  code         String           @unique
  academicYear String
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  students     Student[]
  attempts     Attempt[]
  teachers     TeacherOnGroup[]

  @@index([academicYear])
}

model TeacherOnGroup {
  teacherEmail String
  groupId      String
  role         String   @default("teacher")
  teacher      Teacher  @relation(fields: [teacherEmail], references: [email])
  group        Group    @relation(fields: [groupId], references: [id])

  @@id([teacherEmail, groupId])
  @@index([groupId])
}

model Bilan {
  id               String   @id @default(cuid())
  authorEmail      String
  authorRole       String // 'teacher' | 'student'
  studentEmail     String?
  student          Student? @relation(fields: [studentEmail], references: [email])
  matiere          String?
  niveau           String?
  qcmRawAnswers    Json?
  pedagoRawAnswers Json?
  qcmScores        Json?
  pedagoProfile    Json?
  preAnalyzedData  Json?
  reportText       String?
  summaryText      String?
  generatedAt      DateTime?
  status           String   @default("PENDING")
  variant          String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([authorEmail])
  @@index([studentEmail])
}

model StudentProfileData {
  id               String   @id @default(cuid())
  studentEmail     String   @unique
  student          Student  @relation(fields: [studentEmail], references: [email])
  pedagoRawAnswers Json?
  pedagoProfile    Json?
  preAnalyzedData  Json?
  lastUpdatedAt    DateTime @default(now())
}
```

### Relations

- `Student` 1—n `Attempt` (un élève peut avoir plusieurs tentatives).
- `Attempt` 1—n `Report` (généralement 2: élève/enseignant).
- `Attempt` 1—n `Score`, `Tag`.
- `Bilan` associe un `User` (créateur/contexte) et éventuellement un `Student`.
- `StudentProfileData` stocke des agrégats durables par élève.

### Migrations

- Créer/mettre à jour le client Prisma:

```bash
npx prisma generate
```

- Appliquer les migrations (développement):

```bash
npx prisma migrate dev
```

- Synchroniser le schéma sans migration (environnement local):

```bash
npx prisma db push
```

### Peuplement des Données (Seeding)

Le peuplement de la base de données (création des groupes, des enseignants, importation des élèves et création des comptes de test) est géré par un **script unique et intelligent** pour garantir la cohérence des données.

- **Script :** `scripts/seed_production_data.ts`
- **Commande d'exécution (via Docker) :**

    ```bash
    docker compose -f infra/docker-compose.yml exec -T web npx ts-node -P tsconfig.scripts.json /app/scripts/seed_production_data.ts
    ```

- **Raccourci `package.json` :** Un script `npm` a été ajouté pour simplifier cet appel.

    ```bash
    npm run seed:production
    ```

## Dépendances et Installation Locale

### Prérequis

- Node.js 18+
- Docker + Docker Compose (PostgreSQL, Redis, MinIO)
- npm (ou pnpm)

### Installation

```bash
git clone <repo>
cd <repo>
npm install
```

Créer `.env.local` à la racine (exemple):

```env
APP_BASE_URL=https://nsi.labomaths.tn

DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/DB
REDIS_URL=redis://127.0.0.1:6379

EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy... # clé Gemini
GEMINI_EMBEDDINGS_MODEL=text-embedding-004
VECTOR_DIM=768
HF_TOKEN=hf_... # fallback HuggingFace (optionnel)

OPENAI_API_KEY=sk-...

S3_ENDPOINT=http://127.0.0.1:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=reports
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=labo.maths@ert.tn
SMTP_PASS=********
SMTP_FROM=NSI <labo.maths@ert.tn>
MAGIC_LINK_FROM=labo.maths@ert.tn
JWT_SECRET=change-me-long

# Observabilité / Alertes
SENTRY_DSN=... # requis pour Sentry web/worker
ALERTS_TO=alerts@example.com # destinataire des alertes Alertmanager
```

Important: `DATABASE_URL` doit pointer vers l’instance PostgreSQL locale accessible (ex: `127.0.0.1` ou `localhost`) lorsqu’on exécute hors Docker. En Docker Compose, utilisez idéalement `pgbouncer:5432` (mode trust en dev) ou `postgres:5432` avec mot de passe selon le contexte.

Lancer l’infrastructure Docker:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Appliquer le schéma DB:

```bash
npx prisma db push
```

Démarrer en développement:

```bash
npm run dev -w nsi-web
```

## Philosophie et Décisions d'Architecture

- Monorepo: un seul dépôt pour `apps/web` et `apps/worker` afin de partager facilement le code (types Prisma, logique de scoring, utils) et de simplifier les workflows CI/CD et la gestion des versions.
- BullMQ/Redis: séparation des tâches longues et faillibles (génération IA, LaTeX, S3) dans un worker dédié pour préserver la réactivité de l’UI et permettre le retry/scaling horizontal indépendant du web.
- PgBouncer: point d’entrée DB unique pour lisser les pics de connexions, éviter l’épuisement `max_connections` PostgreSQL et améliorer la stabilité sous charge.
- RAG (Retrieval‑Augmented Generation): ancrer les réponses IA dans les référentiels NSI (programmes officiels, référentiels compétences) pour augmenter la pertinence, la traçabilité et la valeur pédagogique des bilans.

## Workflows et Logique Métier

### Workflow 1 : Parcours Élève

#### 1. Arrivée et Authentification

- Connexion par e‑mail/mot de passe:
  - L’API tente d’abord une correspondance dans `Teacher.email`; si trouvé, compare le mot de passe via `bcrypt.compare`.
  - Sinon, cherche dans `Student.email` et compare le mot de passe.
  - En cas de succès, un JWT est émis (alg HS256) et stocké en cookie HTTP‑Only; le payload inclut le rôle `TEACHER` ou `STUDENT` pour gérer les permissions et les redirections frontend.

#### 2. Remplissage du Questionnaire

- Le questionnaire est défini dans `data/questionnaire_nsi_terminale.final.json`.
- Le frontend récupère la structure, affiche les volets, valide côté client, soumet les réponses.

#### 3. Soumission et Création du Job

- À la soumission, les réponses QCM et profil sont sauvegardées (API bilan). Les scores sont calculés (QCM + indices). Un job BullMQ `generate_reports` est ajouté dans Redis.

### Workflow 2 : Pipeline de Génération des Bilans (Worker)

#### 1. Prise en charge du Job

- `apps/worker/src/index.js` (BullMQ `Worker`) récupère `attemptId` et charge l’élève, les scores, etc.

#### 2. Scoring

- QCM: `apps/web/src/lib/scoring/nsi_qcm_scorer.ts`
- Indices pédagogiques: `apps/web/src/lib/scoring/pedago_nsi_indices.ts`

#### 3. Pré-analyse IA (Textes Libres)

- Définie dans `reporting.pre_analysis` (JSON). Chaque étape `llm_request` envoie un payload `{inputs: {...}}` au modèle `gpt-4o-mini`.
- Prompt type (extrait):

```json
{
  "id": "summarize_free_text",
  "model": "gpt-4o-mini",
  "inputs": {
    "projets": "{{answers.projets_post_bac.value}}",
    "attentes_resultats": "{{answers.attentes_resultats_nsi.value}}",
    "attentes_enseignement": "{{answers.attentes_enseignement_nsi.value}}",
    "craintes": "{{answers.craintes_anticipees_nsi.value}}",
    "methode_efficace": "{{answers.methode_efficace_nsi.value}}",
    "auto_evaluation": "{{answers.auto_evaluation_depart.value}}"
  },
  "output_variable": "pre_analysis.summary"
}
```

- Sortie attendue (JSON): `text_summary` (nous le référençons via `{{pre_analysis.summary}}`), ex: `{ "synthese_projet": "...", "forces_percues": ["..."], ... }`.

#### 4. Génération des Bilans IA (RAG)

- **Embedding & Ingestion**:
  - Documents: `programme_nsi_premiere.pdf`, `programme_nsi_terminale.pdf`, `vademecum-snt-nsi_0.pdf`, `rcp_referentiel_competences_prog.pdf`.
  - Script: `scripts/ingest_rag.ts` → extraction texte (pdf-parse/mammoth/ocr), chunking, embeddings (Gemini 768 ou HF), insertion `documents/chunks` (pgvector).

- **Recherche sémantique**:
  - `apps/web/src/lib/vector.ts` exporte `semanticSearch` qui embed la requête (Gemini/HF) et interroge `chunks` par distance vectorielle.

- **Construction du Payload Final**:
  - Le worker charge `data/questionnaire_nsi_terminale.final.json` et construit `payload = reporting.inputs` via un templating résolvant `{{...}}` (valeurs brutes si placeholder seul).
  - Contenu type:

```json
{
  "student": {"given_name":"Alice","family_name":"Durand","id":"stu_demo_1"},
  "context": {"classe":"TNSI-1"},
  "scores_connaissances": {"python":0.62, ...},
  "indices_pedago": "{{scoring.sections.volet_pedagogique_specifique_nsi.indices}}",
  "tags": "{{scoring.tags}}",
  "risk_flags": "{{scoring.risk_flags}}",
  "answers_profile_raw": "{{answers.volet_pedagogique_specifique_nsi}}",
  "text_summary": {{pre_analysis.summary}}
}
```

- **Appel gpt-4o**:
  - Deux prompts systèmes: `reporting.prompts.system_eleve` et `...system_enseignant`.
  - Le `payload` + extraits RAG sont passés en `user` (JSON); réponse forcée en JSON → champs utilisés ensuite pour LaTeX.

#### 5. Compilation LaTeX

- Templates: `reporting.latex_templates`
- Compilation via `latexmk` (docker worker installe texlive) → PDF(s).
- Tolérance erreurs: si compilation/MinIO indisponible, logs et poursuite des étapes suivantes.

#### 6. Stockage & E-mail

- Upload S3 (MinIO) si configuré (`S3_*`).
- Insertion `Report` en DB (json + pdfUrl si disponible).
- Envoi e-mail vers élève + copie enseignants (optionnel, géré via env SMTP_*).

### Robustesse & Exploitation (Production)

- **Jobs qui échouent (BullMQ)**
  - Lors de la création du job (`scripts/push_job_generate_reports.ts/js`), on utilise `removeOnComplete: true` et `removeOnFail: false`, ce qui conserve les jobs en échec dans Redis pour analyse et relance.
  - Le worker enveloppe les étapes sensibles dans des `try/catch` (pré‑analyse LLM, OpenAI final, LaTeX, S3, SMTP). Les erreurs sont loguées (console.warn/console.error) et le pipeline poursuit quand c’est acceptable (ex: si LaTeX/S3 échoue, on stocke tout de même les JSON d’analyse et on envoie un e‑mail simple sans pièces jointes).
  - Recommandation (prod): configurer `attempts` et `backoff` côté `Queue.add` (ex: `attempts: 3, backoff: { type: 'exponential', delay: 10000 }`) pour les erreurs réseau transitoires (OpenAI, S3, SMTP).
  - Relance manuelle: via un script d’admin (ou UI Bull, si déployée) en rejouant le job avec le même `attemptId`.

- **Validation du JSON retourné par l’IA**
  - Les appels OpenAI incluent `response_format: { type: 'json_object' }` pour contraindre la sortie au JSON.
  - Le worker parse via `openaiJSON(...)` avec `try/catch`; en cas d’échec, il renvoie `{}` (défauts sûrs) et le pipeline continue (aucun crash).
  - Validation stricte (recommandée prod) via Zod (exemple):

    ```ts
    import { z } from 'zod';
    const EleveSchema = z.object({
      strengths_eleve: z.string().default(''),
      remediations_eleve: z.string().default(''),
      methodes_conseils: z.string().default(''),
      objectifs_eleve: z.string().default(''),
      ressources: z.string().default('')
    });
    const EnsSchema = z.object({
      gestes_commentaires: z.string().default(''),
      alertes_recos: z.string().default(''),
      plan_4_semaines: z.string().default('')
    });
    // Après parse OpenAI:
    const safeEleve = EleveSchema.safeParse(analysisEleve).success ? EleveSchema.parse(analysisEleve) : EleveSchema.parse({});
    ```

  - Avant templating LaTeX, on applique systématiquement des valeurs par défaut (`|| ''`) pour éviter toute chaîne `undefined`.
  - Option: si la validation échoue, renvoyer une requête de correction à l’IA avec un prompt très contraint (mode dégradé).

- **Gestion des erreurs de compilation LaTeX**
  - La compilation est encapsulée (try/catch). En cas d’erreur (`latexmk`), on logue l’erreur et on continue (création des `Report` sans PDF, e‑mails sans PJ) pour ne pas bloquer la file.
  - Spécialement pour les caractères LaTeX, une fonction de sanitation est recommandée:

    ```ts
    function sanitizeLatex(input: string): string {
      const map: Record<string,string> = {
        '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '#': '\\#', '$': '\\$',
        '%': '\\%', '&': '\\&', '_': '\\_', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}'
      };
      return (input || '').replace(/[\\{}#$%&_~^]/g, (m) => map[m]);
    }
    // Appliquer avant d’injecter dans LaTeX
    const safeTex = sanitizeLatex(textFromLLM);
    ```

  - `latexmk -halt-on-error -interaction=nonstopmode` est utilisé; en cas d’échec, les logs `.log` peuvent être persistés et consultés.
  - Recommandation (prod): monter un dossier de travail persistant pour collecter les `.log` LaTeX et déclencher une alerte (mail/Slack) si le taux d’erreur dépasse un seuil.
  - Si MinIO/S3 est indisponible, l’upload est ignoré avec avertissement; l’URL PDF est laissée vide. Le `Report.json` reste disponible en base.

### Emplacement des PDF sur le serveur

- Par défaut, les PDF sont compilés dans un répertoire temporaire (`/tmp/nsi-XXXX`) puis uploadés vers **MinIO/S3** (clé objet):
  - `s3://reports/reports/{studentId}/{attemptId}/eleve.pdf`
  - `s3://reports/reports/{studentId}/{attemptId}/enseignant.pdf`
- En Docker Compose, le service `minio` écrit dans un volume nommé `minio`. Physiquement (Docker volumes):
  - `/var/lib/docker/volumes/<stack>_minio/_data` (selon votre environnement).
  - Recommandé: fixer un bind-mount explicite dans `docker-compose.override.yml`:

    ```yaml
    services:
      minio:
        volumes:
          - /var/nsi/minio-data:/data
    ```

    Les PDF seront alors visibles sous `/var/nsi/minio-data/reports/...` sur le serveur.
- Sans S3, vous pouvez persister localement en copiant les PDF compilés vers un dossier (ex: `/var/nsi/reports`) et en stockant le chemin dans `Report.pdfUrl` (schéma déjà compatible).

## API et Routage

### Routage Frontend (pages principales)

- `app/bilan/initier/page.tsx`: démarrer un nouveau bilan
- `app/bilan/[bilanId]/questionnaire/page.tsx`: questionnaire (volets)
- `app/bilan/[bilanId]/resultats/page.tsx`: résultats et déclenchement génération

### Endpoints API (exemples)

- `POST /api/bilan/create` → crée un `Bilan`/`Attempt` (selon usage)
- `POST /api/bilan/[bilanId]/submit-answers` → sauvegarde réponses, calcule scores, met à jour `Bilan`
- `POST /api/bilan/generate-report-text` → génère texte enseignant (RAG + LLM) côté web
- `POST /api/bilan/generate-summary-text` → génère texte élève (RAG + LLM) côté web
- `GET  /api/bilan/pdf/[bilanId]?variant=eleve|enseignant` → PDF LaTeX
- `POST /api/bilan/email/[bilanId]` → envoi e-mails
- `POST /api/rag/upload` → upload documents pour ingestion RAG
- `POST /api/auth/login`, `POST /api/auth/magic-link`, `GET /api/auth/callback`, ...

## Rôles, Permissions et Dashboards

- **Rôles**: `ELEVE`, `ENSEIGNANT` (stockés via `User.role`).
- **Permissions**:
  - Élève: accès uniquement à ses bilans et rapports.
  - Enseignant: accès aux bilans/rapports des élèves (potentiellement de sa classe/établissement).
- **Dashboard Élève**: aperçu scores, liens PDF, prochaines étapes.
- **Dashboard Enseignant**: liste élèves, filtres classe, indicateurs (scores moyens, tags de risque), accès bilans individuels.

## Observabilité et Monitoring

### Suivi des erreurs (Sentry)

- Intégration Sentry pour capture proactive des erreurs:
  - Web: `@sentry/nextjs` (fichiers `sentry.client.config.ts`, `sentry.server.config.ts`).
  - Worker: `@sentry/node` (init au démarrage du worker; capture des exceptions de jobs `generate_reports` et `rag_ingest`).
- Variable requise: `SENTRY_DSN`.

### Métriques (Prometheus)

- Endpoint d’exposition: `GET /api/metrics` (service `web`).
- Métriques personnalisées exposées:
  - `llm_api_latency_seconds` (Histogram) avec label `provider` — latence des appels LLM (Gemini, OpenAI).
  - `bullmq_jobs{queue,status}` (Gauges) — état des files BullMQ (`generate_reports`, `rag_ingest`).
  - Métriques Node par défaut (CPU, RSS, event loop lag, etc.).
- Prometheus scrape `http://web:3000/api/metrics` toutes les 15s (`infra/prometheus/prometheus.yml`).

### Visualisation (Grafana)

- Accès local: `http://localhost:3001` (admin/admin).
- Dashboards pré‑provisionnés (`infra/grafana/provisioning/dashboards`):
  - `NSI Observability`: santé applicative (LLM p95, BullMQ waiting/active/failed, RSS).
  - `NSI Runtime`: santé runtime (CPU user/system, event loop lag p95).

### Alerting (Alertmanager)

- Règles d’alertes: `infra/prometheus/rules.yml`.
- Alertes pré‑configurées:
  - `HighLLMLatencyP95` — p95 latence LLM > 5s.
  - `BullMQJobsFailed` — au moins un job en échec.
  - `BullMQWaitingHigh` — trop de jobs en attente (> 25 sur 5 minutes).
  - `WebDown` — application web non joignable (inclut cas `absent(up{job="web"})`).
- Notifications E‑mail (Alertmanager):
  - Configurées via `infra/alertmanager/config.yml`.
  - Variables d’environnement utilisées: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ALERTS_TO`.
  - Chaîne: Prometheus (alerte firing) → Alertmanager → SMTP (e‑mail) + webhook de log.

## Sécurité & Conformité

- Authentification: sessions JWT (HTTP‑Only cookies), rôles `TEACHER`/`STUDENT` avec contrôle fin en API (`getSession` / `getSessionEmail`).
- Mots de passe: hachage `argon2` ou `bcrypt` (selon scripts).
- Données personnelles: e‑mails, noms, scores; limiter l’accès aux endpoints selon le rôle et minimiser les logs sensibles.
- Secrets: `.env` en prod géré via vault/secrets manager, jamais commité.
- Téléversement fichiers (RAG):
  - Validation MIME de base, écriture dans volume `/data/rag_uploads` (droits UID/GID app), insertion DB `documents`, job `rag_ingest`.
  - Fichiers pris en charge: pdf, docx, txt, md, images (OCR), doc (via conversion LibreOffice).
- Limitation de débit (anti‑brute force):
  - `POST /api/auth/login`: rate limiting Redis (par IP) — 10 tentatives / 60s.
  - `POST /api/auth/magic-link`: rate limiting Redis (par e‑mail) — 5 tentatives / 300s.

## Checklist d’Audit

- Données:
  - Cohérence `Group`/`Student`/`Teacher` et académique `academicYear`.
  - Comptes tests présents et actifs.
- API:
  - Auth: login/logout, reset password.
  - Bilan: create → submit-answers → status GENERATED → PDFs accessibles.
  - RAG: upload → documents/chunks non nuls.
- LLM & RAG:
  - Clés actives (OpenAI/Gemini), latence acceptable, retry functional.
  - Extraits RAG présents dans les réponses (champ `rag_references`).
- PDFs:
  - Contenu lisible, sections remplies, erreurs LaTeX absentes, stockage S3 confirmé.
- Observabilité:
  - Logs exempts d’erreurs récurrentes; queues vides en régime nominal.

## CI/CD et Qualité du Code

- Intégration Continue (GitHub Actions) — `.github/workflows/ci.yml`:
  - Exécuté sur `push`/`pull_request` (`main`).
  - Étapes: installation, ESLint, tests, build Next.js, build images Docker Compose.
- Analyse des dépendances — `.github/dependabot.yml`:
  - Détection automatique de mises à jour npm & docker (hebdomadaire), PRs d’update.

### Tests Unitaires (Jest)

- Couverture: logique de scoring (QCM et indices pédagogiques), validation des permissions des API, validation des payloads Zod (env et entrées), et composants UI de base.
- Commande: `npm test` (Jest au niveau monorepo/workspace).

### Tests de Bout-en-Bout (Playwright)

- Scénarios couverts:
  - Workflow élève complet: login → questionnaire → soumission → génération → téléchargement du PDF.
  - Workflow enseignant: login → consultation d’un bilan existant et de ses PDF.
  - Workflow d’ingestion RAG (enseignant): upload/ingestion de documents et vérifications basiques.
  - Validation pipeline IA/RAG: interception des appels réseau pour vérifier l’injection des extraits RAG dans le prompt final (`rag_extraits`).

Note: la configuration Playwright actuelle (`playwright.config.ts`) est optimisée pour s’exécuter contre un serveur déjà lancé (webServer commenté/désactivé). C’est idéal pour la CI ou un environnement de staging où le service `web` tourne déjà.

**Note sur la Stabilité des Tests E2E :**
Pour garantir des exécutions fiables en CI/CD, plusieurs stratégies ont été implémentées :

- **Désactivation du Rate-Limiter :** Les requêtes de login effectuées par Playwright incluent un en-tête HTTP spécial (`x-test-mode: 'true'`) qui désactive le rate-limiting côté API, évitant ainsi les erreurs `429 Too Many Requests`.
- **Sérialisation des Tests :** La suite de tests est configurée pour s'exécuter avec un nombre limité de workers (ex: `workers: 1`) afin d'éviter de surcharger la base de données et PgBouncer avec des rafales de requêtes simultanées.
- **Attentes Explicites :** Les tests utilisent des mécanismes d'attente robustes (`waitForResponse`, `waitForURL`) pour gérer l'asynchronisme de l'application, plutôt que des délais fixes.

- Tests de charge (k6):
  - Script: `tests/load/k6_scenario.js`.
  - Exemple exécution locale:

    ```bash
    k6 run -e BASE_URL=http://localhost:3000 -e EMAIL=user@example.com -e PASS=password123 tests/load/k6_scenario.js
    ```

  - Intégration CI (exemple) — créer `.github/workflows/load-test.yml` si souhaité:

    ```yaml
    name: Load Test
    on: workflow_dispatch
    jobs:
      k6:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: grafana/setup-k6-action@v1
          - run: k6 run tests/load/k6_scenario.js
            env:
              BASE_URL: http://localhost:3000
              EMAIL: ${{ secrets.K6_EMAIL }}
              PASS: ${{ secrets.K6_PASS }}
    ```

## Sauvegarde et Restauration

Scripts fournis (répertoire `scripts/`):

- `backup_postgres.sh` — sauvegarde PostgreSQL (pg_dump):

  ```bash
  POSTGRES_PASSWORD=... ./scripts/backup_postgres.sh ./backups/postgres
  ```

- `restore_postgres.sh` — restauration PostgreSQL:

  ```bash
  POSTGRES_PASSWORD=... ./scripts/restore_postgres.sh ./backups/postgres/nsi-YYYYMMDD_HHMMSS.sql
  ```

- `backup_minio.sh` — sauvegarde MinIO/S3 via `mc`:

  ```bash
  S3_ENDPOINT=http://localhost:9000 S3_ACCESS_KEY=minioadmin S3_SECRET_KEY=minioadmin S3_BUCKET=reports \
  ./scripts/backup_minio.sh ./backups/minio
  ```

## Déploiement en Production (VPS)

### Check-list

1. **Variables d’Environnement**: configurer `.env` production (voir section Installation) + secrets (OpenAI, Gemini, SMTP, JWT, S3, DB, Redis).
1. **Build & Static**:

```bash
npm run build -w nsi-web
```

1. **Base de Données**:

```bash
npx prisma migrate deploy
```

1. **Lancement**:

```bash
npm start -w nsi-web
```

1. **Worker**: démarrage permanent (ex: pm2/systemd)

```bash
pm2 start apps/worker/src/index.js --name nsi-worker
```

1. **RAG**: ingestion des PDF sources

```bash
HF_TOKEN=... DATABASE_URL=... npx ts-node -P tsconfig.scripts.json scripts/ingest_rag.ts
```

### Opérations utiles

-- Seeding unifié (remplace import_students/seed_teachers):

```bash
npm run seed:production
```

- Lancer un job reporting:

```bash
npx ts-node -P tsconfig.scripts.json scripts/push_job_generate_reports.ts --email=eleve@ert.tn
```

- Test pipeline hors-ligne (pré-analyse + payload):

```bash
npx esbuild scripts/test_reporting_pipeline.ts --bundle --platform=node --format=cjs --outfile=scripts/test_reporting_pipeline.cjs
node scripts/test_reporting_pipeline.cjs
```

### Exemple complet pm2 (ecosystem.config.js)

```js
module.exports = {
  apps: [
    {
      name: 'nsi-web',
      cwd: './apps/web',
      script: './node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        APP_BASE_URL: process.env.APP_BASE_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || 'gemini',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_EMBEDDINGS_MODEL: process.env.GEMINI_EMBEDDINGS_MODEL || 'text-embedding-004',
        VECTOR_DIM: process.env.VECTOR_DIM || '768',
        HF_TOKEN: process.env.HF_TOKEN || '',
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
        S3_SECRET_KEY: process.env.S3_SECRET_KEY,
        S3_BUCKET: process.env.S3_BUCKET || 'reports',
        S3_REGION: process.env.S3_REGION || 'us-east-1',
        S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE || 'true',
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT || '587',
        SMTP_SECURE: process.env.SMTP_SECURE || 'false',
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        SMTP_FROM: process.env.SMTP_FROM
      }
    },
    {
      name: 'nsi-worker',
      cwd: '.',
      script: 'apps/worker/src/index.js',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || 'gemini',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_EMBEDDINGS_MODEL: process.env.GEMINI_EMBEDDINGS_MODEL || 'text-embedding-004',
        VECTOR_DIM: process.env.VECTOR_DIM || '768',
        HF_TOKEN: process.env.HF_TOKEN || '',
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
        S3_SECRET_KEY: process.env.S3_SECRET_KEY,
        S3_BUCKET: process.env.S3_BUCKET || 'reports',
        S3_REGION: process.env.S3_REGION || 'us-east-1',
        S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE || 'true',
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT || '587',
        SMTP_SECURE: process.env.SMTP_SECURE || 'false',
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        SMTP_FROM: process.env.SMTP_FROM
      }
    }
  ]
};
```

Lancement:

```bash
pm2 start ecosystem.config.js
pm2 status
pm2 save
pm2 startup  # pour persister au reboot
```

### Considérations sur l'Environnement de Production

- **Configuration de PgBouncer** : s’assurer que PgBouncer connaît la base applicative, via un `pgbouncer.ini` monté (service `pgbouncer` dans `infra/`) ou via variables d’environnement de l’image Bitnami (voir `infra/docker-compose.yml`). Les services applicatifs doivent pointer vers `pgbouncer:5432`.
- **Exécution des Scripts de Maintenance** : lancer les scripts (ex: `scripts/ingest_rag.ts`) depuis un conteneur du réseau Docker afin d’accéder aux services (DB, Redis): `docker compose -f infra/docker-compose.yml exec -T web npx ts-node -P tsconfig.scripts.json scripts/ingest_rag.ts`.
- **Persistance des Données** : utiliser des bind mounts pour les données critiques afin de faciliter sauvegardes/supervision:
  - PostgreSQL: monter le répertoire de données (`pgdata`) vers un chemin hôte persistant.
  - MinIO: monter `/data` (ex: `/var/nsi/minio-data:/data`).

## 9. Scripts Utilitaires

Remplacé par `scripts/seed_production_data.ts` (voir plus haut)

- `scripts/push_job_generate_reports.ts` — Lancer un job de génération de bilan pour un élève (debug/dev)

```bash
npx ts-node -P tsconfig.scripts.json scripts/push_job_generate_reports.ts --email=eleve@ert.tn
```

- `scripts/count_entities.ts` — Vérifier le nombre d’entrées `Student`/`Teacher`

```bash
npx ts-node -P tsconfig.scripts.json scripts/count_entities.ts
```

### Notes d’Architecture

- Embeddings par **Gemini** (768 dims) configurables via `EMBEDDING_PROVIDER=gemini` (fallback HF). Le worker et le web normalisent et pad/trim les vecteurs à `VECTOR_DIM`.
- Le pipeline de génération est piloté **exclusivement** par `reporting.pre_analysis` et `reporting.inputs` pour séparer configuration et exécution.
- Les templates LaTeX sont personnalisables par établissement; l’upload S3 et l’e-mail sont facultatifs selon l’environnement.

## Runbook Gestion des Alertes

### Alerte : `HighLLMLatencyP95`

- **Description :** La latence p95 des appels LLM (OpenAI/Gemini) dépasse le seuil (ex: > 5s sur 5 min). Impact: génération des bilans ralentie, UX dégradée, risque de timeouts.
- **Sévérité :** `Warning`
- **Étapes de Diagnostic Immédiates :**
  1. Consulter le dashboard Grafana `NSI Observability` (panneau p95 LLM) et confirmer la période concernée.
  2. Vérifier les logs du service `web` et `worker` pour erreurs réseau/timeouts vers OpenAI/Gemini: `docker compose -f infra/docker-compose.yml logs --since=30m web | cat` et idem pour `worker`.
  3. Vérifier l’état de l’alerte dans Alertmanager (annotations, liens) et la série Prometheus `llm_api_latency_seconds`.
- **Causes Possibles :**
  - L’API LLM externe (OpenAI/Gemini) est lente ou connaît un incident.
  - Surcharge locale (worker saturé, CPU élevé, event loop lag).
  - Problèmes réseau (résolution DNS, débit sortant limité, proxy).
- **Procédure de Résolution :**
  - Vérifier la page de statut du fournisseur (OpenAI/Gemini) et adapter le trafic (réessais, file d’attente).
  - Redémarrer le `worker` si saturation: `docker compose -f infra/docker-compose.yml restart worker`.
  - Ajuster le parallélisme du worker (env `CONCURRENCY`) et/ou backoff plus agressif côté BullMQ.
  - En cas d’indisponibilité LLM prolongée, basculer temporairement sur un provider alternatif si configuré (fallback HF).

### Alerte : `BullMQJobsFailed`

- **Description :** Au moins un job BullMQ est en échec (queue `generate_reports` ou `rag_ingest`). Impact: bilans non générés ou ingestion RAG interrompue.
- **Sévérité :** `Warning`
- **Étapes de Diagnostic Immédiates :**
  1. Consulter Grafana `NSI Observability` (panneaux BullMQ failed) pour identifier la queue affectée et la période.
  2. Inspecter les logs `worker` pour la trace d’erreur du job: `docker compose -f infra/docker-compose.yml logs --since=60m worker | cat`.
  3. Vérifier les annotations de l’alerte dans Alertmanager (jobId si journalisé).
- **Causes Possibles :**
  - Erreur de code (exception non gérée dans une étape: LLM, LaTeX, S3, SMTP).
  - Dépendance externe indisponible (OpenAI, MinIO/S3, SMTP).
  - Données en entrée invalides (payload invalide, schéma Zod refusé).
- **Procédure de Résolution :**
  - Corriger la cause (ex: clé API manquante, panne S3) puis relancer le(s) job(s) en échec via script d’admin ou ré‑enqueue.
  - Ajuster `attempts`/`backoff` côté `Queue.add` si échecs transitoires.
  - Ajouter/renforcer la validation (Zod) et des valeurs par défaut pour éviter des crashs.

### Alerte : `BullMQWaitingHigh`

- **Description :** Trop de jobs en attente dans BullMQ (> seuil sur 5 min). Impact: latence accrue pour les utilisateurs.
- **Sévérité :** `Warning`
- **Étapes de Diagnostic Immédiates :**
  1. Grafana `NSI Observability` → panneaux `waiting`/`active` par queue.
  2. Logs `worker` pour détecter une baisse de débit (erreurs répétées, lenteurs externes).
  3. Vérifier la charge machine (CPU/RAM) du conteneur worker.
- **Causes Possibles :**
  - Afflux massif de demandes (pic d’utilisation).
  - Goulot d’étranglement (LLM lent, S3 lent, LaTeX lourd).
  - Concurrency du worker trop faible.
- **Procédure de Résolution :**
  - Augmenter temporairement la concurrence du worker (env ou scaling horizontal de `worker`).
  - Étaler/planifier les jobs (limiter la création de jobs côté `web`).
  - Optimiser les étapes lentes (cache d’appels, prompts plus courts, etc.).

### Alerte : `WebDown`

- **Description :** Le service `web` ne répond plus (métrique `up` absente ou `http_5xx` persistants). Impact: application indisponible.
- **Sévérité :** `Critical`
- **Étapes de Diagnostic Immédiates :**
  1. Vérifier `NSI Observability` (panneaux `up`/`health`) et tenter un accès direct à `http://<host>:3000/`.
  2. Consulter les logs `web` : `docker compose -f infra/docker-compose.yml logs --since=30m web | cat`.
  3. Vérifier l’état de Postgres/PgBouncer/Redis (services requis) et la santé du conteneur.
- **Causes Possibles :**
  - Crash de l’app (erreur non gérée, build corrompu).
  - Dépendance critique HS (DB, Redis) → erreurs lors du boot.
  - OOM/ressources insuffisantes.
- **Procédure de Résolution :**
  - Redémarrer `web`: `docker compose -f infra/docker-compose.yml restart web`.
  - Si dépendance en cause, restaurer le service concerné (Postgres/Redis) puis redémarrer `web`.
  - Si crash au boot, reconstruire et relancer (`docker compose build web && docker compose up -d web`) après correction.

## Implémentation de l'IA et du RAG

### Stratégie RAG à Double Niveau

- **Niveau 1 (Injection Globale)** : le contenu du guide pédagogique principal (`IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md`) est injecté en totalité dans le `system_prompt` des prompts finaux. Il définit le cadre, la philosophie et les instructions de base que l’IA doit toujours respecter.
- **Niveau 2 (Récupération Ciblée)** : pour chaque bilan, une recherche sémantique est effectuée sur l’ensemble de la base de connaissances (guide + programmes PDF). Les extraits les plus pertinents sont injectés dans le `user_prompt` sous la clé `rag_extraits` pour contextualiser la réponse au profil de l’élève.
- **Conclusion** : cette approche garantit à la fois une vision globale (cadre pédagogique constant) et la précision contextuelle (extraits ciblés) pour le cas traité.

### Anatomie d'un Prompt Final (exemple)

```json
{
  "system": "Tu es un professeur de NSI... (system_enseignant)",
  "user": {
    "eleve": {"prenom": "Alice", "nom": "Durand", "classe": "TNSI-1"},
    "scores": {"python": 0.62, "algo": 0.48, "bdd": 0.70},
    "pre_analyse": {{pre_analysis.summary}},
    "rag_extraits": ["...extrait1...", "...extrait2..."],
    "contexte": {"matiere": "NSI", "niveau": "Terminale"}
  },
  "contraintes": {"format": "JSON strict", "clés": ["synthese_profil","diagnostic_pedagogique","plan_4_semaines","indicateurs_pedago","rag_references"]}
}
```

- Injections:
  - `scores`: issus de `Score` (ou fallback `Bilan.qcmScores.by_domain`).
  - `pre_analyse`: sortie des étapes `reporting.pre_analysis`.
  - `rag_extraits`: top‐k chunks retournés par `semanticSearch`.

### Logique d'Ingestion RAG (`scripts/ingest_rag.ts`)

- Extraction texte: `pdf-parse`/`mammoth`/OCR selon le type.
- Chunking: par défaut taille ~500–1000 tokens avec chevauchement (ex. 100 tokens) pour conserver le contexte.
- Embeddings: Gemini (`text-embedding-004`, `VECTOR_DIM=768`), fallback HF.
- Persistance: table `documents` (métadonnées) et `chunks` (texte + vecteur) via `pgvector`.

## Architecture Frontend

- Gestion d’état: hooks React (`useState`/`useReducer`) et/ou `useContext` pour l’état multi‑étapes du questionnaire; persistance temporaire dans l’URL ou local storage si nécessaire.
- Data fetching: routes API Next.js; usage côté serveur (Server Components) ou client (fetch/SWR) selon la page; polling du statut après `202 Accepted`.
- Composants clés:
  - `<QuestionnaireStep>`: rend un groupe de questions, gère la validation locale.
  - `<ResultsDashboard>`: affiche scores par domaine, liens vers PDF et bilans précédents.
- Routage protégé: App Router + middleware lisant le JWT (rôle `TEACHER`/`STUDENT`); redirection si non autorisé.

## Guide du Développeur

- Déboguer le worker:
  - Lancer en local avec `node --inspect apps/worker/src/index.js` et attacher un debugger (Chrome/VSCode) pour inspecter un job.
- Exécuter les tests localement:
  - Unitaire: `npm test` (Jest). E2E: `npm run e2e` (Playwright) si configuré.
- Créer un utilisateur de test complet:
  - `ts-node -P tsconfig.scripts.json scripts/create_test_student.ts`
  - Se connecter puis remplir un questionnaire; ou pousser un job: `scripts/push_job_generate_reports.ts --email=...`
- Ajouter une nouvelle question au questionnaire:
  - Modifier `data/questionnaire_nsi_terminale.final.json` (clé de question, validations).
  - Si la question influe sur le scoring, adapter `lib/scoring/*` et, si nécessaire, `reporting.inputs` pour référencer la nouvelle donnée.
  - Vérifier la prise en compte côté prompts (si utile) et la validation JSON avant LaTeX.
