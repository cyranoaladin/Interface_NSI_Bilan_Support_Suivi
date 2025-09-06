# Plan d’exécution & intégration Warp — NSI Platform (prod)

## A) Décisions VALIDÉES (pour déblocage immédiat)
1) **Architecture** : monorepo **Next.js 14 (App Router)** avec **API routes** (pas de NestJS au départ). Un seul serveur web + jobs séparés (worker Node).
2) **Vecteur** : **PostgreSQL 15 + pgvector** (image `pgvector/pgvector`). Avantage : sauvegardes unifiées, moins de services.
3) **Embeddings HF** : **Hugging Face Inference API** (`sentence-transformers/all-MiniLM-L6-v2` au démarrage ; switch possible vers `intfloat/e5-base-v2`). Normalisation L2 côté app.
4) **Stockage PDFs** : **MinIO** (S3-compatible) interne ; endpoint privé `http://minio:9000`, bucket `reports`.
5) **Domaine/URL** : **APP_BASE_URL=https://labomaths.tn/** (DNS à pointer vers le VPS, Nginx + Let’s Encrypt côté hôte).

---

## B) Roadmap exécutable (jalons)
**J1–J3** : Base système (Compose, Postgres/pgvector, Redis, MinIO), Prisma + migrations, Auth magic-link + sessions JWT.
**J4–J7** : Questionnaire v2.0 (render, autosave, timer), scoring/tags, dashboards v1.
**J8–J10** : RAG (ingestion, retrieval), prompts, génération JSON → LaTeX → PDF, worker BullMQ.
**J11–J12** : Synthèse classe, exports, tests E2E + charge (24 postes), déploiement prod + sauvegardes + monitoring.

---

## C) Structure du repo (proposée)
```
repo/
 ├─ apps/
 │   ├─ web/                # Next.js (UI + API routes)
 │   └─ worker/             # BullMQ jobs (génération bilans)
 ├─ packages/
 │   ├─ core/               # scoring, tags, schémas JSON
 │   └─ rag/                # ingestion + retrieval
 ├─ prisma/
 │   ├─ schema.prisma
 │   └─ migrations/
 ├─ infra/
 │   ├─ docker-compose.yml
 │   ├─ init/
 │   │   ├─ 01_pg_init.sql  # create ext vector, roles, etc.
 │   │   └─ minio_bootstrap.sh
 │   └─ nginx/
 ├─ docs/
 ├─ .env.example
 └─ package.json
```

---

## D) `docker-compose.yml` (base minimaliste, Nginx sur l’hôte)
```yaml
version: '3.9'
services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: nsi
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: nsi
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init/01_pg_init.sql:/docker-entrypoint-initdb.d/01_pg_init.sql:ro
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "nsi"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --save '' --appendonly no
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio:/data

  web:
    build: ../apps/web
    env_file: ../.env
    depends_on:
      - postgres
      - redis
      - minio

  worker:
    build: ../apps/worker
    env_file: ../.env
    depends_on:
      - postgres
      - redis
      - minio

volumes:
  pgdata:
  minio:
```

**`init/01_pg_init.sql`**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- Index utiles créés via migrations Prisma (ou SQL brut) après le bootstrap.
```

---

## E) Schéma de données (Prisma + SQL brut pour pgvector)
**`prisma/schema.prisma` (extrait)**
```prisma
datasource db { provider = "postgresql" url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

model Student {
  id          String   @id @default(cuid())
  email       String   @unique
  givenName   String
  familyName  String
  classe      String
  specialites String
  active      Boolean  @default(true)
  attempts    Attempt[]
}

model Attempt {
  id             String   @id @default(cuid())
  studentId      String
  questionnaire  String
  startedAt      DateTime @default(now())
  submittedAt    DateTime?
  status         String   @default("in_progress")
  scores         Score[]
  tags           Tag[]
  reports        Report[]
  @@index([studentId])
}

model Score {
  id        String  @id @default(cuid())
  attemptId String
  domain    String
  pct       Float
  raw       Float
  weight    Float
  @@index([attemptId])
}

model Tag {
  id        String  @id @default(cuid())
  attemptId String
  code      String
  @@index([attemptId])
}

model Report {
  id         String   @id @default(cuid())
  attemptId  String
  type       String   // 'eleve' | 'enseignant'
  json       Json
  pdfUrl     String?
  publishedAt DateTime?
  @@index([attemptId])
}
```

**Table RAG (SQL brut)** — Prisma ne gère pas encore tous les index pgvector ; on ajoute une migration manuelle :
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT,
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  embedding vector(384),          -- 384 pour all-MiniLM-L6-v2
  meta JSONB DEFAULT '{}'::jsonb
);

-- index ANN HNSW si dispo, sinon IVFFLAT
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## F) Auth magic‑link (API routes)
**Endpoints**
- `POST /api/auth/magic-link` → génère un token, envoie l’e‑mail.
- `GET  /api/auth/callback?token=…` → vérifie, crée la session (cookie HTTP‑only), redirige.

**Squelette (extrait TypeScript)**
```ts
// apps/web/src/app/api/auth/magic-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMail } from '@/lib/mail';
import { signMagicToken, savePendingSession } from '@/lib/auth';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = schema.parse(body);
  if (!email.endsWith('@ert.tn')) return NextResponse.json({ ok: false }, { status: 403 });
  // TODO: check student exists
  const token = await signMagicToken({ email });
  await savePendingSession(email, token);
  const link = `${process.env.APP_BASE_URL}/api/auth/callback?token=${encodeURIComponent(token)}`;
  await sendMail({ to: email, subject: 'Connexion NSI', text: `Cliquez: ${link}` });
  return NextResponse.json({ ok: true });
}
```

---

## G) Ingestion RAG (CLI Node)
**Étapes**
1) Extraire texte PDF (pdf-parse) → nettoyer → chunker (1000–1200 tokens, overlap 100).
2) Embeddings via **HF Inference** (POST modèle, bearer `HF_TOKEN`, batch 8–16).
3) Normalisation L2 → insertion `documents/chunks` + index vecteur.

**Extrait**
```ts
// packages/rag/src/ingest.ts
import fetch from 'node-fetch';

async function embedBatch(texts: string[]) {
  const res = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(texts)
  });
  const vectors: number[][] = await res.json();
  return vectors.map(v => {
    const norm = Math.hypot(...v);
    return v.map(x => x / (norm || 1));
  });
}
```

---

## H) Retrieval + génération bilans (worker)
**Worker** : BullMQ queue `generate_reports` → étapes :
1) Récupérer attempt + scores + réponses.
2) Retrieval top‑k par similarité cosine (`SELECT ... ORDER BY embedding <=> $vec LIMIT k`).
3) Construire **prompts** (élève/enseignant) → appel OpenAI (`gpt-4o`) → JSON structuré.
4) Injecter dans templates LaTeX → compiler (`latexmk -pdf -halt-on-error`).
5) Uploader PDF vers MinIO (`reports/{studentId}/{attemptId}/eleve.pdf`).
6) Maj DB + envoi e‑mails.

---

## I) Dashboards (UX minimal)
- **Élève** : état du questionnaire (non commencé / en cours / soumis), bouton Start (désactivé si `published`), lien PDF.
- **Enseignant** : table par classe (24 élèves), filtres (tags), moyennes domaine, liens PDFs, export CSV.

---

## J) Blocages/Corrections à prévoir dans le JSON questionnaire (breaking)
1) **JSON invalide** :
   - `workflow.stages` mélange tableau + objet (`"volet_connaissances": {...}`) → **doit rester un tableau de strings** ; la définition du volet doit être dans `"volets": [...]`.
   - **Duplication** de `volet_pedago_commun` et virgules orphelines.
   - **Commentaires** `/* ... */` non valides en JSON.
   - **Blocs code** multi‑lignes non échappés (ex: `code:"python\n..."`).
   - LaTeX dans JSON : échapper `\` correctement.
2) **Proposition** : reprendre la version *v1.1* stable, ré‑injecter la **version longue** du Volet 1 proprement (bank_imports + bank_append), puis re‑valider le schéma.

---

## K) CI/CD & qualité (extraits)
- **GitHub Actions** : jobs `lint`, `test`, `build`, `docker`, `deploy`.
- **Tests** : unitaires (scoring/tags), intégration (auth/import), E2E (passation→PDF), charge (24 connexions/60 min).
- **Sécurité** : ESLint, npm audit=0, OWASP (IDOR/CSRF/XSS), secrets `.env` non commités.

---

## L) Critères d’acceptation clefs
- Élève `@ert.tn` : connexion → passation 45 items → PDF élève en dashboard (bouton Start désactivé).
- Enseignant : 24 fiches, PDFs élève+enseignant, synthèse classe (moyennes domaine, taux tags).
- Import CSV rejouable (upsert), logs d’erreurs.
- Backups quotidiens restaurables.
```

