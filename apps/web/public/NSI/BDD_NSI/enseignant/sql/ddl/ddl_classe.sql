-- DDL — Jeux "classe" (élèves / profs / options)
-- Dialecte : SQL standard (compatible SQLite/PostgreSQL)
-- Activez si besoin : PRAGMA foreign_keys=ON;  -- (SQLite)

DROP TABLE IF EXISTS inscriptions_options;
DROP TABLE IF EXISTS eleves;
DROP TABLE IF EXISTS profs;
DROP TABLE IF EXISTS options;

CREATE TABLE profs (
  id_prof    TEXT PRIMARY KEY,
  nom        TEXT NOT NULL,
  prenom     TEXT NOT NULL,
  matiere    TEXT NOT NULL,
  email      TEXT UNIQUE
);

CREATE TABLE eleves (
  id_eleve   TEXT PRIMARY KEY,
  nom        TEXT NOT NULL,
  prenom     TEXT NOT NULL,
  classe     TEXT NOT NULL,
  id_prof_pp TEXT,
  email      TEXT UNIQUE,
  FOREIGN KEY (id_prof_pp) REFERENCES profs(id_prof)
);

CREATE TABLE options (
  id_option  TEXT PRIMARY KEY,
  nom        TEXT NOT NULL,
  type       TEXT NOT NULL
);

CREATE TABLE inscriptions_options (
  id_eleve   TEXT NOT NULL,
  id_option  TEXT NOT NULL,
  PRIMARY KEY (id_eleve, id_option),
  FOREIGN KEY (id_eleve)  REFERENCES eleves(id_eleve),
  FOREIGN KEY (id_option) REFERENCES options(id_option)
);

-- Index conseillés
CREATE INDEX IF NOT EXISTS idx_eleves_pp   ON eleves(id_prof_pp);
CREATE INDEX IF NOT EXISTS idx_insc_eleve  ON inscriptions_options(id_eleve);
CREATE INDEX IF NOT EXISTS idx_insc_option ON inscriptions_options(id_option);
