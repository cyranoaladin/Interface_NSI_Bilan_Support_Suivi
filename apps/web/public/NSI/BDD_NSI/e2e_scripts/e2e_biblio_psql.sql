\
-- E2E — Bibliothèque (PostgreSQL)
-- Usage: psql -d votre_base -f e2e_biblio_psql.sql

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
  date_debut  DATE NOT NULL,
  date_retour DATE,
  FOREIGN KEY (id_lecteur) REFERENCES lecteur(id_lecteur),
  FOREIGN KEY (id_livre)   REFERENCES livre(id_livre),
  CHECK (date_retour IS NULL OR date_retour >= date_debut)
);

-- 2) IMPORT
\copy lecteur(id_lecteur,nom,email) FROM 'biblio_lecteur.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy auteur(id_auteur,nom) FROM 'biblio_auteur.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy livre(id_livre,titre,annee) FROM 'biblio_livre.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy ecrire(id_auteur,id_livre,role) FROM 'biblio_ecrire.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
\copy emprunt(id_emprunt,id_lecteur,id_livre,date_debut,date_retour) FROM 'biblio_emprunt.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');

-- 3) Vues & contrôles
CREATE OR REPLACE VIEW vue_duree_moyenne AS
SELECT l.annee, ROUND(AVG(EXTRACT(EPOCH FROM (e.date_retour - e.date_debut))/86400.0),1) AS duree_jours
FROM emprunt e JOIN livre l ON l.id_livre = e.id_livre
GROUP BY l.annee;

SELECT 'lecteur' AS table, COUNT(*) AS n FROM lecteur
UNION ALL SELECT 'auteur', COUNT(*) FROM auteur
UNION ALL SELECT 'livre', COUNT(*) FROM livre
UNION ALL SELECT 'ecrire', COUNT(*) FROM ecrire
UNION ALL SELECT 'emprunt', COUNT(*) FROM emprunt;

-- Livres jamais empruntés
SELECT l.* FROM livre l LEFT JOIN emprunt e ON e.id_livre=l.id_livre WHERE e.id_livre IS NULL ORDER BY l.titre;

-- Durée moyenne par année (vue)
SELECT * FROM vue_duree_moyenne ORDER BY annee;
