# Smoke test préproduction — guide éclair

Ce guide décrit comment lancer un smoke test unique avant l’ouverture (vérifie API, scénarios UI critiques, et charge 24 élèves) et où retrouver les PDFs générés.

## 1) Commande unique

- Depuis la racine du repo (en local, si votre environnement Playwright est prêt):

```bash
npm run preprod:smoke
```

- Dans le conteneur (recommandé, Playwright déjà provisionné):

```bash
docker compose -f infra/docker-compose.yml exec -T web npm run preprod:smoke
```

Le script enchaîne automatiquement:
1. API (tests/e2e/api_validation.spec.ts)
2. UI critiques (student_golden_path + teacher_consultation)
3. Charge 24 élèves (load_class)

À la fin, un résumé clair est imprimé: PASSED/FAILED/TOTAL par bloc + Overall. Le process sort avec un code non‑zéro si un bloc échoue.

## 2) Où sont les PDFs générés ?

- Dans le conteneur worker:
  - `/app/docs/artifacts_premium_final`
- Sur votre machine (bind‑mount du repo → `/app`):
  - `/home/alaeddine/Interface_NSI_2025_2026_local/docs/artifacts_premium_final`

Vous y trouverez, pour chaque tentative, deux fichiers:
- `eleve_<attemptId>.pdf`
- `enseignant_<attemptId>.pdf`

## 3) Critère de succès avant ouverture

- Les 3 blocs doivent être PASS (API, UI Critical, Load)
- En cas d’échec, inspecter d’abord:
  - logs `web`/`worker` (docker compose logs)
  - `/api/metrics` (bullmq waiting/active/failed)
  - la présence/validité des PDFs dans `docs/artifacts_premium_final`

Si tout est PASS → prêt pour l’ouverture demain matin.
