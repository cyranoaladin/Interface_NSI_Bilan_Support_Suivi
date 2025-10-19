-- DDL — Projet Parc vélo en libre-service
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
  id_velo   TEXT PRIMARY KEY,
  id_station TEXT,
  statut    TEXT NOT NULL CHECK (statut IN ('en_service','maintenance','indisponible')),
  FOREIGN KEY (id_station) REFERENCES station(id_station)
);

CREATE TABLE trajet (
  id_trajet       TEXT PRIMARY KEY,
  id_velo         TEXT NOT NULL,
  id_usager       TEXT NOT NULL,
  station_depart  TEXT NOT NULL,
  station_arrivee TEXT NOT NULL,
  depart          DATETIME NOT NULL,
  arrivee         DATETIME NOT NULL,
  FOREIGN KEY (id_velo)   REFERENCES velo(id_velo),
  FOREIGN KEY (id_usager) REFERENCES usager(id_usager),
  FOREIGN KEY (station_depart)  REFERENCES station(id_station),
  FOREIGN KEY (station_arrivee) REFERENCES station(id_station),
  CHECK (arrivee >= depart)
);

-- Index FK
CREATE INDEX IF NOT EXISTS idx_velo_station   ON velo(id_station);
CREATE INDEX IF NOT EXISTS idx_trajet_velo    ON trajet(id_velo);
CREATE INDEX IF NOT EXISTS idx_trajet_usager  ON trajet(id_usager);
CREATE INDEX IF NOT EXISTS idx_trajet_depart  ON trajet(station_depart);
CREATE INDEX IF NOT EXISTS idx_trajet_arrivee ON trajet(station_arrivee);
