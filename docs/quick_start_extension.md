# Quick start — Extension Programme & Quiz

1) Copier `.env.example` → `.env` et activer les flags:

```
FEATURE_CURRICULUM=1
FEATURE_QUIZ=1
FEATURE_RAG=1
```

2) Définir `JWT_SECRET`, `GEMINI_API_KEY`, `REDIS_URL`.
3) (Optionnel) Démarrer un runner Python compatible à `PY_RUNNER_URL`.
4) Lancer la seed curriculum:

```
npm run seed:curriculum
```
