-- DDL — Projet Réseau social lycée
DROP TABLE IF EXISTS commentaire;
DROP TABLE IF EXISTS aime;
DROP TABLE IF EXISTS relation;
DROP TABLE IF EXISTS publication;
DROP TABLE IF EXISTS utilisateur;

CREATE TABLE utilisateur (
  id_user          TEXT PRIMARY KEY,
  pseudo           TEXT UNIQUE NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  date_inscription DATE NOT NULL
);

CREATE TABLE relation (
  id_user_src TEXT NOT NULL,
  id_user_dst TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('ami','suit')),
  PRIMARY KEY (id_user_src, id_user_dst, type),
  FOREIGN KEY (id_user_src) REFERENCES utilisateur(id_user),
  FOREIGN KEY (id_user_dst) REFERENCES utilisateur(id_user)
);

CREATE TABLE publication (
  id_pub   TEXT PRIMARY KEY,
  id_user  TEXT NOT NULL,
  contenu  TEXT NOT NULL,
  date_pub DATE NOT NULL,
  FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
);

CREATE TABLE aime (
  id_user   TEXT NOT NULL,
  id_pub    TEXT NOT NULL,
  date_like DATE NOT NULL,
  PRIMARY KEY (id_user, id_pub),
  FOREIGN KEY (id_user) REFERENCES utilisateur(id_user),
  FOREIGN KEY (id_pub)  REFERENCES publication(id_pub)
);

CREATE TABLE commentaire (
  id_com   TEXT PRIMARY KEY,
  id_pub   TEXT NOT NULL,
  id_user  TEXT NOT NULL,
  contenu  TEXT NOT NULL,
  date_com DATE NOT NULL,
  FOREIGN KEY (id_pub)  REFERENCES publication(id_pub),
  FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
);

-- Index FK
CREATE INDEX IF NOT EXISTS idx_pub_user  ON publication(id_user);
CREATE INDEX IF NOT EXISTS idx_like_pub  ON aime(id_pub);
CREATE INDEX IF NOT EXISTS idx_comm_pub  ON commentaire(id_pub);
