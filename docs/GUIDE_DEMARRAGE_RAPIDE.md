# 🎯 GUIDE DE DÉMARRAGE RAPIDE - NSI-PMF

**Bienvenue !** Ce guide vous aidera à démarrer rapidement avec la plateforme NSI-PMF après l'audit complet.

---

## 📦 CE QUI A ÉTÉ FAIT

### ✅ Audit Complet
- **Rapport d'audit**: `docs/RAPPORT_AUDIT_COMPLET_2025.md`
- Analyse approfondie de tous les composants
- Recommandations concrètes et actionnables
- Exemples de code pour chaque amélioration

### ✅ Page d'Accueil Moderne
- **Composants créés** dans `apps/web/src/components/landing/`:
  - `Navbar.tsx` - Navigation principale
  - `Hero.tsx` - Section héro avec CTA
  - `QuickAccess.tsx` - 3 cartes d'accès rapide
  - `News.tsx` - Actualités NSI-PMF
  - `FAQ.tsx` - Questions fréquentes
  - `Footer.tsx` - Pied de page

- **Pages créées**:
  - `apps/web/src/app/page.tsx` - Page d'accueil complète
  - `apps/web/src/app/decouvrir-nsi/page.tsx` - Placeholder

### ✅ Gouvernance DAO (Fondations)
- **Schéma Prisma** mis à jour avec:
  - `Proposal` - Propositions communauté
  - `Vote` - Votes UP/DOWN
  - `Comment` - Commentaires (élèves/enseignants/IA)

- **API créées** dans `apps/web/src/app/api/governance/`:
  - `proposals/route.ts` - Liste et création propositions
  - `proposals/[id]/vote/route.ts` - Vote sur propositions
  - `proposals/[id]/comments/route.ts` - Commentaires

- **Interface UI**:
  - `apps/web/src/app/governance/page.tsx` - Page gouvernance (placeholder)

### ✅ Documentation Stratégique
- **Plan d'action**: `docs/PLAN_ACTION_STRATEGIQUE_2025.md`
  - Roadmap 6 mois détaillée
  - KPIs et métriques de succès
  - Budget et ressources
  - Gestion des risques

---

## 🚀 PROCHAINES ÉTAPES

### 1. Démarrer l'Infrastructure

```bash
# Depuis la racine du projet
cd /home/alaeddine/Interface_NSI_2025_2026_local

# Démarrer les services de base
docker compose -f infra/docker-compose.yml up -d postgres redis minio

# Attendre que les services soient prêts (30s)
sleep 30

# Vérifier l'état
docker compose -f infra/docker-compose.yml ps
```

### 2. Appliquer le Schéma de Base de Données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer le schéma (avec les nouveaux modèles Governance)
# Note: Utiliser postgres direct car pgbouncer a un problème d'image
DATABASE_URL="postgresql://nsi:CHANGE_ME@localhost:5434/nsi" npx prisma db push
```

### 3. Peupler les Données de Test

```bash
# Créer les groupes, enseignants et élèves
npm run seed:production

# Ou via Docker (si web est démarré)
docker compose -f infra/docker-compose.yml exec -T web \
  npx ts-node -P tsconfig.scripts.json /app/scripts/seed_production_data.ts
```

### 4. Démarrer l'Application

```bash
# Démarrer web + worker
docker compose -f infra/docker-compose.yml up -d web worker

# Suivre les logs
docker compose -f infra/docker-compose.yml logs -f web worker
```

### 5. Accéder à l'Application

- **Frontend**: http://localhost:3000
- **Page d'accueil**: http://localhost:3000/ (nouvelle !)
- **Gouvernance**: http://localhost:3000/governance (placeholder)
- **Login**: http://localhost:3000/login
- **Grafana**: http://localhost:3001 (admin/admin)

---

## 🧪 TESTER LES NOUVELLES FONCTIONNALITÉS

### Page d'Accueil
1. Ouvrir http://localhost:3000
2. Vérifier les sections:
   - Hero avec titre accrocheur
   - 3 cartes d'accès rapide
   - Actualités
   - FAQ (cliquer pour ouvrir/fermer)
   - Footer avec liens

### API Gouvernance
```bash
# Créer une proposition (nécessite authentification)
curl -X POST http://localhost:3000/api/governance/proposals \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_JWT_TOKEN" \
  -d '{
    "title": "Ajouter un mode sombre complet",
    "description": "Proposer un mode sombre pour toute l'interface, pas seulement la page d'accueil. Cela améliorerait le confort visuel des élèves qui travaillent le soir."
  }'

# Lister les propositions
curl http://localhost:3000/api/governance/proposals

# Voter (UP ou DOWN)
curl -X POST http://localhost:3000/api/governance/proposals/PROPOSAL_ID/vote \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_JWT_TOKEN" \
  -d '{"voteType": "UP"}'
```

---

## 📚 DOCUMENTATION DISPONIBLE

### Documents Créés Aujourd'hui
1. **`docs/RAPPORT_AUDIT_COMPLET_2025.md`** (⭐ PRINCIPAL)
   - Audit exhaustif de tous les composants
   - Architecture détaillée
   - Recommandations concrètes avec code
   - Exemples d'implémentation

2. **`docs/PLAN_ACTION_STRATEGIQUE_2025.md`**
   - Roadmap 6 mois
   - Phases détaillées semaine par semaine
   - KPIs et métriques
   - Budget et risques

3. **`docs/GUIDE_DEMARRAGE_RAPIDE.md`** (ce fichier)
   - Guide de démarrage
   - Prochaines étapes
   - Commandes utiles

### Documentation Existante
- **`README.md`** - Documentation technique complète
- **`CHANGELOG.md`** - Historique des changements
- **`docs/AUDIT_ET_AMELIORATIONS_2025.md`** - Audit précédent
- **`docs/UI_UX_PROPOSITIONS_DETAILLEES.md`** - Propositions UI/UX

---

## 🛠️ COMMANDES UTILES

### Docker
```bash
# Démarrer tous les services
docker compose -f infra/docker-compose.yml up -d

# Arrêter tous les services
docker compose -f infra/docker-compose.yml down

# Voir les logs
docker compose -f infra/docker-compose.yml logs -f [service]

# Redémarrer un service
docker compose -f infra/docker-compose.yml restart [service]

# Exécuter une commande dans un conteneur
docker compose -f infra/docker-compose.yml exec [service] [command]
```

### Base de Données
```bash
# Accéder à PostgreSQL
docker compose -f infra/docker-compose.yml exec postgres psql -U nsi -d nsi

# Backup
docker compose -f infra/docker-compose.yml exec postgres \
  pg_dump -U nsi nsi > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose -f infra/docker-compose.yml exec -T postgres \
  psql -U nsi -d nsi
```

### Tests
```bash
# Tests E2E (dans le conteneur web)
docker compose -f infra/docker-compose.yml exec -T web \
  env E2E_REPORTS_TIMEOUT_MS=120000 npm -w nsi-web run e2e

# Tests unitaires
npm test

# Tests de charge
docker compose -f infra/docker-compose.yml exec -T web \
  npm -w nsi-web run e2e:load
```

### Monitoring
```bash
# Métriques Prometheus
curl http://localhost:3000/api/metrics

# Health check
curl http://localhost:3000/api/health

# Grafana
open http://localhost:3001
```

---

## 🎯 PRIORITÉS IMMÉDIATES

### Cette Semaine (20-24 Nov)
1. ✅ **Audit complet** (FAIT)
2. ✅ **Page d'accueil** (FAIT)
3. ✅ **API gouvernance** (FAIT)
4. **Corriger infrastructure Docker**
   - Problème image pgbouncer
   - Utiliser postgres direct en dev
5. **Tests E2E complets**
   - Vérifier que tous les tests passent
   - Corriger les tests échoués
6. **Monitoring**
   - Configurer Prometheus/Grafana
   - Créer dashboards

### Semaine Prochaine (27 Nov - 01 Déc)
1. **Finaliser API gouvernance**
   - Logique seuils de vote
   - Notifications
2. **Worker analyse IA**
   - Queue governance_analysis
   - Analyse propositions
3. **Tests complets**
   - Tests E2E gouvernance
   - Tests intégration
4. **Documentation API**
   - Swagger/OpenAPI
   - Exemples

---

## 🐛 PROBLÈMES CONNUS

### 1. Image pgbouncer
**Problème**: `manifest for bitnami/pgbouncer:1.21.0 not found`

**Solution temporaire**:
```bash
# Utiliser postgres direct en dev
DATABASE_URL="postgresql://nsi:CHANGE_ME@localhost:5434/nsi"
```

**Solution permanente** (à faire):
- Retirer pgbouncer en dev
- Garder seulement en production
- Ou utiliser une image alternative

### 2. Tests E2E
**Problème**: Certains tests peuvent échouer si l'infrastructure n'est pas complète

**Solution**:
```bash
# S'assurer que tous les services sont démarrés
docker compose -f infra/docker-compose.yml up -d

# Attendre 30s
sleep 30

# Lancer les tests
docker compose -f infra/docker-compose.yml exec -T web \
  env E2E_REPORTS_TIMEOUT_MS=120000 npm -w nsi-web run e2e
```

---

## 💡 CONSEILS

### Développement
1. **Toujours** vérifier que Docker est démarré
2. **Toujours** attendre que les services soient prêts (healthchecks)
3. **Toujours** consulter les logs en cas d'erreur
4. **Toujours** faire un backup avant migration DB

### Tests
1. Lancer les tests **dans le conteneur** (pas en local)
2. Utiliser le **fast-path** pour les tests rapides
3. Vérifier les **métriques** après les tests de charge
4. Documenter les **cas limites**

### Production
1. **Jamais** commiter les secrets (.env)
2. **Toujours** tester en staging avant production
3. **Toujours** avoir un plan de rollback
4. **Toujours** monitorer après déploiement

---

## 📞 BESOIN D'AIDE ?

### Documentation
- **README.md** - Documentation technique
- **docs/RAPPORT_AUDIT_COMPLET_2025.md** - Audit complet
- **docs/PLAN_ACTION_STRATEGIQUE_2025.md** - Plan d'action

### Support
- **Email**: nsi.contact@pmf.tn
- **Issues**: GitHub Issues (si configuré)
- **Discord**: NSI-PMF (à créer)

### Ressources
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **BullMQ**: https://docs.bullmq.io
- **React-PDF**: https://react-pdf.org

---

## 🎉 FÉLICITATIONS !

Vous avez maintenant:
- ✅ Un audit complet de votre plateforme
- ✅ Une page d'accueil moderne
- ✅ Les fondations de la gouvernance DAO
- ✅ Un plan d'action stratégique sur 6 mois
- ✅ Une documentation exhaustive

**Prochaine étape**: Suivre le plan d'action semaine par semaine pour transformer NSI-PMF en plateforme pédagogique de référence !

---

**Bon courage et bonne continuation ! 🚀**

*Document créé le 20 Novembre 2025*
