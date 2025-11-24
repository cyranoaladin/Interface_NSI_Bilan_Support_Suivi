\
-- E2E — Réseau social (SQLite)
-- Usage: sqlite3 reseau.sqlite < e2e_reseau_sqlite.sql
PRAGMA foreign_keys = ON;

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
  date_inscription TEXT NOT NULL
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
  date_pub TEXT NOT NULL,
  FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
);
CREATE TABLE aime (
  id_user   TEXT NOT NULL,
  id_pub    TEXT NOT NULL,
  date_like TEXT NOT NULL,
  PRIMARY KEY (id_user, id_pub),
  FOREIGN KEY (id_user) REFERENCES utilisateur(id_user),
  FOREIGN KEY (id_pub)  REFERENCES publication(id_pub)
);
CREATE TABLE commentaire (
  id_com   TEXT PRIMARY KEY,
  id_pub   TEXT NOT NULL,
  id_user  TEXT NOT NULL,
  contenu  TEXT NOT NULL,
  date_com TEXT NOT NULL,
  FOREIGN KEY (id_pub)  REFERENCES publication(id_pub),
  FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
);

-- 2) IMPORT
.mode ascii
.separator ;
.import --skip 1 reseau_utilisateur.csv utilisateur
.import --skip 1 reseau_relation.csv relation
.import --skip 1 reseau_publication.csv publication
.import --skip 1 reseau_aime.csv aime
.import --skip 1 reseau_commentaire.csv commentaire

-- 3) Vues & contrôles
CREATE VIEW IF NOT EXISTS vue_likes AS
SELECT p.id_pub, p.id_user, COUNT(a.id_user) AS likes
FROM publication p LEFT JOIN aime a ON a.id_pub = p.id_pub
GROUP BY p.id_pub, p.id_user;

SELECT 'utilisateur' AS table, COUNT(*) AS n FROM utilisateur
UNION ALL SELECT 'relation', COUNT(*) FROM relation
UNION ALL SELECT 'publication', COUNT(*) FROM publication
UNION ALL SELECT 'aime', COUNT(*) FROM aime
UNION ALL SELECT 'commentaire', COUNT(*) FROM commentaire;

-- Alternative sans fenêtre (top 3 par user)
WITH lk AS (
  SELECT p.id_user, p.id_pub, COUNT(a.id_user) AS likes
  FROM publication p LEFT JOIN aime a ON a.id_pub = p.id_pub
  GROUP BY p.id_user, p.id_pub
)
SELECT l1.*
FROM lk l1
WHERE (SELECT COUNT(*) FROM lk l2 WHERE l2.id_user = l1.id_user AND l2.likes > l1.likes) < 3
ORDER BY id_user, likes DESC, id_pub;
