-- Corrections types — Terminale NSI (projets)
-- NB: Les fonctions fenêtre peuvent nécessiter PostgreSQL/SQLite récent.

-- === Ciné‑Tunisie (schéma minimal) ===
-- Tables: cinema(id_cinema, nom, ville), salle(id_salle, id_cinema, numero, capacite),
--        film(id_film, titre, duree, genre), seance(id_seance, id_salle, id_film, date_heure, prix),
--        client(id_client, nom, email), reservation(id_res, id_client, id_seance, nb_places, total)

-- 1) Taux de remplissage par séance
-- (nécessite une capacité par salle ; on calcule nb_places réservées / capacité)
SELECT se.id_seance, sa.capacite,
       SUM(res.nb_places) AS places_vendues,
       ROUND(100.0 * SUM(res.nb_places)/sa.capacite, 1) AS taux_remplissage
FROM seance se
JOIN salle sa ON sa.id_salle = se.id_salle
LEFT JOIN reservation res ON res.id_seance = se.id_seance
GROUP BY se.id_seance, sa.capacite
ORDER BY taux_remplissage DESC;

-- 2) Top 3 films par chiffre d'affaires
SELECT f.id_film, f.titre, SUM(r.total) AS ca
FROM reservation r
JOIN seance se ON se.id_seance = r.id_seance
JOIN film f ON f.id_film = se.id_film
GROUP BY f.id_film, f.titre
ORDER BY ca DESC
LIMIT 3;

-- 3) Fenêtre (bonus) : meilleur CA par film par cinéma
-- (version fenêtrée)
WITH ca AS (
  SELECT ci.id_cinema, f.id_film, f.titre, SUM(r.total) AS ca
  FROM reservation r
  JOIN seance se ON se.id_seance = r.id_seance
  JOIN salle sa ON sa.id_salle = se.id_salle
  JOIN cinema ci ON ci.id_cinema = sa.id_cinema
  JOIN film f ON f.id_film = se.id_film
  GROUP BY ci.id_cinema, f.id_film, f.titre
)
SELECT *
FROM (
  SELECT c.*, RANK() OVER (PARTITION BY id_cinema ORDER BY ca DESC) AS rg
  FROM ca c
) x
WHERE rg = 1;

-- === Réseau social lycée ===
-- 4) Publications des amis d'un utilisateur (U001)
SELECT p.*
FROM relation r
JOIN publication p ON p.id_user = r.id_user_dst
WHERE r.id_user_src = 'U001' AND r.type = 'ami'
ORDER BY p.date_pub DESC;

-- 5) Top 3 publications par nombre de likes (fenêtre)
WITH lk AS (
  SELECT p.id_user, p.id_pub, COUNT(a.id_user) AS likes
  FROM publication p
  LEFT JOIN aime a ON a.id_pub = p.id_pub
  GROUP BY p.id_user, p.id_pub
)
SELECT *
FROM (
  SELECT l.*, RANK() OVER (PARTITION BY id_user ORDER BY likes DESC) AS rg
  FROM lk l
) t
WHERE rg <= 3;

-- 6) Publications jamais likées (anti-join)
SELECT p.*
FROM publication p
WHERE NOT EXISTS (SELECT 1 FROM aime a WHERE a.id_pub = p.id_pub);

-- === Bibliothèque ===
-- 7) Durée moyenne d'emprunt par année d'édition
SELECT l.annee, ROUND(AVG(julianday(e.date_retour)-julianday(e.date_debut)),1) AS duree_moy
FROM emprunt e JOIN livre l ON l.id_livre = e.id_livre
GROUP BY l.annee
ORDER BY l.annee;

-- 8) Lecteurs au-dessus de la moyenne d'emprunts
SELECT id_lecteur, COUNT(*) AS nb
FROM emprunt
GROUP BY id_lecteur
HAVING COUNT(*) > (
  SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM emprunt GROUP BY id_lecteur) t
);

-- 9) Premier emprunt par lecteur (sans fenêtre)
SELECT e.*
FROM emprunt e
JOIN (
  SELECT id_lecteur, MIN(date_debut) AS first_date
  FROM emprunt
  GROUP BY id_lecteur
) f ON f.id_lecteur = e.id_lecteur AND f.first_date = e.date_debut;

-- === Parc vélo ===
-- 10) Temps moyen par trajet et top stations (départs)
SELECT station_depart, ROUND(AVG(julianday(arrivee)-julianday(depart))*24*60,1) AS duree_min_moy
FROM trajet
GROUP BY station_depart
ORDER BY duree_min_moy;

-- 11) Fenêtre : rang des stations par nombre de départs
WITH d AS (
  SELECT station_depart, COUNT(*) AS nb
  FROM trajet
  GROUP BY station_depart
)
SELECT station_depart, nb,
       RANK() OVER (ORDER BY nb DESC) AS rang
FROM d;
