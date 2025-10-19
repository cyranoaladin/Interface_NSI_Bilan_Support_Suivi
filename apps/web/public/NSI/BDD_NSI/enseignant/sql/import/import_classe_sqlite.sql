-- To run: sqlite3 mydb.sqlite < THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- If your sqlite3 supports it, we use '.import --skip 1' to skip header lines.
-- If not, remove headers manually (keep column order) before import.

PRAGMA foreign_keys = ON;
.separator ;
.import --skip 1 profs.csv profs
.import --skip 1 eleves.csv eleves
.import --skip 1 options.csv options
.import --skip 1 inscriptions_options.csv inscriptions_options
