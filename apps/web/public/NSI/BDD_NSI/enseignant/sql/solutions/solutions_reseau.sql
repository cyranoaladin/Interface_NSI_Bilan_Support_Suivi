-- Solutions détaillées — Projet Réseau social lycée

-- 0) Aperçu
SELECT * FROM utilisateur LIMIT 5;
SELECT * FROM relation LIMIT 5;
SELECT * FROM publication LIMIT 5;
SELECT * FROM aime LIMIT 5;
SELECT * FROM commentaire LIMIT 5;

-- 1) Fil des amis d'un utilisateur (U001) — relation symétrique 'ami'
SELECT p.*
FROM relation r
JOIN publication p ON p.id_user = r.id_user_dst
WHERE r.id_user_src = 'U001' AND r.type = 'ami'
ORDER BY p.date_pub DESC;

-- 2) Nombre de likes par publication (+ jointure pour le contenu)
SELECT p.id_pub, p.contenu, COUNT(a.id_user) AS likes
FROM publication p
LEFT JOIN aime a ON a.id_pub = p.id_pub
GROUP BY p.id_pub, p.contenu
ORDER BY likes DESC, p.id_pub;

-- 3) Top 3 publications par utilisateur (fenêtre) + alternative
-- Fenêtre (RANK())
WITH lk AS (
  SELECT p.id_user, p.id_pub, COUNT(a.id_user) AS likes
  FROM publication p
  LEFT JOIN aime a ON a.id_pub = p.id_pub
  GROUP BY p.id_user, p.id_pub
)
SELECT * FROM (
  SELECT l.*, RANK() OVER (PARTITION BY id_user ORDER BY likes DESC) AS rg
  FROM lk l
) t WHERE rg <= 3;

-- Alternative sans fenêtre : pour chaque (user, pub), compter combien de pubs de ce user ont plus de likes
SELECT l1.id_user, l1.id_pub, l1.likes
FROM (
  SELECT p.id_user, p.id_pub, COUNT(a.id_user) AS likes
  FROM publication p
  LEFT JOIN aime a ON a.id_pub = p.id_pub
  GROUP BY p.id_user, p.id_pub
) l1
WHERE (
  SELECT COUNT(*)
  FROM (
    SELECT p2.id_pub, COUNT(a2.id_user) AS likes2
    FROM publication p2
    LEFT JOIN aime a2 ON a2.id_pub = p2.id_pub
    WHERE p2.id_user = l1.id_user
    GROUP BY p2.id_pub
  ) t2
  WHERE t2.likes2 > l1.likes
) < 3;

-- 4) Utilisateurs sans publication (anti-join)
SELECT u.*
FROM utilisateur u
LEFT JOIN publication p ON p.id_user = u.id_user
WHERE p.id_user IS NULL;

-- 5) Commentaires récents sur les posts d'un ami
SELECT c.*
FROM relation r
JOIN publication p ON p.id_user = r.id_user_dst
JOIN commentaire c ON c.id_pub = p.id_pub
WHERE r.id_user_src = 'U001' AND r.type='ami'
ORDER BY c.date_com DESC;
