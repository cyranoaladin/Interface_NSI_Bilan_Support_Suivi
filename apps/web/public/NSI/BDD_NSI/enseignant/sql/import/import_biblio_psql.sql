-- To run: psql -d your_db -f THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- Uses \copy (client-side) so paths are local.

\copy lecteur(id_lecteur,nom,email) FROM 'biblio_lecteur.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy auteur(id_auteur,nom) FROM 'biblio_auteur.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy livre(id_livre,titre,annee) FROM 'biblio_livre.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy ecrire(id_auteur,id_livre,role) FROM 'biblio_ecrire.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy emprunt(id_emprunt,id_lecteur,id_livre,date_debut,date_retour) FROM 'biblio_emprunt.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
