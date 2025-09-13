# CAHIER DES CHARGES – BILAN PÉDAGOGIQUE NSI TERMINALE

Ce document est votre guide exhaustif et cohérent pour l'implémentation du Bilan "Terminale NSI". Il intègre tous les détails que nous avons discutés et doit vous permettre de réaliser un travail de la plus haute qualité.

**Objet : Implémentation du Volet 2 du Bilan Pédagogique NSI Terminale et Workflow de Génération des Rapports Élève/Enseignant (Non-Commercial).**

**Contexte :**
Ce document détaille la conception du Volet 2 (Profil Pédagogique et Personnel) spécifique à la NSI Terminale, ainsi que le workflow de génération de rapports de bilan à usage interne (élève et enseignant). L'objectif est de fournir un outil d'évaluation complet, d'une qualité pédagogique et d'une précision diagnostique maximales pour un accompagnement ciblé en classe.

L'IA utilisera un prompt détaillé et un RAG (programmes NSI, vademecum) pour générer des bilans chiffrés, personnalisés et actionnables.

---

## **1. Philosophie et Objectifs du Bilan Pédagogique NSI (Usage Interne)**

* **But Principal :** Fournir à l'élève et à l'enseignant de NSI un diagnostic précis des acquis, des compétences, des méthodes de travail et du profil d'apprentissage de l'élève en informatique. Ce bilan doit être un **outil d'aide à la décision pédagogique** pour l'enseignant et un **guide pour l'élève**.
* **Nature :** Le rapport est purement pédagogique.
* **Livrables Attendus :**

1. **Questionnaire Interactif :** Volet 1 (QCM NSI Première pour entrée Terminale) et Volet 2 (Profil Pédagogique NSI & Personnel).
2. **Rapport Élève (HTML/PDF) :** Synthétique, motivant, avec badges, feuille de route de 2 semaines, conseils pratiques.
3. **Rapport Enseignant (HTML/PDF) :** Analytique, détaillé, avec interprétation des scores, leviers pédagogiques, plan d'appui sur 4 semaines, critères d'observation.
4. **Bilan Chiffré :** Statistiques par domaine, taux de tags/flags, graphique radar.

---

### **2. Structuration du Volet 2 du Questionnaire (NSI Terminale - Détaillé)**

Ce Volet 2 sera un questionnaire riche et ciblé, combinant choix multiples, échelles Likert et texte libre, pour cerner au mieux le profil de l'élève en NSI. Il est conçu pour être la "Fiche d'auto-suivi" mentionnée dans `idées_questionnaire.md`, mais structurée pour l'analyse.

**JSON Structuré du Volet 2 - `data/pedago_survey_nsi_terminale.json`**

```json
{
  "meta": {
    "title": "Volet 2 — Profil Pédagogique & Personnel (NSI Terminale)",
    "niveauCible": "Terminale",
    "matiere": "NSI",
    "version": "1.0",
    "domainsOrder": [
      "AmbitionOrientation",
      "MotivationEngagement",
      "ConfianceRapportErreur",
      "StyleApprentissageNSI",
      "MethodesTravailNSI",
      "OrganisationGestionTemps",
      "CompetencesTransversales",
      "CollaborationCommunication",
      "DefisPersistanceNSI",
      "ContexteMaterielAide",
      "ReflexionAutoEvaluation"
    ],
    "scaleLikert5": { "min": 1, "max": 5, "labels": ["Pas du tout", "Plutôt pas", "Mitigé", "Plutôt oui", "Tout à fait"] },
    "scaleLikert4Freq": { "min": 1, "max": 4, "labels": ["Jamais", "Rarement", "Souvent", "Très souvent"] }
  },
  "questions": [
    // --- Section 1 : Ambition & Orientation (Intègre "À quoi je m'attends ?") ---
    {
      "id": "A1",
      "domain": "AmbitionOrientation",
      "type": "single",
      "statement": "Pourquoi avez-vous choisi de poursuivre la spécialité NSI en Terminale ?",
      "options": [
        "Curiosité et intérêt personnel pour l'informatique",
        "Pour un projet d'études supérieures ou un métier précis",
        "Pour obtenir une bonne note au Baccalauréat",
        "J'aime développer ma logique et résoudre des problèmes",
        "Influence de l'entourage ou par défaut"
      ],
      "required": true,
      "mapsTo": "motivation_principale_nsi"
    },
    {
      "id": "A2",
      "domain": "AmbitionOrientation",
      "type": "text",
      "label": "Quels sont vos projets d'études supérieures ou professionnels après le Bac ? (Ex: école d'ingénieurs en info, licence en maths/info, métier de développeur, etc.)",
      "placeholder": "Décrivez brièvement vos aspirations...",
      "maxlength": 500,
      "mapsTo": "projets_post_bac"
    },
    {
      "id": "A3",
      "domain": "AmbitionOrientation",
      "type": "single",
      "statement": "Quelle mention au Baccalauréat visez-vous ?",
      "options": ["Sans mention particulière", "Assez bien", "Bien", "Très bien", "Très bien avec Félicitations du jury"],
      "mapsTo": "mention_visee"
    },
    {
      "id": "A4",
      "domain": "AmbitionOrientation",
      "type": "text",
      "label": "Pour cette année de Terminale NSI, quels résultats ou compétences souhaitez-vous absolument atteindre ? ('À quel(s) résultat(s) est-ce que je souhaite arriver ?')",
      "placeholder": "Ex: Maîtriser les graphes, faire un projet personnel, obtenir plus de 15 au Bac NSI...",
      "maxlength": 500,
      "mapsTo": "attentes_resultats_nsi"
    },
    {
      "id": "A5",
      "domain": "AmbitionOrientation",
      "type": "text",
      "label": "Quelles sont vos attentes vis-à-vis de l'enseignement de NSI cette année ? ('À quoi je m'attends ?')",
      "placeholder": "Ex: Des cours très pratiques, des projets réguliers, de l'aide sur la programmation...",
      "maxlength": 500,
      "mapsTo": "attentes_enseignement_nsi"
    },

    // --- Section 2 : Motivation & Engagement (Intègre "Investissement / engagement / attitude") ---
    {
      "id": "M1",
      "domain": "MotivationEngagement",
      "type": "likert",
      "statement": "Je me sens très motivé(e) et enthousiaste à l'idée d'apprendre de nouvelles notions en NSI.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "motivation_globale"
    },
    {
      "id": "M2",
      "domain": "MotivationEngagement",
      "type": "single",
      "statement": "Mon attitude face aux cours de NSI est généralement :",
      "options": ["Très active et participative", "Plutôt active", "Plutôt passive (j'écoute, mais n'interviens pas)", "Très passive (j'ai du mal à suivre)"],
      "mapsTo": "attitude_cours"
    },
    {
      "id": "M3",
      "domain": "MotivationEngagement",
      "type": "likert",
      "statement": "Je suis prêt(e) à travailler régulièrement (au moins 2-3h par semaine) sur la NSI en dehors des cours.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "engagement_travail_perso"
    },
    {
      "id": "M4",
      "domain": "MotivationEngagement",
      "type": "multi",
      "statement": "Ce qui vous pousse le plus à vous investir en NSI (choix multiples, max 3) :",
      "options": [
        "Le plaisir de résoudre des problèmes / créer",
        "La perspective des études supérieures / un métier",
        "L'envie d'obtenir de bonnes notes / la mention au Bac",
        "L'avis et les attentes de mes parents / enseignants",
        "Le défi intellectuel / se dépasser",
        "L'utilité concrète de l'informatique"
      ],
      "max": 3,
      "mapsTo": "leviers_investissement"
    },

    // --- Section 3 : Confiance & Rapport à l'Erreur (Intègre "Capacité à remédier à ses difficultés") ---
    {
      "id": "C1",
      "domain": "ConfianceRapportErreur",
      "type": "likert",
      "statement": "Lorsque mon code contient un bug, je persévère pour le débugger seul(e) avant de demander de l'aide.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "persevere_debug_seul"
    },
    {
      "id": "C2",
      "domain": "ConfianceRapportErreur",
      "type": "single",
      "statement": "Face à un problème de programmation complexe, ma première réaction est de :",
      "options": [
        "Décomposer le problème en sous-problèmes plus petits",
        "Chercher des solutions ou indices dans la documentation / sur Internet",
        "Demander de l'aide rapidement à un camarade ou au professeur",
        "Me sentir bloqué(e) et découragé(e)"
      ],
      "mapsTo": "reaction_blocage"
    },
    {
      "id": "C3",
      "domain": "ConfianceRapportErreur",
      "type": "likert",
      "statement": "Je me sens à l'aise pour demander de l'aide ou des explications complémentaires à mes camarades ou à mon professeur.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "facilite_demande_aide"
    },
    {
      "id": "C4",
      "domain": "ConfianceRapportErreur",
      "type": "likert",
      "statement": "Je crois que mes capacités en informatique peuvent se développer significativement avec la pratique et la persévérance.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "etat_esprit_croissance"
    },
    {
      "id": "C5",
      "domain": "ConfianceRapportErreur",
      "type": "likert",
      "statement": "Je n'ai pas peur de faire des erreurs en codant, je les vois comme une opportunité d'apprendre.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "tolere_erreur"
    },

    // --- Section 4 : Style d'Apprentissage NSI & Pensée Informatique ---
    // Intègre "Compétence de la pensée en informatique : évaluer / modéliser / anticiper / décomposer / généraliser / abstraire."
    // Intègre "Concevoir : simple / complexe"
    {
      "id": "S1",
      "domain": "StyleApprentissageNSI",
      "type": "multi",
      "statement": "Je retiens et comprends mieux les concepts informatiques quand : (Choix multiples, max 3)",
      "options": [
        "Je vois des schémas, des diagrammes (ex: UML, graphes, tables)",
        "J'écoute des explications orales ou des tutoriels vidéo",
        "Je lis de la documentation, des fiches de synthèse, des livres",
        "J'expérimente en codant, en testant des programmes",
        "Je décompose un problème complexe en sous-problèmes",
        "J'essaie de conceptualiser / abstraire des solutions générales"
      ],
      "max": 3,
      "required": true,
      "mapsTo": "style_apprentissage_nsi"
    },
    {
      "id": "S2",
      "domain": "StyleApprentissageNSI",
      "type": "single",
      "statement": "Lorsque je conçois un programme ou un algorithme, je préfère :",
      "options": [
        "Commencer à coder directement et ajuster au fur et à mesure",
        "Écrire des étapes claires (pseudo-code, diagramme) avant de coder",
        "M'inspirer de codes existants et les adapter"
      ],
      "mapsTo": "demarche_conception"
    },
    {
      "id": "S3",
      "domain": "StyleApprentissageNSI",
      "type": "likert",
      "statement": "J'ai une bonne capacité à évaluer la complexité (temps, ressources) d'un algorithme simple.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "evalue_complexite"
    },
    {
      "id": "S4",
      "domain": "StyleApprentissageNSI",
      "type": "likert",
      "statement": "Je me sens à l'aise pour modéliser des situations concrètes (ex: un réseau, des données) à l'aide de structures informatiques (graphes, tables, objets).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "modele_situations"
    },
    {
      "id": "S5",
      "domain": "StyleApprentissageNSI",
      "type": "likert",
      "statement": "Je peux anticiper les étapes nécessaires pour résoudre un problème de programmation avant de l'exécuter.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "anticipe_resolution"
    },

    // --- Section 5 : Méthodes de Travail NSI & Auto-Analyse ---
    // Intègre "Analyser (le travail à faire)"
    {
      "id": "T1",
      "domain": "MethodesTravailNSI",
      "type": "likert",
      "statement": "Je lis régulièrement la documentation officielle (Python, bibliothèques, API) quand je rencontre une difficulté ou pour approfondir un sujet.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "utilise_documentation"
    },
    {
      "id": "T2",
      "domain": "MethodesTravailNSI",
      "type": "likert",
      "statement": "Je décompose mes projets ou mes codes en fonctions ou modules plus petits pour faciliter le développement et les tests (approche modulaire).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "decompose_probleme"
    },
    {
      "id": "T3",
      "domain": "MethodesTravailNSI",
      "type": "likert",
      "statement": "J'utilise des tests (assertions) pour vérifier le bon fonctionnement de mes fonctions ou de mon code au fur et à mesure de la progression.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "utilise_tests"
    },
    {
      "id": "T4",
      "domain": "MethodesTravailNSI",
      "type": "likert",
      "statement": "Je commente et documente mes codes (ex: docstrings Python, README du projet) pour les rendre plus lisibles et compréhensibles.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "documente_code"
    },
    {
      "id": "T5",
      "domain": "MethodesTravailNSI",
      "type": "multi",
      "statement": "Quelles sont les ressources ou méthodes qui vous ont été les plus utiles l'année dernière en NSI pour progresser ? (Choix multiples, max 3)",
      "options": [
        "Cours du professeur (notes, polycopiés)",
        "Manuels scolaires / Livres spécialisés",
        "Tutoriels vidéo (YouTube, MOOC)",
        "Sites web / Forums spécialisés (StackOverflow, etc.)",
        "Travaux pratiques (TP) / Projets personnels",
        "Exercices guidés / corrigés",
        "Échanges et collaboration avec des camarades ou le professeur"
      ],
      "max": 3,
      "mapsTo": "ressources_utiles_nsi"
    },
    {
      "id": "T6",
      "domain": "MethodesTravailNSI",
      "type": "text",
      "label": "Décrivez brièvement la méthode de travail que vous trouvez la plus efficace pour apprendre et progresser en NSI (ex: \"Je refais tous les exos\", \"Je programme un petit projet\").",
      "maxlength": 500,
      "mapsTo": "methode_efficace_nsi"
    },

    // --- Section 6 : Organisation & Gestion du Temps (Intègre "Autonomie") ---
    {
      "id": "O1",
      "domain": "OrganisationGestionTemps",
      "type": "single",
      "statement": "Comment organises-tu généralement ton travail hebdomadaire pour la NSI et les autres matières ?",
      "options": [
        "Planning écrit détaillé (papier ou numérique)",
        "Organisation mentale (sans support de planification précis)",
        "Au jour le jour, en fonction des urgences et de l'inspiration",
        "Je ne planifie que les évaluations importantes",
        "J'ai du mal à planifier et je me sens souvent débordé(e)"
      ],
      "required": true,
      "mapsTo": "organisation_hebdo"
    },
    {
      "id": "O2",
      "domain": "OrganisationGestionTemps",
      "type": "single",
      "statement": "Combien de temps par semaine consacres-tu à la NSI (cours, projets, révisions, hors séances en classe) ?",
      "options": ["Moins d'1h", "1-2h", "2-3h", "3-5h", "Plus de 5h"],
      "mapsTo": "temps_nsi_hors_classe"
    },
    {
      "id": "O3",
      "domain": "OrganisationGestionTemps",
      "type": "likert",
      "statement": "Je me sens souvent débordé(e) par la quantité de travail ou par les échéances (projets, devoirs) en NSI.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "surcharge_travail_nsi"
    },
    {
      "id": "O4",
      "domain": "OrganisationGestionTemps",
      "type": "multi",
      "statement": "Quels outils utilises-tu pour t'organiser et suivre tes tâches/projets ? (Choix multiples, max 3)",
      "options": [
        "Agenda papier",
        "Agenda numérique (Google Calendar, Outlook)",
        "Applications de gestion de tâches/projets (Notion, Trello, Todoist, VS Code Tasks)",
        "Cahier/Fiches de cours structurées",
        "Gestionnaire de versions (Git, GitHub)",
        "Aucun outil spécifique"
      ],
      "max": 3,
      "mapsTo": "outils_organisation"
    },
    {
      "id": "O5",
      "domain": "OrganisationGestionTemps",
      "type": "likert",
      "statement": "Je suis autonome dans la gestion de mes projets de NSI (découpage, planification, suivi).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "autonomie_projets"
    },
    {
      "id": "O6",
      "domain": "OrganisationGestionTemps",
      "type": "text",
      "label": "Décris une journée ou une semaine type où tu te sens très productif/ve en NSI et une autre où tu es moins efficace. Qu'est-ce qui change dans ton approche ou ton environnement ?",
      "maxlength": 500,
      "mapsTo": "journee_productive_vs_inefficace"
    },

    // --- Section 7 : Compétences Transversales & Pensée Informatique (Approfondi) ---
    // Intègre "Compétences informatiques → Programmes"
    // Intègre "Compétence de la pensée en informatique : évaluer / modéliser / anticiper / décomposer / généraliser / abstraire."
    {
      "id": "T1",
      "domain": "CompetencesTransversales",
      "type": "likert",
      "statement": "Je me sens capable de décomposer un problème complexe en informatique en sous-problèmes plus petits et gérables (Décomposer).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "competence_decompose"
    },
    {
      "id": "T2",
      "domain": "CompetencesTransversales",
      "type": "likert",
      "statement": "J'arrive à concevoir une solution algorithmique avant de passer à l'écriture du code (Concevoir).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "competence_concevoir"
    },
    {
      "id": "T3",
      "domain": "CompetencesTransversales",
      "type": "likert",
      "statement": "Je peux évaluer la pertinence d'un modèle ou d'une solution algorithmique pour un problème donné (Évaluer).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "competence_evaluer"
    },
    {
      "id": "T4",
      "domain": "CompetencesTransversales",
      "type": "likert",
      "statement": "J'anticipe bien les étapes et les résultats d'un programme avant de l'exécuter (Anticiper).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "competence_anticiper"
    },
    {
      "id": "T5",
      "domain": "CompetencesTransversales",
      "type": "likert",
      "statement": "J'arrive à généraliser des concepts informatiques pour les appliquer à de nouvelles situations (Généraliser).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "competence_generaliser"
    },
    {
      "id": "T6",
      "domain": "CompetencesTransversales",
      "type": "likert",
      "statement": "Je suis capable d'abstraire des détails pour me concentrer sur l'essentiel d'un problème informatique (Abstraire).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "competence_abstraire"
    },

    // --- Section 8 : Collaboration & Communication (Intègre "Communication : avec mes pairs / avec le prof") ---
    {
      "id": "COM1",
      "domain": "CollaborationCommunication",
      "type": "likert",
      "statement": "J'aime travailler en binôme ou en groupe sur des projets de NSI (pair programming, projets collaboratifs).",
      "scaleRef": "scaleLikert5",
      "mapsTo": "pref_travail_groupe"
    },
    {
      "id": "COM2",
      "domain": "CollaborationCommunication",
      "type": "likert",
      "statement": "Je sais expliquer mon code ou mon raisonnement informatique clairement à mes camarades ou à mon professeur.",
      "scaleRef": "scaleLikert5",
      "mapsTo": "communique_code"
    },
    {
      "id": "COM3",
      "domain": "CollaborationCommunication",
      "type": "single",
      "statement": "Quand j'ai une question complexe sur un cours ou un projet de NSI, je préfère :",
      "options": [
        "Poser la question à mon professeur pendant le cours ou en privé",
        "Demander de l'aide à mes camarades",
        "Rechercher la réponse sur Internet (documentation, forums)",
        "Essayer de résoudre seul(e) jusqu'à trouver la solution"
      ],
      "mapsTo": "canal_aide_prefere"
    },
    {
      "id": "COM4",
      "domain": "CollaborationCommunication",
      "type": "single",
      "statement": "Penses-tu qu'un parrainage par un élève plus expérimenté (de 1ère ou Tle NSI) te serait positif pour ton apprentissage ?",
      "options": ["Oui, très utile", "Oui, potentiellement utile", "Neutre", "Non, pas nécessaire", "Non, pas du tout utile"],
      "mapsTo": "interet_parrainage"
    },

    // --- Section 9 : Défis & Persistance NSI ---
    {
      "id": "DF1",
      "domain": "DefisPersistanceNSI",
      "type": "multi",
      "statement": "Quelles sont les notions ou thèmes de Terminale NSI qui vous semblent les plus complexes ou qui vous inquiètent le plus ? (Choix multiples, max 3)",
      "options": [
        "Structures de données avancées (arbres, graphes, tables de hachage)",
        "Bases de données relationnelles (SQL avancé, transactions)",
        "Architectures matérielles (Von Neumann, CPU, mémoire cache)",
        "Systèmes d'exploitation (processus, threads, interblocages)",
        "Réseaux (routage, protocoles, sécurité)",
        "Programmation (paradigmes, récursivité, programmation dynamique)",
        "Algorithmique avancée (complexité, preuves, algorithmes de graphes)",
        "Projets de grande envergure (gestion d'équipe, cahier des charges)",
        "Préparation à l'épreuve du Grand Oral (présentation de projet)",
        "Gestion des bugs complexes et optimisation de code"
      ],
      "max": 3,
      "mapsTo": "themes_complexes_anticipe"
    },
    {
      "id": "DF2",
      "domain": "DefisPersistanceNSI",
      "type": "text",
      "label": "Si vous aviez un accès illimité à un expert NSI, quelle serait la question la plus importante que vous lui poseriez pour vous aider à préparer votre année de Terminale ?",
      "placeholder": "Ex: Comment mieux aborder les graphes ou la POO en Python ?",
      "maxlength": 500,
      "mapsTo": "question_expert_nsi"
    },

    // --- Section 10 : Contexte Matériel & Aides Spécifiques ---
    {
      "id": "CM1",
      "domain": "ContexteMaterielAide",
      "type": "multi",
      "statement": "À la maison, je dispose de… (Choix multiples, max 3)",
      "options": [
        "Un ordinateur personnel (fixe ou portable) performant",
        "Un système d'exploitation libre (Linux)",
        "Une connexion internet stable et rapide",
        "Un espace calme et dédié au travail sur l'ordinateur",
        "Des logiciels de programmation/IDE adaptés (VS Code, PyCharm)"
      ],
      "max": 3,
      "mapsTo": "environnement_maison"
    },
    {
      "id": "CM2",
      "domain": "ContexteMaterielAide",
      "type": "single",
      "statement": "Penses-tu que l'utilisation de ton propre appareil numérique (BYOD) en classe te serait bénéfique pour la NSI ?",
      "options": ["Oui, très bénéfique", "Plutôt bénéfique", "Neutre", "Plutôt pas bénéfique", "Non, pas du tout bénéfique"],
      "mapsTo": "byod_benefice"
    },
    {
      "id": "CM3",
      "domain": "ContexteMaterielAide",
      "type": "single",
      "statement": "As-tu un dispositif d'accompagnement scolaire particulier (ex: PAP, PPS, PAI) ou un suivi par un spécialiste (orthophoniste, psychologue, neuropsy, etc.) ?",
      "options": ["Oui, j'ai un PAP/PPS/PAI", "Oui, je suis suivi(e) par un spécialiste", "Non, aucun dispositif ou suivi"]
    },
    {
      "id": "CM4",
      "domain": "ContexteMaterielAide",
      "type": "text",
      "label": "Si vous avez un dispositif ou un suivi (question CM3), souhaitez-vous nous en informer pour adapter nos méthodes pédagogiques ? (Ex: dyslexie, TDAH, troubles de l'anxiété, aménagement pour le temps...) ",
      "maxlength": 500,
      "mapsTo": "details_accompagnement_specifique"
    },

    // --- Section 11 : Réflexion & Auto-Évaluation (Intègre "Où j'en suis avant de démarrer ?") ---
    {
      "id": "R1",
      "domain": "ReflexionAutoEvaluation",
      "type": "text",
      "label": "Pour commencer cette année de Terminale NSI, où pensez-vous en être dans votre maîtrise des notions informatiques (vos forces, vos points faibles) ? ('Où j'en suis avant de démarrer ?')",
      "placeholder": "Ex: Je suis bon en Python mais les graphes me semblent complexes...",
      "maxlength": 500,
      "mapsTo": "auto_evaluation_depart"
    },
    {
      "id": "R2",
      "domain": "ReflexionAutoEvaluation",
      "type": "multi",
      "statement": "Pour vous aider à suivre vos progrès cette année, quelle(s) forme(s) de "Fiche d'auto-suivi" ou de "cahier évalué" serait(ent) le plus utile(s) ? (Choix multiples, max 3)",
      "options": [
        "Un carnet de bord numérique (ex: Notion, Markdown) pour noter mes réflexions et mes avancées.",
        "Un cahier papier dédié à mes codes et algorithmes (évalué régulièrement par l'enseignant).",
        "Des bilans intermédiaires réguliers (chaque mois) avec l'enseignant pour faire le point.",
        "Un tableau de bord en ligne avec mes scores et badges de progression.",
        "Des revues de projet individuelles ou en groupe pour évaluer l'avancement."
      ],
      "max": 3,
      "mapsTo": "preferences_auto_suivi"
    }
  ]
}
```

---

### **3. Algorithmes de Scoring & Indices Pédagogiques (Volet 2)**

Ces algorithmes seront implémentés côté backend (Next.js API), en s'appuyant sur le fichier `data/pedago_survey_terminale_nsi.json` pour la structure des questions et les `mapsTo` pour les indices.

* **3.1. `lib/scoring/pedago_nsi_indices.ts` :** (Nouveau fichier spécifique NSI pour les indices pédagogiques)
  * **`scorePedagoNSI(survey: PedagoSurvey, answers: Record<string, PedagoAnswer>): PedagoScores` :** Calcule des scores agrégés par domaine pédagogique (Motivation, Méthodes, Organisation, etc.). Normalisation des Likert (1-5 vers 0-1).
  * **`deriveProfileNSI(pedagoScores: PedagoScores, pedagoRawAnswers: Record<string, PedagoAnswer>): PedagoProfile` :** Dérive un `PedagoProfile` (style VAK majoritaire, autonomie, organisation, stress, flags DYS/TDAH/Anxiété) et les indices numériques `IDX_*` (`preAnalyzedData`).
    * **Exemples d'Indices NSI Spécifiques (à implémenter) :**
      * `IDX_PROJETS_MOTIV_NSI` (basé sur A1, A4, M3)
      * `IDX_RESILIENCE_DEBUG` (basé sur C1, C2, C3)
      * `IDX_COMP_INFO_TRANSVERSALES` (basé sur T1 à T6)
      * `IDX_ORGANISATION_PROJETS` (basé sur O1, O4, O5)
      * `IDX_CONNAISSANCE_OUTILS_NSI` (basé sur O4, CM1)
      * `IDX_ADAPTATION_ACCOMPAGNEMENT` (basé sur B4, B5, CM3, CM4)
    * **Mapping des questions aux indices :** Chaque question est mappée à un `mapsTo` dans le JSON, permettant un calcul direct ou une agrégation. Les questions libres seront traitées par l'IA.

---

### **4. Génération du Texte du Bilan (Agent Intelligent) et Ligne Éditoriale**

**4.1. Prompt Détaillé pour l'Agent Intelligent (OpenAI) – Rapport Complet (NSI Terminale) :**
Ce prompt sera utilisé par `POST /api/bilan/generate-report-text`.

```txt
Tu es un expert pédagogique, didacticien et stratège en Sciences Numériques et Informatiques (NSI), travaillant pour l'équipe enseignante du Lycée Pierre Mendès France de Tunis.
Ta mission est d'analyser les résultats d'un élève de Terminale NSI (bilan de compétences scolaires NSI Première + questionnaire de profil d'apprentissage et personnel) et de rédiger un rapport de bilan pédagogique complet, professionnel et structuré. Ce rapport est destiné à l'élève et à son enseignant de NSI.

**Ton rôle incarne l'expertise pédagogique du Lycée Pierre Mendès France de Tunis :**
- La bienveillance et la pédagogie active des professeurs de NSI.
- La précision analytique de notre plateforme pour un diagnostic juste.
- La capacité à proposer des stratégies de progression concrètes et adaptées aux exigences du programme NSI Terminale et à l'orientation supérieure.

---

## Données brutes de l’élève à analyser :

```json
{
  "eleve": {
    "prenom": "Jean",
    "nom": "Dupont",
    "niveau": "Terminale",
    "matiere": "NSI Spécialité",
    "statut": "Scolarisé",
    "etablissement": "Lycée Lyautey (étranger AEFE)",
    "plan_accompagnement": "Aucun",
    "suivi_specialiste": "Non",
    "objectifs_eleve_parent": "Intégrer une CPGE MPSI, exceller en NSI au Bac, développer des projets complexes."
  },
  "qcmScores": {
    "global_mastery_percent": 68,
    "by_domain": {
      "TypesBase": {"percent": 85, "points": 17, "max": 20, "feedback": "Maîtrise solide des représentations binaires et hexadécimales."},
      "AlgoComplexite": {"percent": 55, "points": 11, "max": 20, "feedback": "Concepts de complexité et de preuves algorithmiques à renforcer."},
      "Python": {"percent": 70, "points": 14, "max": 20, "feedback": "Bonne pratique du langage, mais besoin d'approfondir les idiomes Python."},
      "Structures": {"percent": 40, "points": 8, "max": 20, "feedback": "Concepts de piles, files, arbres binaires et de recherche critiques à consolider."},
      "SQL": {"percent": 60, "points": 12, "max": 20, "feedback": "Bases SQL acquises, mais les jointures et requêtes avancées nécessitent du travail."},
      "WebIHM": {"percent": 75, "points": 15, "max": 20, "feedback": "Connaissances solides des interactions client-serveur et des formulaires web."},
      "Reseaux": {"percent": 65, "points": 13, "max": 20, "feedback": "Maîtrise des protocoles de base, mais approfondir la sécurité des réseaux."}
    },
    "critical_lacunes": ["Structures de données avancées (Arbres, Graphes)", "Complexité algorithmique (Preuves, Optimisation)"]
  },
  "pedagoProfile": {
    "style_apprentissage": "Kinesthésique (pratique, expérimentation)",
    "organisation_travail": "J'ai du mal à planifier et je me sens souvent débordé(e)",
    "rythme_travail_efficace": "Soir",
    "motivation_actuelle": "Très élevée",
    "rapport_erreur": "Décomposer le problème en sous-problèmes plus petits",
    "confiance_scolaire": "Bonne",
    "stress_evaluations": "Modéré",
    "difficultes_declarees": "Difficulté à rester concentré longtemps sur un problème, l'abstraction me pose souvent problème.",
    "signaux_dys_tdah_auto_evalue": "Faible (pas de signal fort)",
    "support_familial": "Soutien général",
    "outils_organisation": ["Agenda numérique", "Cahier/Fiches de cours structurées", "Gestionnaire de versions (Git, GitHub)"],
    "preferences_activites": "Je préfère les projets où je peux expérimenter en codant et tester mes idées.",
    "interet_parrainage": "Oui, très utile"
  },
  "pre_analyzed_data": {
    "IDX_AUTONOMIE": 3.0, // sur 5
    "IDX_ORGANISATION": 3.5, // sur 5 (revue de l'échelle, pour coller à Likert)
    "IDX_MOTIVATION": 4.5, // sur 5
    "IDX_STRESS": 2.0, // sur 5
    "IDX_CONCENTRATION": 2.8, // sur 4
    "IDX_MEMORISATION": 3.0, // sur 4
    "IDX_ANALYSE_SYNTHESE": 3.2, // sur 4
    "IDX_SUSPECT_DYS": 1.5, // sur 4
    "IDX_PROJETS_MOTIV_NSI": 4.0, // sur 5
    "IDX_RESILIENCE_DEBUG": 3.5, // sur 5
    "IDX_COMP_INFO_TRANSVERSALES": 3.8, // sur 5
    "IDX_ORGANISATION_PROJETS": 2.5, // sur 5
    "IDX_CONNAISSANCE_OUTILS_NSI": 4.0, // sur 5
    "IDX_ADAPTATION_ACCOMPAGNEMENT": 3.0 // sur 5
  }
}
```

---

## Objectifs du rapport pédagogique

1. **Mettre en Contexte :** Présenter les données collectées de manière pédagogique et contextualisée.
2. **Diagnostic Chiffré :** Fournir des statistiques (scores par domaine, profil radar, badges de maîtrise).
3. **Conseils & Recommandations :** Proposer des aides pratiques et des leviers de progression ciblés.
4. **Feuille de Route :** Établir un plan de travail précis et adapté.

---

## STRUCTURE ATTENDUE DES RAPPORTS (ÉLÈVE et ENSEIGNANT)

**Rappels d’ADN de l'équipe NSI, pour l’IA (Ligne Éditoriale) :**

* **Ton :** Professionnel, bienveillant, valorisant et orienté vers l'action.
* **Style :** Clair, fluide, structuré (listes à puces, titres), sans jargon excessif.
* **Diagnostic :** Rigoureux et objectif, mais positif (faiblesses = "axes de progression").
* **Absence de mention IA :** Le rapport est produit par "l'équipe pédagogique de NSI".
* **Précision :** Recommandations spécifiques et actionnables.
* **RAG :** Les affirmations curriculaires (programmes NSI) doivent s'appuyer sur les extraits RAG fournis.

---

### **A) Rapport ÉLÈVE (Motivation, Cap, 2 semaines) - Via `POST /api/bilan/generate-summary-text`**

* **SYSTEM (élève) :**

    ```text
    Tu es un professeur de NSI du Lycée Pierre Mendès France de Tunis. Tu rédiges un bilan court, positif et concret pour l'élève.
    Objectif : donner un cap de travail sur 2 semaines, avec micro-actions (20–30 min), et 4–6 conseils de méthode adaptés à son profil NSI.
    Style : titres clairs, listes à puces, pas de jargon. Ne révèle JAMAIS les corrigés exacts du QCM.
    Public : Élève de Terminale NSI, en vue de Parcoursup (T1/T2) et du Bac.
    Longueur cible : 250–350 mots.
    Adapte le ton si « TAG_Stress_Eleve » est présent (normalise la charge, propose respiration/étapes courtes).
    Termine par 3 ressources légères internes (banque d’exos chapitres, fiches méthodes, capsules vidéo de la classe) sans lien externe.
    ```

* **USER (gabarit pour données élève) :** (Identique à celui défini précédemment dans `prompts_open_ai_bilans_nsi_terminale_eleve_enseignant.md`.)

* **SORTIE ATTENDUE (JSON) :**

    ```json
    {
      "analysis": {
        "strengths_eleve": "… 3-5 puces de forces/points d'appui (dom. 'excellent/solide') …",
        "remediations_eleve": "… planning succinct J1–J14 avec micro‑tâches ciblées sur dom. 'critique/fragile' (1 mini‑défi par domaine) …",
        "methodes_conseils": "… 4–6 puces de méthodes de travail personnalisées (planification, tests, débogage, prise de notes, pair‑programming selon profil) …",
        "objectifs_eleve": "… reformulation des objectifs T1/T2 & Bac + 2 habitudes concrètes de suivi (ex : 1 quiz hebdo ciblé, 1 fiche mémo) …",
        "ressources": "… 3 puces de ressources internes (banque d’exos chapitres, fiches méthodes, capsules vidéo de la classe) …"
      }
    }
    ```

### **B) Rapport ENSEIGNANT (Analyse, 4 semaines) - Via `POST /api/bilan/generate-report-text`**

* **SYSTEM (enseignant) :**

    ```text
    Tu es un professeur de NSI du Lycée Pierre Mendès France de Tunis. Tu rédiges une analyse diagnostique exploitable en classe.
    Objectif : relier explicitement les faiblesses aux attendus de Terminale NSI (structures de données, bases relationnelles/SQL, graphes, POO, réseaux, architectures matérielles, systèmes, sécurité, optimisation). Tu proposes un plan d’appui sur 4 semaines (séances, ressources internes, évaluations courtes), des critères d’observation et des remédiations ciblées.
    Relie explicitement les faiblesses aux attendus du programme NSI Terminale (référence RAG). Ne révèle JAMAIS les corrigés exacts du QCM.
    Longueur cible : 500–800 mots.
    ```

* **USER (gabarit pour données élève + Contexte RAG) :** (Identique à celui défini précédemment dans `prompts_open_ai_bilans_nsi_terminale_eleve_enseignant.md`, incluant le `RAG_chunks` avec extraits de programme/vademecum pertinents.)

* **SORTIE ATTENDUE (JSON) :**

    ```json
    {
      "analysis": {
        "gestes_commentaires": "… texte analytique 120–200 mots sur les gestes RCP/méthodes/organisation, avec 2–3 constats et 1 levier concret par constat …",
        "alertes_recos": "… puces par tag/flag (si TAG_Python_Faible/TAG_Structures_Faible/TAG_Tables_Faible → relie aux risques immédiats en Terminale (structures, SQL, POO, graphes, réseaux) et propose 1 remédiation brève (15–20 min) + 1 tâche guidée (30–40 min) par tag. Si ALERTE_Parcoursup → suggère cadence d’évaluations formatives) …",
        "plan_4_semaines": "… S1 à S4 (objectifs, activités (individuel/pair/temps), trace attendue, éval rapide (≤10 min)) …",
        "indicateurs_pedago": "… 6–8 indicateurs mesurables (réussite items ciblés, temps de tâche, autonomie tests, qualité des commits si Git, participation oraux) …"
      }
    }
    ```

---

### **5. Arborescence & Fichiers à Créer/Mettre à Jour**

```text
/data/
  qcm_premiere_for_terminale_nsi.json  # Volet 1 = QCM NSI Première (pré-requis Terminale NSI)
  pedago_survey_terminale_nsi.json     # Volet 2 = questions d’ordre général (NSI Terminale spécifique)

/lib/scoring/
  nsi_qcm_scorer.ts                    # Scoring QCM NSI Terminale + agrégats domaines
  pedago_nsi_indices.ts                # Calcul des IDX_* depuis Volet 2 NSI
  suggestionsdecision.ts                   # Matrice de décision pour proposer un suivi personnalisé

/lib/pdf/
  BilanPdfNsiTerminaleEleve.tsx        # Variante PDF Élève
  BilanPdfNsiTerminaleEnseignant.tsx   # Variante PDF Enseignant
  templates/bilan_nsi_terminale.tex    # Gabarit LaTeX principal (XeLaTeX)

/app/(bilan)/
  bilan/initier/page.tsx               # Choix élève/matière/niveau
  bilan/[bilanId]/questionnaire/page.tsx
  bilan/[bilanId]/resultats/page.tsx   # Radar HTML + synthèse + actions PDF/email

/app/api/bilan/
  questionnaire-structure/route.ts     # GET (dynamique V1+V2)
  [bilanId]/submit-answers/route.ts    # POST (persiste réponses, déclenche IA)
  generate-report-text/route.ts        # POST (génère rapport ENSEIGNANT)
  generate-summary-text/route.ts       # POST (génère rapport ÉLÈVE)
  pdf/[bilanId]/route.ts               # GET?variant=eleve|enseignant
  email/[bilanId]/route.ts             # POST (envoi PDF)

/server/graphics/
  radar/buildRadarPng.ts               # Chart.js NodeCanvas → PNG pour LaTeX

/prisma/schema.prisma                  # Modèles Bilan, StudentProfileData (MAJ)```

---

### **6. Modèles Prisma (DB) - Alignés sur la Stratégie**

```prisma
// Fichier : prisma/schema.prisma

// ... (autres modèles existants)

model Bilan {
  id                      String    @id @default(cuid())
  userId                  String
  user                    User      @relation(fields: [userId], references: [id])

  studentId               String?
  student                 Student? @relation(fields: [studentId], references: [id])

  matiere                 String?   // "NSI"
  niveau                  String?   // "Terminale"

  qcmRawAnswers           Json?     // Réponses brutes du QCM (Volet 1)
  pedagoRawAnswers        Json?     // Réponses brutes du questionnaire pédagogique (Volet 2)

  qcmScores               Json?     // Résultats calculés du QCM (global, par domaine, lacunes critiques)
  pedagoProfile           Json?     // Profil pédagogique dérivé du Volet 2 (style, organisation, etc.)
  preAnalyzedData         Json?     // Indices calculés (IDX_* : autonomie, motivation, stress, etc.)
  suggestions                  Json?     // suggestions de suivi et de feuille de route

  reportText              String?   @db.Text // Texte du rapport ENSEIGNANT généré par OpenAI
  summaryText             String?   @db.Text // Texte du rapport ÉLÈVE généré par OpenAI

  generatedAt             DateTime? // Date de génération du rapport complet
  status                  String    @default("PENDING") // PENDING, GENERATED, ERROR, PROCESSING_QCM, PROCESSING_PEDAGO, PROCESSING_AI_REPORT

  variant                 String?   // | enseignant | eleve(le variant généré initialement, ou sélectionné pour l'email/PDF)
  mailLogs                MailLog[]

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}

model StudentProfileData { // Stocke les données du Volet 2 pour réutilisation
  id               String   @id @default(cuid())
  studentId        String   @unique
  student          Student  @relation(fields: [studentId], references: [id])

  pedagoRawAnswers Json?    // Réponses brutes du Volet 2
  pedagoProfile    Json?    // Profil pédagogique dérivé du Volet 2
  preAnalyzedData  Json?    // Indices IDX_* dérivés du Volet 2
  lastUpdatedAt    DateTime @default(now())
}

model Student { // Assurez-vous que le modèle Student a la relation vers StudentProfileData
  id          String              @id @default(cuid())
  // ... autres champs
  profileData StudentProfileData?
  // ...
}

// Alignées sur la dimension HF (384) pour la résilience CPU Only
model Memory {
  id          String     @id @default(cuid())
  studentId   String
  student     Student    @relation(fields: [studentId], references: [id])
  kind        MemoryKind
  content     String     @db.Text
  embedding   Float[]    @db.Vector(384) // Dimension alignée sur paraphrase-multilingual-MiniLM-L12-v2
  importance  Float      @default(1.0)
  accessedAt  DateTime   @default(now())
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([studentId, kind])
  @@index([accessedAt])
}

model KnowledgeAsset { // Alignée sur la dimension HF (384)
  id        String    @id @default(cuid())
  docId     String
  document  UserDocument @relation(fields: [docId], references: [id])
  subject   String    // Matière du chunk (ex: "maths", "nsi")
  level     String?   // Niveau (ex: "Première", "Terminale")
  source    String    // Type de source (ex: "cours", "exercice", "annale", "rapport")
  chunk     String    @db.Text
  tokens    Int
  embedding Float[]   @db.Vector(384) // Dimension alignée sur paraphrase-multilingua l-MiniLM-L12-v2
  meta      Json
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([docId])
  @@index([subject, level])
  @@index([embedding], type: Gin)
}
```

* **Action requise :** Exécuter la migration Prisma pour la dimension 384 : `npm run db:migrate-dev-vector`

---

### **7. Workflow Intégral du Bilan Pédagogique NSI Terminale**

1. **Démarrage du Bilan :** L'enseignant (ou l'élève si l'accès est donné) initie un bilan pour un élève (choix `matiere="NSI"`, `niveau="Terminale"`). Un objet `Bilan` est créé en `status: PENDING`.
2. **Affichage du Questionnaire (`/bilan/[bilanId]/questionnaire`) :**
   * L'endpoint `GET /api/bilan/questionnaire-structure` est appelé pour obtenir les questions.
   * Le Frontend affiche le **Volet 1 (QCM NSI Terminale)**.
   * Si le `StudentProfileData` de l'élève est absent, le Frontend affiche ensuite le **Volet 2 (Profil Pédagogique Commun)**.
3. **Soumission des Réponses (`POST /api/bilan/[bilanId]/submit-answers`) :**
   * Les réponses brutes (`qcmRawAnswers`, `pedagoRawAnswers`) sont stockées.
   * Le `nsi_qcm_scorer.ts` calcule `qcmScores`.
   * Si Volet 2 est rempli : `pedago_nsi_indices.ts` calcule `pedagoProfile` et `preAnalyzedData`. Ces données sont aussi stockées dans `StudentProfileData` de l'élève.
   * La matrice de décision (`offers_decision.ts`) calcule `offers` (pour les prompts IA, même si non exposé au user final).
   * Le `Bilan.status` passe à `PROCESSING_AI_REPORT`.
   * Des jobs BullMQ sont enqueued pour `generate-report-text` (rapport enseignant) et `generate-summary-text` (rapport élève).
4. **Génération des Rapports par l'IA (Worker BullMQ) :**
   * Les jobs appellent `POST /api/bilan/generate-report-text` (pour le rapport Enseignant) et `POST /api/bilan/generate-summary-text` (pour le rapport Élève).
   * Ces endpoints utilisent le prompt détaillé (Section 5.1 / 5.2) et le RAG (pour programme/vademecum NSI) pour générer le `reportText` et `summaryText`.
   * Le `Bilan.status` est mis à jour (`GENERATED`).
5. **Rendu et Actions sur le Dashboard (`/bilan/[bilanId]/resultats`) :**
   * L'élève et l'enseignant peuvent accéder à la page des résultats.
   * **Élève :** Affiche le `summaryText` (rapport élève), le radar HTML, et les badges. Boutons pour télécharger le PDF "Élève" ou "Enseignant", envoyer par e-mail.
   * **Enseignant :** Affiche le `reportText` (rapport enseignant détaillé), le radar HTML, et les indicateurs pédagogiques. Boutons pour télécharger les PDFs "Élève" ou "Enseignant", envoyer par e-mail.
   * **Génération/Envoi PDF :** L'API `GET /api/bilan/pdf/[bilanId]?variant=eleve|enseignant` et `POST /api/bilan/email/[bilanId]` sont utilisées, s'appuyant sur les composants `BilanPdfNsiTerminaleEleve.tsx` et `BilanPdfNsiTerminaleEnseignant.tsx` et le gabarit LaTeX.

---

### **8. Qualité et Garde-fous Pédagogiques**

* **8.1. Bornage Strict du Programme :** Toutes les questions du QCM (Volet 1) restent **strictement dans le programme de Première NSI**, en ciblant les pré-requis de Terminale. Aucune question de Terminale NSI n'est autorisée dans le QCM.
* **8.2. Qualité du Rendu LaTeX :** Utilisation de KaTeX pour HTML et XeLaTeX pour PDF, assurant un rendu impeccable des formules et du code. Le `buildRadarPng` est intégré au pipeline PDF.
* **8.3. Ligne Éditoriale des Rapports :** Ton professionnel, bienveillant, valorisant. **Absence totale de mention d'IA**. Faiblesses reformulées en "axes de progression". Précision et actionnabilité des recommandations.
* **8.4. Revue Pédagogique :** Prévoir une double relecture humaine (prof + coordinateur pédagogique) des QCM et des exemples de rapports générés par l'IA avant toute mise en production.

---

### **9. Checklist d'Implémentation et d'Acceptation (Cursor)**

* **[ ] Fichiers JSON QCM et Pédagogique :** `data/qcm_premiere_for_terminale_nsi.json` (40 questions + 3 mini-exercices), `data/pedago_survey_terminale_nsi.json` (Volet 2 complet), créés et conformes aux schémas.
* **[ ] Modèles Prisma :** `Bilan`, `StudentProfileData`, `Memory`, `KnowledgeAsset` (tous avec `vector(384)`) mis à jour et migrations exécutées.
* **[ ] Adaptateurs Scoring (TypeScript) :** `nsi_qcm_scorer.ts`, `pedago_nsi_indices.ts`, `offers_decision.ts` implémentés et testés.
* **[ ] Rendu PDF (React-PDF) :** `lib/pdf/templates/bilan_terminale_nsi.tex`, `BilanPdfNsiTerminaleEleve.tsx`, `BilanPdfNsiTerminaleEnseignant.tsx` implémentés, intégrant `reportText`/`summaryText` et `radar.png`.
* **[ ] Endpoints API :** `GET /api/bilan/questionnaire-structure`, `POST /api/bilan/[bilanId]/submit-answers`, `POST /api/bilan/generate-report-text`, `POST /api/bilan/generate-summary-text`, `GET /api/bilan/pdf/[bilanId]?variant=...`, `POST /api/bilan/email/[bilanId]` implémentés et sécurisés (ACL).
* **[ ] `server/vector/embeddings.ts` :** Stratégie hybride OpenAI (si dispo) → Hugging Face (`MiniLM-L12-v2`, 384 dim, padding) implémentée et testée.
* **[ ] `server/graphics/radar/buildRadarPng.ts` :** Script de génération du radar PNG fonctionnel.
* **[ ] Frontend (UI) :** Pages de Bilan dynamiques, responsives, UX fluide, avec KaTeX, auto-save, affichage du radar et des rapports (élève/enseignant).
* **[ ] Tests (Unit/Int/E2E) :** Suite de tests spécifiques au bilan NSI Terminale verte (QCM, pédagogique, génération rapport, PDF/email, ACL).
* **[ ] Ligne Éditoriale :** Rapports générés par l'IA respectent toutes les consignes éditoriales et l'absence de mention IA.

---

**Fin du Cahier des Charges Détaillé BILAN_TERMINALE_NSI.md.**
