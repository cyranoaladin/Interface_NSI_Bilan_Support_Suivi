\
-- E2E — Ciné‑Tunisie (SQLite)
-- Usage: sqlite3 cine.sqlite < e2e_cine_sqlite.sql
PRAGMA foreign_keys = ON;

-- 1) DDL
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
  id_seance  TEXT PRIMARY KEY,
  id_salle   TEXT NOT NULL,
  id_film    TEXT NOT NULL,
  date_heure TEXT NOT NULL,
  prix       REAL NOT NULL CHECK (prix >= 0),
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

-- 2) IMPORT (.import)
.mode ascii
.separator ;
.import --skip 1 cine_cinema.csv cinema
.import --skip 1 cine_salle.csv salle
.import --skip 1 cine_film.csv film
.import --skip 1 cine_client.csv client
.import --skip 1 cine_seance.csv seance
.import --skip 1 cine_reservation.csv reservation

-- 3) Vues & contrôles
CREATE VIEW IF NOT EXISTS vue_places_par_seance AS
SELECT se.id_seance, COUNT(r.id_res) AS nb_reservations, COALESCE(SUM(r.nb_places),0) AS places_vendues
FROM seance se LEFT JOIN reservation r ON r.id_seance = se.id_seance
GROUP BY se.id_seance;

CREATE VIEW IF NOT EXISTS vue_taux_remplissage AS
SELECT se.id_seance, sa.capacite, v.places_vendues,
       ROUND(100.0 * v.places_vendues/sa.capacite, 1) AS taux_remplissage
FROM seance se
JOIN salle sa ON sa.id_salle = se.id_salle
JOIN vue_places_par_seance v ON v.id_seance = se.id_seance;

SELECT 'cinema' AS table, COUNT(*) AS n FROM cinema
UNION ALL SELECT 'salle', COUNT(*) FROM salle
UNION ALL SELECT 'film', COUNT(*) FROM film
UNION ALL SELECT 'client', COUNT(*) FROM client
UNION ALL SELECT 'seance', COUNT(*) FROM seance
UNION ALL SELECT 'reservation', COUNT(*) FROM reservation;

SELECT f.titre, SUM(r.total) AS ca
FROM reservation r JOIN seance se ON se.id_seance=r.id_seance JOIN film f ON f.id_film=se.id_film
GROUP BY f.titre ORDER BY ca DESC LIMIT 5;

SELECT * FROM vue_taux_remplissage ORDER BY taux_remplissage DESC LIMIT 5;
