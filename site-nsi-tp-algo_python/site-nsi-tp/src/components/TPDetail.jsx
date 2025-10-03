import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  BookOpen, 
  Target, 
  Code, 
  CheckCircle, 
  ArrowLeft, 
  Play, 
  Download,
  Lightbulb,
  Users,
  FileText
} from 'lucide-react'

const TPDetail = ({ tp, onBack }) => {
  const tpContent = {
    1: {
      title: "Découverte de l'univers algorithmique",
      description: "Premiers pas avec Python : variables, types et expressions",
      objectifs: [
        "Évaluer la valeur et le type d'une expression comportant variables, constantes et opérateurs",
        "Modéliser les informations disponibles ou à calculer par des variables de type élémentaire",
        "Évaluer les effets de l'exécution d'un programme comportant une séquence d'affectations",
        "Modéliser les informations à calculer par une ou des variables intermédiaires"
      ],
      concepts: [
        { nom: "Types de données", description: "int, str, float, bool - les quatre types fondamentaux en Python" },
        { nom: "Variables", description: "Conteneurs pour stocker des valeurs en mémoire" },
        { nom: "Affectations", description: "Opération qui associe une valeur à une variable avec =" },
        { nom: "Expressions", description: "Combinaisons de valeurs, variables et opérateurs" }
      ],
      exemples: [
        {
          titre: "Types et évaluation",
          code: `>>> 2+3*5
17
>>> 'Bonjour' + ' ' + 'Madame !'
'Bonjour Madame !'`,
          explication: "Python respecte la priorité des opérateurs. La multiplication est effectuée avant l'addition."
        },
        {
          titre: "Variables et affectations",
          code: `>>> a = 42
>>> b = 58
>>> a = b - a
>>> b = b - a`,
          explication: "Séquence d'affectations pour échanger les valeurs de deux variables."
        }
      ],
      conseils: [
        "Toujours tester vos expressions dans l'interpréteur Python avant de les intégrer dans un programme",
        "Choisir des noms de variables explicites qui décrivent leur contenu",
        "Utiliser la fonction type() pour vérifier le type d'une variable en cas de doute"
      ]
    },
    2: {
      title: "Constructions alternatives ou conditionnelles",
      description: "Apprendre à prendre des décisions avec if/else",
      objectifs: [
        "Évaluer les effets de l'exécution d'un programme comportant une ou des constructions alternatives",
        "Modéliser par une variable booléenne la condition d'une alternative ou d'une conditionnelle"
      ],
      concepts: [
        { nom: "Conditions", description: "Expressions qui s'évaluent à True ou False" },
        { nom: "Booléens", description: "Type de données pour les valeurs logiques True/False" },
        { nom: "Structures if/else", description: "Instructions pour exécuter du code selon une condition" },
        { nom: "Opérateurs logiques", description: "and, or, not pour combiner des conditions" }
      ],
      exemples: [
        {
          titre: "Structure conditionnelle simple",
          code: `age = int(input("Âge ? "))
if age >= 18:
    print("Vous avez le droit de vote.")
else:
    print("Vous n'avez pas le droit de vote.")`,
          explication: "Test simple avec une condition d'âge pour déterminer le droit de vote."
        },
        {
          titre: "Conditions multiples",
          code: `n = int(input("Nombre entre 10 et 100 ? "))
if n % 2 == 0:
    print(n, "est divisible par 2")
if n % 3 == 0:
    print(n, "est divisible par 3")`,
          explication: "Tests indépendants pour vérifier la divisibilité par 2 et par 3."
        }
      ],
      conseils: [
        "Éviter les répétitions en utilisant des variables booléennes pour stocker les résultats de tests complexes",
        "Tester tous les cas possibles, y compris les cas limites",
        "Utiliser l'indentation correcte pour délimiter les blocs de code"
      ]
    },
    3: {
      title: "Expressions, affectations et conditions - Applications pratiques",
      description: "Mettre en pratique expressions, affectations et conditions",
      objectifs: [
        "Anticiper l'écriture d'une expression comportant variables, constantes et opérateurs",
        "Anticiper l'écriture d'un traitement séquentiel pour obtenir un résultat spécifié",
        "Anticiper l'écriture d'un traitement alternatif ou conditionnel pour obtenir un résultat spécifié"
      ],
      concepts: [
        { nom: "Applications concrètes", description: "Résolution de problèmes du quotidien avec la programmation" },
        { nom: "Interaction utilisateur", description: "Utilisation d'input() pour récupérer des données" },
        { nom: "Module random", description: "Génération de nombres aléatoires pour les jeux" },
        { nom: "Formules mathématiques", description: "Implémentation de calculs complexes" }
      ],
      exemples: [
        {
          titre: "Calcul du discriminant",
          code: `a = float(input("Coefficient a : "))
b = float(input("Coefficient b : "))
c = float(input("Coefficient c : "))
discriminant = b**2 - 4*a*c
print("Discriminant =", discriminant)`,
          explication: "Calcul du discriminant d'une équation du second degré."
        },
        {
          titre: "Jeu de devinette",
          code: `from random import randint
secret = randint(1, 10)
essai = int(input("Devine ? "))
if essai == secret:
    print("Gagné !")
else:
    print("Perdu, c'était", secret)`,
          explication: "Jeu simple utilisant la génération aléatoire et les conditions."
        }
      ],
      conseils: [
        "Décomposer les problèmes complexes en étapes simples",
        "Tester les programmes avec différentes valeurs d'entrée",
        "Gérer les cas d'erreur (division par zéro, valeurs négatives, etc.)"
      ]
    },
    4: {
      title: "Boucles bornées et non bornées",
      description: "Maîtriser la répétition avec for et while",
      objectifs: [
        "Évaluer les effets de l'exécution d'un programme comportant une boucle bornée ou non bornée",
        "Modéliser par une ou des variables les informations à modifier à chaque répétition",
        "Anticiper l'écriture d'un traitement répétitif pour obtenir un résultat spécifié"
      ],
      concepts: [
        { nom: "Boucles for", description: "Répétition avec un nombre d'itérations connu à l'avance" },
        { nom: "Boucles while", description: "Répétition tant qu'une condition est vraie" },
        { nom: "Variables d'accumulation", description: "Variables qui accumulent des valeurs à chaque itération" },
        { nom: "Fonction range()", description: "Génération de séquences de nombres pour les boucles for" }
      ],
      exemples: [
        {
          titre: "Boucle for avec accumulation",
          code: `somme = 0
for i in range(1, 11):
    somme = somme + i
print("Somme des 10 premiers entiers :", somme)`,
          explication: "Calcul de la somme des entiers de 1 à 10 avec une boucle for."
        },
        {
          titre: "Boucle while pour validation",
          code: `note = int(input("Note ? (-1 pour finir)"))
while note != -1:
    print("Note saisie :", note)
    note = int(input("Note ? (-1 pour finir)"))`,
          explication: "Saisie de notes jusqu'à ce que l'utilisateur entre -1."
        }
      ],
      conseils: [
        "Choisir le bon type de boucle : for quand on connaît le nombre d'itérations, while sinon",
        "Initialiser correctement les variables d'accumulation avant la boucle",
        "S'assurer que la condition de sortie des boucles while sera un jour atteinte"
      ]
    },
    5: {
      title: "Programmer avec des fonctions",
      description: "Structurer le code avec des fonctions réutilisables",
      objectifs: [
        "Évaluer le résultat de l'appel d'une fonction avec des paramètres donnés",
        "Modéliser un traitement par une fonction en spécifiant ses paramètres",
        "Anticiper l'écriture d'une fonction, les paramètres étant spécifiés"
      ],
      concepts: [
        { nom: "Définition de fonctions", description: "Création de blocs de code réutilisables avec def" },
        { nom: "Paramètres", description: "Variables qui reçoivent les valeurs passées à la fonction" },
        { nom: "Valeurs de retour", description: "Résultat renvoyé par la fonction avec return" },
        { nom: "Portée des variables", description: "Variables locales vs variables globales" }
      ],
      exemples: [
        {
          titre: "Fonction avec paramètres et retour",
          code: `def puissance(x, n):
    resultat = 1
    for i in range(n):
        resultat = resultat * x
    return resultat

print(puissance(2, 3))  # Affiche 8`,
          explication: "Fonction qui calcule x à la puissance n et retourne le résultat."
        },
        {
          titre: "Fonction de validation",
          code: `def est_premier(n):
    if n < 2:
        return False
    for i in range(2, n):
        if n % i == 0:
            return False
    return True`,
          explication: "Fonction qui teste si un nombre est premier."
        }
      ],
      conseils: [
        "Une fonction doit avoir une responsabilité claire et bien définie",
        "Choisir des noms de fonctions et de paramètres explicites",
        "Tester chaque fonction individuellement avant de l'intégrer dans un programme plus large"
      ]
    }
  }

  const currentTP = tpContent[tp]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <Badge variant="secondary">TP {tp} • NSI Première</Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TP {tp} : {currentTP.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {currentTP.description}
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="objectifs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="objectifs">Objectifs</TabsTrigger>
            <TabsTrigger value="concepts">Concepts</TabsTrigger>
            <TabsTrigger value="exemples">Exemples</TabsTrigger>
            <TabsTrigger value="conseils">Conseils</TabsTrigger>
          </TabsList>

          <TabsContent value="objectifs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Objectifs pédagogiques
                </CardTitle>
                <CardDescription>
                  Compétences et capacités développées dans ce TP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentTP.objectifs.map((objectif, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">{objectif}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="concepts">
            <div className="grid gap-4 md:grid-cols-2">
              {currentTP.concepts.map((concept, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {concept.nom}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{concept.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="exemples">
            <div className="space-y-6">
              {currentTP.exemples.map((exemple, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      {exemple.titre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{exemple.code}</pre>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700">{exemple.explication}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="conseils">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Conseils pratiques
                </CardTitle>
                <CardDescription>
                  Recommandations pour réussir ce TP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentTP.conseils.map((conseil, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">{conseil}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-purple-600"
            onClick={() => window.open(`#exercices-tp-${tp}`, '_blank')}
          >
            <Play className="w-4 h-4 mr-2" />
            Commencer les exercices
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => {
              const link = document.createElement('a');
              link.href = `/tp${tp}.pdf`;
              link.download = `TP${tp}_NSI_Premiere.pdf`;
              link.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger le TP
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => window.open(`#corrections-tp-${tp}`, '_blank')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Voir les corrections
          </Button>
        </div>
      </main>
    </div>
  )
}

export default TPDetail
