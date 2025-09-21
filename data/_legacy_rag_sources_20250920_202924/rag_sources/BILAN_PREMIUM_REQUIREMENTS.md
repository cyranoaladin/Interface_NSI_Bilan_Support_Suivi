# **Exigences Impératives pour la Génération des Bilans "Premium"**

**Directive pour l'Agent IA :** Ce document est ta **source de vérité unique et absolue** pour la génération des bilans Élève et Enseignant. Tu dois respecter **chaque point** de ce cahier des charges à la lettre. Toute déviation sera considérée comme un échec.;

---

## **1. Exigences Générales(Applicables aux DEUX Bilans)**

### **1.1.Ligne Éditoriale et Ton**

* **Auteur :** Le bilan est généré par "l'équipe pédagogique de NSI du Lycée Pierre Mendès France de Tunis".
* **Ton Général:** Professionnel, bienveillant, et orienté vers l'action. Les faiblesses sont systématiquement présentées comme des "axes de progression" ou des "pistes d'amélioration".
* **Sobriété :** Aucune mention de l'IA, du RAG, ou des processus techniques internes ne doit apparaître dans le contenu final, à l'exception de la section renommée pour l'enseignant.

### **1.2.Personnalisation et Utilisation des Données**

* **Obligation :** Le contenu de chaque section **DOIT** être visiblement et spécifiquement personnalisé en utilisant les données fournies(`student`, `qcmScores`, `pedagoProfile`, etc.).Les bilans génériques sont inacceptables.
* **Corrélation :** Chaque recommandation ou plan d'action **DOIT** être directement lié à un score faible ou à une réponse spécifique du questionnaire de profil.

### **1.3.Utilisation du RAG**

* **Source de Vérité:** Tes analyses et recommandations pédagogiques **DOIVENT** s'inspirer du guide (`IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md`) et des extraits RAG des programmes officiels fournis.
* **Section Enseignant:** La section finale du bilan enseignant **DOIT** s'intituler "**Pistes Pédagogiques Issues des Référentiels**" et **DOIT** contenir 2 à 3 phrases pertinentes issues de l'analyse RAG.

---

## **2. Exigences Spécifiques au Bilan ÉLÈVE**

### **2.1.Titre et En - tête**

* Le titre principal **DOIT** être : `Bilan Élève — NSI`.
* L'en-tête **DOIT** inclure le nom de l'élève, sa classe et la date de génération.

### **2.2.Mise en Page et Visuels**

* **Hiérarchie :** Les titres de section(`Introduction`, etc.) **DOIVENT** être en gras et d'une taille supérieure au corps du texte. Une couleur d'accentuation doit être utilisée.
* **Tableau de Scores:** Cette section est **OBLIGATOIRE et NON NÉGOCIABLE**.
  * Elle doit contenir un tableau à 3 colonnes: `Domaine`, `Score`, `Niveau de maîtrise`.
  * La colonne "Niveau de maîtrise" **DOIT** afficher un **badge de couleur** avec un texte.
  * **Logique des Badges:**
    * Score ≥ 75 % : Badge **Vert** avec le texte "Solide".
    * Score entre 50 % et 74 % : Badge **Orange** avec le texte "Moyen".
    * Score < 50 % : Badge **Rouge** avec le texte "À renforcer".

### **2.3.Contenu et Ton**

* **Ton :** Tu **DOIS** t'adresser directement à l'élève en utilisant le **tutoiement** ("tu", "tes", "ta") dans toutes les sections.
* **Section "Ta feuille de route pour les 4 prochaines semaines" :**
  * Le titre **DOIT** être exactement celui - ci.
  * Le contenu **DOIT** être structuré par semaine(`Semaine 1`, `Semaine 2`, etc.).
  * Chaque semaine **DOIT** contenir 2 à 3 actions concrètes, courtes et directement liées aux domaines "À renforcer" ou "Moyen".
  * **Exemple de format:** `Semaine 1 — Python/Structures : 1) Revois les boucles`for`(3 exercices ciblés). 2) Crée une fiche mémo sur les dictionnaires.`
* **Section "Références RAG" :** Cette section **DOIT ÊTRE ABSENTE** du bilan élève.

---

## **3. Exigences Spécifiques au Bilan ENSEIGNANT**

### **3.1.Titre et En - tête**

* Le titre principal **DOIT** être : `Bilan Enseignant — NSI`.
* L'en-tête **DOIT** inclure le nom de l'élève, sa classe et la date de génération.

### **3.2.Mise en Page et Visuels**

* **Hiérarchie :** Les titres de section **DOIVENT** être en gras et d'une taille supérieure au corps du texte.
* **Tableau de Scores:** Un tableau récapitulatif des scores par domaine(pourcentage) **DOIT** être présent.

### **3.3.Contenu et Richesse**

* **Qualité :** Le contenu **DOIT** être riche, détaillé, analytique et directement exploitable pour un enseignant.Les réponses d'une seule phrase sont inacceptables.
* **Section "Diagnostic pédagogique" :** **DOIT** contenir au moins 3 phrases complètes analysant les causes possibles des difficultés de l'élève, en croisant les scores du QCM et les réponses du profil pédagogique.
    ***Section "Plan 4 semaines" :**
    *   **DOIT** être très détaillé et structuré.
    * Chaque semaine **DOIT** être un objet JSON avec les clés`objectif`(string), `activites`(liste de 2 - 3 actions / TPs), et`ressources`(liste de 1 - 2 ressources spécifiques, ex: "e-NSI", "vidéo sur les arbres binaires").
* **Section "Indicateurs pédagogiques" :** **DOIT** lister au moins 4 indicateurs concrets et mesurables pour suivre les progrès.
* **Section "Pistes Pédagogiques Issues des Référentiels" :**
  * Le titre **DOIT** être exactement celui - ci.
  * Le contenu **DOIT** être rempli avec 2 - 3 phrases pertinentes issues de l'analyse RAG.;
