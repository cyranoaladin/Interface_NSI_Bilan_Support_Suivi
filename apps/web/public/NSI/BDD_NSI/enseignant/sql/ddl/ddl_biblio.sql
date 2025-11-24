-- DDL — Projet Bibliothèque
DROP TABLE IF EXISTS emprunt;
DROP TABLE IF EXISTS ecrire;
DROP TABLE IF EXISTS livre;
DROP TABLE IF EXISTS auteur;
DROP TABLE IF EXISTS lecteur;

CREATE TABLE lecteur (
  id_lecteur TEXT PRIMARY KEY,
  nom        TEXT NOT NULL,
  email      TEXT UNIQUE
);

CREATE TABLE auteur (
  id_auteur TEXT PRIMARY KEY,
  nom       TEXT NOT NULL
);

CREATE TABLE livre (
  id_livre TEXT PRIMARY KEY,
  titre    TEXT NOT NULL,
  annee    INTEGER
);

CREATE TABLE ecrire (
  id_auteur TEXT NOT NULL,
  id_livre  TEXT NOT NULL,
  role      TEXT,
  PRIMARY KEY (id_auteur, id_livre),
  FOREIGN KEY (id_auteur) REFERENCES auteur(id_auteur),
  FOREIGN KEY (id_livre)  REFERENCES livre(id_livre)
);

CREATE TABLE emprunt (
  id_emprunt  TEXT PRIMARY KEY,
  id_lecteur  TEXT NOT NULL,
  id_livre    TEXT NOT NULL,
  date_debut  DATE NOT NULL,
  date_retour DATE,
  FOREIGN KEY (id_lecteur) REFERENCES lecteur(id_lecteur),
  FOREIGN KEY (id_livre)   REFERENCES livre(id_livre),
  CHECK (date_retour IS NULL OR date_retour >= date_debut)
);

-- Index FK
CREATE INDEX IF NOT EXISTS idx_emp_lecteur ON emprunt(id_lecteur);
CREATE INDEX IF NOT EXISTS idx_emp_livre   ON emprunt(id_livre);
