# Cahier des charges — Plateforme NSI Terminale (VPS production)

## 1) Objet & périmètre
Construire une plateforme web de diagnostic et de suivi pour la Terminale NSI :
- Page de **connexion** (magic link, domaine `@ert.tn`).
- **Dashboard élève** (questionnaire, génération & dépôt du bilan PDF élève, historique).
- **Dashboard enseignant** (accès aux bilans élève+enseignant, synthèses classe, export CSV).
- **Import CSV** des élèves (pré‑remplissage base de données).
- **RAG** (ingestion des PDF fournis), **embeddings Hugging Face**, **génération** via OpenAI (bilans) + **compilation LaTeX** → PDF.
- Déploiement **VPS** (production) avec observabilité, sauvegardes et sécurité.

Hors périmètre : authentification SSO ENT, paiement en ligne, mobile natif.

---

## 2) Utilisateurs & rôles
- **Élève** : s’authentifie via e‑mail `@ert.tn`, complète le questionnaire, reçoit son bilan PDF, bouton « commencer le bilan » désactivé après soumission.
- **Enseignant** : consulte tous les bilans (élève & enseignant), synthèses classe, exporte.
- **Admin** (interne) : gère imports CSV, relance e‑mails, supervision, purge RGPD.

---

## 3) Parcours clés
### 3.1 Connexion (magic link)
1. Saisie e‑mail → vérification domaine `ert.tn` + existence dans table `students`.
2. Envoi lien signé (validité 15 min) → création session JWT.
3. Redirection vers `dashboard` (rôle‑aware).

### 3.2 Passation questionnaire (salle D201, 24 postes)
- Chargement du **Questionnaire NSI Terminale — v2.0** (fourni), aléa ordre items, minuterie 60 min, **autosave** toutes 10 s.
- Validation → calcul scores pondérés → tags/flags → **jobs** de génération (LLM+RAG → LaTeX → PDF) → stockage.
- **Dashboard élève** : affiche le PDF élève, désactive « commencer le bilan ».
- **Dashboard enseignant** : liste \(24 élèves\) + vue PDF élève & enseignant, synthèse classe.

---

## 4) Fonctionnalités détaillées
### 4.1 Authentification & sécurité
- Magic link (passwordless), domain‑allowlist `ert.tn`.
- Sessions JWT (HTTP‑only cookies, rotation), CSRF, rate‑limit /auth.
- RBAC : `student`, `teacher`, `admin`.

### 4.2 Dashboards
- Élève : statut passation, bouton start (désactivé si `report_published=true`), téléchargement PDF, messages.
- Enseignant : tableau classe, filtres (tags/flags), tri par score domaine, accès PDFs, export `.csv`.

### 4.3 Questionnaire
- Rendu QCM/QROC, randomisation items et options, **anti‑triche minimal** (permutation, timer, blocage navigateur arrière).
- Tolérance déconnexion (autosave, reprise).

### 4.4 Génération de bilans
- **RAG (HF)** : retrieve top‑k sur chunks des PDF officiels.
- **OpenAI** : prompts (élève/enseignant) → JSON d’analyses → injection dans templates LaTeX → compilation `pdflatex/xelatex`.
- Dépôt fichiers : répertoires versionnés par élève.

### 4.5 Import CSV
- Upload `TERMINALE_NSI.csv` → mapping champs → validation → insertion/upsert → rapport.

### 4.6 Notifications
- E‑mails : magic link, confirmation bilan (élève + copie enseignants).

---

## 5) Architecture technique
### 5.1 Stack
- **Frontend** : Next.js 14 (App Router), TypeScript, Tailwind + shadcn/ui.
- **Backend API** : Next.js API routes (ou NestJS si séparation), Node 20.
- **Jobs** : worker Node (BullMQ) + **Redis**.
- **DB** : PostgreSQL 15 (+ extension **pgvector**). Alternative : **Qdrant** pour le vecteur.
- **Stockage** : S3‑compatible (MinIO) ou `local` (répertoire monté) pour PDFs.
- **RAG** : Hugging Face Inference (ou hébergé local) pour embeddings.
- **LLM** : OpenAI (génération contenus bilans).
- **Reverse proxy** : Nginx.

### 5.2 Schéma déploiement (VPS)
```
[Internet] → Nginx (443) → WebApp (Next.js) → Postgres | Redis | Qdrant/pgvector | Worker | MinIO
                                          ↘ SMTP (envoi mails)
```

### 5.3 Conteneurs (Docker Compose)
- `web` (Next.js), `worker`, `postgres`, `redis`, `minio` (ou stockage local), `qdrant` (optionnel), `nginx`.

---

## 6) Données & modèle (ERD simplifié)
- `students(id, email, given_name, family_name, classe, specialites, active)`
- `users(id, email, role)` (teachers/admins)
- `auth_sessions(id, user_id, created_at, expires_at, token_hash)`
- `questionnaires(id, version, schema_json)`
- `attempts(id, student_id, questionnaire_id, started_at, submitted_at, status)`
- `answers(id, attempt_id, question_id, payload_json)`
- `scores(id, attempt_id, domain, pct, raw, weight)`
- `tags(id, attempt_id, tag_code)`
- `reports(id, attempt_id, type, json_payload, pdf_url, published_at)` // type: `eleve` | `enseignant`
- `documents(id, source, path, title, meta)` // corpus RAG
- `chunks(id, document_id, text, embedding VECTOR, meta)`
- `email_queue(id, to, subject, body, status)`
- `audit_log(id, actor, action, entity, entity_id, payload, ts)`

Index : `students.email` unique, vecteur `chunks.embedding` (pgvector) ou Qdrant.

---

## 7) API (exemples)
- `POST /auth/magic-link {email}` → 200 | 400 | 404
- `GET  /auth/callback?token=…` → cookie session + redirect
- `GET  /me` → profil + rôle
- `GET  /questionnaire/current` → JSON v2.0
- `POST /attempts/start` → id + timer
- `POST /attempts/{id}/autosave` → 204
- `POST /attempts/{id}/submit` → scores + enqueue jobs
- `GET  /reports/{attempt_id}?type=eleve|enseignant` → URL PDF
- `POST /admin/import/csv` (role=admin) → rapport
- `GET  /teacher/class/{classe}/synthesis` → stats + liens PDF

JWT scopes : `student:*`, `teacher:read`, `admin:*`.

---

## 8) Pipeline RAG & génération
### 8.1 Ingestion
- Sources : `programme_nsi_premiere.pdf`, `programme_nsi_terminale.pdf`, `vademecum-snt-nsi_0.pdf`, autres.
- Extraction texte (pdfminer/pymupdf) → **chunking** 1 000–1 200 tokens, **overlap** 100.
- **Embeddings** HF (ex. `sentence-transformers/all-MiniLM-L6-v2` ou `intfloat/e5-base`) → stockage `pgvector` ou Qdrant.

### 8.2 Requête
- Construction **prompt** (élève/enseignant) + **retrieval top‑k** (k=6–10) par similarité cosinus.
- Garde‑fous : détection LLM‑prompt‑injection (ban de tokens), troncature, citations internes (non exposées à l’élève).

### 8.3 Génération → LaTeX → PDF
- Appel OpenAI (modèle `gpt-4o`, temperature 0.3/0.4 selon profil).
- Validation JSON (schema), injection dans **templates LaTeX** (fournis), compilation conteneur TeX Live.
- Upload PDF → stockage (MinIO/local) → mise à jour `reports` + dashboards + envoi e‑mail.

---

## 9) Import CSV — règles
- Format attendu `;` UTF‑8, colonnes : Email, Prénom, Nom, Classe, Spécialités gardées, ID.
- Validation : domaine `ert.tn`, e‑mail unique, champs requis non vides.
- Upsert : si `email` existe → mise à jour champs (sauf id interne).
- Journalisation dans `audit_log` + export des erreurs.

---

## 10) Intégration OpenAI & HF — variables d’environnement
```
OPENAI_API_KEY=...
HF_TOKEN=...
DATABASE_URL=postgres://user:pass@db:5432/nsi
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=reports
JWT_SECRET=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
MAGIC_LINK_FROM=no-reply@ert.tn
APP_BASE_URL=https://nsi.ert.tn
```

Secrets stockés hors dépôt (Vault/.env chiffré). Rotation semestrielle.

---

## 11) Déploiement VPS (prod)
- **OS** : Ubuntu LTS ; **pare‑feu** UFW (80/443/22), fail2ban.
- **Nginx** : reverse proxy, HTTP→HTTPS, **Let’s Encrypt** auto‑renouvellement.
- **Docker** + **Compose** : services isolés ; **volumes** pour Postgres/MinIO.
- **Backups** : `pg_dump` quotidien + rétention 30 j ; synchronisation PDFs ; tests de restauration mensuels.
- **Logs** : JSON (app/nginx), rotation (`logrotate`).
- **Monitoring** : Healthchecks + métriques (p95 latence API, jobs en file, erreurs 5xx). Alertes e‑mail.

---

## 12) Sécurité & conformité (RGPD)
- Base légale : mission d’enseignement ; **consentement** explicite pour bilans et e‑mails.
- Minimisation : seules données nécessaires (identité, classe, e‑mail, réponses, rapports) ; **pas** de données sensibles.
- Droits : export individuel, rectification, **effacement** en fin d’année scolaire.
- Chiffrement au repos : disque VPS chiffré ; en transit : TLS 1.2+.
- **PII** dans logs : masquée (e‑mail haché).
- **DPA** : vérifier conditions d’utilisation OpenAI/HF ; pas d’entrainement sur données sans consentement.

---

## 13) Performances & SLO (objectifs)
- Auth (lien → session) : p95 < 1.5 s.
- Chargement dashboard : p95 < 2 s.
- Sauvegarde autosave : p95 < 150 ms.
- Génération bilans (job) : pipeline robuste, file dédiée, **retries** exponentiels.

---

## 14) Qualité & tests
- **Unitaires** (domain scoring, tags), **intégration** (auth, import CSV), **E2E** (passation → PDFs), **charge** (24 connexions simultanées).
- **Mocks** OpenAI/HF pour tests ; snapshot LaTeX/PDF (hash taille/pages).
- Revue sécurité (OWASP), tests CSRF/XSS/IDOR, upload CSV malformés.

---

## 15) Opérations & runbook
- Redémarrage services (`docker compose restart`), purge file d’attente jobs, relance e‑mails en échec.
- Procédure de restauration (DB + fichiers).
- Mécanisme de **re‑génération** PDF si prompts/templates évoluent.

---

## 16) Livrables
- Mono‑repo : `apps/web` (Next.js), `apps/worker`, `packages/ui`, `infra/compose.yml`.
- Schéma Prisma (ou SQL) + migrations.
- Scripts : ingestion RAG, import CSV, seed rôles/users.
- Prompts (élève/enseignant/synthèse) versionnés.
- Templates LaTeX (élève/enseignant) + Docker TeX Live.
- Playbook déploiement VPS + scripts backup.

---

## 17) Roadmap (séquencement)
1. **Base** : Auth + DB + import CSV + dashboards v0.
2. **Questionnaire** : rendu, scoring, tags.
3. **RAG & Génération** : ingestion corpus, prompts, worker, LaTeX.
4. **Prod** : VPS, Nginx, HTTPS, sauvegardes, monitoring.
5. **Finition** : synthèse classe, exports, analytics anonymisés.

---

## 18) Critères d’acceptation (extraits)
- Un élève `@ert.tn` peut se connecter, passer le QCM long (45 items), soumettre et voir son **PDF élève** ; le bouton Start est désactivé.
- L’enseignant voit pour la classe **24 entrées** avec accès **PDF élève** et **PDF enseignant**, plus une **synthèse** avec moyennes par domaine.
- Import CSV rejoue sans duplicats (upsert), journalisation des erreurs.
- Backups quotidiens vérifiés, restauration testée.

