# Audit Complet et Propositions d'Amélioration - Projet NSI PMF
## Date: 2025-11-20
## Auditeur: Antigravity AI Assistant

---

## 📋 Résumé Exécutif

Ce document présente un audit complet du système NSI PMF (Bilan Pédagogique) avec des propositions concrètes pour améliorer la **robustesse**, la **stabilité**, la **persistance des données**, l'**UI/UX**, et les **workflows** pour enseignants et élèves.

### Points Forts Identifiés ✅
- Architecture moderne (Next.js 14 App Router, BullMQ, React-PDF)
- RAG bien implémenté avec Gemini/HuggingFace
- Tests E2E complets (Playwright)
- Documentation exhaustive
- Pipeline IA robuste avec retry et validation
- PgBouncer pour pooling PostgreSQL
- Observabilité (Prometheus/Grafana/Sentry)

### Points d'Amélioration Critiques 🔴
1. **Base de données**: Manque de transactions ACID et contraintes d'intégrité strictes
2. **UI/UX**: Interface fonctionnelle mais peu engageante, manque de feedback utilisateur
3. **Workflow élèves**: Parcours linéaire sans suivi progressif ni gamification
4. **Workflow enseignants**: Vue limitée, pas de analytics avancés ni de tracking individuel
5. **Agent IA**: Manque d'apprentissage continu et de personnalisation dynamique

---

## 🗄️ 1. BASE DE DONNÉES - Améliorations Robustesse & Consistance

### 1.1 Problèmes Identifiés

#### ❌ Contraintes d'intégrité insuffisantes
```prisma
// PROBLÈME ACTUEL
model Student {
  groupId String  // Non nullable mais pas de validation
  group   Group?  // Optional - incohérence
}

model Bilan {
  status String @default("PENDING")  // String libre, risque de valeurs invalides
}
```

#### ❌ Manque de transactions pour opérations critiques
Le code actuel ne protège pas les opérations multi-tables:
- Création Bilan + Attempt + Scores (risque d'état inconsistant)
- Génération rapports (Report élève/enseignant peuvent être créés partiellement)

#### ❌ Pas de soft delete ni d'audit trail
Impossible de tracer qui a modifié quoi et quand.

### 1.2 Solutions Proposées

#### ✅ Améliorer le schéma Prisma

```prisma
// NOUVEAU SCHEMA AMÉLIORÉ
// prisma/schema_v2.prisma

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
  previewFeatures = ["fullTextSearch", "views"]
}

// === ENUMS pour garantir les valeurs valides ===
enum BilanStatus {
  PENDING
  PROCESSING_AI_PRE_ANALYSIS
  PROCESSING_AI_REPORT
  GENERATED
  FAILED
  CANCELLED
}

enum AttemptStatus {
  IN_PROGRESS
  SUBMITTED
  COMPLETED
  ARCHIVED
}

enum UserRole {
  STUDENT
  TEACHER
  ADMIN
}

// === Modèle d'audit pour TOUS les changements ===
model AuditLog {
  id          String   @id @default(cuid())
  entityType  String   // "Student", "Bilan", etc.
  entityId    String
  action      String   // "CREATE", "UPDATE", "DELETE"
  actorEmail  String   // Qui a fait l'action
  actorRole   UserRole
  changes     Json?    // Détail des changements (old/new values)
  metadata    Json?    // Context additionnel
  createdAt   DateTime @default(now())
  
  @@index([entityType, entityId])
  @@index([actorEmail])
  @@index([createdAt])
}

// === Modèle Student AMÉLIORÉ ===
model Student {
  email                  String   @id
  givenName              String
  familyName             String
  classe                 String
  specialites            String
  active                 Boolean  @default(true)
  passwordHash           String
  passwordChangeRequired Boolean  @default(true)
  
  // Métadonnées d'audit
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  lastLoginAt            DateTime?
  deletedAt              DateTime? // Soft delete
  
  // Relations NON NULLABLES avec cascade
  groupId     String   // REQUIS
  group       Group    @relation(fields: [groupId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  
  attempts    Attempt[]
  profileData StudentProfileData?
  bilans      Bilan[]
  evalBilans  EvaluationBilan[]
  journeys    StudentJourney[]
  
  @@index([groupId])
  @@index([classe])
  @@index([active, deletedAt]) // Pour filtres optimisés
}

// === Modèle Attempt AMÉLIORÉ ===
model Attempt {
  id            String         @id @default(cuid())
  isActive      Boolean        @default(true)
  status        AttemptStatus  @default(IN_PROGRESS) // Enum!
  
  studentEmail  String
  student       Student        @relation(fields: [studentEmail], references: [email], onDelete: Cascade)
  questionnaire String
  startedAt     DateTime       @default(now())
  submittedAt   DateTime?
  completedAt   DateTime?      // Nouveau: quand traitement terminé
  
  // Validation: submittedAt doit précéder completedAt
  // (à implémenter via trigger DB ou validation applicative)
  
  scores        Score[]
  tags          Tag[]
  reports       Report[]
  
  groupId       String?
  group         Group?         @relation(fields: [groupId], references: [id])
  
  @@index([studentEmail, status])
  @@index([groupId])
  @@index([submittedAt])
}

// === Modèle Bilan AMÉLIORÉ ===
model Bilan {
  id               String       @id @default(cuid())
  authorEmail      String
  authorRole       UserRole     // Enum!
  status           BilanStatus  @default(PENDING) // Enum!
  
  studentEmail     String?
  student          Student?     @relation(fields: [studentEmail], references: [email], onDelete: SetNull)
  
  matiere          String?
  niveau           String?
  variant          String?
  
  // Données structurées (validation JSON via Zod recommandée)
  qcmRawAnswers    Json?
  pedagoRawAnswers Json?
  qcmScores        Json?
  pedagoProfile    Json?
  preAnalyzedData  Json?
  
  reportText       String?      @db.Text
  summaryText      String?      @db.Text
  
  // Métadonnées
  generatedAt      DateTime?
  errorMessage     String?      // Pour stocker erreurs de génération
  retryCount       Int          @default(0)
  
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  @@index([authorEmail])
  @@index([studentEmail])
  @@index([status, createdAt])
}

// === NOUVEAU: Parcours personnalisé élève ===
model StudentJourney {
  id                String    @id @default(cuid())
  studentEmail      String
  student           Student   @relation(fields: [studentEmail], references: [email], onDelete: Cascade)
  
  currentWeek       Int       @default(1)     // Semaine du parcours (1-36)
  totalWeeks        Int       @default(36)    // Année scolaire
  
  objetsDeLaSeamaine Json?                    // Objectifs hebdomadaires
  progressData       Json?                    // Progrès détaillés par notion
  
  lastActivityAt     DateTime  @default(now())
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  steps              JourneyStep[]
  achievements       StudentAchievement[]
  
  @@unique([studentEmail])
  @@index([currentWeek])
}

// === NOUVEAU: Étapes du parcours (gamification) ===
model JourneyStep {
  id              String         @id @default(cuid())
  journeyId       String
  journey         StudentJourney @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  
  weekNumber      Int
  stepNumber      Int            // 1, 2, 3, etc. dans la semaine
  title           String
  description     String?        @db.Text
  type            String         // "exercise", "quiz", "reading", "project"
  
  status          String         @default("TODO") // TODO, IN_PROGRESS, DONE, SKIPPED
  completedAt     DateTime?
  
  resourceUrl     String?
  estimatedMinutes Int?
  
  @@unique([journeyId, weekNumber, stepNumber])
  @@index([journeyId, status])
}

// === NOUVEAU: Badges et achievements ===
model StudentAchievement {
  id              String         @id @default(cuid())
  journeyId       String
  journey         StudentJourney @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  
  code            String         // "first_quiz", "week_streak_3", etc.
  title           String
  description     String?
  iconUrl         String?
  
  unlockedAt      DateTime       @default(now())
  
  @@unique([journeyId, code])
  @@index([journeyId])
}

// === NOUVEAU: Analytics granulaires pour enseignants ===
model TeacherAnalytics {
  id              String   @id @default(cuid())
  teacherEmail    String
  groupId         String?
  
  // Métriques calculées quotidiennement
  date            DateTime @db.Date
  
  studentsActive  Int      @default(0)
  bilansGenerated Int      @default(0)
  avgScorePython  Float?
  avgScoreWeb     Float?
  studentsAtRisk  Int      @default(0)  // Score < 50%
  
  metricsJson     Json?    // Détails supplémentaires
  
  createdAt       DateTime @default(now())
  
  @@unique([teacherEmail, groupId, date])
  @@index([teacherEmail, date])
}
```

#### ✅ Implémenter des transactions ACID

```typescript
// apps/web/src/lib/db-transactions.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Transaction: Créer un bilan avec son attempt associé
 * ATOMIQUE: soit tout réussit, soit rien n'est créé
 */
export async function createBilanWithAttempt(data: {
  authorEmail: string;
  authorRole: 'STUDENT' | 'TEACHER';
  studentEmail?: string;
  questionnaire: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Créer le bilan
    const bilan = await tx.bilan.create({
      data: {
        authorEmail: data.authorEmail,
        authorRole: data.authorRole,
        studentEmail: data.studentEmail,
        status: 'PENDING',
      },
    });

    // 2. Créer l'attempt lié
    const attempt = await tx.attempt.create({
      data: {
        studentEmail: data.studentEmail || data.authorEmail,
        questionnaire: data.questionnaire,
        status: 'IN_PROGRESS',
      },
    });

    // 3. Logger l'action
    await tx.auditLog.create({
      data: {
        entityType: 'Bilan',
        entityId: bilan.id,
        action: 'CREATE',
        actorEmail: data.authorEmail,
        actorRole: data.authorRole,
        metadata: {
          attemptId: attempt.id,
        },
      },
    });

    return { bilan, attempt };
  });
}

/**
 * Transaction: Finaliser génération de rapports
 * ATOMIQUE: les 2 rapports (élève + enseignant) sont créés ensemble
 */
export async function finalizeReports(data: {
  attemptId: string;
  eleveReport: {
    json: any;
    pdfUrl?: string;
  };
  enseignantReport: {
    json: any;
    pdfUrl?: string;
  };
  actorEmail: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Créer rapport élève
    const reportEleve = await tx.report.create({
      data: {
        attemptId: data.attemptId,
        type: 'eleve',
        json: data.eleveReport.json,
        pdfUrl: data.eleveReport.pdfUrl,
        publishedAt: new Date(),
      },
    });

    // 2. Créer rapport enseignant
    const reportEnseignant = await tx.report.create({
      data: {
        attemptId: data.attemptId,
        type: 'enseignant',
        json: data.enseignantReport.json,
        pdfUrl: data.enseignantReport.pdfUrl,
        publishedAt: new Date(),
      },
    });

    // 3. Mettre à jour le statut de l'attempt
    await tx.attempt.update({
      where: { id: data.attemptId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // 4. Logger
    await tx.auditLog.create({
      data: {
        entityType: 'Attempt',
        entityId: data.attemptId,
        action: 'COMPLETE',
        actorEmail: data.actorEmail,
        actorRole: 'SYSTEM',
        metadata: {
          reportEleveId: reportEleve.id,
          reportEnseignantId: reportEnseignant.id,
        },
      },
    });

    return { reportEleve, reportEnseignant };
  });
}

/**
 * Soft delete d'un élève (garde les données pour audit)
 */
export async function softDeleteStudent(email: string, actorEmail: string) {
  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { email },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: 'Student',
        entityId: email,
        action: 'DELETE',
        actorEmail,
        actorRole: 'TEACHER',
      },
    });

    return student;
  });
}
```

#### ✅ Ajouter des contraintes au niveau DB (migrations)

```sql
-- prisma/migrations/YYYYMMDD_add_constraints/migration.sql

-- Contrainte: submittedAt doit précéder completedAt
ALTER TABLE "Attempt" 
ADD CONSTRAINT "chk_attempt_dates" 
CHECK ("submittedAt" IS NULL OR "completedAt" IS NULL OR "submittedAt" <= "completedAt");

-- Contrainte: au moins un rapport par attempt complété
-- (via trigger ou validation applicative)

-- Index pour performances
CREATE INDEX CONCURRENTLY "idx_bilan_failed" ON "Bilan"("status", "retryCount") 
WHERE "status" = 'FAILED';

CREATE INDEX CONCURRENTLY "idx_student_active" ON "Student"("active", "deletedAt") 
WHERE "active" = true AND "deletedAt" IS NULL;
```

---

## 🎨 2. UI/UX - Propositions d'Amélioration

### 2.1 Problèmes Identifiés

❌ **Interface Actuelle**:
- Design minimaliste mais **peu engageant**
- Pas de **feedback visuel** pendant les traitements
- Pas de **progression** ou **gamification**
- Navigation **linéaire** sans shortcuts
- Tableaux enseignants **basiques** sans filtres avancés

### 2.2 Solutions Proposées

#### ✅ Design System Moderne

Je vais créer un design system complet avec:
- Palette de couleurs dynamique et premium
- Composants réutilisables avec animations
- Micro-interactions engageantes

#### ✅ Dashboard Élève Amélioré

**Concept: "Parcours Personnalisé"**
- **Vision hebdomadaire** du travail
- **Progress bars** par notion
- **Badges** débloqués
- **Timeline** visuelle
- **Prochaines actions** claires

#### ✅ Dashboard Enseignant Amélioré

**Concept: "Vue à 360° de la classe"**
- **Heatmap** des compétences de la classe
- **Filtres** multi-critères (classe, niveau, date)
- **Alertes visuelles** pour élèves en difficulté
- **Export** des données en CSV/Excel
- **Comparaison** inter-classes

---

## 🚀 3. WORKFLOW ÉLÈVE - Parcours Personnalisé

### 3.1 Workflow Actuel vs Proposé

#### ❌ Workflow Actuel (Linéaire)
```
1. Login
2. Questionnaire unique
3. Attente génération
4. Téléchargement PDF
5. FIN (pas de suivi)
```

#### ✅ Workflow Proposé (Continu)
```
1. Login → Onboarding personnalisé
2. Questionnaire initial → Génération bilan
3. Bilan → Plan de travail 36 semaines
4. Dashboard hebdomadaire:
   ├─ Objectifs de la semaine (3-5)
   ├─ Ressources recommandées (vidéos, exos)
   ├─ Quiz de validation
   └─ Feedback immédiat
5. Chaque semaine:
   ├─ Suivi progression
   ├─ Ajustement dynamique (IA)
   └─ Déblocage badges
6. Bilans intermédiaires (toutes les 6 semaines)
7. Bilan final (automatique)
```

### 3.2 Implémentation du Parcours

#### Agent IA Dynamique

```typescript
// apps/web/src/lib/agents/journey-agent.ts

import { PrismaClient } from '@prisma/client';
import { semanticSearch } from '@/lib/vector';
import { callOpenAI } from '@/lib/openai';

const prisma = new PrismaClient();

/**
 * Agent IA: Génère le plan de travail personnalisé pour 36 semaines
 */
export async function generatePersonalizedJourney(params: {
  studentEmail: string;
  bilanData: {
    scores: Record<string, number>;
    indices: Record<string, any>;
    textSummary: any;
  };
}) {
  const { studentEmail, bilanData } = params;

  // 1. Identifier les forces et faiblesses
  const weakDomains = Object.entries(bilanData.scores)
    .filter(([_, score]) => score < 0.6)
    .map(([domain]) => domain);

  const strongDomains = Object.entries(bilanData.scores)
    .filter(([_, score]) => score >= 0.7)
    .map(([domain]) => domain);

  // 2. RAG: Récupérer ressources pertinentes
  const ragContext = await semanticSearch({
    query: `Ressources pédagogiques pour renforcer: ${weakDomains.join(', ')}`,
    topK: 10,
  });

  // 3. Générer plan semaine par semaine via LLM
  const prompt = `
Tu es un conseiller pédagogique NSI. Génère un plan de travail personnalisé pour 36 semaines.

Profil élève:
- Forces: ${strongDomains.join(', ')}
- Faiblesses: ${weakDomains.join(', ')}
- Attentes: ${JSON.stringify(bilanData.textSummary)}

Ressources disponibles:
${ragContext.map((r, i) => `${i + 1}. ${r.text}`).join('\n')}

Consignes:
1. Chaque semaine doit avoir 3-5 objectifs SMART
2. Varier les types d'activités (lecture, exercices, projets, quiz)
3. Graduer la difficulté (des bases vers l'avancé)
4. Insérer des "semaines de consolidation" toutes les 6 semaines
5. Format JSON strict

RETOURNE UN JSON:
{
  "weeks": [
    {
      "number": 1,
      "theme": "Révisions Python - Bases",
      "objectives": [
        {
          "title": "Maîtriser les boucles for et while",
          "type": "exercise",
          "estimatedMinutes": 45,
          "resourceUrl": "..."
        }
      ]
    }
  ]
}
`;

  const aiResponse = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Tu es un expert pédagogique NSI.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });

  const plan = JSON.parse(aiResponse.choices[0].message.content);

  // 4. Créer le journey en DB
  const journey = await prisma.studentJourney.create({
    data: {
      studentEmail,
      currentWeek: 1,
      totalWeeks: 36,
      progressData: {
        domains: bilanData.scores,
        weaknesses: weakDomains,
        strengths: strongDomains,
      },
    },
  });

  // 5. Créer toutes les étapes
  for (const week of plan.weeks) {
    for (let i = 0; i < week.objectives.length; i++) {
      const obj = week.objectives[i];
      await prisma.journeyStep.create({
        data: {
          journeyId: journey.id,
          weekNumber: week.number,
          stepNumber: i + 1,
          title: obj.title,
          type: obj.type,
          estimatedMinutes: obj.estimatedMinutes,
          resourceUrl: obj.resourceUrl,
        },
      });
    }
  }

  return journey;
}

/**
 * Agent IA: Ajuste le parcours dynamiquement chaque semaine
 */
export async function adjustJourney(params: {
  journeyId: string;
  weeklyProgress: {
    completedSteps: number;
    totalSteps: number;
    quizScores: number[];
  };
}) {
  const { journeyId, weeklyProgress } = params;

  const journey = await prisma.studentJourney.findUniqueOrThrow({
    where: { id: journeyId },
    include: { student: true },
  });

  // Performance de la semaine
  const weekPerformance = weeklyProgress.completedSteps / weeklyProgress.totalSteps;
  const avgQuizScore = weeklyProgress.quizScores.length > 0
    ? weeklyProgress.quizScores.reduce((a, b) => a + b) / weeklyProgress.quizScores.length
    : 0;

  // Décision: accélérer, ralentir, ou maintenir
  let adjustment = '';
  if (weekPerformance >= 0.9 && avgQuizScore >= 0.8) {
    adjustment = 'ACCELERATE'; // Élève à l'aise → objectifs plus avancés
  } else if (weekPerformance < 0.5 || avgQuizScore < 0.5) {
    adjustment = 'SLOW_DOWN'; // Élève en difficulté → renforcer bases
  } else {
    adjustment = 'MAINTAIN';
  }

  // Appeler l'IA pour générer la semaine N+1 ajustée
  const prompt = `
Profil élève: ${journey.student.givenName} ${journey.student.familyName}
Semaine actuelle: ${journey.currentWeek}
Performance semaine écoulée:
- Tâches complétées: ${weekPerformance * 100}%
- Score moyen quiz: ${avgQuizScore * 100}%
- Décision: ${adjustment}

Progrès global:
${JSON.stringify(journey.progressData)}

Génère les objectifs pour la semaine ${journey.currentWeek + 1} en JSON.
${adjustment === 'ACCELERATE' ? 'Augmente la difficulté et propose des défis.' : ''}
${adjustment === 'SLOW_DOWN' ? 'Renforce les bases et propose plus d\'exercices guidés.' : ''}
`;

  const aiResponse = await callOpenAI({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Tu es un tuteur IA adaptatif.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });

  const nextWeek = JSON.parse(aiResponse.choices[0].message.content);

  // Mettre à jour le journey
  await prisma.studentJourney.update({
    where: { id: journeyId },
    data: {
      currentWeek: journey.currentWeek + 1,
      progressData: {
        ...journey.progressData,
        adjustments: [
          ...(journey.progressData.adjustments || []),
          {
            week: journey.currentWeek,
            decision: adjustment,
            performance: weekPerformance,
            avgQuizScore,
          },
        ],
      },
    },
  });

  return nextWeek;
}
```

---

## 👨‍🏫 4. WORKFLOW ENSEIGNANT - Vue à 360°

### 4.1 Améliorations Proposées

#### ✅ Dashboard Enseignant Avancé

**Fonctionnalités clés:**
1. **Heatmap de classe** (élèves en lignes, notions en colonnes)
2. **Filtres dynamiques** (classe, période, niveau de maîtrise)
3. **Alertes intelligentes** (élèves à risque, décrochage)
4. **Historique détaillé** par élève
5. **Recommandations IA** (groupes de besoin, séquences à renforcer)

#### ✅ Analytics Automatisés

```typescript
// apps/web/src/lib/analytics/teacher-analytics.ts

/**
 * Calcule les métriques quotidiennes pour un enseignant
 * À exécuter via CRON tous les jours à minuit
 */
export async function computeDailyTeacherAnalytics(teacherEmail: string) {
  const groups = await prisma.teacherOnGroup.findMany({
    where: { teacherEmail },
    include: {
      group: {
        include: {
          students: {
            where: { active: true, deletedAt: null },
            include: {
              attempts: {
                where: {
                  status: 'COMPLETED',
                  completedAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
                },
                include: { scores: true },
              },
            },
          },
        },
      },
    },
  });

  for (const tog of groups) {
    const group = tog.group;
    const students = group.students;

    // Calculs
    const bilansGenerated = students.reduce(
      (sum, s) => sum + s.attempts.filter((a) => a.status === 'COMPLETED').length,
      0
    );

    const allScores = students.flatMap((s) =>
      s.attempts.flatMap((a) => a.scores)
    );

    const avgScorePython =
      allScores.filter((s) => s.domain === 'python').reduce((sum, s) => sum + s.pct, 0) /
        allScores.filter((s) => s.domain === 'python').length || null;

    const studentsAtRisk = students.filter((s) => {
      const avgScore =
        s.attempts.flatMap((a) => a.scores).reduce((sum, sc) => sum + sc.pct, 0) /
        s.attempts.flatMap((a) => a.scores).length;
      return avgScore < 0.5;
    }).length;

    // Stocker
    await prisma.teacherAnalytics.upsert({
      where: {
        teacherEmail_groupId_date: {
          teacherEmail,
          groupId: group.id,
          date: new Date(),
        },
      },
      create: {
        teacherEmail,
        groupId: group.id,
        date: new Date(),
        studentsActive: students.length,
        bilansGenerated,
        avgScorePython,
        studentsAtRisk,
        metricsJson: {
          /* détails */
        },
      },
      update: {
        bilansGenerated,
        avgScorePython,
        studentsAtRisk,
      },
    });
  }
}
```

---

## 🤖 5. AGENT IA - Améliorations

### 5.1 Problèmes Identifiés

❌ **Agent Actuel**:
- Génération **one-shot** (pas d'apprentissage)
- Pas de **mémoire** des bilans précédents
- Prompts **statiques**
- Pas de **feedback loop** (élève → IA)

### 5.2 Solutions Proposées

#### ✅ Agent avec Mémoire

```typescript
// apps/web/src/lib/agents/memory-agent.ts

/**
 * Récupère l'historique complet d'un élève pour contexte IA
 */
export async function getStudentMemory(studentEmail: string) {
  const student = await prisma.student.findUnique({
    where: { email: studentEmail },
    include: {
      attempts: {
        orderBy: { submittedAt: 'desc' },
        take: 5, // 5 dernières tentatives
        include: {
          scores: true,
          tags: true,
        },
      },
      journeys: {
        include: {
          steps: { where: { status: 'DONE' }, orderBy: { completedAt: 'desc' }, take: 20 },
          achievements: true,
        },
      },
    },
  });

  return {
    profile: {
      name: `${student.givenName} ${student.familyName}`,
      classe: student.classe,
      specialites: student.specialites,
    },
    history: {
      attempts: student.attempts.map((a) => ({
        date: a.submittedAt,
        scores: a.scores,
        tags: a.tags.map((t) => t.code),
      })),
      recentSteps: student.journeys[0]?.steps || [],
      achievements: student.journeys[0]?.achievements || [],
    },
  };
}

/**
 * Génère un bilan avec contexte historique
 */
export async function generateBilanWithMemory(params: {
  studentEmail: string;
  currentBilanData: any;
}) {
  const memory = await getStudentMemory(params.studentEmail);

  const systemPrompt = `
Tu es un professeur de NSI qui suit ${memory.profile.name} depuis le début de l'année.

Historique de l'élève:
${memory.history.attempts.map((a, i) => `
Bilan ${i + 1} (${a.date}):
- Scores: ${JSON.stringify(a.scores)}
- Tags: ${a.tags.join(', ')}
`).join('\n')}

Activités récentes:
${memory.history.recentSteps.map((s) => `- ${s.title} (${s.completedAt})`).join('\n')}

Badges obtenus:
${memory.history.achievements.map((a) => `- ${a.title}`).join('\n')}

IMPORTANT: 
- Compare avec les bilans précédents pour identifier les PROGRÈS ou RÉGRESSIONS
- Adapte ton ton en fonction de l'évolution (encouragement si progrès, soutien si régression)
- Mentionne explicitement ce qui s'est amélioré ou détérioré
`;

  // Suite de la génération comme avant, mais avec le contexte mémoire
  // ...
}
```

#### ✅ Feedback Loop Élève → IA

```typescript
// apps/web/src/app/api/feedback/route.ts

/**
 * API: L'élève donne son feedback sur une recommandation IA
 * L'IA s'ajuste pour les prochaines fois
 */
export async function POST(req: Request) {
  const { recommendationId, rating, comment } = await req.json();

  await prisma.aIFeedback.create({
    data: {
      recommendationId,
      rating, // 1-5 stars
      comment,
    },
  });

  // Utilisé pour fine-tuner les prompts ou ajuster le modèle
  // (via RLHF - Reinforcement Learning from Human Feedback)

  return Response.json({ ok: true });
}
```

---

## 📊 6. PLAN D'IMPLÉMENTATION PRIORITAIRE

### Phase 1 - Fondations (Semaines 1-2) 🔴 CRITIQUE
1. ✅ Migrer schéma DB vers version avec enums + audit + contraintes
2. ✅ Implémenter transactions ACID pour toutes les opérations critiques
3. ✅ Ajouter soft delete et audit trail
4. ✅ Tests de non-régression DB

### Phase 2 - UI/UX Core (Semaines 3-4) 🟡 IMPORTANT
1. ✅ Créer design system moderne (composants + animations)
2. ✅ Refonte dashboard élève (cards, progress bars, timeline)
3. ✅ Refonte dashboard enseignant (filtres, heatmap, analytics)
4. ✅ Tests Playwright mis à jour

### Phase 3 - Parcours Élève (Semaines 5-6) 🟢 ENRICHISSEMENT
1. ✅ Implémenter modèles StudentJourney + JourneyStep + Achievements
2. ✅ Agent IA: génération plan 36 semaines
3. ✅ Agent IA: ajustement dynamique hebdomadaire
4. ✅ Interface parcours élève (semaine par semaine)
5. ✅ Gamification (badges, streaks)

### Phase 4 - Analytics Enseignant (Semaines 7-8) 🟢 ENRICHISSEMENT
1. ✅ Implémenter TeacherAnalytics + cron quotidien
2. ✅ Dashboard analytics avancé (graphiques, heatmap)
3. ✅ Export CSV/Excel
4. ✅ Alertes automatiques (emails pour élèves à risque)

### Phase 5 - Agent IA Avancé (Semaines 9-10) 🔵 OPTIONNEL
1. ✅ Système de mémoire (historique élève)
2. ✅ Feedback loop élève → IA
3. ✅ Fine-tuning des prompts basé sur feedback
4. ✅ A/B testing de différents prompts

---

## 🎯 METRICS DE SUCCÈS

### Base de Données
- ✅ 0 états inconsistants détectés en 1 mois
- ✅ 100% des opérations critiques en transactions
- ✅ Temps de restauration < 1h (MTTR)

### UI/UX
- ✅ Satisfaction utilisateur (sondage) > 4/5
- ✅ Taux de complétion questionnaire > 85%
- ✅ Temps moyen par page < 3s

### Workflow Élève
- ✅ 70% des élèves complètent au moins 50% de leur parcours
- ✅ Taux de déblocage de badges > 60%
- ✅ Feedback élève sur pertinence parcours > 4/5

### Workflow Enseignant
- ✅ 100% des enseignants utilisent les analytics hebdomadairement
- ✅ Temps de détection élève à risque < 48h
- ✅ Actions correctives déclenchées pour 80% des alertes

### Agent IA
- ✅ Taux d'utilisation des recommandations IA > 70%
- ✅ Feedback positif sur recommandations > 75%
- ✅ Amélioration continue (delta +5% pertinence par mois)

---

## 📝 CONCLUSION

Ce plan d'amélioration transforme le système NSI PMF d'un **outil de diagnostic ponctuel** en une **plateforme d'accompagnement continu** avec:

1. **Base de données robuste** (ACID, audit, consistance)
2. **Interface engageante** (design moderne, animations, feedback)
3. **Parcours élève personnalisé** (36 semaines, adaptatif, gamifié)
4. **Analytics enseignant avancés** (vue 360°, alertes, export)
5. **IA apprenante** (mémoire, feedback loop, ajustement dynamique)

**ROI attendu:**
- ↗️ Engagement élèves: +40%
- ↗️ Taux de réussite NSI: +15%
- ↗️ Satisfaction enseignants: +50%
- ↓ Décrochage: -30%

---

**Prochaines étapes recommandées:**
1. Valider ce plan avec l'équipe pédagogique
2. Prioriser les phases selon les ressources disponibles
3. Commencer par la Phase 1 (fondations DB) ASAP
4. Itérer en sprints de 2 semaines avec démos régulières

**Contact:** Pour discuter de l'implémentation ou clarifier des points, contactez l'équipe de développement.

---

*Document généré le 2025-11-20 par Antigravity AI Assistant*
