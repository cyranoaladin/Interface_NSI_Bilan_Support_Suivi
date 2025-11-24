-- To run: sqlite3 mydb.sqlite < THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- If your sqlite3 supports it, we use '.import --skip 1' to skip header lines.
-- If not, remove headers manually (keep column order) before import.

PRAGMA foreign_keys = ON;
.separator ;
.import --skip 1 reseau_utilisateur.csv utilisateur
.import --skip 1 reseau_relation.csv relation
.import --skip 1 reseau_publication.csv publication
.import --skip 1 reseau_aime.csv aime
.import --skip 1 reseau_commentaire.csv commentaire
