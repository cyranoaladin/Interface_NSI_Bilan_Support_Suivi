-- To run: psql -d your_db -f THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- Uses \copy (client-side) so paths are local.

\copy cinema(id_cinema,nom,ville) FROM 'cine_cinema.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy salle(id_salle,id_cinema,numero,capacite) FROM 'cine_salle.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy film(id_film,titre,duree,genre) FROM 'cine_film.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy client(id_client,nom,email) FROM 'cine_client.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy seance(id_seance,id_salle,id_film,date_heure,prix) FROM 'cine_seance.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy reservation(id_res,id_client,id_seance,nb_places,total) FROM 'cine_reservation.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
