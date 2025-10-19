-- To run: sqlite3 mydb.sqlite < THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- If your sqlite3 supports it, we use '.import --skip 1' to skip header lines.
-- If not, remove headers manually (keep column order) before import.

PRAGMA foreign_keys = ON;
.separator ;
.import --skip 1 biblio_lecteur.csv lecteur
.import --skip 1 biblio_auteur.csv auteur
.import --skip 1 biblio_livre.csv livre
.import --skip 1 biblio_ecrire.csv ecrire
.import --skip 1 biblio_emprunt.csv emprunt
