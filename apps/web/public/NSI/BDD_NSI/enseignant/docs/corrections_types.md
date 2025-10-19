# Corrections types — Enseignant (Terminale NSI — Bases de données)

Ce pack contient des **requêtes SQL prêtes à l’emploi** pour chaque sujet de projet, avec des **attendus** (ce que l’élève doit montrer).
Pour les **fonctions fenêtre**, privilégier PostgreSQL ou SQLite récents. Une **alternative sans fenêtre** est proposée quand c’est possible.

## Ciné‑Tunisie — Attendus
- Calcul de **taux de remplissage** (capacité salle vs places vendues).
- **Top 3 films** par chiffre d’affaires ; justification des jointures `reservation → seance → film`.
- Bonus : **fenêtre** par cinéma pour extraire le **meilleur film** localement.

## Réseau social lycée — Attendus
- Fil **des amis** (relation symétrique *ami*) ; tri temporel décoursant.
- **Top 3 publications par utilisateur** (fenêtre `RANK()` sur le nombre de likes).
- **Anti‑join** (publications jamais likées) via `NOT EXISTS`.

## Bibliothèque — Attendus
- **Durée moyenne** d’emprunt (dates) par **année d’édition** (jointure `emprunt → livre`).
- **Nombre d’emprunts par lecteur** vs **moyenne globale** (sous‑requête d’agrégats).
- **Premier emprunt** par lecteur (variante **sans fenêtre**).
