# NSI / BDD_NSI — README
**Dernière mise à jour : 19 octobre 2025**
**Cibles livrées :** (A) Version *standalone* `index.html` (React/Tailwind/AlaSQL via CDN, sans build) · (B) Version React/Next.js (shadcn/ui).
**Référence** : voir aussi `CAHIER_CHARGES.md` (mêmes exigences fonctionnelles et pédagogiques).

---

## 1. Objet
Ce dépôt fournit une **ressource pédagogique complète** pour la Terminale NSI sur le thème **Bases de données** :
- Cours synthétique, **MCD/Merise** (avec patrons **Mocodo**), **exercices** graduels & **avancés** (sous‑requêtes, **fenêtres**),
- **Playground SQL** intégré (AlaSQL côté navigateur) avec **import CSV**,
- **Projets** (binôme) avec **barème /20**, **grille d’évaluation A4** et **corrections types**,
- **Page Enseignant** : interrupteur d’affichage des solutions, **sélecteur de datasets**, **génération de pack élève**, **exécuteur de scripts** (pour lancer des E2E et indicateurs).

> La priorité absolue est **pédagogique** : robustesse (aucune erreur non gérée), progressivité, explications, et autonomie (fonctionne *offline*).

---

## 2. Démarrage rapide

### 2.1 Mode A — *Standalone* (recommandé pour la diffusion)
1. Téléchargez `index.html` et ouvrez‑le dans un navigateur moderne (Chrome/Edge/Firefox).
2. Onglet **Playground SQL** → **Importer un CSV** (séparateur `;` ou `,`, en‑tête obligatoire).
3. Lancez quelques requêtes, par exemple :
   ```sql
   SELECT * FROM eleves LIMIT 10;
   ```
4. Explorez les **Exercices**, **Avancé**, **MCD & Mocodo** et **Projets**.

> Les liens « sandbox:/… » pointent vers des ressources générées ici. Si vous hébergez le site ailleurs, placez ces fichiers dans un dossier `assets/` et adaptez les liens.

### 2.2 Mode B — React/Next.js (pour développement/évolution)
1. Créez un projet Next.js + Tailwind + shadcn/ui.
2. Copiez les composants (onglets, Playground, Exercices, Projets, Enseignant) en respectant la structure proposée dans `CAHIER_CHARGES.md`.
3. Vérifiez que l’**API** (aucune : tout est *client-side*) et les dépendances (React/Tailwind/AlaSQL) sont bien importées.
4. Passez les **tests d’acceptation** (voir *Plan de tests*).

---

## 3. Structure conseillée

```
NSI/BDD_NSI/
├── CAHIER_CHARGES.md
├── README.md
├── PLAN_DE_TESTS.md
├── index.html                      # version standalone (A)
└── assets/
    ├── csv/                        # datasets par thème (Ciné, Réseau, Biblio, Vélo) + "classe"
    ├── sql/
    │   ├── ddl_*.sql               # DDL par sujet
    │   ├── import_*_(psql|sqlite).sql
    │   ├── e2e_*_(psql|sqlite).sql # scripts end-to-end
    │   ├── solutions_*.sql         # solutions commentées par projet
    │   └── corrections_types.sql
    └── docs/
        ├── grille_competences_A4.html
        └── corrections_types.md
```

---

## 4. Données & ressources

### 4.1 CSV (datasets prêts à importer)
- **Ciné‑Tunisie** : `cine_cinema.csv`, `cine_salle.csv`, `cine_film.csv`, `cine_seance.csv`, `cine_client.csv`, `cine_reservation.csv`
- **Réseau social** : `reseau_utilisateur.csv`, `reseau_relation.csv`, `reseau_publication.csv`, `reseau_aime.csv`, `reseau_commentaire.csv`
- **Bibliothèque** : `biblio_lecteur.csv`, `biblio_auteur.csv`, `biblio_livre.csv`, `biblio_ecrire.csv`, `biblio_emprunt.csv`
- **Parc Vélo** : `velo_station.csv`, `velo_velo.csv`, `velo_usager.csv`, `velo_trajet.csv`
- **Jeux "classe"** : `eleves.csv`, `profs.csv`, `options.csv`, `inscriptions_options.csv`

**Spécifications CSV** : UTF‑8 ; séparateur `;` (auto `,` supporté) ; 1ʳᵉ ligne = en‑têtes ; colonnes en `snake_case`; dates ISO.

### 4.2 SQL (DDL, import, E2E, solutions)
- **DDL** : `ddl_cine.sql`, `ddl_reseau.sql`, `ddl_biblio.sql`, `ddl_velo.sql`, `ddl_classe.sql`
- **Import** : `import_*_psql.sql` (PostgreSQL via `\copy`) ; `import_*_sqlite.sql` (SQLite via `.import`)
- **E2E** : `e2e_*_psql.sql` et `e2e_*_sqlite.sql` (pipeline DROP→CREATE→IMPORT→CHECK)
- **Solutions** : `solutions_cine.sql`, `solutions_reseau.sql`, `solutions_biblio.sql`, `solutions_velo.sql`
- **Corrections types (global)** : `corrections_types.sql` + `corrections_types.md`

---

## 5. Utilisation (enseignant & élève)

### 5.1 Page Enseignant
- **Interrupteur "Afficher les solutions"** (persistance locale)
- **Sélecteur de dataset** (Ciné, Réseau, Biblio, Vélo, Classe ; + CSV perso)
- **Pack élève (zip)** : bouton « Générer le pack » qui assemble `index.html`, les CSV du thème, les scripts SQL (DDL/import/E2E/solutions) et un `manifest.md`.
- **Exécuteur SQL local (AlaSQL)** : chargement automatique du dataset sélectionné, import CSV personnalisé, exécution de scripts E2E et affichage des résultats (≤10 lignes) avec journal détaillé.

### 5.2 Page Élève
- **Cours & Fiche** ; **MCD & Mocodo** (patrons prêts à coller) ; **Exercices** (indice → solution) ; **Avancé** (fenêtres & alternatives) ; **Projets** (barème /20).
- **Playground SQL** : importer un CSV → tables auto (TEXT par défaut) → requêtes.
- Astuce : pour l’analytique, proposer d’abord une version **sans fenêtre** (sous‑requêtes), puis la version **fenêtre**.

---

## 6. Exécution des scripts (SGBD réels)

### 6.1 PostgreSQL
```bash
# Création + import + indicateurs (ex. Ciné)
psql -f assets/sql/e2e_cine_psql.sql
# ou import seul :
psql -f assets/sql/import_cine_psql.sql
```

### 6.2 SQLite
```bash
# Dans sqlite3
.read assets/sql/e2e_cine_sqlite.sql
# ou import seul :
.read assets/sql/import_cine_sqlite.sql
```

> **Note** : les commandes `\copy` (Postgres) et `.import` (SQLite) **ne** s’exécutent **pas** dans le navigateur. Utilisez la page **Playground** pour charger les CSV côté client.

---

## 7. Qualité & accessibilité
- **Zéro crash** : toutes les erreurs sont interceptées et affichées proprement.
- **Accessibilité** : navigation clavier, `aria-*`, focus visible, contrastes (WCAG 2.1 AA).
- **Performance** : pagination si >10k lignes ; rendu tabulaire optimisé.

---

## 8. Dépannage (FAQ)

- **Erreur de parsing CSV** : vérifiez l’en‑tête (ligne 1) et le séparateur (`;` par défaut, `,` accepté).
- **Colonnes avec espaces/accents** : elles sont **normalisées** en `snake_case` pour devenir des identifiants SQL valides.
- **Fenêtres non supportées (Playground)** : utilisez un SGBD réel, ou la variante « sans fenêtre » fournie.
- **Tables invisibles après reset** : utilisez **Réinitialiser** puis réimportez les CSV.

---

## 9. Licence & attribution
- Ressources pédagogiques dédiées à l’usage en classe NSI (AEFE / lycée).
- Vous pouvez adapter les CSV/SQL pour votre établissement ; conservez la mention d’origine.
