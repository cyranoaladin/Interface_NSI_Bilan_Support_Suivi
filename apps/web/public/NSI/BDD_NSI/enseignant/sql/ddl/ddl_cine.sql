-- DDL — Projet Ciné-Tunisie
DROP TABLE IF EXISTS reservation;
DROP TABLE IF EXISTS seance;
DROP TABLE IF EXISTS salle;
DROP TABLE IF EXISTS film;
DROP TABLE IF EXISTS client;
DROP TABLE IF EXISTS cinema;

CREATE TABLE cinema (
  id_cinema TEXT PRIMARY KEY,
  nom       TEXT NOT NULL,
  ville     TEXT NOT NULL
);

CREATE TABLE salle (
  id_salle  TEXT PRIMARY KEY,
  id_cinema TEXT NOT NULL,
  numero    INTEGER NOT NULL,
  capacite  INTEGER NOT NULL CHECK (capacite > 0),
  FOREIGN KEY (id_cinema) REFERENCES cinema(id_cinema),
  UNIQUE (id_cinema, numero)
);

CREATE TABLE film (
  id_film TEXT PRIMARY KEY,
  titre   TEXT NOT NULL,
  duree   INTEGER NOT NULL CHECK (duree > 0),
  genre   TEXT NOT NULL
);

CREATE TABLE client (
  id_client TEXT PRIMARY KEY,
  nom       TEXT NOT NULL,
  email     TEXT UNIQUE
);

CREATE TABLE seance (
  id_seance TEXT PRIMARY KEY,
  id_salle  TEXT NOT NULL,
  id_film   TEXT NOT NULL,
  date_heure DATETIME NOT NULL,
  prix      REAL NOT NULL CHECK (prix >= 0),
  FOREIGN KEY (id_salle) REFERENCES salle(id_salle),
  FOREIGN KEY (id_film)  REFERENCES film(id_film)
);

CREATE TABLE reservation (
  id_res    TEXT PRIMARY KEY,
  id_client TEXT NOT NULL,
  id_seance TEXT NOT NULL,
  nb_places INTEGER NOT NULL CHECK (nb_places >= 1),
  total     REAL NOT NULL CHECK (total >= 0),
  FOREIGN KEY (id_client) REFERENCES client(id_client),
  FOREIGN KEY (id_seance) REFERENCES seance(id_seance)
);

-- Index FK
CREATE INDEX IF NOT EXISTS idx_salle_cinema ON salle(id_cinema);
CREATE INDEX IF NOT EXISTS idx_seance_salle ON seance(id_salle);
CREATE INDEX IF NOT EXISTS idx_seance_film  ON seance(id_film);
CREATE INDEX IF NOT EXISTS idx_res_client   ON reservation(id_client);
CREATE INDEX IF NOT EXISTS idx_res_seance   ON reservation(id_seance);
