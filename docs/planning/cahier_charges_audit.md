# Cahier des Charges d'Audit "Premium"

## **1. Gouvernance de l’Audit**

### **1.1 Objectifs**

* Garantir un **déploiement en production sur VPS** 100% fonctionnel, avec zéro erreur bloquante et sans surprises.
* Fiabiliser **toutes les couches** de l'application : Frontend (Next.js), Backend (API & Worker BullMQ), Base de Données (PostgreSQL/pgvector), Cache (Redis), Pipeline RAG, Génération PDF, Observabilité, CI/CD, et Sécurité.

### **1.2 Livrables Finaux**

* **Rapport d’Audit (PDF) :** Tableaux de conformité, analyse des risques (Bloquant/Majeur/Mineur), et plan de remédiation priorisé.
* **Dossier de Preuves :** Checklists horodatées, logs, captures d'écran, rapports de tests (Lighthouse, couverture, E2E), et exports (SBOM).
* **Correctifs :** Un jeu de Pull Requests ou de patches Git pour chaque remédiation.
* **Dossier "Go-Live" :** Runbook d'incidents, procédures de sauvegarde/restauration testées, SLOs définis, et documentation d'exploitation.

### **1.3 Méthode**

* Revue de la documentation et du code source.
* Exécution du projet en conditions réelles via Docker Compose.
* Exécution de tests automatisés (unitaires, intégration, E2E).
* Exécution de tests de "chaîne complète" en conditions réelles.
* Mesures quantitatives (latences, taux d'erreur, coûts) et qualitatives (robustesse, sécurité, UX).

---

## **2. Périmètres & Exigences d’Audit**

### **2.1 Frontend (Next.js 14 – App Router)**

* **Contrôles :**
  * **Routing & App Router :** Conventions, gestion des erreurs (`error.js`), caches, `revalidate`.
  * **Auth & Cookies :** JWT HTTP-Only, durée, **CSRF**, SameSite, Secure, rotation de `JWT_SECRET`.
  * **Formulaires :** Validation client/serveur, accessibilité, anti-rejeu.
  * **UX/Ergonomie :** Cohérence, états de chargement/erreur, indicateurs de progression.
  * **Sécurité :** XSS, Content-Security-Policy (CSP), contrôle des `origin`.
  * **Performance :** Scores Lighthouse ≥ 90, analyse des bundles.
* **Critères d’acceptation :** 0 erreur bloquante en console, score Lighthouse ≥ 90, authentification sans faille.

### **2.2 Backend/API (Next.js routes) & Worker (BullMQ/Redis)**

* **Contrôles :**
  * **API :** Schémas de validation (Zod), gestion des erreurs, idempotence, **rate-limiting**.
  * **Queues BullMQ :** Définitions, TTL, **retries & backoff**, **dead-letter queue**, **idempotence des jobs**.
  * **Pipeline de Génération :** Reprise sur incident, timeouts, observabilité par étape (Sentry).
  * **Runbooks :** Complétude des procédures d'incident (web down, dépendance HS, etc.).
  * **Sécurité :** Gestion des secrets, logs sans données sensibles, prévention des RCE LaTeX.
* **Critères d’acceptation :** 0 job bloqué sans alerte, ≤ 1% de jobs en dead-letter queue, reprise automatique après crash.

### **2.3 Base de Données (PostgreSQL + pgvector via Prisma)**

* **Contrôles :**
  * **Schéma :** Clés, index (y compris vectoriels), contraintes, migrations versionnées (`migrate deploy`).
  * **PgBouncer :** Mode transaction, timeouts, pool size.
  * **Performance :** `EXPLAIN ANALYZE` sur les requêtes critiques, stratégies d'indexation (B-Tree, HNSW), `VACUUM`.
  * **Sécurité :** Rôles à moindre privilège, TLS, rotation des identifiants.
  * **Sauvegardes & Restauration :** Stratégie de backup (journalière + PITR), tests de restauration.
* **Critères d’acceptation :** p95 des requêtes critiques < 150 ms, migration dry-run réussie avec rollback documenté.

### **2.4 RAG (Retrieval-Augmented Generation)**

* **Contrôles :**
  * **Qualité du Corpus :** Sources ingérées, dédoublonnage, normalisation.
  * **Qualité des Chunks :** Vérification manuelle d'un échantillon pour s'assurer de la cohérence sémantique (pas de phrases coupées).
  * **Pertinence de la Recherche :** Validation manuelle de la pertinence des chunks retournés pour un jeu de 5-10 questions pédagogiques cibles.
  * **Compatibilité des Embeddings :** `VECTOR_DIM=768` strictement aligné avec le modèle Gemini.
  * **Prompting :** Traçabilité de la structure JSON, contrôle anti-hallucination, garde-fous sur le ton.
  * **Évaluation :** Taux de "grounding" (réponses basées sur le RAG), conformité du JSON de sortie.
* **Critères d’acceptation :** Grounding ≥ 90%, conformité JSON de sortie ≥ 99%.

### **2.5 Génération PDF, Stockage S3 & Envoi d'E-mail**

* **Contrôles :**
  * **LaTeX :** Gestion des erreurs de compilation, **échappement des entrées** pour prévenir les injections.
  * **PDF :** Intégrité, nommage, métadonnées.
  * **S3/MinIO :** ACL privées, politiques de cycle de vie, URLs signées si nécessaire.
  * **SMTP :** Configuration de sécurité (STARTTLS, SPF/DKIM/DMARC), logs d'envoi.
* **Critères d’acceptation :** Taux d'échec de compilation LaTeX < 1%, taux d'échec d'envoi d'e-mail < 0.5%.

### **2.6 Appels API IA (OpenAI / Gemini) & Coûts**

* **Contrôles :**
  * **Robustesse :** Timeouts, retries exponentiels, circuit-breaker.
  * **Coûts :** Mesure du coût moyen par bilan, mise en place d'alertes budgétaires.
  * **Fuite de Données via LLM :** Valider que le payload envoyé est pseudonymisé autant que possible (ex: `student.id` plutôt que `student.family_name`).
* **Critères d’acceptation :** Coût par bilan dans les limites du budget, p95 des erreurs API < 1%.

### **2.7 Observabilité (Dashboards, Alertes, Logs)**

* **Contrôles :**
  * **Métriques :** Couverture complète (web, worker, DB, Redis, RAG, etc.).
  * **Logs :** Sentry activé et corrélé aux traces.
  * **Alertes :** Seuils pertinents, contacts `ALERTS_TO` corrects.
* **Critères d’acceptation :** SLOs définis et mesurables (ex: p95 web < 300 ms), temps de détection d'alerte < 5 min.

### **2.8 CI/CD et Qualité du Code**

* **Contrôles :**
  * **CI :** Build, tests, lint, **analyse de sécurité statique (SAST)**, **génération de SBOM**, **scan de vulnérabilités d'image (Trivy)**.
  * **CD :** Déploiement atomique, health-checks, stratégie de rollback.
* **Critères d’acceptation :** Pipeline CI vert de bout en bout, 0 vulnérabilité critique non traitée.

### **2.9 Tests (Unitaires, Intégration, E2E)**

* **Contrôles :**
  * **Unitaires :** Couverture de la logique métier critique (scoring, etc.).
  * **Intégration :** Interactions entre services (API -> DB, Worker -> Redis).
  * **E2E :** Scénario élève complet, du login à la réception de l'e-mail.
* **Critères d’acceptation :** Couverture des modules critiques > 80%, suite de tests E2E verte.

### **2.10 Configuration & Dépendances**

* **Contrôles :**
  * **Variables d'Environnement :** `.env.example` complet, pas de secrets dans Git (validé par `gitleaks`), politique de rotation.
  * **Dépendances :** `npm audit` sans vulnérabilités critiques, pas de doublons.
* **Critères d’acceptation :** Scan de secrets passé, `npm audit` propre.

### **2.11 Conteneurisation (Docker)**

* **Contrôles :**
  * **Dockerfiles :** Best practices (multi-stage, non-root, etc.).
  * **Docker Compose :** Réseau, `healthchecks`, limites de ressources, volumes persistants.
* **Critères d’acceptation :** Build reproductible, healthchecks verts.

### **2.12 Sécurité & Conformité**

* **Contrôles :**
  * **RBAC :** Séparation stricte des rôles `TEACHER`/`STUDENT`.
  * **Données Personnelles :** Minimisation des données, durée de rétention, chiffrement.
* **Critères d’acceptation :** Tests d'intrusion légers sans fuite de données.

### **2.13 Cohérence des Données**

* **Contrôles :**
  * **Traçabilité :** Correspondance entre les données en base et l'affichage sur les dashboards.
* **Critères d’acceptation :** 100% de concordance sur un échantillon de 10 élèves.

### **2.14 Gestion de la Charge et de la Concurrence**

* **Contrôles :**
  * **Prévention des "Race Conditions"** à la soumission.
  * **Scalabilité du Worker** face à une rafale de jobs.
  * **Gestion de la Pression** sur PgBouncer et les API externes (rate limits).
* **Plan de Tests Spécifique :**
  * **Scénario de "Rafale" :** Simuler 30 utilisateurs soumettant leur questionnaire en 60 secondes.
* **Critères d’acceptation :** 0 échec lors de la soumission simultanée, le temps de traitement du dernier job de la rafale ne dépasse pas de plus de 50% celui d'un job unique, aucun service ne crashe.

---

## **3. Déploiement en Production (VPS) et "Go-Live"**

### **3.1 Architecture de Déploiement**

* **Contrôles :**
  * Reverse-proxy avec HTTPS (Let’s Encrypt).
  * Réseaux Docker isolés.
  * **Configuration du Pare-feu (Firewall) :** Seuls les ports SSH/80/443 doivent être ouverts sur l'extérieur.
* **Critères d’acceptation :** Déploiement réussi sur un VPS de staging avec configuration réseau sécurisée.

### **3.2 Critères "Go-Live"**

* Tous les critères d'acceptation des sections 2.1 à 2.14 sont au **vert**.
* Test E2E "bilan complet" **vert**.
* Monitoring et Alerting **actifs et testés**.

---

## **4. Plan de Tests "Chaîne Complète"**

1. **Scénario Nominal :** Un élève, du login à la réception de l'e-mail.
2. **Scénarios Dégradés :** Coupure des API externes, de Redis, de S3, de la DB pour valider la robustesse et les alertes.
3. **Scénario de Charge :** La "rafale" de 30 élèves, puis un test de 100 bilans en parallèle pour mesurer le p95 et les coûts.

---

Ce cahier des charges constitue la feuille de route finale pour l'audit. Il est exhaustif et aligné avec les exigences d'un déploiement en production de haute qualité.
