# Starter Pack — SMTP labo.maths & infra files (copier/coller)

Collez chaque fichier à l’emplacement indiqué dans le monorepo.

---

## 1) `.env.example` (racine)
```env
# IA
OPENAI_API_KEY=REPLACE
HF_TOKEN=REPLACE
APP_BASE_URL=https://labomaths.tn

# DB/Cache
DATABASE_URL=postgres://nsi:CHANGE_ME@postgres:5432/nsi?sslmode=disable
REDIS_URL=redis://redis:6379/0

# Stockage S3 (MinIO)
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=nsi-s3-user
S3_SECRET_KEY=SUPER_SECRET_S3_PASS
S3_BUCKET=reports
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# SMTP (expéditeur: labo.maths@ert.tn)
SMTP_HOST=REPLACE_SMTP_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=labo.maths@ert.tn
SMTP_PASS=REPLACE_SMTP_PASS
SMTP_FROM="Labo Maths <labo.maths@ert.tn>"
MAGIC_LINK_FROM=labo.maths@ert.tn

# Auth
JWT_SECRET=GENERATED_BASE64_48
```

> Remplacez `REPLACE_*`. Retirez le `/` final de `APP_BASE_URL` si présent.

---

## 2) `infra/docker-compose.yml`
```yaml
version: '3.9'
services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: nsi
      POSTGRES_PASSWORD: ${PG_PASSWORD:-CHANGE_ME}
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

### `infra/init/01_pg_init.sql`
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 3) Nginx (sur l’hôte VPS)
### `/etc/nginx/sites-available/labomaths.tn`
```nginx
server {
  listen 80;
  server_name labomaths.tn;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
> Activer + TLS : `ln -s .../sites-available/labomaths.tn .../sites-enabled/ && nginx -t && systemctl reload nginx && certbot --nginx -d labomaths.tn`

---

## 4) Prisma (DB)
### `prisma/schema.prisma`
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

### Migration RAG (SQL brut)
`prisma/migrations/20250904_rag_init.sql`
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
  embedding vector(384),
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 5) Web (Next.js) — outils communs
### `apps/web/src/lib/env.ts`
```ts
import { z } from 'zod';

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(10),
  HF_TOKEN: z.string().min(10),
  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string().default('reports'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.string().optional(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),
  MAGIC_LINK_FROM: z.string().email(),
  JWT_SECRET: z.string().min(20),
});

export const env = EnvSchema.parse(process.env);
```

### `apps/web/src/lib/mail.ts`
```ts
import nodemailer from 'nodemailer';
import { env } from './env';

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE, // false => STARTTLS
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string; }) {
  return mailer.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
}
```

### `apps/web/src/lib/jwt.ts`
```ts
import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';

const ENC = new TextEncoder();
const secret = ENC.encode(env.JWT_SECRET);

export async function signMagicToken(email: string, expMinutes = 15) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expMinutes * 60)
    .sign(secret);
}

export async function verifyMagicToken(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  return payload as { email: string; exp: number; iat: number };
}
```

### `apps/web/src/lib/cookies.ts`
```ts
import { cookies } from 'next/headers';

export function setSessionCookie(value: string) {
  cookies().set('session', value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
}
```

---

## 6) Auth — magic link (API routes)
### `apps/web/src/app/api/auth/magic-link/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMail } from '@/lib/mail';
import { signMagicToken } from '@/lib/jwt';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = schema.parse(body);
  if (!email.endsWith('@ert.tn')) return NextResponse.json({ ok: false, error: 'Domaine non autorisé' }, { status: 403 });

  const token = await signMagicToken(email, 15);
  const url = new URL('/api/auth/callback', process.env.APP_BASE_URL!);
  url.searchParams.set('token', token);

  await sendMail({
    to: email,
    subject: 'Connexion — Plateforme NSI',
    text: `Cliquez sur ce lien pour vous connecter (valide 15 minutes): ${url.toString()}`,
    html: `<p>Cliquez pour vous connecter (valide 15 min): <a href="${url.toString()}">Se connecter</a></p>`,
  });

  return NextResponse.json({ ok: true });
}
```

### `apps/web/src/app/api/auth/callback/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken } from '@/lib/jwt';
import { setSessionCookie } from '@/lib/cookies';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/login?e=missing', process.env.APP_BASE_URL));
  try {
    const payload = await verifyMagicToken(token);
    setSessionCookie(token);
    return NextResponse.redirect(new URL('/dashboard', process.env.APP_BASE_URL));
  } catch (e) {
    return NextResponse.redirect(new URL('/login?e=invalid', process.env.APP_BASE_URL));
  }
}
```

---

## 7) S3 (MinIO) helper pour upload PDFs
### `apps/web/src/lib/s3.ts`
```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env';

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});

export async function putPdf(key: string, body: Buffer) {
  await s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: 'application/pdf' }));
  return `s3://${env.S3_BUCKET}/${key}`;
}
```

---

## 8) Worker (BullMQ) — squelette
### `apps/worker/src/index.ts`
```ts
import { Queue, Worker } from 'bullmq';
import { env } from '../../web/src/lib/env';

const connection = { url: env.REDIS_URL } as any;
export const generateReportsQueue = new Queue('generate_reports', { connection });

new Worker('generate_reports', async job => {
  // TODO: 1) fetch attempt + scores 2) retrieval HF 3) OpenAI prompts 4) LaTeX compile 5) MinIO upload 6) DB update + email
  console.log('Generate reports for attempt', job.data.attemptId);
}, { connection });
```

---

## 9) Script ingestion RAG
### `scripts/ingest_rag.ts`
```ts
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Client } from 'pg';

const HF_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

async function embedBatch(texts: string[], token: string) {
  const res = await fetch(HF_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(texts) });
  const arr: number[][] = await res.json();
  return arr.map(v => { const n = Math.hypot(...v); return v.map(x => x / (n || 1)); });
}

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const docs = [
    { path: '/mnt/data/programme_nsi_premiere.pdf', title: 'Programme NSI Première' },
    { path: '/mnt/data/programme_nsi_terminale.pdf', title: 'Programme NSI Terminale' },
    { path: '/mnt/data/vademecum-snt-nsi_0.pdf', title: 'Vademecum NSI' },
  ];

  for (const d of docs) {
    const id = (await pg.query("INSERT INTO documents(source,path,title) VALUES('local',$1,$2) RETURNING id", [d.path, d.title])).rows[0].id;
    const raw = fs.readFileSync(d.path);
    const text = raw.toString('utf8'); // remplacez par un extracteur PDF réel
    const chunks = text.match(/[^\n]{1,4000}/g) || [];
    for (let i = 0; i < chunks.length; i += 16) {
      const batch = chunks.slice(i, i + 16);
      const emb = await embedBatch(batch, process.env.HF_TOKEN!);
      for (let j = 0; j < batch.length; j++) {
        await pg.query('INSERT INTO chunks(document_id,text,embedding) VALUES($1,$2,$3)', [id, batch[j], emb[j]]);
      }
    }
  }
  await pg.end();
})();
```

---

## 10) Questionnaire
- Placez **`questionnaire_nsi_terminale.json`** à la racine du repo (déjà fait selon vos infos).
- Code lecteur (exemple) :

### `apps/web/src/lib/questionnaire.ts`
```ts
import fs from 'fs';
import path from 'path';

export function loadQuestionnaire() {
  const p = path.resolve(process.cwd(), 'questionnaire_nsi_terminale.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
```

---

## 11) Pages minimales (login + dashboard élève)
### `apps/web/src/app/login/page.tsx`
```tsx
'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState<string | null>(null);
  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Connexion</h1>
      <input className="border p-2 w-full mb-3" placeholder="email @ert.tn" value={email} onChange={e=>setEmail(e.target.value)} />
      <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={async()=>{
        const res = await fetch('/api/auth/magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        setOk(res.ok ? 'Lien envoyé ! Vérifie tes mails.' : 'Erreur.');
      }}>Envoyer le lien</button>
      {ok && <p className="mt-3">{ok}</p>}
    </main>
  );
}
```

### `apps/web/src/app/dashboard/page.tsx`
```tsx
export default function Dashboard() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard élève</h1>
      <p className="text-gray-600">Votre bilan sera disponible ici une fois généré.</p>
    </main>
  );
}
```

---

## 12) README (extraits utiles)
### `README.md`
```md
# Plateforme NSI — Démarrage rapide

## Pré-requis
- Node 20, Docker, docker-compose
- Domaine: https://labomaths.tn

## Étapes
1. Copier `.env.example` en `.env` et remplir les secrets (SMTP labo.maths@ert.tn).
2. `docker compose -f infra/docker-compose.yml up -d` (DB/Redis/MinIO)
3. `npm i && npx prisma migrate dev` (dans le repo)
4. Ingestion RAG: `HF_TOKEN=... DATABASE_URL=... ts-node scripts/ingest_rag.ts`
5. Lancer web & worker: `npm run dev` (ou build `npm run build` puis `npm start`).
6. Configurer Nginx + Certbot pour labomaths.tn.

## Tests rapides
- POST `/api/auth/magic-link` avec un email @ert.tn → reçoit un lien.
- GET `/api/auth/callback?token=...` → cookie session + redirection `/dashboard`.
```

