import {
  AutoEvalChecklistBlock,
  DatasetEntry,
  E2ESnippetLibrary,
  EvaluationTool,
  HealthCheckLibrary,
  MethodCard,
  MocodoTemplate,
  ProjectTrack,
  QuizQuestionSet,
  ResourceDirectoryEntry,
  ScenarioDefinition,
  SolutionOverrideState,
  StudentModule,
  StudentTool,
  TeacherResourceGroup,
  TeacherSession
} from "./types";

export const studentModules: StudentModule[] = [
  {
    id: "module-besoins",
    title: "Bloc 1 · Comprendre le besoin",
    duration: "45 min",
    focus: "Cours & vocabulaire",
    keyPoints: [
      "Identifier acteurs, objets et actions décrits dans l’énoncé.",
      "Construire un dictionnaire de données partagé avec les termes métiers.",
      "Tracer un premier MCD lisible avec les cardinalités."
    ],
    resources: [
      { label: "Fiche méthode MCD", href: "#outils-mcd" },
      { label: "Dataset Bibliothèque", href: "etudiant/datasets/bibliotheque/biblio_lecteur.csv" },
      { label: "Dataset Réseau social", href: "etudiant/datasets/reseau/reseau_utilisateur.csv" }
    ]
  },
  {
    id: "module-mcd-mld",
    title: "Bloc 2 · Du MCD au MLD",
    duration: "50 min",
    focus: "Explications & entraînement",
    keyPoints: [
      "Appliquer la méthode MERISE en 4 étapes (entités → associations → cardinalités → dictionnaire).",
      "Vérifier les dépendances fonctionnelles avant de traduire en tables.",
      "Choisir les clés primaires et étrangères en justifiant chaque décision."
    ],
    resources: [
      { label: "Checklist MLD", href: "#methodes" },
      { label: "Jeu de données Ciné", href: "etudiant/datasets/cinema/cine_film.csv" },
      { label: "Jeu de données Vélo", href: "etudiant/datasets/velo/velo_station.csv" }
    ]
  },
  {
    id: "module-sql",
    title: "Bloc 3 · Écrire le SQL pas à pas",
    duration: "55 min",
    focus: "Méthodes & exercices",
    keyPoints: [
      "Structurer une requête SELECT avec WHERE, ORDER BY, LIMIT.",
      "Composer des jointures 1-N et N-N pour répondre aux questions métiers.",
      "Utiliser GROUP BY, HAVING et les fonctions d’agrégation pour produire des indicateurs."
    ],
    resources: [
      { label: "Playground SQL", href: "#atelier" },
      { label: "Mémo SQL", href: "#outils-sql" },
      { label: "Scénarios contextualisés", href: "#scenarios" }
    ]
  },
  {
    id: "module-analyse",
    title: "Bloc 4 · Analyser et optimiser",
    duration: "45 min",
    focus: "Approfondissements",
    keyPoints: [
      "Comparer sous-requête, vue et fonction de fenêtre pour un même problème.",
      "Lire un plan d’exécution et repérer les colonnes filtrantes.",
      "Imaginer des métriques métiers pour donner du sens aux résultats."
    ],
    resources: [
      { label: "Requêtes avancées", href: "#avance" },
      { label: "Projet data", href: "#projets" },
      { label: "Jeu de données mixte", href: "etudiant/datasets/classes/eleves.csv" }
    ]
  }
];

export const methodCards: MethodCard[] = [
  {
    title: "Routine MCD express",
    tips: [
      "Lire l’énoncé en surlignant les verbes d’action (→ associations).",
      "Lister les noms communs importants (→ entités) et leurs attributs.",
      "Déterminer les cardinalités avec des phrases « un ... peut ... ».",
      "Vérifier qu’aucune information ne dépend de deux entités à la fois."
    ],
    cta: { label: "Revoir le bloc 1", href: "#cours" }
  },
  {
    title: "Check-list MLD / DDL",
    tips: [
      "Chaque table possède une clé primaire simple ou composée.",
      "Les clés étrangères portent le même type que la clé référencée.",
      "Aucune colonne multi-valeur : utiliser une table d’association.",
      "Prévoir les contraintes NOT NULL / UNIQUE utiles dès le départ."
    ],
    cta: { label: "Aller au bloc 2", href: "#cours" }
  },
  {
    title: "Déboguer une requête SQL",
    tips: [
      "Tester d’abord SELECT * FROM ... LIMIT 5 pour vérifier les colonnes.",
      "Construire la requête étape par étape en exécutant à chaque ajout.",
      "Isoler les jointures : SELECT ... FROM A JOIN B ON ... avant les filtres.",
      "Comparer le résultat attendu avec une requête de vérification (COUNT, EXISTS)."
    ],
    cta: { label: "Tester dans le playground", href: "#atelier" }
  }
];

export const quizSets: QuizQuestionSet[] = [
  {
    id: "quiz_mcd_vocabulaire",
    title: "Quiz 1 · MCD & vocabulaire",
    description: "10 questions flash pour vérifier la maîtrise du triptyque entité / association / cardinalité.",
    questions: [
      "Différence entre attribut identifiant et clé étrangère ?",
      "Comment représenter une relation optionnelle dans un MCD ?",
      "Repérer une dépendance fonctionnelle cachée dans un énoncé."
    ],
    resources: [{ label: "Mini-cours", href: "#cours" }]
  },
  {
    id: "quiz_sql_fondamental",
    title: "Quiz 2 · SQL fondamental",
    description: "S’entraîner sur SELECT, WHERE, ORDER BY et les fonctions d’agrégation.",
    questions: [
      "Écrire une requête qui renvoie les trois derniers emprunts.",
      "Trouver les clients sans commande en utilisant LEFT JOIN.",
      "Calculer un panier moyen avec GROUP BY et HAVING."
    ],
    resources: [
      { label: "Playground", href: "#atelier" },
      { label: "Scénario Commerce", href: "#scenarios" }
    ]
  },
  {
    id: "quiz_analyse_avancee",
    title: "Quiz 3 · Analyse avancée",
    description: "Préparer l’oral en justifiant chaque choix de requête et en comparant plusieurs approches.",
    questions: [
      "Choisir entre sous-requête corrélée et fenêtre pour détecter les doublons.",
      "Expliquer le rôle de HAVING dans une requête sur les auteurs prolifiques.",
      "Optimiser une requête lente en réécrivant la jointure."
    ],
    resources: [
      { label: "Requêtes avancées", href: "#avance" },
      { label: "Projet data", href: "#projets" }
    ]
  }
];

export const projectTracks: ProjectTrack[] = [
  {
    title: "Projet · Bibliothèque intelligente",
    goal: "Créer un tableau de bord pour suivre l’activité de la médiathèque.",
    milestones: [
      "Valider le MCD fourni puis proposer deux améliorations.",
      "Écrire les scripts DDL/INSERT et charger les données dans le playground.",
      "Proposer 5 indicateurs clés (lecteurs actifs, retards, auteurs stars...)."
    ],
    deliverables: [
      "MCD annoté + justification des modifications.",
      "Script SQL commenté (DDL + 10 requêtes).",
      "Présentation synthèse (3 diapositives ou 1 page)."
    ],
    datasets: [
      { label: "Lecteurs", href: "etudiant/datasets/bibliotheque/biblio_lecteur.csv" },
      { label: "Livres", href: "etudiant/datasets/bibliotheque/biblio_livre.csv" },
      { label: "Emprunts", href: "etudiant/datasets/bibliotheque/biblio_emprunt.csv" }
    ]
  },
  {
    title: "Projet · Ciné & fréquentation",
    goal: "Analyser le remplissage des salles et la fidélité des spectateurs.",
    milestones: [
      "Construire le MLD et vérifier les cardinalités salle ↔ séance.",
      "Rédiger les requêtes pour le taux de remplissage et les films populaires.",
      "Communiquer les résultats sous forme de rapport ou dataviz."
    ],
    deliverables: [
      "Jeu de requêtes SQL commentées.",
      "Export CSV ou capture du résultat pour chaque indicateur.",
      "Analyse écrite (½ page) des tendances observées."
    ],
    datasets: [
      { label: "Salles", href: "etudiant/datasets/cinema/cine_salle.csv" },
      { label: "Séances", href: "etudiant/datasets/cinema/cine_seance.csv" },
      { label: "Réservations", href: "etudiant/datasets/cinema/cine_reservation.csv" }
    ]
  },
  {
    title: "Projet · Mobilité douce",
    goal: "Explorer les trajets vélo pour proposer des recommandations de service.",
    milestones: [
      "Modéliser les données usagers/velos/trajets et identifier les indicateurs utiles.",
      "Mettre en place des requêtes d’analyse temporelle (heures de pointe, durée moyenne).",
      "Imaginer une fonctionnalité bonus (classement des stations, alertes de saturation)."
    ],
    deliverables: [
      "Schéma relationnel + documentation des hypothèses.",
      "Script SQL reproductible (création + jeux de requêtes).",
      "Restitution orale ou vidéo courte (2 min)."
    ],
    datasets: [
      { label: "Stations", href: "etudiant/datasets/velo/velo_station.csv" },
      { label: "Trajets", href: "etudiant/datasets/velo/velo_trajet.csv" },
      { label: "Usagers", href: "etudiant/datasets/velo/velo_usager.csv" }
    ]
  }
];

export const mocodoTemplates: MocodoTemplate[] = [
  {
    theme: "Commerce connecté",
    filename: "commerce.mcd.txt",
    instructions:
      "Copie ce patron dans Mocodo, génère le diagramme puis personnalise les attributs et cardinalités si besoin.",
    template: `CLIENT: id_client, nom, email
COMMANDE: id_commande, date_commande, total
PRODUIT: id_produit, libelle, prix, categorie
LIGNE: quantite, prix_unitaire

CLIENT, passé, COMMANDE: 1,N
COMMANDE, contient, LIGNE: 1,N
PRODUIT, est_compris_dans, LIGNE: 1,N`
  },
  {
    theme: "Bibliothèque municipale",
    filename: "bibliotheque.mcd.txt",
    instructions:
      "Utilise ce modèle pour vérifier les cardinalités lecteur ↔ emprunt ↔ livre et la table d’association ÉCRIRE.",
    template: `LECTEUR: id_lecteur, nom, email
EMPRUNT: id_emprunt, date_debut, date_retour
LIVRE: id_livre, titre, annee
AUTEUR: id_auteur, nom

LECTEUR, effectue, EMPRUNT: 1,N
EMPRUNT, concerne, LIVRE: N,1
AUTEUR, ecrit, LIVRE: N,N`
  },
  {
    theme: "Réseau social scolaire",
    filename: "reseau.mcd.txt",
    instructions:
      "Vérifie que chaque relation est identifiée par son couple utilisateur_source/utilisateur_cible et pense aux dates.",
    template: `UTILISATEUR: id_user, pseudo, email, date_inscription
PUBLICATION: id_pub, contenu, date_pub
RELATION: type, date_relation
AIME: date_like

UTILISATEUR, publie, PUBLICATION: 1,N
UTILISATEUR, suit, RELATION: 1,N
UTILISATEUR, est_cible_de, RELATION: 1,N
UTILISATEUR, aime, AIME: 1,N
PUBLICATION, est_aimee_par, AIME: 1,N`
  }
];

export const studentTools: StudentTool[] = [
  {
    title: "Mémo SQL express",
    id: "outils-sql",
    items: [
      "SELECT colonnes FROM table WHERE condition ORDER BY colonne LIMIT n;",
      "Jointure interne : SELECT ... FROM A JOIN B ON A.fk = B.pk;",
      "Jointure externe : LEFT JOIN pour conserver les lignes de A même sans correspondance.",
      "Agrégat : GROUP BY colonne HAVING condition sur la fonction (SUM, AVG...)."
    ],
    action: { label: "Télécharger mémo PDF (à venir)", href: "#" }
  },
  {
    title: "Checklist MCD → MLD",
    id: "outils-mcd",
    items: [
      "Chaque entité possède une clé primaire stable (id ou couple minimal).",
      "Les relations N-N sont transformées en tables d’association.",
      "Les attributs multivalués deviennent des tables dépendantes.",
      "Toutes les colonnes sont nommées en snake_case sans espace."
    ],
    action: { label: "Télécharger checklist (modèle à compléter)", href: "#" }
  },
  {
    title: "Aide Mocodo",
    id: "outils-mocodo",
    items: [
      "Entrer le patron dans l’éditeur en ligne https://mocodo.net/.",
      "Utiliser le bouton Export pour récupérer le schéma en SVG/PNG.",
      "Colorer les entités principales pour les présentations.",
      "Annoter chaque relation avec une phrase “Un ... peut ...”."
    ],
    action: { label: "Accéder à Mocodo", href: "https://mocodo.net" }
  }
];

export const autoEvalChecklist: AutoEvalChecklistBlock[] = [
  {
    title: "Avant de lancer le SQL",
    items: [
      "Mon MCD couvre bien tous les cas de l’énoncé.",
      "Chaque clé primaire / étrangère est identifiée et justifiée.",
      "Les types de données sont cohérents (dates, montants, textes)."
    ]
  },
  {
    title: "Pendant les requêtes",
    items: [
      "Je teste ma requête étape par étape (SELECT → WHERE → JOIN → GROUP BY).",
      "Je vérifie toujours le résultat avec un cas réel ou limite.",
      "Je commente les requêtes importantes pour me souvenir de l’objectif."
    ]
  },
  {
    title: "Avant le rendu",
    items: [
      "J’ai produit au moins 10 requêtes variées (jointures, agrégats, sous-requêtes).",
      "Les résultats sont capturés (copie d’écran ou export CSV).",
      "Mon dossier contient un README clair (datasets utilisés, étapes suivies)."
    ]
  }
];

export const resourceDirectory: ResourceDirectoryEntry[] = [
  {
    category: "Jeux de données (CSV)",
    items: [
      { label: "Bibliothèque — Lecteurs", href: "etudiant/datasets/bibliotheque/biblio_lecteur.csv" },
      { label: "Bibliothèque — Emprunts", href: "etudiant/datasets/bibliotheque/biblio_emprunt.csv" },
      { label: "Ciné — Réservations", href: "etudiant/datasets/cinema/cine_reservation.csv" },
      { label: "Réseau — Publications", href: "etudiant/datasets/reseau/reseau_publication.csv" },
      { label: "Vélo — Trajets", href: "etudiant/datasets/velo/velo_trajet.csv" },
      { label: "Classe — Élèves", href: "etudiant/datasets/classes/eleves.csv" }
    ]
  },
  {
    category: "Scripts SQL (DDL / import)",
    items: [
      { label: "DDL Bibliothèque", href: "enseignant/sql/ddl/ddl_biblio.sql" },
      { label: "DDL Ciné", href: "enseignant/sql/ddl/ddl_cine.sql" },
      { label: "Import Bibliothèque (SQLite)", href: "enseignant/sql/import/import_biblio_sqlite.sql" },
      { label: "Import Réseau (PostgreSQL)", href: "enseignant/sql/import/import_reseau_psql.sql" },
      { label: "E2E Vélo (SQLite)", href: "e2e_scripts/e2e_velo_sqlite.sql" }
    ]
  },
  {
    category: "Documents & supports",
    items: [
      { label: "Grille compétences A4", href: "enseignant/docs/grille_competences_A4.html" },
      { label: "Corrections types (MD)", href: "enseignant/docs/corrections_types.md" },
      { label: "Solutions Bibliothèque", href: "enseignant/sql/solutions/solutions_biblio.sql" },
      { label: "README BDD", href: "README.md" },
      { label: "Interface standalone", href: "index_standalone.html" }
    ]
  }
];

export const teacherSessions: TeacherSession[] = [
  {
    phase: "Séance 1 — Découverte guidée",
    duration: "55 min",
    objectives: [
      "Activer les pré-requis sur dictionnaire de données et cardinalités.",
      "Co-construire un MCD à partir du scénario Bibliothèque.",
      "Installer une routine de validation (verbalisation, justification)."
    ],
    teacherMoves: [
      "Projeter l’énoncé et faire annoter individuellement (5 min).",
      "Mettre en commun puis compléter le MCD sur tableau ou Mocodo (20 min).",
      "Construire le MLD ensemble en soulignant les clés (20 min).",
      "Lancer un quiz rapide (Quiz 1) pour vérifier les acquis (10 min)."
    ]
  },
  {
    phase: "Séance 2 — Atelier SQL",
    duration: "55 min",
    objectives: [
      "Écrire des requêtes répondant aux questions métiers.",
      "Différencier jointure interne / externe et HAVING.",
      "Encourager la coopération (binômes) et l’auto-correction."
    ],
    teacherMoves: [
      "Installer les binômes sur le playground (5 min).",
      "Distribuer les cartes d’exercices par scénario (25 min).",
      "Passer voir les élèves en difficulté avec la check-list SQL (15 min).",
      "Clôture collective : mutualisation de 2 requêtes (10 min)."
    ]
  },
  {
    phase: "Séance 3 — Projet & évaluation",
    duration: "55 min",
    objectives: [
      "Structurer un mini-projet data à rendre en fin de séquence.",
      "Évaluer les compétences BD1, BD2, BD3 avec la grille A4.",
      "Préparer la trace écrite ou l’oral (Grand oral, NSI)."
    ],
    teacherMoves: [
      "Choisir un projet dans la section dédiée (#projets).",
      "Présenter les attentes et le barème simplifié (grille de compétences).",
      "Planifier les temps de suivi (point mi-parcours, rendu final).",
      "Prévoir un prolongement (Python/sqlite3, dataviz) pour les rapides."
    ]
  }
];

export const teacherResourceGroups: TeacherResourceGroup[] = [
  {
    title: "SQL — DDL & imports prêts à l’emploi",
    description: "Scripts pour initialiser rapidement les bases en PostgreSQL ou SQLite.",
    items: [
      { label: "Biblio · DDL", href: "enseignant/sql/ddl/ddl_biblio.sql" },
      { label: "Ciné · DDL", href: "enseignant/sql/ddl/ddl_cine.sql" },
      { label: "Réseau · DDL", href: "enseignant/sql/ddl/ddl_reseau.sql" },
      { label: "Vélo · DDL", href: "enseignant/sql/ddl/ddl_velo.sql" },
      { label: "Import Biblio (SQLite)", href: "enseignant/sql/import/import_biblio_sqlite.sql" },
      { label: "Import Ciné (PostgreSQL)", href: "enseignant/sql/import/import_cine_psql.sql" }
    ]
  },
  {
    title: "Guides & corrections",
    description: "Supports réservés à l’enseignant pour sécuriser la progression.",
    items: [
      { label: "Corrections types", href: "enseignant/sql/corrections/corrections_types.sql" },
      { label: "Solutions Biblio", href: "enseignant/sql/solutions/solutions_biblio.sql" },
      { label: "Solutions Ciné", href: "enseignant/sql/solutions/solutions_cine.sql" },
      { label: "Solutions Réseau", href: "enseignant/sql/solutions/solutions_reseau.sql" },
      { label: "Solutions Vélo", href: "enseignant/sql/solutions/solutions_velo.sql" },
      { label: "Grille compétences (A4)", href: "enseignant/docs/grille_competences_A4.html" }
    ]
  },
  {
    title: "Tests & automatisation",
    description: "Scripts de validation pour vérifier les jeux de données avant séance.",
    items: [
      { label: "E2E Biblio (SQLite)", href: "e2e_scripts/e2e_biblio_sqlite.sql" },
      { label: "E2E Ciné (PostgreSQL)", href: "e2e_scripts/e2e_cine_psql.sql" },
      { label: "E2E Réseau (SQLite)", href: "e2e_scripts/e2e_reseau_sqlite.sql" },
      { label: "E2E Vélo (PostgreSQL)", href: "e2e_scripts/e2e_velo_psql.sql" }
    ]
  }
];

export const evaluationTools: EvaluationTool[] = [
  {
    title: "Grille d’évaluation par compétence",
    description: "Document imprimable A4 pour cocher les niveaux BD1, BD2, BD3.",
    href: "enseignant/docs/grille_competences_A4.html"
  },
  {
    title: "Banque d’indicateurs de réussite",
    description: "Barèmes, critères détaillés et aides à la remédiation.",
    href: "enseignant/docs/corrections_types.md"
  },
  {
    title: "Scripts d’auto-correction",
    description: "Requêtes de référence pour comparer les productions élèves.",
    href: "enseignant/sql/solutions/solutions_biblio.sql"
  }
];

export const datasetCatalog: DatasetEntry[] = [
  {
    key: "bibliotheque",
    label: "Bibliothèque",
    csv: [
      "etudiant/datasets/bibliotheque/biblio_lecteur.csv",
      "etudiant/datasets/bibliotheque/biblio_livre.csv",
      "etudiant/datasets/bibliotheque/biblio_emprunt.csv",
      "etudiant/datasets/bibliotheque/biblio_auteur.csv",
      "etudiant/datasets/bibliotheque/biblio_ecrire.csv"
    ],
    ddl: "enseignant/sql/ddl/ddl_biblio.sql",
    imports: [
      "enseignant/sql/import/import_biblio_sqlite.sql",
      "enseignant/sql/import/import_biblio_psql.sql"
    ],
    e2e: "enseignant/sql/e2e/e2e_biblio_sqlite.sql"
  },
  {
    key: "cinema",
    label: "Ciné-Tunisie",
    csv: [
      "etudiant/datasets/cinema/cine_cinema.csv",
      "etudiant/datasets/cinema/cine_salle.csv",
      "etudiant/datasets/cinema/cine_film.csv",
      "etudiant/datasets/cinema/cine_seance.csv",
      "etudiant/datasets/cinema/cine_client.csv",
      "etudiant/datasets/cinema/cine_reservation.csv"
    ],
    ddl: "enseignant/sql/ddl/ddl_cine.sql",
    imports: [
      "enseignant/sql/import/import_cine_sqlite.sql",
      "enseignant/sql/import/import_cine_psql.sql"
    ],
    e2e: "enseignant/sql/e2e/e2e_cine_psql.sql"
  },
  {
    key: "reseau",
    label: "Réseau social",
    csv: [
      "etudiant/datasets/reseau/reseau_utilisateur.csv",
      "etudiant/datasets/reseau/reseau_publication.csv",
      "etudiant/datasets/reseau/reseau_relation.csv",
      "etudiant/datasets/reseau/reseau_aime.csv",
      "etudiant/datasets/reseau/reseau_commentaire.csv"
    ],
    ddl: "enseignant/sql/ddl/ddl_reseau.sql",
    imports: [
      "enseignant/sql/import/import_reseau_sqlite.sql",
      "enseignant/sql/import/import_reseau_psql.sql"
    ],
    e2e: "enseignant/sql/e2e/e2e_reseau_sqlite.sql"
  },
  {
    key: "velo",
    label: "Parc vélo",
    csv: [
      "etudiant/datasets/velo/velo_station.csv",
      "etudiant/datasets/velo/velo_velo.csv",
      "etudiant/datasets/velo/velo_usager.csv",
      "etudiant/datasets/velo/velo_trajet.csv"
    ],
    ddl: "enseignant/sql/ddl/ddl_velo.sql",
    imports: [
      "enseignant/sql/import/import_velo_sqlite.sql",
      "enseignant/sql/import/import_velo_psql.sql"
    ],
    e2e: "enseignant/sql/e2e/e2e_velo_psql.sql"
  },
  {
    key: "classe",
    label: "Jeu de classe",
    csv: [
      "etudiant/datasets/classes/eleves.csv",
      "etudiant/datasets/classes/profs.csv",
      "etudiant/datasets/classes/options.csv",
      "etudiant/datasets/classes/inscriptions_options.csv"
    ],
    ddl: "enseignant/sql/ddl/ddl_classe.sql",
    imports: [
      "enseignant/sql/import/import_classe_sqlite.sql",
      "enseignant/sql/import/import_classe_psql.sql"
    ],
    e2e: null
  }
];

export const healthCheckLibrary: HealthCheckLibrary = {
  bibliotheque: [
    "SELECT COUNT(*) AS nb_lecteurs FROM Lecteur;",
    "SELECT COUNT(*) AS emprunts_sans_retour FROM Emprunt WHERE date_retour IS NULL;",
    "SELECT COUNT(*) AS livres_sans_auteur FROM Livre l LEFT JOIN Ecrire e ON e.id_livre = l.id_livre WHERE e.id_auteur IS NULL;"
  ],
  cinema: [
    "SELECT COUNT(*) AS nb_reservations FROM Reservation;",
    "SELECT salle_id, COUNT(*) AS nb_seances FROM Seance GROUP BY salle_id;",
    "SELECT COUNT(*) AS films_sans_seance FROM Film f LEFT JOIN Seance s ON s.id_film = f.id_film WHERE s.id_film IS NULL;"
  ],
  reseau: [
    "SELECT COUNT(*) AS nb_utilisateurs FROM Utilisateur;",
    "SELECT COUNT(*) AS likes_sans_pub FROM Aime a LEFT JOIN Publication p ON p.id_pub = a.id_pub WHERE p.id_pub IS NULL;",
    "SELECT id_user_src, COUNT(*) AS nb_relations FROM Relation GROUP BY id_user_src;"
  ],
  velo: [
    "SELECT COUNT(*) AS nb_trajets FROM Trajet;",
    "SELECT station_depart, COUNT(*) AS departs FROM Trajet GROUP BY station_depart;",
    "SELECT COUNT(*) AS velos_sans_station FROM Velo v LEFT JOIN Station s ON s.id_station = v.id_station WHERE s.id_station IS NULL;"
  ]
};

export const e2eSnippets: E2ESnippetLibrary = {
  bibliotheque: `-- Nettoyage
DROP TABLE IF EXISTS biblio_lecteur;
DROP TABLE IF EXISTS biblio_livre;
DROP TABLE IF EXISTS biblio_emprunt;
DROP TABLE IF EXISTS biblio_auteur;
DROP TABLE IF EXISTS biblio_ecrire;

-- Après chargement via « Charger le dataset » exécutez ces contrôles
SELECT COUNT(*) AS nb_lecteurs FROM biblio_lecteur;
SELECT COUNT(*) AS nb_livres FROM biblio_livre;
SELECT COUNT(*) AS emprunts_sans_retour FROM biblio_emprunt WHERE date_retour IS NULL;
SELECT COUNT(*) AS livres_sans_auteur
FROM biblio_livre l
LEFT JOIN biblio_ecrire e ON e.id_livre = l.id_livre
WHERE e.id_auteur IS NULL;`,
  cinema: `-- Nettoyage
DROP TABLE IF EXISTS cine_cinema;
DROP TABLE IF EXISTS cine_salle;
DROP TABLE IF EXISTS cine_film;
DROP TABLE IF EXISTS cine_seance;
DROP TABLE IF EXISTS cine_client;
DROP TABLE IF EXISTS cine_reservation;

-- Contrôles post-import
SELECT COUNT(*) AS nb_cinemas FROM cine_cinema;
SELECT COUNT(*) AS nb_salles FROM cine_salle;
SELECT COUNT(*) AS nb_seances FROM cine_seance;
SELECT COUNT(*) AS reservations_sans_seance
FROM cine_reservation r
LEFT JOIN cine_seance s ON s.id_seance = r.id_seance
WHERE s.id_seance IS NULL;`,
  reseau: `-- Nettoyage
DROP TABLE IF EXISTS reseau_utilisateur;
DROP TABLE IF EXISTS reseau_publication;
DROP TABLE IF EXISTS reseau_relation;
DROP TABLE IF EXISTS reseau_aime;
DROP TABLE IF EXISTS reseau_commentaire;

-- Contrôles post-import
SELECT COUNT(*) AS nb_utilisateurs FROM reseau_utilisateur;
SELECT COUNT(*) AS nb_publications FROM reseau_publication;
SELECT COUNT(*) AS relations_orphelines
FROM reseau_relation rel
LEFT JOIN reseau_utilisateur u ON u.id_user = rel.id_user_src
WHERE u.id_user IS NULL;`,
  velo: `-- Nettoyage
DROP TABLE IF EXISTS velo_station;
DROP TABLE IF EXISTS velo_velo;
DROP TABLE IF EXISTS velo_usager;
DROP TABLE IF EXISTS velo_trajet;

-- Contrôles post-import
SELECT COUNT(*) AS nb_stations FROM velo_station;
SELECT COUNT(*) AS nb_velos FROM velo_velo;
SELECT COUNT(*) AS nb_trajets FROM velo_trajet;
SELECT station_depart, COUNT(*) AS depart_count
FROM velo_trajet
GROUP BY station_depart
ORDER BY depart_count DESC
LIMIT 5;`,
  classe: `-- Nettoyage
DROP TABLE IF EXISTS eleves;
DROP TABLE IF EXISTS profs;
DROP TABLE IF EXISTS options;
DROP TABLE IF EXISTS inscriptions_options;

-- Contrôles post-import
SELECT COUNT(*) AS nb_eleves FROM eleves;
SELECT COUNT(*) AS nb_profs FROM profs;
SELECT COUNT(*) AS nb_options FROM options;
SELECT COUNT(*) AS nb_inscriptions FROM inscriptions_options;
SELECT option_id, COUNT(*) AS nb_affectations
FROM inscriptions_options
GROUP BY option_id
ORDER BY nb_affectations DESC
LIMIT 5;`
};

export const defaultSolutionOverrides: SolutionOverrideState = {
  scenarios: {
    commerce: null,
    bibliotheque: null,
    reseau: null
  },
  projects: null
};

export const evaluationScenarios: ScenarioDefinition[] = [
  {
    id: "commerce",
    title: "Commerce connecté",
    schema:
      "Client(#id_client, nom, email) · Produit(#id_produit, libelle, prix, categorie) · Commande(#id_commande, date, id_client) · Ligne(#id_commande, #id_produit, quantite, prix_unitaire)",
    description:
      "Piloter une boutique en ligne : analyser le chiffre d’affaires, les paniers moyens, identifier les produits stars ou peu rentables.",
    exercises: [
      {
        question: "Lister le top 10 des produits par chiffre d’affaires.",
        hint: "JOIN Ligne ↔ Produit, SUM(quantite * prix_unitaire), GROUP BY",
        solution: `SELECT p.id_produit, p.libelle,
       SUM(l.quantite * l.prix_unitaire) AS chiffre_affaires
FROM Ligne l
JOIN Produit p ON p.id_produit = l.id_produit
GROUP BY p.id_produit, p.libelle
ORDER BY chiffre_affaires DESC
LIMIT 10;`
      },
      {
        question: "Panier moyen par client.",
        hint: "COUNT commandes + SUM total, AVG",
        solution: `SELECT c.id_client, c.nom,
       COUNT(DISTINCT cmd.id_commande) AS nb_commandes,
       SUM(cmd.total) AS ca_client,
       AVG(cmd.total) AS panier_moyen
FROM Client c
LEFT JOIN Commande cmd ON cmd.id_client = c.id_client
GROUP BY c.id_client, c.nom;`
      },
      {
        question: "Produits jamais vendus.",
        hint: "LEFT JOIN Ligne → WHERE ligne.id_produit IS NULL",
        solution: `SELECT p.*
FROM Produit p
LEFT JOIN Ligne l ON l.id_produit = p.id_produit
WHERE l.id_produit IS NULL;`
      }
    ]
  },
  {
    id: "bibliotheque",
    title: "Bibliothèque municipale",
    schema:
      "Lecteur(#id_lecteur, nom, email) · Livre(#id_livre, titre, annee) · Emprunt(#id_emprunt, date_debut, date_retour, id_lecteur, id_livre) · Auteur(#id_auteur, nom) · Ecrire(#id_auteur, #id_livre)",
    description:
      "Gérer l’activité d’une médiathèque : fidélisation des lecteurs, rotation du fonds documentaire, auteurs les plus consultés.",
    exercises: [
      {
        question: "Top 5 des lecteurs qui empruntent le plus.",
        hint: "COUNT(*) + GROUP BY id_lecteur",
        solution: `SELECT l.id_lecteur, l.nom,
       COUNT(*) AS nb_emprunts
FROM Emprunt e
JOIN Lecteur l ON l.id_lecteur = e.id_lecteur
GROUP BY l.id_lecteur, l.nom
ORDER BY nb_emprunts DESC
LIMIT 5;`
      },
      {
        question: "Livres jamais empruntés.",
        hint: "LEFT JOIN Emprunt, filtrer sur NULL",
        solution: `SELECT liv.*
FROM Livre liv
LEFT JOIN Emprunt emp ON emp.id_livre = liv.id_livre
WHERE emp.id_livre IS NULL;`
      },
      {
        question: "Durée moyenne d’emprunt par année de parution.",
        hint: "AVG(julianday(date_retour) - julianday(date_debut))",
        solution: `SELECT liv.annee,
       AVG(CAST(julianday(emp.date_retour) - julianday(emp.date_debut) AS REAL)) AS duree_moyenne
FROM Emprunt emp
JOIN Livre liv ON liv.id_livre = emp.id_livre
GROUP BY liv.annee
ORDER BY liv.annee;`
      }
    ]
  },
  {
    id: "reseau",
    title: "Réseau social scolaire",
    schema:
      "Utilisateur(#id_user, pseudo, email, date_inscription) · Publication(#id_pub, contenu, date_pub, id_user) · Relation(#id_user_src, #id_user_dst, type) · Aime(#id_user, #id_pub, date_like)",
    description:
      "Analyser l’engagement, détecter les élèves isolés, comprendre la propagation des contenus dans un réseau social fermé.",
    exercises: [
      {
        question: "Nombre de likes par publication.",
        hint: "COUNT(Aime) + GROUP BY id_pub",
        solution: `SELECT pub.id_pub, pub.contenu,
       COUNT(aime.id_user) AS nb_likes
FROM Publication pub
LEFT JOIN Aime aime ON aime.id_pub = pub.id_pub
GROUP BY pub.id_pub, pub.contenu
ORDER BY nb_likes DESC;`
      },
      {
        question: "Publications des amis directs d’un utilisateur (U001).",
        hint: "JOIN Relation → Publication",
        solution: `SELECT pub.*
FROM Relation rel
JOIN Publication pub ON pub.id_user = rel.id_user_dst
WHERE rel.id_user_src = 'U001'
  AND rel.type = 'ami';`
      },
      {
        question: "Utilisateurs qui n’ont jamais publié.",
        hint: "LEFT JOIN Publication → NULL",
        solution: `SELECT u.*
FROM Utilisateur u
LEFT JOIN Publication p ON p.id_user = u.id_user
WHERE p.id_user IS NULL;`
      }
    ]
  }
];
