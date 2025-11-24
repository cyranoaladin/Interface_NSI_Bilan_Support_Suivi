# Changelog

## [Unreleased] - 2025-11-20

### 🎉 Audit Complet & Améliorations Majeures

#### Ajouté
- **Page d'accueil moderne** avec composants landing:
  - `Navbar` - Navigation principale avec liens vers gouvernance
  - `Hero` - Section héro avec titre accrocheur et CTA
  - `QuickAccess` - 3 cartes d'accès rapide (Découvrir NSI, Première, Terminale)
  - `News` - Section actualités NSI-PMF
  - `FAQ` - Questions fréquentes avec accordéon
  - `Footer` - Pied de page avec liens utiles et contact

- **Gouvernance DAO (Fondations)**:
  - Schéma Prisma: `Proposal`, `Vote`, `Comment`
  - API `/api/governance/proposals` (GET, POST)
  - API `/api/governance/proposals/[id]/vote` (POST, DELETE)
  - API `/api/governance/proposals/[id]/comments` (GET, POST)
  - Page `/governance` (placeholder UI)

- **Documentation exhaustive**:
  - `docs/RAPPORT_AUDIT_COMPLET_2025.md` - Audit approfondi de tous les composants
  - `docs/PLAN_ACTION_STRATEGIQUE_2025.md` - Roadmap 6 mois avec KPIs et budget
  - `docs/GUIDE_DEMARRAGE_RAPIDE.md` - Guide de démarrage et commandes utiles
  - `docs/README.md` - Index de la documentation

#### Modifié
- `apps/web/src/app/page.tsx` - Nouvelle page d'accueil moderne
- `prisma/schema.prisma` - Ajout modèles gouvernance (Proposal, Vote, Comment)
- `infra/docker-compose.yml` - Exposition port postgres 5434, tentative fix pgbouncer

#### Documenté
- Architecture complète avec diagrammes Mermaid
- Recommandations UI/UX avec wireframes
- Exemples de code pour chaque amélioration
- Plan d'action semaine par semaine sur 6 mois
- KPIs et métriques de succès
- Budget et gestion des risques

### 🔍 Audit Réalisé

#### Points Forts Identifiés
- Architecture solide (Next.js 14 + Worker BullMQ + PostgreSQL/pgvector)
- Pipeline de génération de bilans fonctionnel (React-PDF)
- RAG opérationnel avec embeddings Gemini
- Tests E2E Playwright robustes
- Observabilité (Prometheus/Grafana)

#### Axes d'Amélioration
- Gouvernance DAO à finaliser (API créée, UI à compléter)
- Dashboards élève/enseignant à enrichir
- Documentation utilisateur à créer
- Déploiement production à finaliser
- Tests de charge à effectuer

### 📋 Prochaines Étapes

#### Semaine 1 (20-24 Nov)
- [ ] Corriger infrastructure Docker (pgbouncer)
- [ ] Tests E2E complets
- [ ] Monitoring Prometheus/Grafana
- [ ] Documentation technique

#### Semaine 2 (27 Nov - 01 Déc)
- [ ] Finaliser API gouvernance (seuils, notifications)
- [ ] Worker analyse IA propositions
- [ ] Tests complets
- [ ] Documentation API

---


## [2025-09] Migration React-PDF
- Suppression complète du pipeline LaTeX (Mustache + latexmk).
- Ajout de composants PDF factorisés (`pdf-components.js`, `EleveBilan.js`, `EnseignantBilan.js`).
- Rendu désormais 100% React-PDF (MarkdownRenderer, ScoreTable, Header/Footer).
- Ajout de tests unitaires pour `MarkdownRenderer`.
- Nouveau guide pédagogique injecté dans RAG : `GUIDE_PEDAGOGIQUE_NSI_PMF.md`.
