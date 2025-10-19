-- To run: psql -d your_db -f THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- Uses \copy (client-side) so paths are local.

\copy utilisateur(id_user,pseudo,email,date_inscription) FROM 'reseau_utilisateur.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy relation(id_user_src,id_user_dst,type) FROM 'reseau_relation.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy publication(id_pub,id_user,contenu,date_pub) FROM 'reseau_publication.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy aime(id_user,id_pub,date_like) FROM 'reseau_aime.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy commentaire(id_com,id_pub,id_user,contenu,date_com) FROM 'reseau_commentaire.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
