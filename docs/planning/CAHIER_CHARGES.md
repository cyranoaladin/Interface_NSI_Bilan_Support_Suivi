## Cahier des Charges : Application "NSI PMF"
Projet : Création d'une plateforme web sécurisée pour la gestion des questionnaires et des bilans pédagogiques personnalisés pour les élèves en spécialité NSI.
URL de Production : nsi.labomaths.tn

1. Expérience Utilisateur (UI/UX)
Page de Connexion : L'interface doit être moderne, sobre et professionnelle, avec une esthétique "tech". L'expérience doit être fluide et intuitive.

Dashboards : Les tableaux de bord (élève et enseignant) doivent être clairs, organisés et fournir un accès direct aux fonctionnalités clés sans friction.

2. Gestion des Rôles et Authentification
Système d'Authentification : L'application utilisera un système de connexion par email et mot de passe.

Initialisation des Mots de Passe : Tous les utilisateurs (élèves et enseignants) auront un mot de passe initial par défaut : password123.

Changement de Mot de Passe Obligatoire : À la toute première connexion, chaque utilisateur doit être contraint de changer son mot de passe initial avant de pouvoir accéder à son dashboard.

Rôles Utilisateurs : Deux rôles principaux : ELEVE et ENSEIGNANT, avec des permissions et des interfaces distinctes.

3. Fonctionnalités du Rôle "ÉLÈVE"
Dashboard Élève :

Affiche le nom et le prénom de l'élève connecté.

Avant soumission : Affiche un bouton ou un lien "Commencer le questionnaire".

Après soumission : Le bouton se transforme en un indicateur non-cliquable "Questionnaire soumis".

Processus du Questionnaire :

La soumission du questionnaire déclenche le pipeline de génération de bilans en arrière-plan.

Accès au Bilan :

Une fois le bilan élève généré, il apparaît sur le dashboard.

L'élève doit pouvoir visualiser et télécharger son bilan PDF.

4. Fonctionnalités du Rôle "ENSEIGNANT"
Dashboard Enseignant :

Affiche une vue organisée par groupes (ex: "Terminale NSI"). L'architecture doit permettre d'ajouter d'autres groupes à l'avenir.

Gestion des Élèves :

L'enseignant peut visualiser la liste de tous les élèves de ses groupes.

Pour chaque élève, l'enseignant peut visualiser et télécharger les deux versions du bilan (élève et enseignant).

Fonctions d'Administration :

Réinitialisation de Mot de Passe : L'enseignant doit avoir un bouton sur chaque élève pour réinitialiser son mot de passe (le remettre à password123 et forcer le changement à la prochaine connexion).

Réinitialisation du Questionnaire : L'enseignant doit pouvoir réactiver le questionnaire pour un élève qui l'a déjà soumis. Cette action réactive le bouton "Commencer le questionnaire" sur le dashboard de l'élève.

Gestion du RAG :

L'enseignant doit disposer d'une interface pour enrichir la base de connaissances du RAG.

Cette interface doit permettre d'ingérer de nouvelles informations via :

L'upload de fichiers (PDF, docx, image).

La soumission d'une URL.

5. Spécifications de la Base de Données
Table Student :

Doit être peuplée à partir du fichier CSV.

Doit contenir toutes les informations du CSV.

L'adresse e-mail (email) doit être la clé primaire et unique.

Doit inclure un champ pour le mot de passe haché et un indicateur pour le changement de mot de passe obligatoire.

Table Teacher :

Doit contenir les informations des enseignants (nom, prénom, email).

L'adresse e-mail (email) doit être la clé primaire et unique.

Données Initiales :

La base doit être pré-remplie avec les enseignants suivants :

Alaeddine BEN RHOUMA (alaeddine.benrhouma@ert.tn)

Pierre CAILLABET (pierre.caillabet@ert.tn)

Hatem BOUHLEL (hatem.bouhlel@ert.tn)
