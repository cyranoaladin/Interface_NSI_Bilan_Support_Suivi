\
-- E2E — Parc vélo (PostgreSQL)
-- Usage: psql -d votre_base -f e2e_velo_psql.sql

-- 1) DDL
DROP TABLE IF EXISTS trajet;
DROP TABLE IF EXISTS velo;
DROP TABLE IF EXISTS usager;
DROP TABLE IF EXISTS station;

CREATE TABLE station (
  id_station TEXT PRIMARY KEY,
  nom        TEXT NOT NULL,
  quartier   TEXT NOT NULL,
  capacite   INTEGER NOT NULL CHECK (capacite > 0)
);
CREATE TABLE usager (
  id_usager        TEXT PRIMARY KEY,
  type_abonnement  TEXT NOT NULL CHECK (type_abonnement IN ('mensuel','annuel','occasionnel'))
);
CREATE TABLE velo (
  id_velo    TEXT PRIMARY KEY,
  id_station TEXT,
  statut     TEXT NOT NULL CHECK (statut IN ('en_service','maintenance','indisponible')),
  FOREIGN KEY (id_station) REFERENCES station(id_station)
);
CREATE TABLE trajet (
  id_trajet       TEXT PRIMARY KEY,
  id_velo         TEXT NOT NULL,
  id_usager       TEXT NOT NULL,
  station_depart  TEXT NOT NULL,
  station_arrivee TEXT NOT NULL,
  depart          TIMESTAMP NOT NULL,
  arrivee         TIMESTAMP NOT NULL,
  FOREIGN KEY (id_velo)   REFERENCES velo(id_velo),
  FOREIGN KEY (id_usager) REFERENCES usager(id_usager),
  FOREIGN KEY (station_depart)  REFERENCES station(id_station),
  FOREIGN KEY (station_arrivee) REFERENCES station(id_station),
  CHECK (arrivee >= depart)
);

-- 2) IMPORT
\copy station(id_station,nom,quartier,capacite) FROM 'velo_station.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy usager(id_usager,type_abonnement) FROM 'velo_usager.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy velo(id_velo,id_station,statut) FROM 'velo_velo.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy trajet(id_trajet,id_velo,id_usager,station_depart,station_arrivee,depart,arrivee) FROM 'velo_trajet.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');

-- 3) Vues & contrôles
CREATE OR REPLACE VIEW vue_duree_min AS
SELECT station_depart, ROUND(AVG(EXTRACT(EPOCH FROM (arrivee - depart))/60.0),1) AS duree_min_moy
FROM trajet GROUP BY station_depart;

CREATE OR REPLACE VIEW vue_activite AS
SELECT s.id_station, s.nom,
       SUM((t.station_depart = s.id_station)::int) AS departs,
       SUM((t.station_arrivee = s.id_station)::int) AS arrivees
FROM station s LEFT JOIN trajet t
ON t.station_depart = s.id_station OR t.station_arrivee = s.id_station
GROUP BY s.id_station, s.nom;

SELECT 'station' AS table, COUNT(*) AS n FROM station
UNION ALL SELECT 'usager', COUNT(*) FROM usager
UNION ALL SELECT 'velo', COUNT(*) FROM velo
UNION ALL SELECT 'trajet', COUNT(*) FROM trajet;

SELECT * FROM vue_duree_min ORDER BY duree_min_moy;
SELECT * FROM vue_activite ORDER BY departs DESC, arrivees DESC;
