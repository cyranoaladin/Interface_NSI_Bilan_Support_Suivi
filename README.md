## Bilan Pédagogique NSI - Nexus Réussite

Outil complet de bilan pédagogique pour élèves de Terminale NSI: questionnaire d'entrée, scoring, pré-analyse IA des réponses libres, génération de bilans (élève et enseignant) via LLM + RAG, compilation LaTeX/PDF, stockage S3 et envoi par e-mail.

## Table des Matières

- [Architecture Générale](#architecture-générale)
- [Structure et Arborescence du Projet](#structure-et-arborescence-du-projet)
- [Base de Données](#base-de-données)
- [Dépendances et Installation Locale](#dépendances-et-installation-locale)
- [Workflows et Logique Métier](#workflows-et-logique-métier)
- [API et Routage](#api-et-routage)
- [Rôles, Permissions et Dashboards](#rôles-permissions-et-dashboards)
- [Déploiement en Production (VPS)](#déploiement-en-production-vps)

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

## Structure et Arborescence du Projet

```
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
│  ├─ import_students.ts             # Import CSV élèves
│  ├─ clear_students.ts              # Vidage des tables élèves et artifacts liés
│  ├─ create_test_student.ts         # Création rapide d’un élève de test
│  ├─ fix_students_csv.js            # Nettoyage non-destructif CSV et corrections e-mails
│  ├─ ingest_rag.ts                  # Ingestion PDF/Doc → chunks + embeddings
│  ├─ push_job_generate_reports.ts   # Lancer un job (TS)
│  ├─ push_job_generate_reports_js.js# Lancer un job (JS, dotenv)
│  └─ test_reporting_pipeline.ts     # Test autonome: pré-analyse + payload final
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

- Enseignants (3 comptes — mot de passe par défaut haché):

  - Script: `prisma/seed.ts`

  ```bash
  npx ts-node -P tsconfig.scripts.json prisma/seed.ts
  ```

- Élèves (24 entrées — import CSV + mot de passe par défaut haché):

  - Script: `scripts/import_students.ts` (par défaut, lit `TERMINALE_NSI_24_eleves_corrige.csv` et applique `bcrypt.hash('password123')`)

  ```bash
  npx ts-node -P tsconfig.scripts.json scripts/import_students.ts
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
```

Important: `DATABASE_URL` doit pointer vers l’instance PostgreSQL locale accessible (ex: `127.0.0.1` ou `localhost`). N’utilisez pas le nom de service Docker (`postgres`) en exécution locale hors réseau Docker, sous peine d’erreurs `ENOTFOUND`/connexion.

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

## Workflows et Logique Métier

### Workflow 1: Parcours Élève

1) **Arrivée et Authentification**

- Connexion par e‑mail/mot de passe:
  - L’API tente d’abord une correspondance dans `Teacher.email`; si trouvé, compare le mot de passe via `bcrypt.compare`.
  - Sinon, cherche dans `Student.email` et compare le mot de passe.
  - En cas de succès, un JWT est émis (alg HS256) et stocké en cookie HTTP‑Only; le payload inclut le rôle `TEACHER` ou `STUDENT` pour gérer les permissions et les redirections frontend.

2) **Remplissage du Questionnaire**

- Le questionnaire est défini dans `data/questionnaire_nsi_terminale.final.json`.
- Le frontend récupère la structure, affiche les volets, valide côté client, soumet les réponses.

3) **Soumission et Création du Job**

- À la soumission, les réponses QCM et profil sont sauvegardées (API bilan). Les scores sont calculés (QCM + indices). Un job BullMQ `generate_reports` est ajouté dans Redis.

### Workflow 2: Pipeline de Génération des Bilans (Worker)

1) **Prise en charge du Job**

- `apps/worker/src/index.js` (BullMQ `Worker`) récupère `attemptId` et charge l’élève, les scores, etc.

2) **Scoring**

- QCM: `apps/web/src/lib/scoring/nsi_qcm_scorer.ts`
- Indices pédagogiques: `apps/web/src/lib/scoring/pedago_nsi_indices.ts`

3) **Pré-analyse IA (Textes Libres)**

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

4) **Génération des Bilans IA (RAG)**

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

5) **Compilation LaTeX**

- Templates: `reporting.latex_templates`
- Compilation via `latexmk` (docker worker installe texlive) → PDF(s).
- Tolérance erreurs: si compilation/MinIO indisponible, logs et poursuite des étapes suivantes.

6) **Stockage & E-mail**

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

## Déploiement en Production (VPS)

### Check-list

1) **Variables d’Environnement**: configurer `.env` production (voir section Installation) + secrets (OpenAI, Gemini, SMTP, JWT, S3, DB, Redis).
2) **Build & Static**:

```bash
npm run build -w nsi-web
```

3) **Base de Données**:

```bash
npx prisma migrate deploy
```

4) **Lancement**:

```bash
npm start -w nsi-web
```

5) **Worker**: démarrage permanent (ex: pm2/systemd)

```bash
pm2 start apps/worker/src/index.js --name nsi-worker
```

6) **RAG**: ingestion des PDF sources

```bash
HF_TOKEN=... DATABASE_URL=... npx ts-node -P tsconfig.scripts.json scripts/ingest_rag.ts
```

### Opérations utiles

- Import élèves depuis CSV:

```bash
npx ts-node -P tsconfig.scripts.json scripts/import_students.ts --file=TERMINALE_NSI_24_eleves_corrige.csv
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
        SMTP_FROM: process.env.SMTP_FROM,
        MAGIC_LINK_FROM: process.env.MAGIC_LINK_FROM,
        JWT_SECRET: process.env.JWT_SECRET
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

## 9. Scripts Utilitaires

- `scripts/import_students.ts` — Import des 24 élèves depuis `TERMINALE_NSI_24_eleves_corrige.csv` (hash des mots de passe par défaut)

```bash
npx ts-node -P tsconfig.scripts.json scripts/import_students.ts
```

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
