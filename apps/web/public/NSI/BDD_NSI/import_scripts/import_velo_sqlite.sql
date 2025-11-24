-- To run: sqlite3 mydb.sqlite < THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- If your sqlite3 supports it, we use '.import --skip 1' to skip header lines.
-- If not, remove headers manually (keep column order) before import.

PRAGMA foreign_keys = ON;
.separator ;
.import --skip 1 velo_station.csv station
.import --skip 1 velo_usager.csv usager
.import --skip 1 velo_velo.csv velo
.import --skip 1 velo_trajet.csv trajet
