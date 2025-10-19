# PLAN_DE_TESTS — NSI / BDD_NSI
**Dernière mise à jour : 19 octobre 2025**

Ce plan couvre la **page Élève**, la **page Enseignant**, le **Playground SQL**, les **ressources CSV/SQL**, et la **qualité pédagogique** (indices/solutions, progressivité, MCD/Mocodo). Les tests sont organisés en **acceptation (Gherkin)**, **fonctionnels**, **accessibilité**, **performance**, **compatibilité**, et **non‑régression**.

---

## 1. Périmètre
- **Standalone** `index.html` (AlaSQL + import CSV)
- **React/Next.js** (mêmes comportements)
- Datasets : **Ciné**, **Réseau**, **Biblio**, **Vélo**, **Classe**
- SQL : **DDL**, **import** (Postgres/SQLite), **E2E**, **solutions**

---

## 2. Tests d’acceptation (Gherkin)

### 2.1 Import & requête (Playground)
```
Étant donné un fichier "eleves.csv" (UTF-8, séparateur ;, en-tête),
Quand je l’importe dans le Playground,
Alors une table "eleves" est créée,
Et la requête "SELECT COUNT(*) FROM eleves" renvoie un entier >= 1,
Et aucun message d’erreur non géré n’apparaît.
```

### 2.2 Exercices : indice/solution
```
Étant donné la section "Exercices",
Quand je déploie l'exercice "Chiffre d'affaires par produit",
Alors un bloc "Indice" s'affiche avec une piste utile,
Et en cliquant sur "Solution", la requête SQL apparaît,
Et si l'interrupteur Enseignant "Afficher les solutions" = OFF, alors la solution est remplacée par un message explicite.
```

### 2.3 MCD & Mocodo
```
Étant donné l'onglet "MCD & Mocodo",
Quand je copie le patron "Bibliothèque" dans l'éditeur en ligne Mocodo,
Alors le diagramme généré correspond aux entités et cardinalités du patron.
```

### 2.4 Projets & barème
```
Étant donné l'onglet "Projets",
Alors je vois 4 projets, avec livrables, points de vigilance et un barème /20 (5 critères) + bonus jusqu'à +2.
```

### 2.5 Enseignant — interrupteurs & exécuteur
```
Étant donné l'onglet "Enseignant",
Quand je décoche "Afficher les solutions",
Alors les solutions sont masquées côté Élève après rechargement,
Et le réglage persiste (localStorage).
Quand je clique "Pré-remplir l'exécuteur (AlaSQL)" pour "Ciné",
Alors un script E2E minimal s'insère,
Et quand je clique "Exécuter", je vois des indicateurs (COUNT par table) sans erreur non gérée.
```

---

## 3. Tests fonctionnels (détail)

### 3.1 Playground SQL
- [ ] **Parser CSV** : auto‑détection `;`/`,` ; CRLF→LF ; colonnes **normalisées** en `snake_case`.
- [ ] **CREATE/INSERT** auto : TEXT par défaut ; message « Table X importée (N lignes) ».
- [ ] **Réinitialiser** : supprime toutes les tables ; aucun résidu visible dans « Tables présentes ».
- [ ] **Messages** : succès/erreur (max 5 récents). Aucune exception non rattrapée (console).

### 3.2 Exercices
- [ ] Séquences énoncé → indice → solution (toggle).
- [ ] Solutions cohérentes avec les schémas conseillés (Commerce/Biblio/Réseau).
- [ ] Exemples avancés : au moins 3 **fenêtres** et 4 **sous‑requêtes** (dont 2 corrélées) + **NOT EXISTS**.

### 3.3 MCD & Mocodo
- [ ] Patrons complets pour 3 thèmes ; diagrammes lisibles ; cardinalités et clés précisées.
- [ ] Lien/CTA vers l’éditeur en ligne ; export PNG/SVG mentionné.

### 3.4 Projets
- [ ] 4 projets (Ciné, Réseau, Biblio, Vélo) avec **livrables** et **vigilances**.
- [ ] Barème /20 (5 critères) + bonus jusqu’à +2.
- [ ] Les `solutions_*.sql` couvrent la diversité (jointures, agrégats, sous‑requêtes, fenêtres).

### 3.5 Enseignant
- [ ] **Afficher les solutions** : persistance locale + effet côté Élève.
- [ ] **Sélecteur de dataset** et liens CSV/DDL/E2E corrects.
- [ ] **Pack élève (zip)** : téléchargement d’une archive contenant `index.html`, CSV, SQL et `manifest.md`.
- [ ] **Exécuteur** : chargement du dataset sélectionné, import CSV local, exécution d’un script (DROP→CREATE→SELECT) avec résultats (≤10 lignes) et journal détaillé.

---

## 4. Accessibilité
- [ ] Navigation **clavier** complète (onglets, accordéons, boutons).
- [ ] Rôles ARIA (`role="tablist"`, `aria-expanded`, labels).
- [ ] **Focus visible** ; contrastes ≥ 4.5:1 ; tailles suffisamment lisibles.
- [ ] Textes alternatifs ou titres explicites pour schémas.

---

## 5. Performance
- [ ] Import d’un CSV de **10k lignes** → pas de freeze bloquant ; pagination ou découpage de rendu si nécessaire.
- [ ] Exécution de 10 requêtes successives → stabilité des messages et du DOM.
- [ ] Réinitialisation rapide (< 1 s sur machine standard).

---

## 6. Compatibilité navigateurs
- [ ] Chrome (dernière), Edge (dernière), Firefox (dernière).
- [ ] Mobile Safari (iOS récent) : rendu lisible, onglets accessibles, tableaux scrollables.
- [ ] Mode hors‑ligne : pages fonctionnelles (hors liens externes/CDN).

---

## 7. Non‑régression
- [ ] Modifications de `parseCSV` ne cassent pas l’import simple (séparateur, en‑tête).
- [ ] Ajout de nouveaux jeux de données n’implique aucune modification de code.
- [ ] L’état des solutions (ON/OFF) n’interfère pas avec l’exécution du Playground.

---

## 8. Tests SGBD réels

### 8.1 PostgreSQL
- [ ] `psql -f assets/sql/e2e_cine_psql.sql` crée les tables, importe les CSV et affiche les **comptages** attendus.
- [ ] Les contraintes PK/FK sont valides ; aucun import orphelin.
- [ ] Les **vues d’indicateurs** renvoient des résultats non vides.

### 8.2 SQLite
- [ ] `.read assets/sql/e2e_cine_sqlite.sql` (dans `sqlite3`) crée/importe/contrôle.
- [ ] Les `.import --skip 1` utilisent correctement le séparateur `;`.

---

## 9. Critères de réussite
- 100 % des **tests d’acceptation** passent.
- 95 % des **fonctionnels** passent ; les 5 % restants documentés avec correctifs planifiés.
- **Aucune** exception non rattrapée dans la console en parcours normal.
- Conformité **accessibilité** (checklist) et **performance** (volumétrie).

---

## 10. Rapport de test
- **Template recommandé** : *cas → étapes → attendu → obtenu → statut (OK/KO) → observations/correctifs*.
- Conservez des **captures d’écran** (exercices, Playground, projets, exécuteur).
- Archivez un **jeu de données** utilisé (CSV) et les **résultats** (exports éventuels).
