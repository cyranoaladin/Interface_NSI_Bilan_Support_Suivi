# Cahier des charges d’audit « Premium »

voici un **cahier des charges d’audit “premium”** couvrant l’ensemble du projet décrit (frontend, backend, base de données, RAG, génération PDF, appels API OpenAI/Gemini, embeddings, dashboards, pipelines, tests, routage, dépendances, env vars, dev/prod, Docker/Compose, YAML, observabilité, sécurité, déploiement VPS).
Il est organisé par **périmètres d’audit**, avec objectifs, items vérifiables, livrables attendus et critères d’acceptation. J’y intègre les éléments spécifiques de votre README (architecture Next.js + worker BullMQ, PostgreSQL + pgvector, Redis, MinIO, SMTP, RAG 2 niveaux, etc.) pour que l’audit soit **actionnable** et **aligné** avec votre implémentation.

## 1) Gouvernance de l’audit

## 1.1 Objectifs

* Garantir un **déploiement production sur VPS** 100 % fonctionnel, **zéro erreur bloquante**, sans “mauvaises surprises”.
* Fiabiliser **toutes** les couches : Frontend (Next.js 14 App Router), Backend/API & Worker BullMQ, Base PostgreSQL (pgvector), Redis/BullMQ, RAG (ingestion/embeddings/retrieval/prompting), génération LaTeX→PDF→S3→e-mail, observabilité/alerting, CI/CD, sécurité, conformité.

## 1.2 Livrables finaux

* **Rapport d’audit** (PDF) avec tableaux de conformité, risques, priorisation (Bloquant/Majeur/Mineur), plan de remédiation.
* **Checklists horodatées** + **traces** (captures, logs, exports SBOM, rapports tests).
* **Jeu de correctifs** (PRs/Git patches) : configuration, code, IaC, Docker/Compose.
* **Dossier “Go-Live”** : procédures d’exploitation (runbook), sauvegardes/restore, SLO/alertes, matrice d’accès, documentation d’onboarding.

## 1.3 Méthode

* Revue documentaire et du code (monorepo `apps/web` + `apps/worker`, `infra/`), exécution en **mode dev** et **mode prod** via Docker Compose, tests automatisés (unitaires/E2E) + tests “chaîne complète” (du questionnaire à l’email final).

* Mesures **quantitatives** (taux d’échec jobs BullMQ, recall\@k RAG, temps de build PDF, erreurs API, coût par bilan) et **qualitatives** (traçabilité, robustesse, UX, sécurité).

## 2) Périmètres & Exigences d’audit

## 2.1 Frontend (Next.js 14 – App Router)

### Contexte — Frontend (2.1)

Le frontend “apps/web” sert UI, auth, questionnaire, déclenchement des bilans, et expose des **routes API** App Router.

### Contrôles — Frontend (2.1)

* **Routing & App Router** : convention dossiers, RSC/SSR/ISR, gestion des erreurs (`error.js`), limites de streaming, caches, `revalidate`, headers no-store sur pages sensibles.
* **Auth & Cookies** : JWT HTTP-Only, durée/renouvellement, **CSRF**, SameSite, Secure, rotation de `JWT_SECRET`, révocation de session. (Le README précise JWT HS256 en cookie HTTP-Only — vérifier sécurisation complète).
* **Formulaires** : questionnaire `data/questionnaire_nsi_terminale.final.json` : validation côté client & serveur, règles d’accessibilité, anti-rejeu et throttling.
* **UX/Ergonomie** : cohérence des écrans, états (chargement/erreur), indicateurs de progression, i18n éventuelle.
* **Sécurité** : XSS/DOMPurify, Content-Security-Policy (CSP), contrôle strict des origin, désactivation `dangerouslySetInnerHTML`, audit libs UI.
* **Performance** : Lighthouse ≥ 90, bundle analyzers, code-splitting, optim images, préchargements.

### Livrables — Frontend (2.1)

* Rapport de conformité (tableau) + rapport Lighthouse + captures routes protégées.
* Recommandations CSP, cookies, routing, formulaires & accessibilité.

### Critères d’acceptation — Frontend (2.1)

* 0 **erreur bloquante** au runtime/console.
* Score Lighthouse ≥ 90 perf/accès/best-practices/sécurité.
* Auth sans faille (JWT HTTP-Only + CSRF + CSP).

## 2.2 Backend/API (Next.js routes) & Worker (BullMQ/Redis)

### Contexte — Backend/API & Worker (2.2)

* **Routes API Next.js** pour logique synchrone (auth, enregistrement réponses, création jobs).
* **Worker autonome `apps/worker`** (BullMQ/Redis) pour pipeline IA → LaTeX/PDF → S3 → e-mail.

### Contrôles — Backend/API & Worker (2.2)

* **API** : schémas d’IO (Zod/OpenAPI), codes & messages d’erreur, idempotence, limites de débit (rate-limit), quotas IP/route, journaux structurés (correlation-id).
* **Queues BullMQ** : définitions (`generate_reports`, `rag_ingest`), TTL, **retries & backoff**, **dead-letter queue**, **idempotence** (job keying), tailles maxi payload, sécurité Redis (AUTH/TLS), purge contrôlée.
* **Pipeline “pré-analyse IA → RAG → LaTeX/PDF → S3 → SMTP”** : états, reprise sur incident, compensation/sagas, timeouts, circuit-breakers, **observabilité** (Sentry, métriques par étape).
* **Runbooks** : procédures incident (ex. web down / dépendance HS / OOM), déjà amorcées dans README — vérifier complétude (isoler cause, MTTR, checklists).
* **Sécurité** : secrets (API keys), logs sans données sensibles, principe de moindre privilège (mail/S3/DB), RCE LaTeX (voir §2.5).

### Livrables — Backend/API & Worker (2.2)

* Matrice des endpoints + tests de charge et de résilience (graceful shutdown, retry).
* Rapport BullMQ (taux d’échec, DLQ, latences par étape).
* PRs de durcissement (rate-limit, idempotence, sentry tags).

### Critères — Backend/API & Worker (2.2)

* 0 job “bloqué” > 15 min sans alerte.
* ≤ 1 % jobs en DLQ sur 1 000 exécutions nominales.
* Reprise automatique après crash service (web/worker).

## 2.3 Base de données (PostgreSQL + pgvector via Prisma)

### Contexte — Base de données (2.3)

* PostgreSQL, **pgvector** pour RAG, Prisma, **PgBouncer** en entrée pour lisser les connexions.

### Contrôles — Base de données (2.3)

* **Schéma** (entités `Teacher`, `Student`, `Bilan`, `Score`, `documents`, `chunks`…) : clés primaires/étrangères, index (dont vectoriels), contraintes d’unicité, check constraints, **migrations** versionnées (no `db push` en prod → préférer `migrate deploy`).
* **PgBouncer** : mode transaction/statement, timeouts, pool size, `server_reset_query`.
* **Performance** : plans EXPLAIN, index b-tree, GIN/IVFFlat HNSW pour pgvector, **VACUUM/auto-analyze**.
* **Sécurité** : comptes minimaux (app/worker/ro), TLS, rotation des creds, chiffrement au repos (VPS) et en transit.
* **Sauvegardes & Restauration** : stratégie (journalière + PITR), tests de restore, rétention.

### Livrables — Base de données (2.3)

* Schéma ER + rapport index/performances, plan de migration production.
* Procédure de **backup/restore** testée (PITR si requis).

### Critères — Base de données (2.3)

* Temps de réponse requêtes critiques p95 < 150 ms sous charge nominale.
* Migration dry-run **réussie** + rollback documenté.

## 2.4 RAG (Retrieval-Augmented Generation)

### Contexte — Génération PDF (2.5)

* **Stratégie à double niveau** : (1) injection globale (guide pédagogique), (2) récupération ciblée (extraits top-k depuis DB `chunks`).
* **Ingestion** : `scripts/ingest_rag.ts` (pdf-parse/mammoth/OCR, chunking 500–1000 tokens + overlap ≈100).
* **Embeddings** : **Gemini `text-embedding-004` (768 dims)**, fallback HF; stockage `documents/chunks` via **pgvector**.

### Contrôles — Génération PDF (2.5)

* **Qualité corpus** : liste des sources **effectivement** ingérées (programmes, vademecum, RCP), dates/version, dédoublonnage, normalisation accents, limites OCR.
* **Paramètres chunking** : taille/overlap cohérents avec modèles utilisés; mesure **recall\@k**/precision\@k sur jeux de requêtes de référence (Q/A pédagogiques).
* **Compatibilité** : **`VECTOR_DIM=768`** strictement aligné avec le modèle d’embedding sélectionné; contrôle que tous les vecteurs ont la bonne dimension.
* **Recherche sémantique** : vérif `semanticSearch` (encodage requêtes avec le même provider, distance adéquate, k, filtres metadata).
* **Prompting** : traçabilité **system/user/constraints JSON** (structure clé → `synthese_profil`, `diagnostic_pedagogique`, etc.), contrôle anti-hallucination (citations `rag_references` obligatoires), **garde-fous** (ton pédagogique, format strict JSON).
* **Évaluation** : taux de grounding (passage RAG), conformité JSON, coût/tps moyen par bilan.

### Livrables — RAG (2.4)

* Rapport qualité RAG (corpus, embeddings, recall\@k), prompts annotés, exemples tracés.
* Scripts de tests RAG reproductibles (jeu de 50–100 questions cibles).

### Critères — RAG (2.4)

* **Grounding ≥ 90 %** (réponses appuyées sur extraits cités).
* **Conformité JSON ≥ 99 %** des sorties LLM (zéro “parse error” en prod).

## 2.5 Génération PDF (LaTeX) → stockage S3 (MinIO) → envoi e-mail (SMTP)

### Contexte

La chaîne Worker exécute **pré-analyse IA → textes finaux → compilation LaTeX/PDF → upload MinIO (S3) → e-mail SMTP**.

### Contrôles

* **LaTeX** : moteur (pdflatex/xelatex), temps de compile, logs, gestion des erreurs, **échappement** des champs injectés (prévenir injection LaTeX), packages requis versionnés.
* **PDF** : intégrité (hash), nommage, métadonnées (élève, version), taille max.
* **S3/MinIO** : **endpoint/bucket** configurés (forçage path-style si requis), ACL privées, **politiques lifecycle**, retry/backoff, URLs signées temporaires.
* **SMTP** : STARTTLS/587, SPF/DKIM/DMARC (si nom de domaine), gabarits d’e-mail, logs d’envoi, **pas de PII en clair**.

### Livrables — Génération PDF (2.5)

* Rapport chaîne PDF→S3→Mail avec captures et **exemples livrables**.
* Correctifs d’échappement LaTeX & politiques MinIO/SMTP.

### Critères — Génération PDF (2.5)

* 0 e-mail non délivré (taux d’échec < 0,5 %).
* 0 échec de compilation LaTeX sur 100 bilans consécutifs.

## 2.6 Appels API IA (OpenAI / Gemini) & Coûts

### Contexte — Appels API IA (2.6)

* OpenAI (gpt-4o, gpt-4o-mini) pour pré-analyse et génération; **Gemini Embeddings** pour l’indexation RAG (fallback HF).

### Contrôles — Appels API IA (2.6)

* **Robustesse** : timeouts, retries exponentiels, **circuit-breaker**, quotas journaliers.
* **Conformité** : pas de données sensibles hors cadre; logs pseudonymisés.
* **Coûts** : mesure coût moyen par bilan, alerte si dépassement budget.
* **Versionning modèles** : pinning des versions, tests non-régression.

### Livrables / Critères — Appels API IA (2.6)

* Tableau des endpoints & budgets → **Coût/Bilan** ≤ objectif, **SLA** erreurs API (p95).

## 2.7 Dashboards (Grafana) & Observabilité

### Contexte — Observabilité (2.7)

Prometheus + Alertmanager + Grafana (mentionnés dans l’architecture).

### Contrôles — Observabilité (2.7)

* **Metrics** : web (latences, erreurs), worker (taux succès/échec jobs, durée étapes), DB (connections, locks), Redis/BullMQ (queues), RAG (recall\@k), PDF (durée compile), SMTP (taux envoi).
* **Logs** : Sentry web/worker activé et **corrélé** aux traces/métriques; DSN présent.
* **Alertes** : contacts (ALERTS\_TO), seuils (ex. DLQ > 1 %, erreurs API > 5 %/5 min), horaires & astreinte.

### Livrables / Critères — Observabilité (2.7)

* 1 **tableau de bord** par domaine + 1 “executive”.
* **SLO**: p95 web < 300 ms, pipeline bilan < N minutes (à définir), alerte < 5 min.

## 2.8 Pipelines, CI/CD, Qualité & Sécurité

### Contrôles — CI/CD (2.8)

* **CI** : build multi-services, tests unitaires/E2E, lint/format, **SAST** (CodeQL/Semgrep), **licence check**, **SBOM** (Syft), **trivy** sur images. (Le badge CI est référencé dans le README — vérifier workflow complet).
* **CD** : build images, tag immutables, scan vulnérabilités, déploiement atomique sur VPS (health-checks, rollback).
* **Sécurité supply-chain** : pin versions, provenance images (base), `npm audit`/`pnpm audit`, lockfiles vérifiés, politique de mises à jour.

### Livrables / Critères — CI/CD (2.8)

* Pipeline vert **de bout en bout**; 0 vulnérabilité **critique** ouverte; SBOM archivé.

## 2.9 Tests (unitaires, d’intégration, E2E)

### Contrôles — Tests (2.9)

* **Unitaires** : scoring (`nsi_qcm_scorer.ts`, `pedago_nsi_indices.ts`) avec cas limites.
* **Intégration** : API → DB via Prisma, Worker → Redis/BullMQ, ingestion RAG, compile PDF, S3, SMTP (sandbox).
* **E2E** (Playwright/Cypress) : scénario élève **complet** : login → questionnaire → création job → génération PDF → e-mail reçu. (S’appuie sur workflows du README).

### Livrables / Critères — Tests (2.9)

* Couverture min. 80 % modules critiques; E2E verts sur CI.

## 2.10 Routage, dépendances, variables d’environnement

### Contrôles — Routage & Env (2.10)

* **Routage** : cohérence noms/roles (`TEACHER`/`STUDENT`) et autorisations.
* **Dépendances** : audit vulnérabilités, doublons, tailles, peerDeps.
* **Env vars** : inventaire + **.env.example** complet; secrets (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `S3_SECRET_KEY`, `SMTP_PASS`, `JWT_SECRET`, `SENTRY_DSN`) chiffrés (SOPS/1Password), **rotation** régulière; consignes **dev vs prod** et **valeurs interdites** (ex. `minioadmin` en prod).

### Livrables / Critères — Routage & Env (2.10)

* `.env.example` à jour; 0 secret en clair dans git; **scan** passé (trufflehog/gitleaks).

## 2.11 Conteneurs, Dockerfiles, Compose & YAML

### Contrôles — Conteneurs (2.11)

* **Dockerfiles** multi-stage, non-root, user UID/GID, `--chown`, caches, `distroless` si possible.
* **docker-compose** : réseau, dépendances (`depends_on` vs wait-for), **healthchecks**, limites CPU/RAM, volumes persistants (Postgres, MinIO).
* **Images** : taille, CVEs (trivy), provenance (registry privé), pin digest SHA.
* **Démarrage local** : `docker compose -f infra/docker-compose.yml up -d` **OK**; `prisma db push` vs stratégie migrations prod.

### Livrables / Critères — Conteneurs (2.11)

* Build reproductible; **healthchecks** OK; 0 vulnérabilité critique image.

## 2.12 Sécurité & Conformité

### Contrôles — Sécurité (2.12)

* **RBAC** : séparation `TEACHER`/`STUDENT` (contrôles backend + UI).
* **Données personnelles** : minimisation, durée conservation, droits d’accès/suppression, chiffrement en transit/au repos, **journal d’accès**.
* **Surface d’attaque** : headers de sécurité, CSP, CORS, SSRF (S3/SMTP), RCE LaTeX, secrets, dépendances.
* **Journalisation** : logs signés/horodatés, rétention & rotation.

### Livrables / Critères — Sécurité (2.12)

* Rapport de risques; plan de remédiation ≤ 30 jours pour “Majeurs”.
* Tests d’intrusion applicatifs (DAST “light”) **sans fuite** de données.

## 2.13 Cohérence Dashboards ↔ Base ↔ Workflows

### Contrôles — Cohérence (2.13)

* **Traçabilité pédagogique** : correspondance champs DB → métriques dashboards (scores, statuts bilans, erreurs RAG).
* **Définitions** : dictionnaire de métriques (nom, formule, source, fréquence).
* **Vérifs** : échantillon (10 élèves) → comparaison UI/DB/logs.

### Livrables / Critères — Cohérence (2.13)

* Dictionnaire des métriques; 100 % concordance DB↔UI pour l’échantillon.

## 3) Environnement VPS (Prod) & “Go-Live”

## 3.1 Architecture de déploiement

* **Reverse-proxy** (Nginx/Traefik) + HTTPS (Let’s Encrypt) + HTTP2/3.
* Réseaux Docker isolés; **secrets** passés par Docker/Env; logs centralisés (Loki/ELK).
* **PgBouncer** en frontal Postgres; sauvegardes automatisées; redondance Redis si critique.

## 3.2 Procédures d’exploitation

* **Runbook incidents** : crash web/worker/dépendances/oom (déjà amorcé dans README → enrichir).
* **Mises à jour** : fenêtre de maintenance, canary, rollback “1 commande”.
* **Conformité Vademecum** (pédagogie & évaluation) : inclusion d’un échantillon d’évaluations variées et traçables (devoirs sur machine, mini-projets, etc.).

## 3.3 Critères “Go-Live”

* Tous les **critères d’acceptation** sections 2.1 → 2.13 **verts**.
* Test E2E “bilan complet” **vert** (login → questionnaire → génération → PDF en S3 → e-mail reçu).
* **Monitoring & Alerting** actifs (tableaux de bord + alertes), **Sentry** opérationnel.

## 4) Plan de tests “chaîne complète”

1. **Scénario Élève**
   Login (cookie HTTP-Only) → Questionnaire JSON → Soumission → Job `generate_reports` → Pré-analyse IA → RAG (recall\@k mesuré) → Génération LaTeX/PDF → Upload S3 → Envoi e-mail → Vérif UI/Dashboards.
2. **Dégradations contrôlées**
   Coupure OpenAI/Gemini, Redis indisponible, S3 KO, SMTP KO, Postgres saturé → vérifier retries/backoff/DLQ/alertes.
3. **Charge**
   100 bilans en parallèle : temps pipeline p95, erreurs, coût.

Livrables : rapports E2E, profils de perf, matrices “OK/KO”, tickets correctifs.

## 5) Annexes – Modèles & Échantillons

* **Modèle de SBOM** (Syft) + rapport **trivy**.
* **Modèle de dictionnaire de métriques** (nom, owner, source, formule, SLO).
* **Checklist Secrets & Env** (inventaire, rotation, stockage).
* **Grille d’évaluation pédagogique** (alignée Vademecum : diversité, mini-projets, critères code/rapport/oral).

## Remarques ciblées issues du README (observées)

* RAG **double niveau** (global + ciblé) : très bon choix → formaliser les **tests recall\@k** et le **contrat de sortie JSON** strict (hook de validation).
* Ingestion : **`VECTOR_DIM=768`** doit être validé à l’insert (contrôle dimensionnel).
* **BullMQ** : ajouter **dead-letter queue** et **idempotence** par `jobId`.
* **SMTP & MinIO** : durcir secrets et politiques (pas de comptes par défaut en prod).
* **PgBouncer** : très pertinent pour lisser connexions (vérifier mode “transaction”).

### En résumé

Ce cahier des charges fournit **la grille complète d’audit** (technique + opérationnelle + pédagogique) pour atteindre un **go-live VPS** sans surprise : **robuste, observé, sécurisé, traçable** et **pédagogiquement aligné**.
