-- To run: psql -d your_db -f THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- Uses \copy (client-side) so paths are local.

\copy profs(id_prof,nom,prenom,matiere,email) FROM 'profs.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy eleves(id_eleve,nom,prenom,classe,id_prof_pp,email) FROM 'eleves.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy options(id_option,nom,type) FROM 'options.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy inscriptions_options(id_eleve,id_option) FROM 'inscriptions_options.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
