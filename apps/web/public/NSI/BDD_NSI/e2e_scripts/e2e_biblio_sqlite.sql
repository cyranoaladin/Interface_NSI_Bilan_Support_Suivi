\
-- E2E — Bibliothèque (SQLite)
-- Usage: sqlite3 biblio.sqlite < e2e_biblio_sqlite.sql
PRAGMA foreign_keys = ON;

-- 1) DDL
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
  date_debut  TEXT NOT NULL,
  date_retour TEXT,
  FOREIGN KEY (id_lecteur) REFERENCES lecteur(id_lecteur),
  FOREIGN KEY (id_livre)   REFERENCES livre(id_livre),
  CHECK (date_retour IS NULL OR date_retour >= date_debut)
);

-- 2) IMPORT
.mode ascii
.separator ;
.import --skip 1 biblio_lecteur.csv lecteur
.import --skip 1 biblio_auteur.csv auteur
.import --skip 1 biblio_livre.csv livre
.import --skip 1 biblio_ecrire.csv ecrire
.import --skip 1 biblio_emprunt.csv emprunt

-- 3) Vues & contrôles
CREATE VIEW IF NOT EXISTS vue_duree_moyenne AS
SELECT l.annee, ROUND(AVG((julianday(e.date_retour)-julianday(e.date_debut))),1) AS duree_jours
FROM emprunt e JOIN livre l ON l.id_livre = e.id_livre
GROUP BY l.annee;

SELECT 'lecteur' AS table, COUNT(*) AS n FROM lecteur
UNION ALL SELECT 'auteur', COUNT(*) FROM auteur
UNION ALL SELECT 'livre', COUNT(*) FROM livre
UNION ALL SELECT 'ecrire', COUNT(*) FROM ecrire
UNION ALL SELECT 'emprunt', COUNT(*) FROM emprunt;

SELECT l.* FROM livre l LEFT JOIN emprunt e ON e.id_livre=l.id_livre WHERE e.id_livre IS NULL ORDER BY l.titre;
SELECT * FROM vue_duree_moyenne ORDER BY annee;
