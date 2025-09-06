## **CAHIER DES CHARGES – DÉVELOPPEMENT DU BILAN PÉDAGOGIQUE NSI TERMINALE (Lycée Pierre Mendès France de Tunis)**

**À l'attention de l'Agent IA Cursor (Développement),**

**Objet : Implémentation Complète du Bilan Pédagogique d'Entrée en Terminale NSI et Workflow de Génération des Rapports Élève/Enseignant (Contexte Lycée Pierre Mendès France de Tunis).**

**Contexte du Projet :**
En tant qu'enseignant de NSI au Lycée Pierre Mendès France de Tunis et chef de projet, l'objectif est de développer et déployer un outil de bilan pédagogique d'entrée en Terminale NSI pour mes élèves. Ce projet s'intègre au sous-domaine `nsi.labomaths.tn` et se concentrera sur le questionnaire et la génération de bilans personnalisés.

Ce cahier des charges fusionne toutes les spécifications fonctionnelles, techniques et pédagogiques nécessaires pour implémenter ce bilan. Il met l'accent sur la qualité, la personnalisation, l'objectivité du diagnostic et l'efficacité de l'accompagnement, le tout dans un cadre **purement pédagogique, sans aucune référence commerciale à NSI PMF ou à des offres**. L'IA est ici un outil au service de la pédagogie.

---

### **1. Philosophie et Objectifs du Bilan Pédagogique NSI Terminale (Usage Interne au Lycée)**

*   **1.1. But Principal :** Fournir à chaque élève de Terminale NSI et à son enseignant un diagnostic précis de :
    *   Ses acquis et compétences en NSI (programme de Première NSI - Volet 1).
    *   Son profil d'apprentissage, ses méthodes de travail et son organisation (Volet 2).
    *   Ses motivations, ses ambitions, ses aptitudes face aux défis informatiques, et ses éventuelles difficultés spécifiques.
    Ce bilan doit être un **outil d'aide à la décision pédagogique** pour l'enseignant et un **guide structurant** pour l'élève en ce début d'année de Terminale.
*   **1.2. Nature du Rapport :** Le rapport est **strictement pédagogique et interne au lycée**, sans aucune mention de NSI PMF, d'offres commerciales, de garanties, ou de tarifs. Il est produit par "l'équipe enseignante de NSI du Lycée Pierre Mendès France de Tunis".
*   **1.3. Livrables Attendus :**
    1.  **Questionnaire Interactif :** Composé d'un Volet 1 (QCM NSI Première pour entrée Terminale) et d'un Volet 2 (Profil Pédagogique NSI & Personnel).
    2.  **Rapport Élève (HTML/PDF) :** Synthétique, motivant, avec badges de niveau de maîtrise, feuille de route de 2 semaines (micro-actions), et conseils pratiques.
    3.  **Rapport Enseignant (HTML/PDF) :** Analytique, détaillé, avec interprétation des scores, leviers pédagogiques, plan d'appui sur 4 semaines, critères d'observation et historique du suivi.
    4.  **Bilan Chiffré :** Statistiques par domaine, taux de tags/flags, graphique radar.

---

### **2. Structuration Détaillée des Questionnaires (Volet 1 & Volet 2)**

**2.1. Volet 1 — QCM NSI Terminale (Pré-requis de Première NSI)**
*   **Objectif :** Évaluer la maîtrise des notions de Première NSI indispensables pour la Terminale.
*   **Contenu :** Utiliser le JSON de 40 questions (plus 3 mini-exercices) détaillé dans le document `BILAN_TERMINALE_NSI.md` (section 2.2). Ce QCM couvre les domaines de `TypesBase`, `AlgoComplexite`, `Python`, `Structures`, `SQL`, `WebIHM`, `Reseaux`, `ArchOS`, `HistoireEthique`.
*   **Bornage :** Questions **strictement** issues du programme de Première NSI, sans dépassement vers la Terminale.
*   **Barème :** Pondération des questions (poids 2 ou 3) avec un total de 90 points.

**2.2. Volet 2 — Profil Pédagogique et Personnel (NSI Terminale - Détaillé)**
*   **Objectif :** Recueillir des informations qualitatives et quantitatives sur le profil d'apprentissage, les méthodes de travail, la motivation, les freins, et les projets de l'élève en NSI. Ce volet doit servir de "Fiche d'auto-suivi".
*   **Contenu :** Utiliser le JSON structuré complet fourni dans `CAHIER_CHARGES_VOLET2.md` (section 2). Il intègre les idées de la "Fiche d'auto-suivi", du RCP et du vademecum.
*   **Axes Évalués :** Ambition & Orientation, Motivation & Engagement, Confiance & Rapport à l'Erreur, Style d'Apprentissage NSI & Pensée Informatique, Méthodes de Travail NSI & Auto-Analyse, Organisation & Gestion du Temps, Compétences Transversales & Pensée Informatique, Collaboration & Communication, Défis & Persistance NSI, Contexte Matériel & Aides Spécifiques, Réflexion & Auto-Évaluation.
*   **Types de Questions :** Choix multiples, Likert (échelles 1-5, 1-4 Fréquence), texte libre.
*   **Réutilisation :** Les réponses de ce Volet 2 seront stockées dans `StudentProfileData` et réutilisées pour tout bilan ultérieur du même élève, sans qu'il ait à le remplir à nouveau.

---

### **3. Algorithmes de Scoring & Indices Pédagogiques (Backend)**

Ces algorithmes seront implémentés côté backend (Next.js API).

*   **3.1. Scoring QCM (Volet 1) - `lib/scoring/nsi_qcm_scorer.ts` :**
    *   **`scoreQCM(qcmQuestions: any[], qcmAnswers: Record<string, any>): ResultsQCM` :** Calcule `qcmScores` (total, global, par domaine, lacunes critiques).
    *   **Seuils :** `< 50%` = Faible ; `50–74%` = Moyen ; `≥ 75%` = Solide.
    *   **Lacunes Critiques :** La liste `qcmScores.critical_lacunes` identifiera les domaines faibles et les questions `critical: true` échouées.

*   **3.2. Scoring Pédagogique (Volet 2) et Indices - `lib/scoring/pedago_nsi_indices.ts` :**
    *   **`scorePedagoNSI(survey: PedagoSurvey, answers: Record<string, PedagoAnswer>): PedagoScores` :** Calcule des scores agrégés par domaine pédagogique (Motivation, Méthodes, Organisation, etc.). Normalisation des Likert (1-5 vers 0-1).
    *   **`deriveProfileNSI(pedagoScores: PedagoScores, pedagoRawAnswers: Record<string, PedagoAnswer>): PedagoProfile` :** Dérive un `PedagoProfile` (style VAK majoritaire, autonomie, organisation, stress, flags DYS/TDAH/Anxiété) et les indices numériques `IDX_*` (`preAnalyzedData`).
        *   **Mapping questions/indices :** Utiliser les `mapsTo` définis dans le JSON du Volet 2.

---

### **4. Génération du Texte du Bilan (Agent Intelligent) et Ligne Éditoriale**

L'IA (OpenAI) générera deux versions du bilan textuel : une pour l'élève (synthétique) et une pour l'enseignant (analytique).

**4.1. Prompt Détaillé pour l'Agent Intelligent (OpenAI) – Rapport Complet (Enseignant) :**
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
    "etablissement": "Lycée Pierre Mendès France de Tunis",
    "plan_accompagnement": "Aucun",
    "suivi_specialiste": "Non",
    "objectifs_eleve": "Intégrer une CPGE MPSI, exceller en NSI au Bac, développer des projets complexes."
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
    "interet_parrainage": "Oui, très utile",
    "preferences_auto_suivi": ["Un carnet de bord numérique", "Des bilans intermédiaires réguliers"]
  },
  "pre_analyzed_data": {
    "IDX_AUTONOMIE": 3.0, // sur 5
    "IDX_ORGANISATION": 3.5, // sur 5
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
  },
  "RAG_chunks": [
    "Extrait du programme NSI Terminale : 'Structures de données avancées: arbres, graphes.'",
    "Extrait du vademecum SNT/NSI : 'La démarche de projet est au cœur de l'enseignement de spécialité NSI. L'évaluation doit porter sur plusieurs aspects: analyse du besoin, organisation, justification des solutions, présentation des résultats, critique des résultats.'",
    "Extrait du RCP : 'Programmer avec des fonctions récursives (07) : Évaluer le résultat de l'appel d'une fonction récursive (E07).'"
  ]
}
```

---

## Objectifs du rapport pédagogique :

1.  **Mettre en Contexte :** Présenter les données collectées de manière pédagogique et contextualisée.
2.  **Diagnostic Chiffré :** Fournir des statistiques (scores par domaine, profil radar, badges de maîtrise).
3.  **Conseils & Recommandations :** Proposer des aides pratiques et des leviers de progression ciblés.
4.  **Feuille de Route :** Établir un plan de travail précis et adapté.

---

## STRUCTURE ATTENDUE DES RAPPORTS (ÉLÈVE et ENSEIGNANT)

**Rappels d’ADN de l'équipe NSI (pour l’IA - Ligne Éditoriale) :**
*   **Ton :** Professionnel, bienveillant, valorisant et orienté vers l'action.
*   **Style :** Clair, fluide, structuré (listes à puces, titres), sans jargon excessif.
*   **Diagnostic :** Rigoureux et objectif, mais positif (faiblesses = "axes de progression").
*   **Absence de mention IA :** Le rapport est produit par "l'équipe pédagogique de NSI du Lycée Pierre Mendès France de Tunis".
*   **Précision :** Recommandations spécifiques et actionnables.
*   **RAG :** Les affirmations curriculaires (programmes NSI, vademecum, RCP) doivent s'appuyer sur les extraits RAG fournis.

---

### **A) Rapport ÉLÈVE (Motivation, Cap, 2 semaines) - Via `POST /api/bilan/generate-summary-text`**

*   **SYSTEM (élève) :**
    ```
    Tu es un professeur de NSI du Lycée Pierre Mendès France de Tunis. Tu rédiges un bilan court, positif et concret pour l'élève.
    Objectif : donner un cap de travail sur 2 semaines, avec micro-actions (20–30 min), et 4–6 conseils de méthode adaptés à son profil NSI.
    Style : titres clairs, listes à puces, pas de jargon. Ne révèle JAMAIS les corrigés exacts du QCM.
    Public : Élève de Terminale NSI, en vue de Parcoursup (T1/T2) et du Bac.
    Longueur cible : 250–350 mots.
    Adapte le ton si « TAG_Stress_Eleve » est présent (normalise la charge, propose respiration/étapes courtes).
    Termine par 3 ressources légères internes (banque d’exos chapitres, fiches méthodes, capsules vidéo de la classe) sans lien externe.
    ```

*   **USER (gabarit pour données élève) :** (Identique à celui défini précédemment dans `prompts_open_ai_bilans_nsi_terminale_eleve_enseignant.md`.)

*   **SORTIE ATTENDUE (JSON) :**
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

*   **SYSTEM (enseignant) :**
    ```
    Tu es un professeur de NSI du Lycée Pierre Mendès France de Tunis. Tu rédiges une analyse diagnostique exploitable en classe.
    Objectif : relier explicitement les faiblesses aux attendus de Terminale NSI (structures de données, bases relationnelles/SQL, graphes, POO, réseaux, architectures matérielles, systèmes, sécurité, optimisation). Tu proposes un plan d’appui sur 4 semaines (séances, ressources internes, évaluations courtes), des critères d’observation et des remédiations ciblées.
    Relie explicitement les faiblesses aux attendus du programme NSI Terminale (référence RAG). Ne révèle JAMAIS les corrigés exacts du QCM.
    Longueur cible : 500–800 mots.
    ```

*   **USER (gabarit pour données élève + Contexte RAG) :** (Identique à celui défini précédemment dans `prompts_open_ai_bilans_nsi_terminale_eleve_enseignant.md`, incluant le `RAG_chunks` avec extraits de programme/vademecum pertinents.)

*   **SORTIE ATTENDUE (JSON) :**
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

```
/data/
  qcm_premiere_for_terminale_nsi.json  # Volet 1 = QCM NSI Première (pré-requis Terminale NSI)
  pedago_survey_terminale_nsi.json     # Volet 2 = questions d’ordre général (NSI Terminale spécifique)
  
/lib/scoring/
  nsi_qcm_scorer.ts                    # Scoring QCM NSI Terminale + agrégats domaines
  pedago_nsi_indices.ts                # Calcul des IDX_* depuis Volet 2 NSI
  # offers_decision.ts                 # Pour NSI PMF - non utilisé dans ce cadre pédagogique

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
  # suggestions             Json?     // suggestions de suivi et de feuille de route (si souhaité)

  reportText              String?   @db.Text // Texte du rapport ENSEIGNANT généré par OpenAI
  summaryText             String?   @db.Text // Texte du rapport ÉLÈVE généré par OpenAI

  generatedAt             DateTime? // Date de génération du rapport complet
  status                  String    @default("PENDING") // PENDING, GENERATED, ERROR, PROCESSING_QCM, PROCESSING_PEDAGO, PROCESSING_AI_REPORT

  variant                 String?   // eleve | enseignant (le variant généré initialement, ou sélectionné pour l'email/PDF)
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
*   **Action requise :** Exécuter la migration Prisma pour la dimension 384 : `npm run db:migrate-dev-vector`

---

### **7. Workflow Intégral du Bilan Pédagogique NSI Terminale**

1.  **Démarrage du Bilan :** L'enseignant (ou l'élève si l'accès est donné) initie un bilan pour un élève (choix `matiere="NSI"`, `niveau="Terminale"`). Un objet `Bilan` est créé en `status: PENDING`.
2.  **Affichage du Questionnaire (`/bilan/[bilanId]/questionnaire`) :**
    *   L'endpoint `GET /api/bilan/questionnaire-structure` est appelé pour obtenir les questions.
    *   Le Frontend affiche le **Volet 1 (QCM NSI Terminale)**.
    *   Si le `StudentProfileData` de l'élève est absent, le Frontend affiche ensuite le **Volet 2 (Profil Pédagogique Commun)**.
3.  **Soumission des Réponses (`POST /api/bilan/[bilanId]/submit-answers`) :**
    *   Les réponses brutes (`qcmRawAnswers`, `pedagoRawAnswers`) sont stockées.
    *   Le `nsi_qcm_scorer.ts` calcule `qcmScores`.
    *   Si Volet 2 est rempli : `pedago_nsi_indices.ts` calcule `pedagoProfile` et `preAnalyzedData`. Ces données sont aussi stockées dans `StudentProfileData` de l'élève.
    *   Les `suggestions` (`offers_decision.ts` ou autre) sont calculées (pour les prompts IA).
    *   Le `Bilan.status` passe à `PROCESSING_AI_REPORT`.
    *   Des jobs BullMQ sont enqueued pour `generate-report-text` (rapport enseignant) et `generate-summary-text` (rapport élève).
4.  **Génération des Rapports par l'IA (Worker BullMQ) :**
    *   Les jobs appellent `POST /api/bilan/generate-report-text` (pour le rapport Enseignant) et `POST /api/bilan/generate-summary-text` (pour le rapport Élève).
    *   Ces endpoints utilisent le prompt détaillé (Section 5.1 / 5.2) et le RAG (pour programme/vademecum NSI, RCP) pour générer le `reportText` et `summaryText`.
    *   Le `Bilan.status` est mis à jour (`GENERATED`).
5.  **Rendu et Actions sur le Dashboard (`/bilan/[bilanId]/resultats`) :**
    *   L'élève et l'enseignant peuvent accéder à la page des résultats.
    *   **Élève :** Affiche le `summaryText` (rapport élève), le radar HTML, et les badges. Boutons pour télécharger le PDF "Élève" ou "Enseignant", envoyer par e-mail.
    *   **Enseignant :** Affiche le `reportText` (rapport enseignant détaillé), le radar HTML, et les indicateurs pédagogiques. Boutons pour télécharger les PDFs "Élève" ou "Enseignant", envoyer par e-mail.
    *   **Génération/Envoi PDF :** L'API `GET /api/bilan/pdf/[bilanId]?variant=eleve|enseignant` et `POST /api/bilan/email/[bilanId]` sont utilisées, s'appuyant sur les composants `BilanPdfNsiTerminaleEleve.tsx` et `BilanPdfNsiTerminaleEnseignant.tsx` et le gabarit LaTeX.

---

### **8. Qualité et Garde-fous Pédagogiques**

*   **8.1. Bornage Strict du Programme :** Toutes les questions du QCM (Volet 1) restent **strictement dans le programme de Première NSI**, en ciblant les pré-requis de Terminale. Aucune question de Terminale NSI n'est autorisée dans le QCM.
*   **8.2. Qualité du Rendu LaTeX :** Utilisation de KaTeX pour HTML et XeLaTeX pour PDF, assurant un rendu impeccable des formules et du code. Le `buildRadarPng` est intégré au pipeline PDF.
*   **8.3. Ligne Éditoriale des Rapports :** Ton professionnel, bienveillant, valorisant. **Absence totale de mention d'IA ou d'offres commerciales**. Faiblesses reformulées en "axes de progression". Précision et actionnabilité des recommandations.
*   **8.4. Revue Pédagogique :** Prévoir une double relecture humaine (prof + coordinateur pédagogique) des QCM et des exemples de rapports générés par l'IA avant toute mise en production.

---

### **9. Checklist d'Implémentation et d'Acceptation (Cursor)**

*   **[ ] Fichiers JSON QCM et Pédagogique :** `data/qcm_premiere_for_terminale_nsi.json` (40 questions + 3 mini-exercices), `data/pedago_survey_terminale_nsi.json` (Volet 2 complet), créés et conformes aux schémas.
*   **[ ] Modèles Prisma :** `Bilan`, `StudentProfileData`, `Memory`, `KnowledgeAsset` (tous avec `vector(384)`) mis à jour et migrations exécutées.
*   **[ ] Adaptateurs Scoring (TypeScript) :** `nsi_qcm_scorer.ts`, `pedago_nsi_indices.ts`, `suggestions.ts` (ou `offers_decision.ts` si vous avez une préférence pour le nom) implémentés et testés.
*   **[ ] Rendu PDF (React-PDF) :** `lib/pdf/templates/bilan_terminale_nsi.tex`, `BilanPdfNsiTerminaleEleve.tsx`, `BilanPdfNsiTerminaleEnseignant.tsx` implémentés, intégrant `reportText`/`summaryText` et `radar.png`.
*   **[ ] Endpoints API :** `GET /api/bilan/questionnaire-structure`, `POST /api/bilan/[bilanId]/submit-answers`, `POST /api/bilan/generate-report-text`, `POST /api/bilan/generate-summary-text`, `GET /api/bilan/pdf/[bilanId]?variant=...`, `POST /api/bilan/email/[bilanId]` implémentés et sécurisés (ACL).
*   **[ ] `server/vector/embeddings.ts` :** Stratégie hybride OpenAI (si dispo) → Hugging Face (`MiniLM-L12-v2`, 384 dim, padding) implémentée et testée.
*   **[ ] `server/graphics/radar/buildRadarPng.ts` :** Script de génération du radar PNG fonctionnel.
*   **[ ] Frontend (UI) :** Pages de Bilan dynamiques, responsives, UX fluide, avec KaTeX, auto-save, affichage du radar et des rapports (élève/enseignant).
*   **[ ] Tests (Unit/Int/E2E) :** Suite de tests spécifiques au bilan NSI Terminale verte (QCM, pédagogique, génération rapport, PDF/email, ACL).
*   **[ ] Ligne Éditoriale :** Rapports générés par l'IA respectent toutes les consignes éditoriales et l'absence de mention IA.

