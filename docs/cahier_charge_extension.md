# Cahier des charges — Extension « Programme & Quiz » (Terminale NSI)

> Version: 2025-10 — **Source de vérité** pour DB, API, Workers, UI, RAG/LLM.  
> Ce document consolide les choix validés et aligne les livrables des étapes 3→11.

---

## 1) Invariants techniques (bloquants)

- **Vector / RAG**
  - Provider **GEMINI** (embeddings), `VECTOR_DIM=768`.
  - **Réutiliser** les tables existantes `documents` et `document_chunks` (colonne embedding existante).
  - **Aucune nouvelle** table ou index vectoriel ne doit être créé.
- **Stockage**
  - Réutiliser les variables **S3\_*** existantes (noms inchangés).
- **RBAC & session**
  - JWT en cookie `session`. Rôles supportés : `TEACHER`, `STUDENT`. Interdiction d’introduire d’autres rôles.
- **Prisma / migrations**
  - `add-only`: pas de drop/rename sur le schéma existant.
  - FK en `ON DELETE SET NULL` quand raisonnable.
  - Extension `pgvector` **non** rejouée.
- **Feature Flags** (booléens `0|1`, **OFF par défaut**)
  - `FEATURE_CURRICULUM`, `FEATURE_QUIZ`, `FEATURE_RAG`, `FEATURE_ADMIN`.
- **Runner Python**
  - `PY_RUNNER_URL` (service externe ou mock). Timeout par test : 10s.
- **CI / Qualité**
  - Lint + Tests + Build ne régressent pas. Nouveaux codes couverts (≥85% lignes).

**Constats de l’audit (Étape 1)**
- Tables `documents/chunks` OK (dim=768), provider GEMINI OK.
- Variables S3 existantes à réutiliser.
- Workers actuels : `generate_reports` OK ; **queue `rag_ingest` produite côté web mais non consommée côté worker** → sera couverte à l’étape 7.
- Lint script présent mais **eslint** absent ; pas de CI détectée ; `.env.example` manquant → **à traiter Étape 4 et Étape 9**.

---

## 2) Modèle de données cible (Nouveaux modèles)

Ajouts **sans casser l’existant**. Voir Étape 3 pour le détail Prisma. Concepts :

- **CurrTheme** (arbre de thèmes, sous-thèmes)
- **Notion** (feuilles rattachées à un thème)
- **TeacherCoverage** (journal des notions couvertes en classe)
- **Resource** & **ResourceNotion** (ressources S3 et leurs liens vers notions)
- **Exercise** & **ExerciseNotion** (banque d’exercices)
- **Quiz**, **QuizItem**, **QuizSubmission**, **SubmissionItem**, **SubmissionItemGrading**
- **StudentMastery** (maîtrise notionnelle par élève)
- **DocumentNotion** (lien entre documents existants et notions)

Enums : `ExerciseType { QCM, OUVERT, CODING }`, `Difficulty { EASY, MEDIUM, HARD }`.

**Contraintes**
- Index usuels (FK, `order`, `code`).
- `ON DELETE SET NULL` sur refs non-critiques ; `CASCADE` sur tables de liaison M:N.

---

## 3) Contrats d’API (App Router)

**Toutes** les routes renvoient `{ ok: true, data }` ou `{ ok: false, error, details? }`.  
**Zod** pour valider body/query. **RBAC middleware** : extrait `role` depuis le cookie `session`.

- `GET /api/curriculum/tree` *(flag `FEATURE_CURRICULUM`)*  
  **Res** `{ themes: Array<{ id, code, title, order, parentId?, notions: Array<{id, code, title}> }> }`

- `POST /api/curriculum/coverage` *(TEACHER)*  
  **Body** `{ entries: Array<{ notionId: string, coveredAt?: string, durationMin?: number, notes?: string, groupId?: string }> }`  
  **Res** `{ created: number }`

- `POST /api/resources/link-notions` *(TEACHER)*  
  **Body** `{ resourceId: string, notionIds: string[] }`  
  **Res** `{ linked: number }`

- `GET /api/quiz/[id]`  
  **Res** `{ quiz: { id, title?, items: Array<{ id, order, exercise: { id, type, title, statementMd, difficulty } }> } }`

- `POST /api/quiz/[id]` *(submit)*  
  **Body** `{ items: Array<{ quizItemId: string, answerJson?: unknown, codePy?: string }> }`  
  **Res** `{ submissionId: string }`

- `POST /api/quiz/generate` *(TEACHER ou STUDENT)*  
  **Body** `{ target: { studentId?: string, notionIds?: string[] }, size?: number, difficulty?: "EASY"|"MEDIUM"|"HARD" }`  
  **Res** `{ quizId: string }`

- `GET /api/submission/[id]/result`  
  **Res** `{ submissionId, score: number, items: Array<{ quizItemId, score: number, feedback?: any, codeReview?: any }> }`

- `GET /api/student/mastery?studentId=...`  
  **Res** `{ mastery: Array<{ notionId, mastery: number }> }`

---

## 4) Workers (BullMQ)

Queues & payloads :

- `ingest-doc` → `{ resourceId: string }`  
  ➜ Parcours `document_chunks`, propose des `notionIds` par similarité (GEMINI-768), écrit `DocumentNotion`.

- `execute-tests` → `{ submissionItemId: string }`  
  ➜ Pour `CODING`: appelle `${PY_RUNNER_URL}/run` avec `{ code, tests }`; calcule score (tests passés / total).

- `grade-submission` → `{ submissionId: string }`  
  ➜ Agrège scores QCM/CODING ; pour OUVERT : LLM avec `rubricJson` → `{score, feedback}`.  
  ➜ Met à jour `StudentMastery` (EMA : `new = 0.7*old + 0.3*score`).

**Note audit** : la queue `rag_ingest` est côté web mais non consommée — l’implémentation worker est **exigée** à l’étape 7.

---

## 5) UI (pages & composants)

### Enseignant — `/dashboard/teacher/program` *(FEATURE_CURRICULUM=1)*
- **Arbre Programme** (thèmes/notions) : checkbox « couvert », badge % couverture.
- **Journal** : timeline `TeacherCoverage` (filtre par groupe/date).
- **Ressources** : upload S3 + liaison multi-notions + recherche RAG.

### Élève
- `/quiz/[id]/play` : QCM/OUVERT/CODING (Monaco Python), autosave locale, soumission.
- `/submission/[id]/result` : score global + détail item (feedback/code review), liens ressources.
- **Widget** `StudentProgress` : barre/heatmap par notion (via `/api/student/mastery`).

---

## 6) Sécurité & conformité

- RBAC strict (TEACHER vs STUDENT).  
- Uploads S3 : antivirus optionnel, whitelist MIME, taille max (ex: 20 Mo), signed URLs.  
- Runner : timeouts, sandbox, pas d’accès réseau sortant pendant l’exécution utilisateur.  
- Rate-limit : génération de quiz et grading LLM.  
- Journaux : aucune fuite de secrets ; traces minimales (GDPR friendly).

---

## 7) Tests & CI

- **Unitaires** ≥ 85 % des nouvelles lignes (parser YAML, quiz generator, graders, RBAC middleware).  
- **Intégration** : upload→ingest→search, quiz→submit→grade (mocks autorisés).  
- **E2E** (Playwright) : smoke teacher/élève avec flags ON.  
- **CI** : lint, test, build.  
- **Guard Prisma** : la pipeline échoue si des modèles existants sont modifiés autrement qu’en **add-only**.

---

## 8) Décisions validées

- Embeddings **GEMINI** dimension **768** ; ré-usage strict des tables `documents`/`document_chunks`.  
- Variables S3 actuelles non modifiées.  
- Flags OFF par défaut.  
- Pas de nouvelle table/index vectoriel.  
- Migrations add-only.  
- Contrats d’API ci-dessus gelés (changement = arbitrage).  
- Worker `rag_ingest` à implémenter (manquant).

---

## 9) Checklist DoD (Definition of Done)

- Flags OFF ⇒ aucune régression ; Flags ON ⇒ nouvelles features utilisables.  
- Migrations passent, aucune atteinte au schéma existant.  
- Seed YAML Terminale NSI idempotent.  
- API conforme (200/401/403 testés).  
- Workers opérationnels (mocks OK en dev).  
- UI teacher/élève fonctionnelle (alpha).  
- CI verte ; guard Prisma actif.  
