# Déploiement production — nsi.labomaths.tn

Prérequis
- Docker et Docker Compose
- Réseau Docker externe: infra_nsi_network (créer si besoin: docker network create infra_nsi_network)
- Nginx reverse-proxy sur le VPS pointant le vhost nsi.labomaths.tn vers 127.0.0.1:13002

Fichier d’environnement
- Copiez .env.example en .env.production et renseignez les variables (sans secrets en clair dans le repo public).
- APP_BASE_URL=https://nsi.labomaths.tn

Build et lancement
- npm run prod:up
- Vérifier: npm run prod:health (ou curl -sSf http://127.0.0.1:13002/api/health)

Seed TAD idempotent
- npm run prod:seed:evaluations

Runbook Nginx (extrait)
- upstream 127.0.0.1:13002 pour / et /api/
- En-têtes: Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto, Upgrade/Connection pour WebSocket
- Rediriger 80 -> 443, certs Let’s Encrypt, HSTS

Vérifications post-déploiement
- GET https://nsi.labomaths.tn/api/health -> 200
- GET https://nsi.labomaths.tn/api/evaluations -> 200 (après auth)
- GET https://nsi.labomaths.tn/api/teacher/bilans?evaluationId=1 -> 200 + bilans
- GET https://nsi.labomaths.tn/api/bilans/1?studentEmail=... -> 200 + bilan

Rollback
- Conserver l’ancienne image/contener pendant 48h (rename); en cas de souci, repointer Nginx vers 13001 et relancer l’ancien conteneur.
