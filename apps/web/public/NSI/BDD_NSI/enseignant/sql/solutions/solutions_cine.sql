-- Solutions détaillées — Projet Ciné-Tunisie
-- Objectif : explorer le schéma, produire des indicateurs, et aller jusqu'aux fenêtres (optionnel selon SGBD).

-- 0) Survol des tables
SELECT * FROM cinema LIMIT 5;
SELECT * FROM salle  LIMIT 5;
SELECT * FROM film   LIMIT 5;
SELECT * FROM seance LIMIT 5;
SELECT * FROM client LIMIT 5;
SELECT * FROM reservation LIMIT 5;

-- 1) Jointures de base : séances avec film, salle et cinéma
SELECT se.id_seance, ci.nom AS cinema, sa.numero AS salle, f.titre, se.date_heure, se.prix
FROM seance se
JOIN salle sa   ON sa.id_salle  = se.id_salle
JOIN cinema ci  ON ci.id_cinema = sa.id_cinema
JOIN film f     ON f.id_film    = se.id_film
ORDER BY se.date_heure;

-- 2) Places vendues par séance (LEFT JOIN car il peut y avoir 0 réservation)
SELECT se.id_seance, COUNT(r.id_res) AS nb_reservations, COALESCE(SUM(r.nb_places),0) AS places_vendues
FROM seance se
LEFT JOIN reservation r ON r.id_seance = se.id_seance
GROUP BY se.id_seance
ORDER BY places_vendues DESC;

-- 3) Taux de remplissage (besoin de la capacité de la salle)
SELECT se.id_seance, sa.capacite,
       COALESCE(SUM(r.nb_places),0) AS places_vendues,
       ROUND(100.0 * COALESCE(SUM(r.nb_places),0)/sa.capacite, 1) AS taux_remplissage
FROM seance se
JOIN salle sa ON sa.id_salle = se.id_salle
LEFT JOIN reservation r ON r.id_seance = se.id_seance
GROUP BY se.id_seance, sa.capacite
ORDER BY taux_remplissage DESC;

-- 4) Chiffre d'affaires par film
SELECT f.id_film, f.titre, SUM(r.total) AS ca
FROM reservation r
JOIN seance se ON se.id_seance = r.id_seance
JOIN film f ON f.id_film = se.id_film
GROUP BY f.id_film, f.titre
ORDER BY ca DESC;

-- 5) Top 3 films par cinéma
SELECT ci.id_cinema, ci.nom, f.titre, SUM(r.total) AS ca
FROM reservation r
JOIN seance se ON se.id_seance = r.id_seance
JOIN salle sa  ON sa.id_salle  = se.id_salle
JOIN cinema ci ON ci.id_cinema = sa.id_cinema
JOIN film f    ON f.id_film    = se.id_film
GROUP BY ci.id_cinema, ci.nom, f.titre
ORDER BY ci.nom, ca DESC
LIMIT 30;

-- 5bis) Version avec fenêtre (1er par cinéma) — nécessite RANK()
WITH ca AS (
  SELECT ci.id_cinema, ci.nom, f.id_film, f.titre, SUM(r.total) AS ca
  FROM reservation r
  JOIN seance se ON se.id_seance = r.id_seance
  JOIN salle sa  ON sa.id_salle  = se.id_salle
  JOIN cinema ci ON ci.id_cinema = sa.id_cinema
  JOIN film f    ON f.id_film    = se.id_film
  GROUP BY ci.id_cinema, ci.nom, f.id_film, f.titre
)
SELECT nom, titre, ca
FROM (
  SELECT c.*, RANK() OVER (PARTITION BY id_cinema ORDER BY ca DESC) AS rg
  FROM ca c
) t WHERE rg = 1;

-- 6) Clients « fidèles » : nombre de séances différentes réservées
SELECT c.id_client, c.nom, COUNT(DISTINCT r.id_seance) AS nb_seances
FROM client c
LEFT JOIN reservation r ON r.id_client = c.id_client
GROUP BY c.id_client, c.nom
ORDER BY nb_seances DESC, c.nom;

-- 7) Vue d'analyse (facultatif)
CREATE VIEW IF NOT EXISTS vue_ca_film AS
SELECT f.id_film, f.titre, SUM(r.total) AS ca
FROM reservation r
JOIN seance se ON se.id_seance = r.id_seance
JOIN film f ON f.id_film = se.id_film
GROUP BY f.id_film, f.titre;
