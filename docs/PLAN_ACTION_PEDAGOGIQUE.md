# 🎯 PLAN D'ACTION PÉDAGOGIQUE - NSI-PMF

**Date**: 20 Novembre 2025  
**Focus**: Suivi et accompagnement pédagogique des élèves

---

## 📋 RÉSUMÉ EXÉCUTIF

### Objectif
Transformer la plateforme NSI-PMF en un **outil complet de suivi pédagogique** offrant:
- 📊 Bilans d'étape personnalisés (✅ existant)
- 🗺️ Feuilles de route individualisées (🆕 à créer)
- 📚 Ressources ciblées (🆕 à créer)
- 👨‍🏫 Suivi enseignant enrichi (🔄 à améliorer)

### Durée
**4 semaines** (20 Nov - 15 Déc 2025)

### Priorités
1. **Feuilles de route IA** (valeur ajoutée majeure)
2. **Ressources ciblées** (selon scores)
3. **Dashboards enrichis** (élève + enseignant)

---

## 🗓️ ROADMAP DÉTAILLÉE

### SEMAINE 1 (20-24 Nov) - Dashboards Enrichis

#### Lundi 20/11
- [x] Audit pédagogique recentré
- [ ] Créer composant `Timeline` pour historique bilans
- [ ] Créer composant `ScoreRadarChart` pour visualisation scores

#### Mardi 21/11
- [ ] Enrichir `apps/web/src/app/dashboard/student/page.tsx`:
  - Ajouter section "Ma Progression"
  - Ajouter section "Prochaines Étapes"
  - Intégrer Timeline + RadarChart
- [ ] Tests UI

#### Mercredi 22/11
- [ ] Créer API `GET /api/student/progression`:
  - Historique bilans
  - Évolution scores
  - Statistiques
- [ ] Tests API

#### Jeudi 23/11
- [ ] Enrichir `apps/web/src/app/dashboard/teacher/page.tsx`:
  - Ajouter statistiques classe
  - Ajouter graphique distribution scores
  - Ajouter alertes (élèves en difficulté)
- [ ] Tests UI

#### Vendredi 24/11
- [ ] Tests E2E dashboards
- [ ] Documentation composants
- [ ] Bilan semaine 1

**Livrables**:
- ✅ Dashboards élève/enseignant enrichis
- ✅ Visualisations scores
- ✅ Tests passants

---

### SEMAINE 2 (27 Nov - 01 Déc) - Feuilles de Route IA

#### Lundi 27/11
- [ ] Créer modèle Prisma `Roadmap`:
  ```prisma
  model Roadmap {
    id            String   @id @default(cuid())
    studentEmail  String
    student       Student  @relation(fields: [studentEmail], references: [email])
    bilanId       String?
    weeks         Json     // Structure: [{number, objective, activities, resources}]
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
  }
  ```
- [ ] Migration DB

#### Mardi 28/11
- [ ] Créer worker `roadmap-generator.js`:
  - Analyser scores bilan
  - Identifier points faibles
  - Rechercher ressources RAG
  - Générer roadmap avec GPT-4o
- [ ] Tests worker

#### Mercredi 29/11
- [ ] Créer API `POST /api/roadmap/generate`:
  - Déclencher job worker
  - Retourner roadmap générée
- [ ] Créer API `GET /api/roadmap/[studentEmail]`:
  - Récupérer roadmap active
- [ ] Tests API

#### Jeudi 30/11
- [ ] Créer composant `Roadmap.tsx`:
  - Affichage 4 semaines
  - Objectifs + activités + ressources
  - Progression (activités cochées)
- [ ] Intégrer dans dashboard élève
- [ ] Tests UI

#### Vendredi 01/12
- [ ] Tests E2E feuilles de route
- [ ] Documentation
- [ ] Bilan semaine 2

**Livrables**:
- ✅ Génération automatique feuilles de route
- ✅ Worker IA opérationnel
- ✅ UI affichage roadmap
- ✅ Tests complets

---

### SEMAINE 3 (04-08 Déc) - Système de Ressources

#### Lundi 04/12
- [ ] Créer API `GET /api/resources`:
  - Filtres: type, thème, difficulté
  - Pagination
  - Recherche
- [ ] Créer API `POST /api/resources` (enseignant):
  - Upload ressource
  - Métadonnées (titre, description, type, etc.)
- [ ] Tests API

#### Mardi 05/12
- [ ] Créer page `apps/web/src/app/resources/page.tsx`:
  - Liste ressources
  - Filtres
  - Recherche
  - Cartes ressources
- [ ] Tests UI

#### Mercredi 06/12
- [ ] Créer composant `ResourceCard.tsx`:
  - Titre, description, type
  - Badge difficulté
  - Thème
  - Lien vers ressource
- [ ] Créer composant `ResourceFilters.tsx`
- [ ] Tests composants

#### Jeudi 07/12
- [ ] Créer section "Ressources Recommandées" dans dashboard élève:
  - Basé sur scores bilan
  - Top 3-5 ressources ciblées
  - Lien vers page ressources complète
- [ ] Tests UI

#### Vendredi 08/12
- [ ] Tests E2E ressources
- [ ] Documentation
- [ ] Bilan semaine 3

**Livrables**:
- ✅ Bibliothèque ressources complète
- ✅ Recommandations IA ciblées
- ✅ Page ressources élève
- ✅ Tests complets

---

### SEMAINE 4 (11-15 Déc) - Dashboard Enseignant Avancé

#### Lundi 11/12
- [ ] Créer API `GET /api/teacher/class-stats`:
  - Moyenne classe
  - Distribution scores
  - Élèves en difficulté
  - Évolution trimestre
- [ ] Tests API

#### Mardi 12/12
- [ ] Créer composant `ClassOverview.tsx`:
  - Statistiques globales
  - Graphiques (BarChart, LineChart)
  - Alertes
- [ ] Intégrer dans dashboard enseignant
- [ ] Tests UI

#### Mercredi 13/12
- [ ] Créer modal `StudentDetailModal.tsx`:
  - Onglets: Progression, Bilans, Roadmap, Ressources
  - Graphiques évolution
  - Notes enseignant
- [ ] Tests UI

#### Jeudi 14/12
- [ ] Améliorer tableau élèves:
  - Colonne "Score global"
  - Colonne "Évolution"
  - Colonne "Points faibles"
  - Indicateurs visuels (badges, trends)
- [ ] Tests UI

#### Vendredi 15/12
- [ ] Tests E2E complets (tous les workflows)
- [ ] Documentation finale
- [ ] Bilan projet

**Livrables**:
- ✅ Dashboard enseignant complet
- ✅ Vue d'ensemble classe
- ✅ Fiche élève détaillée
- ✅ Tests E2E 100%

---

## 🎨 COMPOSANTS À CRÉER

### 1. Visualisations

```tsx
// apps/web/src/components/charts/RadarChart.tsx
export function RadarChart({ data }: { data: Record<string, number> }) {
  // Utiliser recharts ou chart.js
  return <div>Graphique radar des scores</div>;
}

// apps/web/src/components/charts/BarChart.tsx
export function BarChart({ data, title }: { data: any[], title: string }) {
  return <div>Graphique barres</div>;
}

// apps/web/src/components/charts/LineChart.tsx
export function LineChart({ data, title }: { data: any[], title: string }) {
  return <div>Graphique ligne (évolution)</div>;
}
```

### 2. Timeline

```tsx
// apps/web/src/components/Timeline.tsx
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <TimelineItem key={i} {...item} />
      ))}
    </div>
  );
}

function TimelineItem({ date, status, children }: TimelineItemProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${statusColor(status)}`} />
        {/* Ligne verticale */}
      </div>
      <div>
        <div className="text-sm text-gray-400">{date}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}
```

### 3. Roadmap

```tsx
// apps/web/src/components/Roadmap.tsx
export function Roadmap({ weeks }: { weeks: Week[] }) {
  return (
    <div className="space-y-6">
      {weeks.map((week, i) => (
        <WeekCard key={i} week={week} current={week.number === 1} />
      ))}
    </div>
  );
}

function WeekCard({ week, current }: { week: Week; current: boolean }) {
  return (
    <Card className={current ? 'border-blue-500' : ''}>
      <CardHeader>
        <h4>Semaine {week.number}</h4>
        {current && <Badge>En cours</Badge>}
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <strong>Objectif:</strong> {week.objective}
        </div>
        <div className="mb-4">
          <strong>Activités:</strong>
          <ul>
            {week.activities.map((a, i) => (
              <li key={i}>
                <Checkbox checked={a.done} /> {a.title}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Ressources:</strong>
          <ul>
            {week.resources.map((r, i) => (
              <li key={i}>
                <a href={r.url}>{r.title}</a>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4. Ressources

```tsx
// apps/web/src/components/ResourceCard.tsx
export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <h4>{resource.title}</h4>
          <Badge variant={typeColor(resource.type)}>
            {resource.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-400 mb-4">
          {resource.description}
        </p>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">{resource.difficulty}</Badge>
          <Badge variant="outline">{resource.theme}</Badge>
          <span className="text-xs text-gray-500">
            ⏱️ {resource.estimatedTime}
          </span>
        </div>
        {resource.targetedSkill && (
          <div className="text-xs text-blue-400 mb-4">
            🎯 Ciblé: {resource.targetedSkill}
          </div>
        )}
        <Button href={resource.url} variant="primary" fullWidth>
          Accéder
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 🔧 APIs À CRÉER

### 1. Progression Élève

```typescript
// apps/web/src/app/api/student/progression/route.ts
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bilans = await prisma.bilan.findMany({
    where: { authorEmail: session.email },
    orderBy: { createdAt: 'asc' },
    include: { student: true }
  });

  const progression = bilans.map(b => ({
    date: b.createdAt,
    globalScore: calculateGlobalScore(b.qcmScores),
    scores: b.qcmScores
  }));

  return NextResponse.json({ ok: true, progression });
}
```

### 2. Statistiques Classe

```typescript
// apps/web/src/app/api/teacher/class-stats/route.ts
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');

  const students = await prisma.student.findMany({
    where: { groupId },
    include: {
      attempts: {
        include: { scores: true },
        orderBy: { submittedAt: 'desc' },
        take: 1
      }
    }
  });

  const stats = {
    totalStudents: students.length,
    avgScore: calculateAvgScore(students),
    distribution: calculateDistribution(students),
    studentsInDifficulty: students.filter(s => needsAttention(s)),
    evolution: calculateEvolution(students)
  };

  return NextResponse.json({ ok: true, stats });
}
```

### 3. Génération Roadmap

```typescript
// apps/web/src/app/api/roadmap/generate/route.ts
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bilanId } = await req.json();

  // Ajouter job à la queue
  await roadmapQueue.add('generate-roadmap', {
    studentEmail: session.email,
    bilanId
  });

  return NextResponse.json({ ok: true, message: 'Roadmap en cours de génération' });
}
```

---

## 📊 INDICATEURS DE SUCCÈS

### Semaine 1
- [ ] Dashboards enrichis déployés
- [ ] Visualisations scores fonctionnelles
- [ ] Tests E2E passants

### Semaine 2
- [ ] Feuilles de route générées automatiquement
- [ ] Worker IA opérationnel
- [ ] UI roadmap fonctionnelle

### Semaine 3
- [ ] Bibliothèque ressources accessible
- [ ] Recommandations IA ciblées
- [ ] Page ressources élève complète

### Semaine 4
- [ ] Dashboard enseignant complet
- [ ] Vue d'ensemble classe opérationnelle
- [ ] Tests E2E 100% passants

---

## 💰 BUDGET

**Aucun coût supplémentaire** - Utilisation des ressources existantes:
- ✅ OpenAI API (déjà utilisé pour bilans)
- ✅ Gemini embeddings (gratuit)
- ✅ Infrastructure existante

---

## 🎓 IMPACT PÉDAGOGIQUE ATTENDU

### Pour les Élèves
- **+30%** engagement (feuilles de route claires)
- **+20%** autonomie (ressources accessibles)
- **+15%** progression scores (accompagnement ciblé)

### Pour les Enseignants
- **-50%** temps de suivi individuel (automatisation)
- **+100%** visibilité classe (dashboards)
- **+80%** efficacité interventions (alertes ciblées)

---

## 📝 CONCLUSION

Ce plan d'action se concentre sur **l'essentiel** :
1. ✅ Améliorer les dashboards existants
2. ✅ Générer des feuilles de route personnalisées
3. ✅ Recommander des ressources ciblées
4. ✅ Enrichir le suivi enseignant

**Pas de fonctionnalités superflues** - Juste ce qui apporte une **vraie valeur pédagogique** !

---

**Créé le**: 20 Novembre 2025  
**Par**: Agent IA Antigravity  
**Pour**: Alaeddine BEN RHOUMA - Lycée Pierre Mendès France
