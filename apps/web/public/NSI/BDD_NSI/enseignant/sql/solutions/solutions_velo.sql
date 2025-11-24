-- Solutions détaillées — Projet Parc vélo

-- 0) Aperçu
SELECT * FROM station  LIMIT 5;
SELECT * FROM usager   LIMIT 5;
SELECT * FROM velo     LIMIT 5;
SELECT * FROM trajet   LIMIT 5;

-- 1) Temps moyen (minutes) par station de départ
SELECT station_depart,
       ROUND(AVG((julianday(arrivee)-julianday(depart))*24*60),1) AS duree_min_moy
FROM trajet
GROUP BY station_depart
ORDER BY duree_min_moy;

-- 2) Nombre de départs/arrivées par station (activité)
SELECT s.id_station, s.nom,
       SUM(CASE WHEN t.station_depart = s.id_station THEN 1 ELSE 0 END) AS departs,
       SUM(CASE WHEN t.station_arrivee = s.id_station THEN 1 ELSE 0 END) AS arrivees
FROM station s
LEFT JOIN trajet t ON t.station_depart = s.id_station OR t.station_arrivee = s.id_station
GROUP BY s.id_station, s.nom
ORDER BY departs DESC, arrivees DESC;

-- 3) Classement des stations par départs (fenêtre) + alternative
-- Fenêtre (RANK())
WITH d AS (
  SELECT station_depart AS station, COUNT(*) AS nb
  FROM trajet
  GROUP BY station_depart
)
SELECT station, nb, RANK() OVER (ORDER BY nb DESC) AS rang
FROM d;

-- Alternative sans fenêtre : compter combien de stations ont plus de départs
WITH d AS (
  SELECT station_depart AS station, COUNT(*) AS nb
  FROM trajet
  GROUP BY station_depart
)
SELECT d1.station, d1.nb
FROM d d1
WHERE (SELECT COUNT(*) FROM d d2 WHERE d2.nb > d1.nb) < 3;

-- 4) Cohérence temporelle (contrôle)
SELECT id_trajet
FROM trajet
WHERE arrivee < depart;  -- doit retourner 0 ligne si la contrainte CHECK est respectée
