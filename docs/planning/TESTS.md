# Tests et Validation

## 1. Philosophie et Outils de Test

Nous allons adopter une approche de tests multi-niveaux. Tu mettras en place les outils suivants :

**Tests Unitaires & d'Intégration :** Utilise **Jest** avec **React Testing Library** pour tester les composants React et les fonctions utilitaires de manière isolée.

**Tests de Bout-en-Bout (E2E) :** Utilise **Playwright** pour simuler des parcours utilisateurs complets dans un vrai navigateur.

---

## 2. Plan de Tests Unitaires et d'Intégration

Crée les fichiers de test (*.test.ts) pour les unités de logique et les composants suivants :

**Fonctions Utilitaires :**

Crée un test pour la fonction de **nettoyage LaTeX** (sanitizeLatex). Il doit vérifier que tous les caractères spéciaux (_, ^, %, &, etc.) sont correctement échappés.

**Composants UI (/components/ui) :**

**Button.tsx :** Teste que le bouton affiche correctement le texte, qu'il est cliquable, et que son état disabled fonctionne.

**Card.tsx :** Teste que la carte affiche correctement son contenu (children).

**Composant de Connexion (/app/page.tsx) :**

Teste la validation du formulaire : des messages d'erreur doivent apparaître si l'email est invalide ou si un champ est vide.

Simule une soumission et vérifie que l'appel API est bien effectué avec les bonnes données.

**Logique des API Routes (mocké) :**

Teste le handler de l'API /api/auth/login. En simulant (mockant) les appels à la base de données, vérifie qu'il appelle bien bcrypt.compare et retourne le bon rôle (TEACHERouSTUDENT).

---

## 3. Plan de Tests de Bout-en-Bout (E2E) avec Playwright

Crée les fichiers de tests E2E qui simulent les parcours utilisateurs réels. Chaque scénario doit partir de zéro (navigateur vierge) et être complètement autonome.

### Scénario 1 : Le Parcours Complet d'un Nouvel Élève

1. Naviguer vers nsi.labomaths.tn.
2. Se connecter avec des identifiants d'élève par défaut (<eleve-test@ert.tn>, password123).
3. Vérifier la redirection forcée vers la page de changement de mot de passe.
4. Changer le mot de passe avec succès.
5. Vérifier que l'utilisateur est déconnecté.
6. Se reconnecter avec le **nouveau** mot de passe.
7. Atterrir sur le dashboard élève et vérifier que le nom de l'élève est affiché.
8. Vérifier que le bouton "Commencer le questionnaire" est visible et cliquable.
9. Cliquer sur le bouton, naviguer dans le questionnaire, remplir **toutes** les questions, et le soumettre.
10. Revenir au dashboard et vérifier que le bouton est maintenant **désactivé** avec le texte "Questionnaire soumis".
11. Attendre (via un polling ou une attente définie) que le bilan PDF soit généré et vérifier que le lien de téléchargement apparaît.
12. Cliquer sur le lien et vérifier qu'un fichier PDF est bien téléchargé.

### Scénario 2 : Le Parcours Complet d'un Enseignant

1. Se connecter avec des identifiants d'enseignant et effectuer le changement de mot de passe obligatoire.
2. Atterrir sur le dashboard enseignant et vérifier que la liste des groupes est visible.
3. Cliquer sur le groupe "Terminale NSI".
4. Vérifier que la liste des élèves s'affiche, incluant l'élève du scénario 1.
5. Localiser l'élève du scénario 1 et vérifier la présence des boutons/liens pour télécharger **les deux bilans** (version élève et version enseignant).
6. Télécharger les deux PDF et vérifier qu'ils sont valides.

### Scénario 3 : Les Actions d'Administration de l'Enseignant

1. Se connecter en tant qu'enseignant.
2. Trouver un élève ayant soumis son questionnaire (celui du scénario 1).
3. Cliquer sur le bouton **"Réactiver le questionnaire"**.
4. Se déconnecter, puis se **reconnecter en tant que cet élève**.
5. Vérifier que le bouton "Commencer le questionnaire" est de nouveau **actif**.
6. Se déconnecter, se reconnecter en tant qu'enseignant.
7. Trouver un élève et cliquer sur **"Réinitialiser le mot de passe"**.
8. Se déconnecter et essayer de se connecter en tant que l'élève avec son ancien mot de passe (doit échouer).
9. Se connecter en tant que l'élève avec le mot de passe par défaut password123 (doit réussir et forcer un changement de mot de passe).

### Scénario 4 : L'Ingestion de Documents RAG

1. Se connecter en tant qu'enseignant.
2. Naviguer vers la section d'ingestion RAG.
3. Uploader un fichier PDF de test.
4. Vérifier qu'un message de succès s'affiche, confirmant que le document a été pris en charge pour traitement.

### Scénario 5 : Tests des Cas Limites et de Sécurité

1. **Authentification :** Tenter de se connecter avec un email inconnu, un mot de passe erroné. Vérifier que des messages d'erreur clairs sont affichés.
2. **Permissions :**

* Étant connecté en tant qu'élève, tenter d'accéder directement à l'URL du dashboard enseignant. Vérifier la redirection vers une page d'erreur ou le dashboard élève.
* Étant déconnecté, tenter d'accéder à un dashboard. Vérifier la redirection vers la page de connexion.

---

## 4. Ta Mission Finale, Cursor

1. **Mets en place Jest, React Testing Library et Playwright** dans le projet s'ils ne sont pas déjà configurés.
2. **Crée l'arborescence de fichiers** nécessaire pour ces tests (ex: testspour Jest,e2e pour Playwright).
3. **Écris le code complet** pour tous les tests unitaires et E2E décrits ci-dessus.
4. Pour finir, **propose d'autres tests** auxquels nous n'aurions pas pensé. En tant qu'IA ayant une vue complète du code, quels sont les scénarios ou les fonctions qui, selon toi, mériteraient une attention particulière pour garantir une robustesse maximale ?
