-- To run: psql -d your_db -f THIS_FILE.sql
-- Assumes CSV files are in the SAME DIRECTORY as this script.
-- Uses \copy (client-side) so paths are local.

\copy station(id_station,nom,quartier,capacite) FROM 'velo_station.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy usager(id_usager,type_abonnement) FROM 'velo_usager.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy velo(id_velo,id_station,statut) FROM 'velo_velo.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy trajet(id_trajet,id_velo,id_usager,station_depart,station_arrivee,depart,arrivee) FROM 'velo_trajet.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
