-- To run: sqlite3 mydb.sqlite < THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- If your sqlite3 supports it, we use '.import --skip 1' to skip header lines.
-- If not, remove headers manually (keep column order) before import.

PRAGMA foreign_keys = ON;
.separator ;
.import --skip 1 cine_cinema.csv cinema
.import --skip 1 cine_salle.csv salle
.import --skip 1 cine_film.csv film
.import --skip 1 cine_client.csv client
.import --skip 1 cine_seance.csv seance
.import --skip 1 cine_reservation.csv reservation
