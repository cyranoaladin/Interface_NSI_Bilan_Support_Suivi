# Journal d’intégration – Bilan NSI Terminale

## Portée de cette phase

- Intégration contenus QCM/Volet 2 (placeholders créés, prêt à injecter les JSON complets).
- RAG intégré dans les endpoints de génération texte (mini-retrieval HF + pgvector).
- Endpoints PDF/Email pour `Bilan` (prototype; upload S3; envoi e-mail texte).
- Alignement basePath configurable.
- ACL conservée (self/owner) et à raffiner pour classes enseignants.

## Actions réalisées

1) Modèles Prisma

- Ajout `Bilan`, `StudentProfileData`; lien `Student.profileData`.

2) API Bilan

- `GET /api/bilan/questionnaire-structure`
- `POST /api/bilan/create`
- `GET /api/bilan/[bilanId]`
- `POST /api/bilan/[bilanId]/submit-answers` (scoring QCM + indices pédago basiques, upsert `StudentProfileData`).
- `POST /api/bilan/generate-report-text` et `POST /api/bilan/generate-summary-text` avec RAG intégré via `semanticSearch`.
- `GET /api/bilan/pdf/[bilanId]?variant=...` (prototype upload S3) et `POST /api/bilan/email/[bilanId]` (mailer texte).

3) Frontend

- `app/bilan/initier`, `app/bilan/[bilanId]/questionnaire`, `app/bilan/[bilanId]/resultats`.

4) Libs

- `lib/bilan_data.ts` (loaders), `lib/scoring/*`, `lib/vector.ts` (HF embeddings + pgvector search).

5) Worker

- Correction `logiques_pct`.

6) Config

- `next.config.mjs` paramétré par `NEXT_BASE_PATH`.

## À finir/valider

- Injecter contenus réels QCM/Volet 2 (remplacer placeholders `data/*.json`).
- PDF LaTeX dédiés au modèle `Bilan` (aujourd’hui: upload placeholder). Option: déléguer au worker comme pour `Attempt`.
- ACL fine enseignant (par classe): requête `Teacher` → classes autorisées → filtre sur `Bilan.studentId`.
- Redirections avec basePath: confirmer URL finale publique (recommandé: `APP_BASE_URL=https://nsi.labomaths.tn`).

## Risques/notes

- Les endpoints de génération appellent OpenAI depuis le web: quota/latence. Alternative: déléguer au worker via jobs.
- RAG: dépend de la présence de chunks en DB; prévoir fallback si vide.
- PDF endpoint: actuellement un prototype (place des octets JSON). Remplacer par compilation LaTeX.
