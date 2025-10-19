\
-- E2E — Réseau social (PostgreSQL)
-- Usage: psql -d votre_base -f e2e_reseau_psql.sql

-- 1) DDL
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

-- 2) IMPORT
\copy utilisateur(id_user,pseudo,email,date_inscription) FROM 'reseau_utilisateur.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy relation(id_user_src,id_user_dst,type) FROM 'reseau_relation.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy publication(id_pub,id_user,contenu,date_pub) FROM 'reseau_publication.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy aime(id_user,id_pub,date_like) FROM 'reseau_aime.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy commentaire(id_com,id_pub,id_user,contenu,date_com) FROM 'reseau_commentaire.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');

-- 3) Vues & contrôles
CREATE OR REPLACE VIEW vue_likes AS
SELECT p.id_pub, p.id_user, COUNT(a.id_user) AS likes
FROM publication p LEFT JOIN aime a ON a.id_pub = p.id_pub
GROUP BY p.id_pub, p.id_user;

-- Comptes par table
SELECT 'utilisateur' AS table, COUNT(*) AS n FROM utilisateur
UNION ALL SELECT 'relation', COUNT(*) FROM relation
UNION ALL SELECT 'publication', COUNT(*) FROM publication
UNION ALL SELECT 'aime', COUNT(*) FROM aime
UNION ALL SELECT 'commentaire', COUNT(*) FROM commentaire;

-- Top 3 publications par utilisateur (fenêtre)
WITH rk AS (
  SELECT v.*, RANK() OVER (PARTITION BY id_user ORDER BY likes DESC) AS rg
  FROM vue_likes v
)
SELECT * FROM rk WHERE rg <= 3 ORDER BY id_user, likes DESC, id_pub;

-- Publications jamais likées
SELECT p.* FROM publication p WHERE NOT EXISTS (SELECT 1 FROM aime a WHERE a.id_pub = p.id_pub);
