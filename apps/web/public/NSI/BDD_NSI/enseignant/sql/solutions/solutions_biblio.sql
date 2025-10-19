-- Solutions détaillées — Projet Bibliothèque

-- 0) Aperçu
SELECT * FROM lecteur LIMIT 5;
SELECT * FROM auteur LIMIT 5;
SELECT * FROM livre  LIMIT 5;
SELECT * FROM ecrire LIMIT 5;
SELECT * FROM emprunt LIMIT 5;

-- 1) Livres jamais empruntés (anti-join)
SELECT l.*
FROM livre l
LEFT JOIN emprunt e ON e.id_livre = l.id_livre
WHERE e.id_livre IS NULL
ORDER BY l.titre;

-- 2) Durée moyenne d'emprunt par année d'édition
SELECT l.annee,
       ROUND(AVG(julianday(e.date_retour)-julianday(e.date_debut)),1) AS duree_moy
FROM emprunt e
JOIN livre l ON l.id_livre = e.id_livre
GROUP BY l.annee
ORDER BY l.annee;

-- 3) Lecteurs au-dessus de la moyenne d'emprunts
SELECT id_lecteur, COUNT(*) AS nb
FROM emprunt
GROUP BY id_lecteur
HAVING COUNT(*) > (
  SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM emprunt GROUP BY id_lecteur) t
);

-- 4) Premier emprunt par lecteur — sans fenêtre
SELECT e.*
FROM emprunt e
JOIN (
  SELECT id_lecteur, MIN(date_debut) AS first_date
  FROM emprunt
  GROUP BY id_lecteur
) f ON f.id_lecteur = e.id_lecteur AND f.first_date = e.date_debut;

-- 5) Auteurs les plus lus (via emprunts)
SELECT a.nom, COUNT(*) AS nb_emprunts
FROM emprunt e
JOIN livre l   ON l.id_livre   = e.id_livre
JOIN ecrire ec ON ec.id_livre  = l.id_livre
JOIN auteur a  ON a.id_auteur  = ec.id_auteur
GROUP BY a.nom
ORDER BY nb_emprunts DESC;
