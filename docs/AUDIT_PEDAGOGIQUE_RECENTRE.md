# 📊 AUDIT PÉDAGOGIQUE - PLATEFORME NSI-PMF

**Date**: 20 Novembre 2025  
**Focus**: Suivi et accompagnement pédagogique des élèves NSI

---

## 🎯 VISION DU PROJET

Une **plateforme pédagogique complète** pour:
- 📊 **Bilans d'étape personnalisés** générés par IA
- 🗺️ **Feuilles de route individualisées** selon les besoins
- 📚 **Ressources ciblées** (cours, TP, exercices)
- 👨‍🏫 **Suivi enseignant** de la progression classe
- 🎯 **Accompagnement continu** des élèves

---

## ✅ EXISTANT - CE QUI FONCTIONNE

### 1. Workflow Élève Actuel

```
Connexion → Dashboard → Questionnaire → Génération Bilan → Téléchargement PDF
```

**Points forts**:
- ✅ Questionnaire structuré (connaissances + profil pédagogique)
- ✅ Génération automatique bilans (React-PDF)
- ✅ IA générative (GPT-4o) + RAG (Gemini embeddings)
- ✅ Dashboard simple et fonctionnel
- ✅ Téléchargement PDF direct

### 2. Workflow Enseignant Actuel

```
Connexion → Sélection Groupe → Liste Élèves → Consultation Bilans
```

**Points forts**:
- ✅ Vue par groupe/classe
- ✅ Accès aux bilans élèves
- ✅ Réinitialisation mots de passe
- ✅ Upload documents RAG
- ✅ Réactivation soumissions

### 3. Architecture Technique

**Solide et moderne**:
- ✅ Next.js 14 (App Router)
- ✅ Worker BullMQ pour génération asynchrone
- ✅ PostgreSQL + pgvector (RAG)
- ✅ Tests E2E Playwright
- ✅ Monitoring Prometheus/Grafana

---

## 🚀 AMÉLIORATIONS PROPOSÉES

### A. DASHBOARD ÉLÈVE ENRICHI

#### 1. Vue d'ensemble Progression

**Actuellement**: Juste "Commencer questionnaire" + "Télécharger bilan"

**Proposé**:
```tsx
// apps/web/src/app/dashboard/student/page.tsx

<Card>
  <CardHeader>
    <h3>Ma Progression NSI</h3>
  </CardHeader>
  <CardContent>
    {/* Timeline des bilans */}
    <Timeline>
      <TimelineItem date="Sept 2024" status="completed">
        Bilan de rentrée - Score global: 72%
      </TimelineItem>
      <TimelineItem date="Nov 2024" status="current">
        Bilan mi-trimestre - En cours
      </TimelineItem>
      <TimelineItem date="Jan 2025" status="upcoming">
        Bilan fin trimestre 1
      </TimelineItem>
    </Timeline>

    {/* Graphique radar scores */}
    <RadarChart data={latestScores} />
  </CardContent>
</Card>
```

#### 2. Feuille de Route Personnalisée

**Nouveau composant**:
```tsx
<Card>
  <CardHeader>
    <h3>Ma Feuille de Route (4 semaines)</h3>
  </CardHeader>
  <CardContent>
    <Roadmap>
      <Week number={1} current>
        <Objective>Consolider les structures de données</Objective>
        <Activities>
          <Activity done>✅ Revoir cours Listes/Piles/Files</Activity>
          <Activity>⏳ TP Arbres Binaires</Activity>
          <Activity>⬜ Quiz Complexité</Activity>
        </Activities>
        <Resources>
          <Resource href="/tp/arbres">TP Arbres (recommandé)</Resource>
          <Resource href="/cours/structures">Cours Structures</Resource>
        </Resources>
      </Week>

      <Week number={2}>
        <Objective>Maîtriser les algorithmes de tri</Objective>
        {/* ... */}
      </Week>
    </Roadmap>
  </CardContent>
</Card>
```

#### 3. Ressources Recommandées

**Basé sur les scores du bilan**:
```tsx
<Card>
  <CardHeader>
    <h3>Ressources pour Toi</h3>
    <Badge>Ciblées selon ton bilan</Badge>
  </CardHeader>
  <CardContent>
    <ResourceList>
      {/* Score Python faible → Ressources Python */}
      <ResourceCard
        title="TP Python - Fonctions Avancées"
        type="tp"
        difficulty="Moyen"
        estimatedTime="2h"
        targetedSkill="Python (score actuel: 65%)"
        href="/tp/python-fonctions"
      />

      {/* Score Structures faible → Ressources Structures */}
      <ResourceCard
        title="Cours Arbres Binaires"
        type="cours"
        difficulty="Moyen"
        estimatedTime="45min"
        targetedSkill="Structures (score actuel: 58%)"
        href="/cours/arbres"
      />

      {/* Quiz pour s'entraîner */}
      <ResourceCard
        title="Quiz Complexité Algorithmique"
        type="quiz"
        difficulty="Facile"
        estimatedTime="15min"
        targetedSkill="Algorithmique"
        href="/quiz/complexite"
      />
    </ResourceList>
  </CardContent>
</Card>
```

#### 4. Prochaines Étapes Claires

```tsx
<Card>
  <CardHeader>
    <h3>Mes Prochaines Étapes</h3>
  </CardHeader>
  <CardContent>
    <StepsList>
      <Step number={1} status="current">
        <Title>Compléter le bilan mi-trimestre</Title>
        <Description>Questionnaire disponible jusqu'au 30/11</Description>
        <Action>
          <Button href="/bilan/initier">Commencer</Button>
        </Action>
      </Step>

      <Step number={2} status="upcoming">
        <Title>Travailler les structures de données</Title>
        <Description>Objectif: +10% de score d'ici fin trimestre</Description>
        <Action>
          <Button href="/roadmap">Voir ma feuille de route</Button>
        </Action>
      </Step>

      <Step number={3} status="upcoming">
        <Title>Préparer le projet de trimestre</Title>
        <Description>Sujet à choisir avant le 15/12</Description>
      </Step>
    </StepsList>
  </CardContent>
</Card>
```

---

### B. DASHBOARD ENSEIGNANT ENRICHI

#### 1. Vue d'Ensemble Classe

**Actuellement**: Liste élèves basique

**Proposé**:
```tsx
<Card>
  <CardHeader>
    <h3>Vue d'Ensemble - TNSI-1</h3>
  </CardHeader>
  <CardContent>
    <ClassOverview>
      {/* Statistiques globales */}
      <Stats>
        <Stat label="Moyenne classe" value="74%" trend="+3%" />
        <Stat label="Bilans complétés" value="22/24" />
        <Stat label="Élèves en difficulté" value="3" variant="warning" />
      </Stats>

      {/* Graphique distribution scores */}
      <BarChart
        title="Distribution des scores par domaine"
        data={classScoresByDomain}
      />

      {/* Alertes */}
      <Alerts>
        <Alert variant="warning">
          3 élèves n'ont pas complété le bilan de rentrée
        </Alert>
        <Alert variant="info">
          Score moyen Python en baisse (-5%) → Prévoir révision
        </Alert>
      </Alerts>
    </ClassOverview>
  </CardContent>
</Card>
```

#### 2. Tableau Élèves Amélioré

```tsx
<Table>
  <THead>
    <TR>
      <TH>Élève</TH>
      <TH>Dernier bilan</TH>
      <TH>Score global</TH>
      <TH>Évolution</TH>
      <TH>Points faibles</TH>
      <TH>Actions</TH>
    </TR>
  </THead>
  <tbody>
    {students.map(s => (
      <TR key={s.email}>
        <TD>
          {s.name}
          {s.needsAttention && <Badge variant="warning">⚠️</Badge>}
        </TD>
        <TD>{formatDate(s.lastBilanDate)}</TD>
        <TD>
          <ScoreBadge score={s.globalScore} />
        </TD>
        <TD>
          <TrendIndicator value={s.evolution} />
        </TD>
        <TD>
          <WeakPointsList points={s.weakPoints} />
        </TD>
        <TD>
          <Button onClick={() => openStudentDetail(s)}>
            Voir détail
          </Button>
        </TD>
      </TR>
    ))}
  </tbody>
</Table>
```

#### 3. Fiche Élève Détaillée

**Modal ou page dédiée**:
```tsx
<StudentDetailModal student={selectedStudent}>
  {/* Onglets */}
  <Tabs>
    <Tab label="Progression">
      <ProgressionTab>
        <TimelineChart bilans={student.bilans} />
        <ScoresEvolution scores={student.scoresHistory} />
      </ProgressionTab>
    </Tab>

    <Tab label="Bilans">
      <BilansTab>
        <BilansList bilans={student.bilans} />
      </BilansTab>
    </Tab>

    <Tab label="Feuille de route">
      <RoadmapTab>
        <StudentRoadmap roadmap={student.roadmap} />
        <TeacherNotes>
          {/* Enseignant peut ajouter des notes */}
          <Textarea placeholder="Notes personnelles..." />
        </TeacherNotes>
      </RoadmapTab>
    </Tab>

    <Tab label="Ressources">
      <ResourcesTab>
        <RecommendedResources student={student} />
        <AssignResource onAssign={assignToStudent} />
      </ResourcesTab>
    </Tab>
  </Tabs>
</StudentDetailModal>
```

#### 4. Gestion Ressources

```tsx
<Card>
  <CardHeader>
    <h3>Bibliothèque de Ressources</h3>
    <Button onClick={() => setShowUploadModal(true)}>
      + Ajouter une ressource
    </Button>
  </CardHeader>
  <CardContent>
    <ResourceLibrary>
      <Filters>
        <Select label="Type" options={['Cours', 'TP', 'Quiz', 'Projet']} />
        <Select label="Thème" options={themes} />
        <Select label="Difficulté" options={['Facile', 'Moyen', 'Difficile']} />
      </Filters>

      <ResourceGrid>
        {resources.map(r => (
          <ResourceCard
            key={r.id}
            resource={r}
            onAssign={(studentEmails) => assignResource(r.id, studentEmails)}
            onEdit={() => editResource(r)}
            onDelete={() => deleteResource(r.id)}
          />
        ))}
      </ResourceGrid>
    </ResourceLibrary>
  </CardContent>
</Card>
```

---

### C. GÉNÉRATION FEUILLES DE ROUTE IA

**Nouveau worker BullMQ**:
```javascript
// apps/worker/src/roadmap-generator.js

async function generateRoadmap(job) {
  const { studentEmail, bilanId } = job.data;

  // 1. Charger le bilan et les scores
  const bilan = await prisma.bilan.findUnique({
    where: { id: bilanId },
    include: { student: true }
  });

  const scores = JSON.parse(bilan.qcmScores);

  // 2. Identifier les points faibles (score < 70%)
  const weakPoints = Object.entries(scores)
    .filter(([_, score]) => score < 0.7)
    .map(([domain, score]) => ({ domain, score }));

  // 3. Rechercher ressources ciblées (RAG)
  const resources = await Promise.all(
    weakPoints.map(async ({ domain }) => {
      const query = `Ressources pour améliorer ${domain} en NSI Terminale`;
      return await semanticSearch(query, { limit: 3 });
    })
  );

  // 4. Générer feuille de route avec IA
  const roadmap = await callGPT4o({
    prompt: `
      Tu es un enseignant NSI expert. Génère une feuille de route personnalisée sur 4 semaines pour cet élève:

      Profil:
      - Nom: ${bilan.student.givenName} ${bilan.student.familyName}
      - Classe: ${bilan.student.classe}
      - Scores: ${JSON.stringify(scores)}
      - Points faibles: ${weakPoints.map(p => p.domain).join(', ')}

      Ressources disponibles:
      ${JSON.stringify(resources)}

      Génère un plan structuré:
      - Semaine 1: Objectif + 3 activités + ressources
      - Semaine 2: Objectif + 3 activités + ressources
      - Semaine 3: Objectif + 3 activités + ressources
      - Semaine 4: Objectif + 3 activités + ressources

      Format JSON:
      {
        "weeks": [
          {
            "number": 1,
            "objective": "...",
            "activities": ["...", "...", "..."],
            "resources": [{"title": "...", "url": "...", "type": "..."}]
          },
          ...
        ]
      }
    `,
    temperature: 0.7
  });

  // 5. Sauvegarder la feuille de route
  await prisma.studentProfileData.upsert({
    where: { studentEmail },
    update: {
      roadmap: roadmap,
      lastUpdatedAt: new Date()
    },
    create: {
      studentEmail,
      roadmap: roadmap,
      lastUpdatedAt: new Date()
    }
  });

  return { success: true, roadmap };
}
```

---

### D. SYSTÈME DE RESSOURCES

#### 1. Modèle de Données (déjà existant !)

Vous avez déjà les modèles `Resource`, `Exercise`, `Quiz` dans Prisma ! Il suffit de les utiliser.

#### 2. API Ressources

```typescript
// apps/web/src/app/api/resources/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'cours', 'tp', 'quiz'
  const theme = searchParams.get('theme');
  const difficulty = searchParams.get('difficulty');

  const resources = await prisma.resource.findMany({
    where: {
      ...(type && { type }),
      ...(theme && { currTheme: { code: theme } }),
      ...(difficulty && { difficulty })
    },
    include: {
      currTheme: true,
      notions: true,
      documents: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ ok: true, resources });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, type, themeId, difficulty, url } = body;

  const resource = await prisma.resource.create({
    data: {
      title,
      description,
      type,
      currThemeId: themeId,
      difficulty,
      url,
      status: 'PUBLISHED'
    }
  });

  return NextResponse.json({ ok: true, resource }, { status: 201 });
}
```

#### 3. Page Ressources Élève

```tsx
// apps/web/src/app/resources/page.tsx

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [filters, setFilters] = useState({ type: 'all', theme: 'all' });

  return (
    <Layout>
      <h1>Ressources NSI</h1>

      <Filters>
        <Select
          label="Type"
          value={filters.type}
          onChange={(v) => setFilters({ ...filters, type: v })}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'cours', label: 'Cours' },
            { value: 'tp', label: 'TP' },
            { value: 'quiz', label: 'Quiz' }
          ]}
        />
        <Select
          label="Thème"
          value={filters.theme}
          onChange={(v) => setFilters({ ...filters, theme: v })}
          options={themes}
        />
      </Filters>

      <ResourceGrid>
        {resources.map(r => (
          <ResourceCard
            key={r.id}
            title={r.title}
            description={r.description}
            type={r.type}
            difficulty={r.difficulty}
            theme={r.currTheme?.name}
            href={r.url}
          />
        ))}
      </ResourceGrid>
    </Layout>
  );
}
```

---

## 🎯 PLAN D'ACTION CONCRET

### Semaine 1 (20-24 Nov)
1. ✅ **Audit recentré** (FAIT)
2. **Enrichir dashboard élève**:
   - Timeline bilans
   - Graphique scores
   - Section "Prochaines étapes"
3. **Tests E2E**

### Semaine 2 (27 Nov - 01 Déc)
1. **Feuilles de route IA**:
   - Worker génération roadmap
   - API roadmap
   - UI affichage roadmap
2. **Tests intégration**

### Semaine 3 (04-08 Déc)
1. **Système ressources**:
   - API ressources (CRUD)
   - Page ressources élève
   - Bibliothèque enseignant
2. **Recommandations IA**

### Semaine 4 (11-15 Déc)
1. **Dashboard enseignant enrichi**:
   - Vue d'ensemble classe
   - Fiche élève détaillée
   - Gestion ressources
2. **Tests E2E complets**

---

## 📊 PRIORITÉS

### 🔥 Haute Priorité
1. **Feuilles de route personnalisées** (valeur ajoutée majeure)
2. **Ressources ciblées** (selon scores bilan)
3. **Dashboard élève enrichi** (engagement)

### ⚡ Moyenne Priorité
4. **Dashboard enseignant enrichi** (suivi classe)
5. **Visualisations scores** (graphiques)
6. **Timeline progression** (historique)

### 📌 Basse Priorité
7. Notifications (email/in-app)
8. Export données (CSV/Excel)
9. Rapports automatisés

---

## 💡 INNOVATIONS PÉDAGOGIQUES

### 1. Feuilles de Route Adaptatives
- Générées automatiquement après chaque bilan
- Adaptées aux points faibles identifiés
- Ressources ciblées et progressives
- Suivi hebdomadaire

### 2. Recommandations IA
- Basées sur les scores réels
- Priorisation automatique (points faibles d'abord)
- Estimation temps nécessaire
- Progression mesurable

### 3. Suivi Longitudinal
- Historique complet des bilans
- Évolution scores dans le temps
- Détection précoce décrochage
- Intervention ciblée enseignant

---

## 🎓 IMPACT ATTENDU

### Pour les Élèves
- ✅ **Clarté** : Savoir exactement quoi travailler
- ✅ **Motivation** : Voir sa progression
- ✅ **Autonomie** : Ressources accessibles 24/7
- ✅ **Réussite** : Accompagnement personnalisé

### Pour les Enseignants
- ✅ **Efficacité** : Vue d'ensemble rapide
- ✅ **Ciblage** : Identifier élèves en difficulté
- ✅ **Gain de temps** : Recommandations automatiques
- ✅ **Suivi fin** : Données objectives

---

## 📝 CONCLUSION

Votre plateforme a déjà **d'excellentes fondations**. Les améliorations proposées se concentrent sur:

1. **Enrichir les dashboards** (élève + enseignant)
2. **Générer des feuilles de route** personnalisées
3. **Recommander des ressources** ciblées
4. **Visualiser la progression** dans le temps

**Pas de DAO, pas de gouvernance** - juste une plateforme pédagogique **ultra-efficace** pour le suivi et l'accompagnement des élèves NSI !

---

**Créé le**: 20 Novembre 2025  
**Par**: Agent IA Antigravity  
**Pour**: Alaeddine BEN RHOUMA - Lycée Pierre Mendès France
