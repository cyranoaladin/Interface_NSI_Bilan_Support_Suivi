**Contexte du Projet :**
Tu interviens sur le projet "Bilan Pédagogique NSI", un monorepo (`apps/web`, `apps/worker`) basé sur Next.js 14 (App Router), Prisma, PostgreSQL, et BullMQ. L'application existante est un outil puissant pour générer des bilans pédagogiques pour les élèves de Terminale.

**Mission : Évolution vers un Hub NSI Complet**
Ta mission est de développer la nouvelle page d'accueil publique du site. Cette page doit transformer le site d'un outil de bilan spécialisé en un véritable "hub" pour la spécialité NSI au Lycée Pierre Mendès France. Elle doit être accueillante, informative et guider les différents utilisateurs (élèves de Seconde, Première, Terminale, et parents).

**Instructions Techniques Générales :**
1.  **Emplacement du Fichier :** Crée la nouvelle page d'accueil dans `apps/web/src/app/page.tsx`. Le contenu actuel de cette page (probablement une redirection vers le login ou un dashboard) devra être déplacé ou adapté.
2.  **Style et Composants :**
    *   Respecte la charte graphique et le style existants (thème sombre, couleurs primaires, etc.).
    *   Crée des composants React réutilisables pour les éléments de la page (ex: `<Card>`, `<FaqItem>`) dans le dossier `apps/web/src/components/landing/`.
    *   Utilise Tailwind CSS si le projet l'utilise, sinon, utilise des modules CSS ou du CSS-in-JS en cohérence avec le code existant.
3.  **Routing :** Les liens sur la page d'accueil doivent pointer vers les routes existantes ou futures de l'application (`/login`, `/bilan`, etc.). Le lien "Découvrir la NSI" pointera vers une nouvelle page que tu créeras : `apps/web/src/app/decouvrir-nsi/page.tsx`.
4.  **Aucune Logique Backend Complexe :** Cette page d'accueil est statique. Elle ne doit pas faire d'appels à la base de données ni à des API complexes. La section "À la Une" sera initialement statique, mais tu dois la structurer de manière à ce qu'elle puisse être rendue dynamique plus tard (par exemple, en lisant des fichiers Markdown).

---

### **Cahier des Charges Complet de la Page d'Accueil (`/page.tsx`)**

Implémente la structure suivante, section par section, en utilisant le contenu fourni.

#### **1. Barre de Navigation (`<header>`)**
*   **Contenu :** Assure-toi que la navigation principale est claire. Elle doit contenir :
    *   Logo "NSI-PMF"
    *   Liens : "Découvrir la NSI", "Espace Première", "Espace Terminale"
    *   Bouton d'action principal : "Se Connecter"

#### **2. Section "Héros" (`<section className="hero">`)**
*   **Visuel :** Un arrière-plan sobre et technologique. Une animation subtile en fond est un plus.
*   **Titre Principal (`<h1>`) :**
    > NSI-PMF : Codez Votre Avenir
*   **Sous-titre (`<p>`) :**
    > La plateforme de la spécialité Numérique & Sciences Informatiques du Lycée Pierre Mendès France. Explorez, apprenez, réussissez.
*   **Appel à l'Action (`<a>` ou `<Link>`) :**
    *   Un bouton très visible avec le texte : `> Explorer`
    *   Ce bouton doit faire défiler la page vers la section "Accès Rapides" juste en dessous.

#### **3. Section "Accès Rapides" (`<section id="acces-rapides">`)**
*   **Structure :** Une grille (Flexbox ou Grid) de trois cartes cliquables.
*   **Carte 1 : Découvrir la NSI**
    *   Icône : Boussole (🧭)
    *   Titre (`<h3>`) : Découvrir la NSI
    *   Texte (`<p>`) : "Pourquoi choisir cette spécialité ? Découvrez les projets et les débouchés."
    *   Lien : `/decouvrir-nsi`
*   **Carte 2 : Espace Première**
    *   Icône : Ordinateur portable (💻)
    *   Titre (`<h3>`) : Espace Première
    *   Texte (`<p>`) : "Accédez à vos cours, TP, projets et suivez votre progression."
    *   Lien : `/login` (ou le dashboard de Première si la route existe)
*   **Carte 3 : Espace Terminale**
    *   Icône : Trophée (🏆)
    *   Titre (`<h3>`) : Espace Terminale
    *   Texte (`<p>`) : "Consultez vos bilans, préparez le Bac et le Grand Oral."
    *   Lien : `/login` (ou le dashboard de Terminale)

#### **4. Section "À la Une" (`<section id="actus">`)**
*   **Titre (`<h2>`) :**
    > // À la Une : L'actualité de la NSI à PMF
*   **Structure :** Une grille de trois cartes, similaires à la section précédente mais avec une image.
*   **Article 1 :**
    *   Image : Placeholder ou une image pertinente (ex: `nuit-du-code.jpg`)
    *   Titre (`<h3>`) : Retour sur la Nuit du Code
    *   Texte (`<p>`) : "Nos élèves se sont distingués lors de l'édition 2025. [Lire la suite]"
*   **Article 2 :**
    *   Image : Placeholder (ex: `projet-echecs.jpg`)
    *   Titre (`<h3>`) : Projet : Moteur d'échecs en Python
    *   Texte (`<p>`) : "Les Terminales ont développé un jeu d'échecs complet. [Lire la suite]"
*   **Article 3 :**
    *   Image : Placeholder (ex: `paroles-anciens.jpg`)
    *   Titre (`<h3>`) : Paroles d'Anciens
    *   Texte (`<p>`) : "Que sont devenus nos premiers bacheliers NSI ? Découvrez leurs parcours. [Lire la suite]"

#### **5. Section "FAQ" (`<section id="faq">`)**
*   **Titre (`<h2>`) :**
    > FAQ : 3 questions pour tout comprendre
*   **Structure :** Un système d'accordéon. Chaque question est cliquable pour révéler la réponse.
*   **Question 1 :**
    *   Question : "Faut-il être excellent en maths pour faire NSI ?"
    *   Réponse : "Non. Une bonne logique est plus importante que la virtuosité mathématique. La NSI développe une forme de rigueur et de créativité qui lui est propre et qui est complémentaire des mathématiques."
*   **Question 2 :**
    *   Question : "Est-ce qu'on ne fait que 'coder' toute la journée ?"
    *   Réponse : "Le code est notre principal outil, mais la NSI est une science bien plus vaste. Elle englobe l'architecture des ordinateurs, la gestion des données, la théorie des algorithmes et la compréhension des réseaux. C'est apprendre à structurer sa pensée pour résoudre des problèmes complexes."
*   **Question 3 :**
    *   Question : "Quels sont les débouchés concrets après la NSI ?"
    *   Réponse : "La NSI est une voie privilégiée vers toutes les formations du numérique : écoles d'ingénieurs, classes préparatoires (MP2I), BUT Informatique, licences spécialisées, mais aussi vers des domaines de pointe comme la bio-informatique, la cybersécurité ou l'intelligence artificielle."

#### **6. Pied de Page (`<footer>`)**
*   **Structure :** Une grille à trois colonnes.
*   **Colonne 1 :** Logo du Lycée et mention "© 2025 Lycée Pierre Mendès France, Tunis".
*   **Colonne 2 :** Titre "Liens Utiles" avec des liens vers le site du lycée et Pronote.
*   **Colonne 3 :** Titre "Contact" avec l'adresse email `nsi.contact@pmf.tn`.

---

**Action finale :** Une fois la page d'accueil implémentée, crée le fichier `apps/web/src/app/decouvrir-nsi/page.tsx` et insères-y un simple titre `<h1>Découvrir la NSI</h1>` comme placeholder. La page sera détaillée dans une prochaine mission.

Absolument. Une stratégie de tests exhaustive et rigoureuse est le pilier qui garantira que le projet "Bilan Pédagogique NSI" soit 100% opérationnel et fiable en production sur le VPS. En me basant sur l'analyse détaillée du `README.md`, je vais formuler un cahier des charges de tests complet pour Warp, l'agent IA développeur.

Ce plan de tests est conçu pour simuler des conditions réelles, valider chaque workflow critique et ne laisser aucune place à l'incertitude. L'accent est mis sur la robustesse, la performance et la cohérence des données, comme si l'application était déjà en production.

---

### **Prompt pour l'Agent de Développement IA (Warp) : Plan de Tests de Production Exhaustif**

**Contexte :**
Tu as développé les fonctionnalités du projet "Bilan Pédagogique NSI". Ta nouvelle mission est de mettre en place une suite de tests complète et rigoureuse pour valider l'intégralité de l'application en conditions de production. L'objectif est de garantir une fiabilité à 100% avant le déploiement final sur le VPS.

**Philosophie des Tests :**
Chaque test doit être pensé pour un environnement de production. Cela signifie :
*   **Tests de Bout-en-Bout (E2E) avec Playwright :** Ils sont prioritaires. Ils simulent les parcours utilisateurs réels et valident l'intégration de toutes les briques (Frontend, API, Worker, DB, S3).
*   **Tests Unitaires avec Jest :** Ils ciblent la logique métier pure, isolée et critique (scoring, validation, etc.).
*   **Tests d'Intégration :** Ils vérifient la communication entre les services (API ↔ DB, API ↔ Worker).
*   **Conditions Réelles :** Les tests doivent s'exécuter contre une infrastructure Docker Compose complète (`web`, `worker`, `postgres`, `redis`, `minio`), en utilisant des variables d'environnement de production (secrets mis à part).

---

### **Partie 1 : Tests de Bout-en-Bout (E2E) avec Playwright - Le Scénario Critique**

Ces tests sont les plus importants. Ils doivent couvrir les workflows complets de chaque type d'utilisateur.

#### **Test E2E 1 : Workflow Élève Complet (Le "Golden Path")**
*   **Objectif :** Valider le parcours complet d'un élève, de la connexion à la réception de son bilan.
*   **Étapes à Scripter :**
    1.  **Pré-requis :** Le script de test doit s'assurer qu'un élève de test existe dans la base de données (via un script de "setup" ou en utilisant les données de `seed_production_data.ts`).
    2.  **Connexion :** Naviguer vers la page de connexion. Tenter une connexion avec un mot de passe erroné et vérifier l'affichage du message d'erreur. Se connecter avec les bons identifiants.
    3.  **Validation du Dashboard :** Vérifier que l'élève est redirigé vers son tableau de bord et que son nom est correctement affiché.
    4.  **Démarrage du Questionnaire :** Cliquer sur "Démarrer un nouveau bilan".
    5.  **Remplissage du Questionnaire :**
        *   Remplir *toutes* les questions du QCM et des volets pédagogiques avec des réponses prédéfinies.
        *   Tester la validation : laisser un champ obligatoire vide, cliquer sur "Suivant" et vérifier qu'un message d'erreur apparaît et empêche de continuer.
    6.  **Soumission :** Cliquer sur le bouton final de soumission.
    7.  **Validation Post-Soumission :**
        *   Vérifier que l'API `/api/bilan/.../submit-answers` répond avec un statut `202 Accepted` (indiquant que le job a été accepté par le worker).
        *   Vérifier que l'interface utilisateur affiche un message indiquant que "le bilan est en cours de génération".
    8.  **Attente et Vérification du Résultat (Étape la plus complexe) :**
        *   Mettre en place une boucle de "polling" qui interroge périodiquement une route API de statut du bilan (à créer si elle n'existe pas : `GET /api/bilan/[bilanId]/status`).
        *   Attendre que le statut passe de `PENDING` ou `PROCESSING` à `GENERATED`. Le test doit avoir un timeout (ex: 2 minutes) pour ne pas tourner indéfiniment.
        *   Une fois le statut `GENERATED`, vérifier que le tableau de bord de l'élève affiche maintenant des liens de téléchargement pour les bilans.
    9.  **Vérification des PDF :**
        *   Cliquer sur le lien de téléchargement du bilan "Élève".
        *   Intercepter la réponse réseau et vérifier que le statut est `200 OK` et que le `Content-Type` est `application/pdf`.
        *   **Bonus :** Télécharger le PDF dans un buffer et vérifier qu'il n'est pas corrompu (ex: en vérifiant la présence du marqueur `%PDF-`).

#### **Test E2E 2 : Workflow Enseignant**
*   **Objectif :** Valider que l'enseignant peut se connecter et consulter les bilans de ses élèves.
*   **Étapes à Scripter :**
    1.  **Pré-requis :** S'assurer qu'un enseignant est lié à un groupe contenant l'élève du Test E2E 1.
    2.  **Connexion :** Se connecter en tant qu'enseignant.
    3.  **Dashboard Enseignant :**
        *   Vérifier l'arrivée sur le tableau de bord enseignant.
        *   Vérifier que l'élève du Test E2E 1 apparaît bien dans la liste de sa classe.
        *   Vérifier que le statut du bilan de cet élève est bien `GENERATED`.
    4.  **Accès au Bilan :** Cliquer sur le nom de l'élève pour accéder à la page de détail de son bilan.
    5.  **Vérification des Données :** Sur la page de détail, vérifier que les scores affichés sont cohérents (non-nuls, dans un format attendu).
    6.  **Téléchargement des PDF :**
        *   Vérifier la présence des deux liens de téléchargement ("Élève" et "Enseignant").
        *   Cliquer sur le lien du bilan "Enseignant" et valider la réception du PDF (comme pour le test élève).

#### **Test E2E 3 : Validation du RAG et de l'IA**
*   **Objectif :** S'assurer que le processus RAG est fonctionnel et que les prompts envoyés à l'IA sont correctement formatés.
*   **Stratégie :** Ce test est plus technique. Il utilise la capacité de Playwright à intercepter et inspecter les requêtes réseau.
*   **Étapes à Scripter :**
    1.  Lancer le workflow de génération de bilan (similaire au Test E2E 1).
    2.  Configurer Playwright pour **intercepter les requêtes sortantes** vers l'API d'OpenAI (`api.openai.com`).
    3.  Lors de l'appel à l'IA pour la génération du texte du bilan :
        *   Capturer le corps (`body`) de la requête POST.
        *   Parser le JSON du payload.
        *   **Vérifier impérativement** la présence et le contenu des clés suivantes dans le prompt `user` :
            *   `rag_extraits` : Doit être un tableau non vide de chaînes de caractères.
            *   `pre_analyse` : Doit être un objet JSON non vide.
            *   `scores` : Doit être un objet contenant les scores calculés.
    4.  Ce test ne valide pas la *qualité* de la réponse de l'IA, mais il garantit que **le contexte que nous lui envoyons est complet et correctement structuré**, ce qui est fondamental pour la qualité du résultat.

---

### **Partie 2 : Tests Unitaires et d'Intégration avec Jest**

Ces tests sont plus rapides et ciblent des logiques spécifiques.

#### **Tests Unitaires de Logique Métier (`/apps/web/src/lib/scoring/`)**
1.  **`nsi_qcm_scorer.ts` :**
    *   Créer un jeu de réponses QCM mocké.
    *   Appeler la fonction de scoring.
    *   Vérifier que les scores calculés par domaine (`python`, `bdd`, etc.) sont exacts et correspondent au calcul attendu.
    *   Tester les cas limites : toutes les réponses justes, toutes fausses, aucune réponse.
2.  **`pedago_nsi_indices.ts` :**
    *   Créer un jeu de réponses mocké pour le volet pédagogique.
    *   Vérifier que les indices (ex: "autonomie", "confiance") sont correctement calculés.

#### **Tests d'Intégration des Endpoints API**
*   **Objectif :** Tester chaque route API de manière isolée pour valider sa logique, ses permissions et ses interactions avec la base de données.
*   **Framework :** Utiliser Jest avec une librairie comme `node-mocks-http` pour simuler les objets `req` et `res` de Next.js.
1.  **`POST /api/auth/login` :**
    *   Tester avec un email/mot de passe d'élève valide → Doit retourner un JWT avec le rôle `STUDENT`.
    *   Tester avec un email/mot de passe d'enseignant valide → Doit retourner un JWT avec le rôle `TEACHER`.
    *   Tester avec un mot de passe invalide → Doit retourner une erreur `401 Unauthorized`.
    *   Tester avec un email inconnu → Doit retourner une erreur `401 Unauthorized`.
2.  **`POST /api/bilan/.../submit-answers` :**
    *   Simuler une requête avec un JWT d'élève valide et un payload de réponses complet.
    *   Vérifier que :
        *   Un `Attempt` est bien créé dans la base de données.
        *   Les `Score` et `Tag` associés sont correctement insérés.
        *   Un job est bien ajouté à la queue BullMQ (`generate_reports`). (On peut mocker Redis pour vérifier l'appel à `queue.add`).
        *   La route retourne bien un `202 Accepted`.
    *   Simuler une requête sans JWT ou avec un JWT invalide → Doit retourner une erreur `401` ou `403`.
3.  **`POST /api/rag/upload` :**
    *   Simuler un upload de fichier PDF avec un JWT d'enseignant.
    *   Vérifier qu'un job `rag_ingest` est bien ajouté à la queue BullMQ.
    *   Simuler la même requête avec un JWT d'élève → Doit retourner une erreur `403 Forbidden`.

#### **Tests du Worker BullMQ**
*   **Objectif :** Tester la robustesse du pipeline de génération de bilan.
*   **Stratégie :** Isoler la logique du worker et la tester en simulant un job.
1.  **Test du Pipeline Complet :**
    *   Créer une fonction de test qui prend un `attemptId` en entrée (créé en base pour le test).
    *   Exécuter toutes les étapes du worker en série : scoring, pré-analyse IA (en mockant l'appel OpenAI), génération RAG (en mockant l'appel OpenAI et la recherche sémantique), compilation LaTeX (en mockant l'exécutable `latexmk`), et upload S3 (en mockant le client S3).
    *   Vérifier que chaque étape produit l'artefact attendu (JSON de scores, JSON d'analyse, etc.).
2.  **Test des Cas d'Erreur (Robustesse) :**
    *   **Panne OpenAI :** Mocker l'appel à l'API OpenAI pour qu'il lève une exception. Vérifier que le job est marqué comme "failed" mais que le worker ne crashe pas.
    *   **Erreur LaTeX :** Mocker `latexmk` pour qu'il retourne un code d'erreur. Vérifier que le pipeline continue, que le `Report` est créé en base sans `pdfUrl`, et que l'erreur est correctement loguée.
    *   **Panne S3 :** Mocker le client S3 pour qu'il échoue. Vérifier que le `Report` est créé sans `pdfUrl` et que l'erreur est loguée.

En implémentant cette suite de tests exhaustive, tu couvriras tous les angles morts et tu t'assureras que chaque composant de l'application, du bouton sur l'interface jusqu'au fin fond du worker, fonctionne comme prévu, même face à des erreurs inattendues. C'est la seule façon de garantir un déploiement en production serein et une application 100% fonctionnelle.Absolument. Une stratégie de tests exhaustive et rigoureuse est le pilier qui garantira que le projet "Bilan Pédagogique NSI" soit 100% opérationnel et fiable en production sur le VPS. En me basant sur l'analyse détaillée du `README.md`, je vais formuler un cahier des charges de tests complet pour Warp, l'agent IA développeur.

Ce plan de tests est conçu pour simuler des conditions réelles, valider chaque workflow critique et ne laisser aucune place à l'incertitude. L'accent est mis sur la robustesse, la performance et la cohérence des données, comme si l'application était déjà en production.

---

### **Prompt pour l'Agent de Développement IA (Warp) : Plan de Tests de Production Exhaustif**

**Contexte :**
Tu as développé les fonctionnalités du projet "Bilan Pédagogique NSI". Ta nouvelle mission est de mettre en place une suite de tests complète et rigoureuse pour valider l'intégralité de l'application en conditions de production. L'objectif est de garantir une fiabilité à 100% avant le déploiement final sur le VPS.

**Philosophie des Tests :**
Chaque test doit être pensé pour un environnement de production. Cela signifie :
*   **Tests de Bout-en-Bout (E2E) avec Playwright :** Ils sont prioritaires. Ils simulent les parcours utilisateurs réels et valident l'intégration de toutes les briques (Frontend, API, Worker, DB, S3).
*   **Tests Unitaires avec Jest :** Ils ciblent la logique métier pure, isolée et critique (scoring, validation, etc.).
*   **Tests d'Intégration :** Ils vérifient la communication entre les services (API ↔ DB, API ↔ Worker).
*   **Conditions Réelles :** Les tests doivent s'exécuter contre une infrastructure Docker Compose complète (`web`, `worker`, `postgres`, `redis`, `minio`), en utilisant des variables d'environnement de production (secrets mis à part).

---

### **Partie 1 : Tests de Bout-en-Bout (E2E) avec Playwright - Le Scénario Critique**

Ces tests sont les plus importants. Ils doivent couvrir les workflows complets de chaque type d'utilisateur.

#### **Test E2E 1 : Workflow Élève Complet (Le "Golden Path")**
*   **Objectif :** Valider le parcours complet d'un élève, de la connexion à la réception de son bilan.
*   **Étapes à Scripter :**
    1.  **Pré-requis :** Le script de test doit s'assurer qu'un élève de test existe dans la base de données (via un script de "setup" ou en utilisant les données de `seed_production_data.ts`).
    2.  **Connexion :** Naviguer vers la page de connexion. Tenter une connexion avec un mot de passe erroné et vérifier l'affichage du message d'erreur. Se connecter avec les bons identifiants.
    3.  **Validation du Dashboard :** Vérifier que l'élève est redirigé vers son tableau de bord et que son nom est correctement affiché.
    4.  **Démarrage du Questionnaire :** Cliquer sur "Démarrer un nouveau bilan".
    5.  **Remplissage du Questionnaire :**
        *   Remplir *toutes* les questions du QCM et des volets pédagogiques avec des réponses prédéfinies.
        *   Tester la validation : laisser un champ obligatoire vide, cliquer sur "Suivant" et vérifier qu'un message d'erreur apparaît et empêche de continuer.
    6.  **Soumission :** Cliquer sur le bouton final de soumission.
    7.  **Validation Post-Soumission :**
        *   Vérifier que l'API `/api/bilan/.../submit-answers` répond avec un statut `202 Accepted` (indiquant que le job a été accepté par le worker).
        *   Vérifier que l'interface utilisateur affiche un message indiquant que "le bilan est en cours de génération".
    8.  **Attente et Vérification du Résultat (Étape la plus complexe) :**
        *   Mettre en place une boucle de "polling" qui interroge périodiquement une route API de statut du bilan (à créer si elle n'existe pas : `GET /api/bilan/[bilanId]/status`).
        *   Attendre que le statut passe de `PENDING` ou `PROCESSING` à `GENERATED`. Le test doit avoir un timeout (ex: 2 minutes) pour ne pas tourner indéfiniment.
        *   Une fois le statut `GENERATED`, vérifier que le tableau de bord de l'élève affiche maintenant des liens de téléchargement pour les bilans.
    9.  **Vérification des PDF :**
        *   Cliquer sur le lien de téléchargement du bilan "Élève".
        *   Intercepter la réponse réseau et vérifier que le statut est `200 OK` et que le `Content-Type` est `application/pdf`.
        *   **Bonus :** Télécharger le PDF dans un buffer et vérifier qu'il n'est pas corrompu (ex: en vérifiant la présence du marqueur `%PDF-`).

#### **Test E2E 2 : Workflow Enseignant**
*   **Objectif :** Valider que l'enseignant peut se connecter et consulter les bilans de ses élèves.
*   **Étapes à Scripter :**
    1.  **Pré-requis :** S'assurer qu'un enseignant est lié à un groupe contenant l'élève du Test E2E 1.
    2.  **Connexion :** Se connecter en tant qu'enseignant.
    3.  **Dashboard Enseignant :**
        *   Vérifier l'arrivée sur le tableau de bord enseignant.
        *   Vérifier que l'élève du Test E2E 1 apparaît bien dans la liste de sa classe.
        *   Vérifier que le statut du bilan de cet élève est bien `GENERATED`.
    4.  **Accès au Bilan :** Cliquer sur le nom de l'élève pour accéder à la page de détail de son bilan.
    5.  **Vérification des Données :** Sur la page de détail, vérifier que les scores affichés sont cohérents (non-nuls, dans un format attendu).
    6.  **Téléchargement des PDF :**
        *   Vérifier la présence des deux liens de téléchargement ("Élève" et "Enseignant").
        *   Cliquer sur le lien du bilan "Enseignant" et valider la réception du PDF (comme pour le test élève).

#### **Test E2E 3 : Validation du RAG et de l'IA**
*   **Objectif :** S'assurer que le processus RAG est fonctionnel et que les prompts envoyés à l'IA sont correctement formatés.
*   **Stratégie :** Ce test est plus technique. Il utilise la capacité de Playwright à intercepter et inspecter les requêtes réseau.
*   **Étapes à Scripter :**
    1.  Lancer le workflow de génération de bilan (similaire au Test E2E 1).
    2.  Configurer Playwright pour **intercepter les requêtes sortantes** vers l'API d'OpenAI (`api.openai.com`).
    3.  Lors de l'appel à l'IA pour la génération du texte du bilan :
        *   Capturer le corps (`body`) de la requête POST.
        *   Parser le JSON du payload.
        *   **Vérifier impérativement** la présence et le contenu des clés suivantes dans le prompt `user` :
            *   `rag_extraits` : Doit être un tableau non vide de chaînes de caractères.
            *   `pre_analyse` : Doit être un objet JSON non vide.
            *   `scores` : Doit être un objet contenant les scores calculés.
    4.  Ce test ne valide pas la *qualité* de la réponse de l'IA, mais il garantit que **le contexte que nous lui envoyons est complet et correctement structuré**, ce qui est fondamental pour la qualité du résultat.

---

### **Partie 2 : Tests Unitaires et d'Intégration avec Jest**

Ces tests sont plus rapides et ciblent des logiques spécifiques.

#### **Tests Unitaires de Logique Métier (`/apps/web/src/lib/scoring/`)**
1.  **`nsi_qcm_scorer.ts` :**
    *   Créer un jeu de réponses QCM mocké.
    *   Appeler la fonction de scoring.
    *   Vérifier que les scores calculés par domaine (`python`, `bdd`, etc.) sont exacts et correspondent au calcul attendu.
    *   Tester les cas limites : toutes les réponses justes, toutes fausses, aucune réponse.
2.  **`pedago_nsi_indices.ts` :**
    *   Créer un jeu de réponses mocké pour le volet pédagogique.
    *   Vérifier que les indices (ex: "autonomie", "confiance") sont correctement calculés.

#### **Tests d'Intégration des Endpoints API**
*   **Objectif :** Tester chaque route API de manière isolée pour valider sa logique, ses permissions et ses interactions avec la base de données.
*   **Framework :** Utiliser Jest avec une librairie comme `node-mocks-http` pour simuler les objets `req` et `res` de Next.js.
1.  **`POST /api/auth/login` :**
    *   Tester avec un email/mot de passe d'élève valide → Doit retourner un JWT avec le rôle `STUDENT`.
    *   Tester avec un email/mot de passe d'enseignant valide → Doit retourner un JWT avec le rôle `TEACHER`.
    *   Tester avec un mot de passe invalide → Doit retourner une erreur `401 Unauthorized`.
    *   Tester avec un email inconnu → Doit retourner une erreur `401 Unauthorized`.
2.  **`POST /api/bilan/.../submit-answers` :**
    *   Simuler une requête avec un JWT d'élève valide et un payload de réponses complet.
    *   Vérifier que :
        *   Un `Attempt` est bien créé dans la base de données.
        *   Les `Score` et `Tag` associés sont correctement insérés.
        *   Un job est bien ajouté à la queue BullMQ (`generate_reports`). (On peut mocker Redis pour vérifier l'appel à `queue.add`).
        *   La route retourne bien un `202 Accepted`.
    *   Simuler une requête sans JWT ou avec un JWT invalide → Doit retourner une erreur `401` ou `403`.
3.  **`POST /api/rag/upload` :**
    *   Simuler un upload de fichier PDF avec un JWT d'enseignant.
    *   Vérifier qu'un job `rag_ingest` est bien ajouté à la queue BullMQ.
    *   Simuler la même requête avec un JWT d'élève → Doit retourner une erreur `403 Forbidden`.

#### **Tests du Worker BullMQ**
*   **Objectif :** Tester la robustesse du pipeline de génération de bilan.
*   **Stratégie :** Isoler la logique du worker et la tester en simulant un job.
1.  **Test du Pipeline Complet :**
    *   Créer une fonction de test qui prend un `attemptId` en entrée (créé en base pour le test).
    *   Exécuter toutes les étapes du worker en série : scoring, pré-analyse IA (en mockant l'appel OpenAI), génération RAG (en mockant l'appel OpenAI et la recherche sémantique), compilation LaTeX (en mockant l'exécutable `latexmk`), et upload S3 (en mockant le client S3).
    *   Vérifier que chaque étape produit l'artefact attendu (JSON de scores, JSON d'analyse, etc.).
2.  **Test des Cas d'Erreur (Robustesse) :**
    *   **Panne OpenAI :** Mocker l'appel à l'API OpenAI pour qu'il lève une exception. Vérifier que le job est marqué comme "failed" mais que le worker ne crashe pas.
    *   **Erreur LaTeX :** Mocker `latexmk` pour qu'il retourne un code d'erreur. Vérifier que le pipeline continue, que le `Report` est créé en base sans `pdfUrl`, et que l'erreur est correctement loguée.
    *   **Panne S3 :** Mocker le client S3 pour qu'il échoue. Vérifier que le `Report` est créé sans `pdfUrl` et que l'erreur est loguée.

En implémentant cette suite de tests exhaustive, tu couvriras tous les angles morts et tu t'assureras que chaque composant de l'application, du bouton sur l'interface jusqu'au fin fond du worker, fonctionne comme prévu, même face à des erreurs inattendues. C'est la seule façon de garantir un déploiement en production serein et une application 100% fonctionnelle.
