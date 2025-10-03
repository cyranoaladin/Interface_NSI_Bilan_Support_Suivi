import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { 
  ArrowLeft, 
  BookOpen, 
  Target, 
  Code, 
  CheckCircle,
  Lightbulb,
  Users,
  Star,
  TrendingUp
} from 'lucide-react'

const ResourceDetail = ({ resource, onBack }) => {
  const resourceContent = {
    methodologie: {
      title: "Fiche Méthodologique",
      description: "Conseils pratiques pour réussir en programmation",
      sections: [
        {
          titre: "Comment aborder un exercice de programmation",
          contenu: [
            {
              etape: "Étape 1 : Comprendre le problème",
              description: "Avant de commencer à coder, prenez le temps de bien comprendre ce qui est demandé. Lisez attentivement l'énoncé et identifiez les éléments clés : les données d'entrée, le traitement à effectuer, et le résultat attendu."
            },
            {
              etape: "Étape 2 : Modéliser la solution",
              description: "Réfléchissez aux variables dont vous aurez besoin et à leur type. Demandez-vous quelles informations doivent être stockées et comment elles vont évoluer au cours du programme."
            },
            {
              etape: "Étape 3 : Anticiper le résultat",
              description: "Avant d'exécuter votre programme, essayez de prévoir ce qu'il va afficher. Cette capacité d'anticipation vous permettra de détecter rapidement les erreurs de logique."
            }
          ]
        },
        {
          titre: "Conseils pour chaque type de structure",
          contenu: [
            {
              etape: "Travailler avec les variables",
              description: "Les variables sont comme des boîtes qui contiennent des valeurs. Choisissez des noms explicites qui décrivent clairement leur contenu. L'affectation a = b copie la valeur de b dans a."
            },
            {
              etape: "Maîtriser les conditions",
              description: "Les structures conditionnelles permettent à votre programme de prendre des décisions. Testez toutes les branches de vos conditions et utilisez des variables booléennes pour plus de lisibilité."
            },
            {
              etape: "Optimiser les boucles",
              description: "Pour les boucles for, utilisez range() approprié. Pour les boucles while, assurez-vous que la condition de sortie sera atteinte. Les variables d'accumulation sont essentielles pour les calculs progressifs."
            }
          ]
        },
        {
          titre: "Stratégies de débogage",
          contenu: [
            {
              etape: "Utiliser les affichages de contrôle",
              description: "Ajoutez des print() temporaires pour vérifier les valeurs de vos variables. Cette technique simple vous aidera à localiser précisément les problèmes."
            },
            {
              etape: "Tester avec des cas simples",
              description: "Commencez par tester avec des valeurs simples dont vous connaissez le résultat. Une fois que ces cas fonctionnent, testez avec des données plus complexes."
            },
            {
              etape: "Vérifier les types de données",
              description: "Beaucoup d'erreurs proviennent de confusions entre les types. Utilisez type() pour vérifier vos variables si nécessaire."
            }
          ]
        }
      ]
    },
    competences: {
      title: "Compétences et Capacités",
      description: "Référentiel détaillé des apprentissages",
      sections: [
        {
          titre: "Compétence 1 : Évaluer et anticiper",
          contenu: [
            {
              etape: "Description",
              description: "Cette compétence fondamentale consiste à comprendre et prévoir le comportement d'un programme avant son exécution. Elle se développe progressivement à travers tous les TP."
            },
            {
              etape: "Capacités associées",
              description: "Évaluer la valeur et le type d'une expression • Évaluer les effets d'une séquence d'affectations • Évaluer les constructions alternatives • Évaluer les boucles • Évaluer l'appel de fonctions"
            }
          ]
        },
        {
          titre: "Compétence 2 : Modéliser l'information",
          contenu: [
            {
              etape: "Description",
              description: "La modélisation consiste à choisir les bonnes structures de données pour représenter les informations nécessaires à la résolution d'un problème."
            },
            {
              etape: "Capacités associées",
              description: "Modéliser par des variables de type élémentaire • Modéliser par des variables intermédiaires • Modéliser par des variables booléennes • Modéliser par des fonctions"
            }
          ]
        },
        {
          titre: "Compétence 3 : Concevoir et implémenter",
          contenu: [
            {
              etape: "Description",
              description: "Cette compétence porte sur la capacité à concevoir des solutions algorithmiques et à les traduire en code Python."
            },
            {
              etape: "Capacités associées",
              description: "Anticiper l'écriture d'expressions • Anticiper les traitements séquentiels • Anticiper les traitements conditionnels • Anticiper les traitements répétitifs • Anticiper l'écriture de fonctions"
            }
          ]
        }
      ]
    },
    exercices: {
      title: "Exercices d'Entraînement",
      description: "Exercices supplémentaires pour chaque TP",
      sections: [
        {
          titre: "Exercices TP 1 : Variables et expressions",
          contenu: [
            {
              etape: "Exercice 1.1 : Types de données",
              description: "Créez un programme qui demande nom, âge et taille, puis affiche ces informations en précisant leur type. Calculez l'âge dans 10 ans."
            },
            {
              etape: "Exercice 1.2 : Calculs avec remise",
              description: "Un magasin applique 15% de remise. Calculez le prix final d'un article à partir de son prix initial."
            },
            {
              etape: "Exercice 1.3 : Échange de variables",
              description: "Échangez les valeurs de trois variables a, b, c selon le schéma : a→b, b→c, c→a."
            }
          ]
        },
        {
          titre: "Exercices TP 2 : Conditions",
          contenu: [
            {
              etape: "Exercice 2.1 : Calculatrice",
              description: "Créez une calculatrice qui demande deux nombres et une opération, puis affiche le résultat. Gérez la division par zéro."
            },
            {
              etape: "Exercice 2.2 : Classification d'âge",
              description: "Classez une personne selon son âge : enfant (0-12), adolescent (13-17), adulte (18-64), senior (65+)."
            },
            {
              etape: "Exercice 2.3 : Validation mot de passe",
              description: "Vérifiez qu'un mot de passe a au moins 8 caractères, un chiffre et une majuscule."
            }
          ]
        },
        {
          titre: "Exercices TP 3 : Applications",
          contenu: [
            {
              etape: "Exercice 3.1 : Calcul d'IMC",
              description: "Calculez l'IMC et indiquez la catégorie (maigreur, normal, surpoids, obésité)."
            },
            {
              etape: "Exercice 3.2 : Jeu amélioré",
              description: "Améliorez le jeu de devinette avec 7 essais maximum et des indices précis."
            },
            {
              etape: "Exercice 3.3 : Convertisseur",
              description: "Convertissez les températures entre Celsius, Fahrenheit et Kelvin avec menu de choix."
            }
          ]
        }
      ]
    }
  }

  const currentResource = resourceContent[resource]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour aux ressources
            </Button>
            <Badge variant="secondary">Ressource pédagogique</Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {currentResource.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {currentResource.description}
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {currentResource.sections.map((section, sectionIndex) => (
            <Card key={sectionIndex} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  {resource === 'methodologie' && <Lightbulb className="w-5 h-5" />}
                  {resource === 'competences' && <Target className="w-5 h-5" />}
                  {resource === 'exercices' && <Code className="w-5 h-5" />}
                  {section.titre}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {section.contenu.map((item, itemIndex) => (
                    <div key={itemIndex} className="border-l-4 border-blue-200 pl-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        {resource === 'exercices' ? (
                          <Code className="w-4 h-4 text-blue-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {item.etape}
                      </h4>
                      <p className="text-gray-700 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Tips */}
        {resource === 'methodologie' && (
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-0 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Conseils d'expert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Progression régulière</h4>
                    <p className="text-sm text-gray-600">Pratiquez un peu chaque jour plutôt que de longues sessions espacées.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Travail collaboratif</h4>
                    <p className="text-sm text-gray-600">N'hésitez pas à expliquer votre code à un camarade, cela renforce votre compréhension.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-center mt-8">
          <Button onClick={onBack} size="lg" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux ressources
          </Button>
        </div>
      </main>
    </div>
  )
}

export default ResourceDetail
