import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { BookOpen, Code, Target, Users, ChevronRight, Play, Download, CheckCircle } from 'lucide-react'
import TPDetail from './components/TPDetail.jsx'
import ResourceDetail from './components/ResourceDetail.jsx'
import './App.css'

function App() {
  const [activeTP, setActiveTP] = useState(null)
  const [activeResource, setActiveResource] = useState(null)

  const tpData = [
    {
      id: 1,
      title: "Découverte de l'univers algorithmique",
      description: "Premiers pas avec Python : variables, types et expressions",
      concepts: ["Types de données", "Variables", "Affectations", "Expressions"],
      competences: ["Évaluer", "Modéliser", "Anticiper"],
      color: "bg-blue-500",
      icon: <BookOpen className="w-6 h-6" />
    },
    {
      id: 2,
      title: "Constructions alternatives",
      description: "Apprendre à prendre des décisions avec if/else",
      concepts: ["Conditions", "Booléens", "Structures if/else", "Logique"],
      competences: ["Évaluer", "Modéliser"],
      color: "bg-green-500",
      icon: <Target className="w-6 h-6" />
    },
    {
      id: 3,
      title: "Applications pratiques",
      description: "Mettre en pratique expressions, affectations et conditions",
      concepts: ["Applications concrètes", "Interaction utilisateur", "Module random"],
      competences: ["Anticiper", "Implémenter"],
      color: "bg-purple-500",
      icon: <Code className="w-6 h-6" />
    },
    {
      id: 4,
      title: "Boucles bornées et non bornées",
      description: "Maîtriser la répétition avec for et while",
      concepts: ["Boucles for", "Boucles while", "Variables d'accumulation", "Algorithmes itératifs"],
      competences: ["Évaluer", "Modéliser", "Anticiper"],
      color: "bg-orange-500",
      icon: <Play className="w-6 h-6" />
    },
    {
      id: 5,
      title: "Programmer avec des fonctions",
      description: "Structurer le code avec des fonctions réutilisables",
      concepts: ["Définition de fonctions", "Paramètres", "Valeurs de retour", "Modularité"],
      competences: ["Évaluer", "Modéliser", "Anticiper"],
      color: "bg-red-500",
      icon: <Users className="w-6 h-6" />
    }
  ]

  const ressources = [
    {
      title: "Fiche Méthodologique",
      description: "Conseils pratiques pour réussir en programmation",
      icon: <BookOpen className="w-5 h-5" />,
      type: "guide",
      key: "methodologie"
    },
    {
      title: "Compétences et Capacités",
      description: "Référentiel détaillé des apprentissages",
      icon: <Target className="w-5 h-5" />,
      type: "reference",
      key: "competences"
    },
    {
      title: "Exercices d'Entraînement",
      description: "Exercices supplémentaires pour chaque TP",
      icon: <Code className="w-5 h-5" />,
      type: "practice",
      key: "exercices"
    }
  ]

  // Navigation handlers
  const handleTPClick = (tpId) => {
    setActiveTP(tpId)
  }

  const handleResourceClick = (resourceKey) => {
    setActiveResource(resourceKey)
  }

  const handleBackToMain = () => {
    setActiveTP(null)
    setActiveResource(null)
  }

  // Render detailed views
  if (activeTP) {
    return <TPDetail tp={activeTP} onBack={handleBackToMain} />
  }

  if (activeResource) {
    return <ResourceDetail resource={activeResource} onBack={handleBackToMain} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NSI Première</h1>
                <p className="text-sm text-gray-600">Séquence 1 : Débuter en Python</p>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              5 TP • Niveau Première
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Maîtrisez les fondamentaux de Python
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Une progression pédagogique complète pour découvrir la programmation en Python. 
            De la manipulation des variables aux fonctions, développez vos compétences algorithmiques étape par étape.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => handleTPClick(1)}
            >
              Commencer le parcours
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setActiveResource('methodologie')}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger les ressources
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Tabs defaultValue="tp" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="tp">Travaux Pratiques</TabsTrigger>
            <TabsTrigger value="ressources">Ressources</TabsTrigger>
          </TabsList>

          <TabsContent value="tp" className="space-y-8">
            {/* TP Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tpData.map((tp) => (
                <Card key={tp.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${tp.color} text-white mb-3`}>
                        {tp.icon}
                      </div>
                      <Badge variant="outline">TP {tp.id}</Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {tp.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {tp.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Concepts clés</h4>
                        <div className="flex flex-wrap gap-1">
                          {tp.concepts.map((concept, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Compétences</h4>
                        <div className="flex flex-wrap gap-1">
                          {tp.competences.map((comp, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button 
                        className="w-full group-hover:bg-primary/90 transition-colors"
                        onClick={() => handleTPClick(tp.id)}
                      >
                        Accéder au TP {tp.id}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progression Overview */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Progression pédagogique
                </CardTitle>
                <CardDescription>
                  Découvrez comment les concepts s'articulent tout au long de la séquence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  {tpData.map((tp, index) => (
                    <div key={tp.id} className="flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-full ${tp.color} text-white flex items-center justify-center mb-2`}>
                        {tp.id}
                      </div>
                      <h4 className="font-semibold text-sm mb-1">TP {tp.id}</h4>
                      <p className="text-xs text-gray-600 leading-tight">{tp.title}</p>
                      {index < tpData.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-gray-400 mt-2 hidden md:block" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ressources" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {ressources.map((ressource, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        {ressource.icon}
                      </div>
                      <CardTitle className="text-lg">{ressource.title}</CardTitle>
                    </div>
                    <CardDescription>{ressource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleResourceClick(ressource.key)}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Consulter
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Additional Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Ressources complémentaires</CardTitle>
                <CardDescription>
                  Documents et outils pour approfondir vos connaissances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Download className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="font-semibold">Documents TP originaux</h4>
                      <p className="text-sm text-gray-600">Fichiers PDF des 5 TP</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Code className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="font-semibold">Exemples de code</h4>
                      <p className="text-sm text-gray-600">Solutions et corrections</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">
              Site pédagogique NSI - Première • Séquence 1 : Débuter en Python
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Conçu pour accompagner les élèves dans leur apprentissage de la programmation
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
