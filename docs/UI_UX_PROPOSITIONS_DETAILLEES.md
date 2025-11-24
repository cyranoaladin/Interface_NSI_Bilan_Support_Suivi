# Propositions Détaillées UI/UX - NSI PMF
## Design System Moderne & Expérience Utilisateur Premium

---

## 🎨 1. DESIGN SYSTEM

### 1.1 Palette de Couleurs Premium

```css
/* apps/web/src/app/globals.css - NOUVEAU DESIGN SYSTEM */

:root {
  /* Couleurs primaires - Dégradés dynamiques */
  --electric-start: hsl(210, 100%, 56%);
  --electric-end: hsl(195, 100%, 50%);
  --electric-gradient: linear-gradient(135deg, var(--electric-start), var(--electric-end));
  
  /* Couleurs de succès/validation */
  --success-light: hsl(142, 71%, 45%);
  --success-dark: hsl(142, 71%, 35%);
  --success-gradient: linear-gradient(135deg, var(--success-light), var(--success-dark));
  
  /* Couleurs d'alerte/risque */
  --warning-light: hsl(38, 92%, 50%);
  --warning-dark: hsl(38, 92%, 40%);
  --danger-light: hsl(0, 84%, 60%);
  --danger-dark: hsl(0, 84%, 50%);
  
  /* Couleurs neutres - Mode sombre premium */
  --bg-primary: hsl(220, 13%, 9%);
  --bg-secondary: hsl(220, 13%, 12%);
  --bg-tertiary: hsl(220, 13%, 15%);
  --bg-elevated: hsl(220, 13%, 18%);
  
  --text-primary: hsl(0, 0%, 98%);
  --text-secondary: hsl(0, 0%, 70%);
  --text-tertiary: hsl(0, 0%, 50%);
  
  /* Glassmorphism */
  --glass-bg: hsla(220, 13%, 18%, 0.7);
  --glass-border: hsla(0, 0%, 100%, 0.1);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  --glass-backdrop: blur(12px);
  
  /* Ombres */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.16);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.24);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.32);
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Spacing (système 4px) */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem;  /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem;    /* 16px */
  --space-6: 1.5rem;  /* 24px */
  --space-8: 2rem;    /* 32px */
  --space-12: 3rem;   /* 48px */
  
  /* Typographie */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Poppins', var(--font-sans);
  --font-mono: 'Fira Code', 'Courier New', monospace;
  
  --text-xs: 0.75rem;   /* 12px */
  --text-sm: 0.875rem;  /* 14px */
  --text-base: 1rem;    /* 16px */
  --text-lg: 1.125rem;  /* 18px */
  --text-xl: 1.25rem;   /* 20px */
  --text-2xl: 1.5rem;   /* 24px */
  --text-3xl: 1.875rem; /* 30px */
  --text-4xl: 2.25rem;  /* 36px */
}

/* Animations micro-interactions */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Utilitaires globaux */
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-backdrop);
  -webkit-backdrop-filter: var(--glass-backdrop);
  border-radius: 1rem;
}

.gradient-text {
  background: var(--electric-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-border {
  position: relative;
  background-clip: padding-box;
  border: 2px solid transparent;
}

.gradient-border::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  margin: -2px;
  border-radius: inherit;
  background: var(--electric-gradient);
}
```

### 1.2 Composants Premium

#### ✅ Card Moderne avec Glassmorphism

```tsx
// apps/web/src/components/ui/PremiumCard.tsx

import React from 'react';

interface PremiumCardProps {
  variant?: 'default' | 'glass' | 'gradient';
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function PremiumCard({ 
  variant = 'default', 
  children, 
  className = '',
  hover = false 
}: PremiumCardProps) {
  const baseClasses = 'rounded-2xl p-6 transition-all duration-300';
  
  const variantClasses = {
    default: 'bg-[var(--bg-secondary)] border border-white/5 shadow-md',
    glass: 'glass-card',
    gradient: 'gradient-border bg-[var(--bg-secondary)]',
  };
  
  const hoverClasses = hover 
    ? 'hover:shadow-xl hover:-translate-y-1 hover:border-white/10 cursor-pointer' 
    : '';

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
}

// Exemple d'utilisation avec animation
export function AnimatedCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div 
      className="animate-slide-up"
      style={{ 
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
        animationDuration: '400ms'
      }}
    >
      <PremiumCard variant="glass" hover>
        {children}
      </PremiumCard>
    </div>
  );
}
```

#### ✅ Progress Bar Animée

```tsx
// apps/web/src/components/ui/ProgressBar.tsx

import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
  showPercentage?: boolean;
  animated?: boolean;
}

const colorGradients = {
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-amber-500',
  red: 'from-red-500 to-rose-500',
};

export function ProgressBar({ 
  value, 
  label, 
  color = 'blue', 
  showPercentage = true,
  animated = true 
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
          {showPercentage && (
            <span className="text-sm font-bold text-[var(--text-primary)]">{clampedValue}%</span>
          )}
        </div>
      )}
      
      <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
        <div
          className={`h-full bg-gradient-to-r ${colorGradients[color]} transition-all duration-700 ease-out relative`}
          style={{ width: `${clampedValue}%` }}
        >
          {animated && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{
                animation: 'shimmer 2s infinite',
                backgroundSize: '200% 100%'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Variante avec icône et badge
export function ProgressBarWithIcon({ 
  value, 
  label, 
  icon, 
  color = 'blue' 
}: ProgressBarProps & { icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex-1">
        <ProgressBar value={value} label={label} color={color} />
      </div>
      <div>
        {value >= 70 && <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Maîtrisé</span>}
        {value >= 50 && value < 70 && <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">En cours</span>}
        {value < 50 && <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">À renforcer</span>}
      </div>
    </div>
  );
}
```

#### ✅ Badge Débloquable (Gamification)

```tsx
// apps/web/src/components/ui/AchievementBadge.tsx

import React from 'react';
import { Award, Lock } from 'lucide-react';

interface AchievementBadgeProps {
  title: string;
  description?: string;
  iconUrl?: string;
  unlocked: boolean;
  unlockedAt?: Date;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

const rarityColors = {
  common: 'from-gray-500 to-gray-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-yellow-500 to-orange-500',
};

const rarityGlow = {
  common: 'shadow-gray-500/20',
  rare: 'shadow-blue-500/30',
  epic: 'shadow-purple-500/40',
  legendary: 'shadow-yellow-500/50',
};

export function AchievementBadge({ 
  title, 
  description, 
  iconUrl, 
  unlocked, 
  unlockedAt,
  rarity = 'common' 
}: AchievementBadgeProps) {
  return (
    <div 
      className={`relative group transition-all duration-300 ${
        unlocked ? 'hover:scale-105' : 'opacity-50 grayscale'
      }`}
    >
      <div className={`
        w-20 h-20 rounded-2xl p-1 
        bg-gradient-to-br ${rarityColors[rarity]}
        ${unlocked ? `shadow-lg ${rarityGlow[rarity]}` : 'shadow-md'}
        transition-all duration-300
      `}>
        <div className="w-full h-full rounded-xl bg-[var(--bg-primary)] flex items-center justify-center">
          {unlocked ? (
            iconUrl ? (
              <img src={iconUrl} alt={title} className="w-10 h-10" />
            ) : (
              <Award className="w-10 h-10 text-yellow-400" />
            )
          ) : (
            <Lock className="w-10 h-10 text-gray-600" />
          )}
        </div>
      </div>
      
      {/* Tooltip au hover */}
      <div className="
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
        opacity-0 group-hover:opacity-100 
        transition-opacity duration-200 pointer-events-none
        w-max max-w-xs
      ">
        <div className="glass-card px-3 py-2 text-center">
          <div className="text-sm font-bold text-[var(--text-primary)]">{title}</div>
          {description && (
            <div className="text-xs text-[var(--text-secondary)] mt-1">{description}</div>
          )}
          {unlocked && unlockedAt && (
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              Débloqué le {unlockedAt.toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
        <div className="w-2 h-2 bg-[var(--glass-bg)] rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}

// Grille de badges
export function AchievementGrid({ achievements }: { achievements: AchievementBadgeProps[] }) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
      {achievements.map((achievement, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <AchievementBadge {...achievement} />
          <span className="text-xs text-center text-[var(--text-tertiary)] max-w-[80px] truncate">
            {achievement.title}
          </span>
        </div>
      ))}
    </div>
  );
}
```

---

## 🧑‍🎓 2. DASHBOARD ÉLÈVE - "Mon Parcours NSI"

### 2.1 Vue Hebdomadaire

```tsx
// apps/web/src/components/student/WeeklyDashboard.tsx

import React from 'react';
import { Calendar, Target, TrendingUp, Award } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { ProgressBarWithIcon } from '@/components/ui/ProgressBar';
import { AchievementGrid } from '@/components/ui/AchievementBadge';

interface WeeklyDashboardProps {
  weekNumber: number;
  totalWeeks: number;
  objectives: Array<{
    id: string;
    title: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    estimatedMinutes: number;
    type: string;
  }>;
  domainProgress: Record<string, number>; // domain -> percentage
  achievements: any[];
  streak: number; // Jours consécutifs d'activité
}

export function WeeklyDashboard({
  weekNumber,
  totalWeeks,
  objectives,
  domainProgress,
  achievements,
  streak,
}: WeeklyDashboardProps) {
  const completedObjectives = objectives.filter((o) => o.status === 'DONE').length;
  const progressPercentage = (completedObjectives / objectives.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header avec progression générale */}
      <PremiumCard variant="glass">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--electric-start)]" />
              <h2 className="text-2xl font-display font-bold gradient-text">
                Semaine {weekNumber} / {totalWeeks}
              </h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Tu as complété {completedObjectives} / {objectives.length} objectifs cette semaine
            </p>
          </div>
          
          {/* Streak badge */}
          {streak > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="text-sm font-bold text-orange-400">{streak} jours</div>
                <div className="text-xs text-[var(--text-tertiary)]">Série en cours</div>
              </div>
            </div>
          )}
        </div>
        
        <ProgressBar value={progressPercentage} label="Progression de la semaine" animated />
      </PremiumCard>

      {/* Objectifs de la semaine */}
      <PremiumCard variant="default">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-[var(--electric-start)]" />
          <h3 className="text-xl font-bold">Mes objectifs cette semaine</h3>
        </div>
        
        <div className="space-y-3">
          {objectives.map((obj, i) => (
            <ObjectiveCard key={obj.id} objective={obj} delay={i * 100} />
          ))}
        </div>
      </PremiumCard>

      {/* Progression par domaine */}
      <PremiumCard variant="default">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[var(--electric-start)]" />
          <h3 className="text-xl font-bold">Ma progression par notion</h3>
        </div>
        
        <div className="space-y-4">
          {Object.entries(domainProgress).map(([domain, progress]) => (
            <ProgressBarWithIcon
              key={domain}
              value={progress}
              label={domain.charAt(0).toUpperCase() + domain.slice(1)}
              icon={getDomainIcon(domain)}
              color={getProgressColor(progress)}
            />
          ))}
        </div>
      </PremiumCard>

      {/* Badges débloqués */}
      {achievements.length > 0 && (
        <PremiumCard variant="gradient">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-yellow-400" />
            <h3 className="text-xl font-bold">Mes badges</h3>
          </div>
          
          <AchievementGrid achievements={achievements} />
        </PremiumCard>
      )}
    </div>
  );
}

// Carte d'objectif individuel
function ObjectiveCard({ objective, delay }: { objective: any; delay: number }) {
  const statusConfig = {
    TODO: { color: 'bg-gray-500/20 text-gray-400', icon: '⏳', text: 'À faire' },
    IN_PROGRESS: { color: 'bg-blue-500/20 text-blue-400', icon: '🚀', text: 'En cours' },
    DONE: { color: 'bg-green-500/20 text-green-400', icon: '✅', text: 'Terminé' },
  };

  const config = statusConfig[objective.status];

  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200 cursor-pointer animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <div className="font-medium text-[var(--text-primary)]">{objective.title}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {objective.type} • ~{objective.estimatedMinutes} min
          </div>
        </div>
      </div>
      
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
}

function getDomainIcon(domain: string) {
  const icons: Record<string, string> = {
    python: '🐍',
    structures: '📦',
    donnees: '📊',
    logique: '🧠',
    web: '🌐',
  };
  return <span className="text-xl">{icons[domain] || '📖'}</span>;
}

function getProgressColor(progress: number): 'blue' | 'green' | 'orange' | 'red' {
  if (progress >= 70) return 'green';
  if (progress >= 50) return 'blue';
  if (progress >= 30) return 'orange';
  return 'red';
}
```

### 2.2 Timeline Interactive

```tsx
// apps/web/src/components/student/JourneyTimeline.tsx

import React from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';

interface TimelineProps {
  currentWeek: number;
  weeks: Array<{
    number: number;
    theme: string;
    completed: boolean;
    locked: boolean;
  }>;
}

export function JourneyTimeline({ currentWeek, weeks }: TimelineProps) {
  return (
    <div className="relative">
      {/* Ligne verticale */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--electric-start)] via-[var(--electric-end)] to-transparent" />

      <div className="space-y-6">
        {weeks.map((week) => (
          <div
            key={week.number}
            className={`relative pl-16 transition-all duration-300 ${
              week.number === currentWeek ? 'scale-105' : week.locked ? 'opacity-40' : ''
            }`}
          >
            {/* Icône timeline */}
            <div className="absolute left-0 top-0">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  week.completed
                    ? 'bg-green-500 shadow-lg shadow-green-500/50'
                    : week.number === currentWeek
                    ? 'bg-gradient-to-br from-[var(--electric-start)] to-[var(--electric-end)] shadow-lg shadow-blue-500/50 animate-pulse-subtle'
                    : week.locked
                    ? 'bg-gray-700'
                    : 'bg-gray-600'
                }`}
              >
                {week.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : week.locked ? (
                  <Lock className="w-6 h-6 text-gray-400" />
                ) : (
                  <Circle className="w-6 h-6 text-white" />
                )}
              </div>
            </div>

            {/* Contenu */}
            <PremiumCard
              variant={week.number === currentWeek ? 'gradient' : 'default'}
              hover={!week.locked}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">Semaine {week.number}</div>
                  <div className="text-lg font-bold mt-1">{week.theme}</div>
                </div>
                {week.number === currentWeek && (
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                    En cours
                  </span>
                )}
              </div>
            </PremiumCard>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 👨‍🏫 3. DASHBOARD ENSEIGNANT - "Vue à 360°"

### 3.1 Heatmap de Classe

```tsx
// apps/web/src/components/teacher/ClassHeatmap.tsx

import React from 'react';
import { PremiumCard } from '@/components/ui/PremiumCard';

interface HeatmapProps {
  students: Array<{
    name: string;
    email: string;
  }>;
  notions: string[];
  data: Record<string, Record<string, number>>; // student email -> notion -> mastery (0-1)
}

export function ClassHeatmap({ students, notions, data }: HeatmapProps) {
  const getColor = (mastery: number) => {
    if (mastery >= 0.8) return 'bg-green-500';
    if (mastery >= 0.6) return 'bg-blue-500';
    if (mastery >= 0.4) return 'bg-orange-500';
    if (mastery >= 0.2) return 'bg-red-500';
    return 'bg-gray-700';
  };

  return (
    <PremiumCard variant="default">
      <h3 className="text-xl font-bold mb-4">Heatmap de maîtrise - Classe</h3>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header avec notions */}
          <div className="flex">
            <div className="w-40 flex-shrink-0" /> {/* Espace pour noms élèves */}
            {notions.map((notion) => (
              <div
                key={notion}
                className="w-20 flex-shrink-0 text-center"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {notion}
                </span>
              </div>
            ))}
          </div>

          {/* Lignes élèves */}
          {students.map((student, i) => (
            <div key={student.email} className="flex items-center hover:bg-white/5 transition-colors">
              <div className="w-40 flex-shrink-0 py-2 px-2 text-sm font-medium truncate" title={student.name}>
                {student.name}
              </div>
              {notions.map((notion) => {
                const mastery = data[student.email]?.[notion] ?? 0;
                return (
                  <div
                    key={notion}
                    className="w-20 flex-shrink-0 p-1"
                  >
                    <div
                      className={`h-8 rounded ${getColor(mastery)} transition-all duration-300 hover:scale-110 cursor-pointer relative group`}
                      title={`${student.name} - ${notion}: ${Math.round(mastery * 100)}%`}
                    >
                      {/* Tooltip au hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="glass-card px-2 py-1 text-xs whitespace-nowrap">
                          {Math.round(mastery * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mt-6 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-[var(--text-secondary)]">≥ 80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-[var(--text-secondary)]">60-79%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span className="text-[var(--text-secondary)]">40-59%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-[var(--text-secondary)]">\u003c 40%</span>
        </div>
      </div>
    </PremiumCard>
  );
}
```

### 3.2 Alertes Intelligentes

```tsx
// apps/web/src/components/teacher/AlertsPanel.tsx

import React from 'react';
import { AlertTriangle, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';

interface Alert {
  id: string;
  type: 'risk' | 'inactive' | 'regression' | 'success';
  student: {
    name: string;
    email: string;
  };
  message: string;
  metadata?: any;
  createdAt: Date;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
  onAction?: (alert: Alert) => void;
}

export function AlertsPanel({ alerts, onDismiss, onAction }: AlertsPanelProps) {
  const alertConfig = {
    risk: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
    inactive: {
      icon: Clock,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    },
    regression: {
      icon: TrendingDown,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    success: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
  };

  if (alerts.length === 0) {
    return (
      <PremiumCard variant="glass">
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">Aucune alerte pour le moment 🎉</p>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard variant="default">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-400" />
        Alertes & Notifications ({alerts.length})
      </h3>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border ${config.bgColor} ${config.borderColor} transition-all duration-300 hover:shadow-lg`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] mb-1">
                    {alert.student.name}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {alert.message}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-2">
                    {alert.createdAt.toLocaleDateString('fr-FR')} à {alert.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {onAction && (
                    <button
                      onClick={() => onAction(alert)}
                      className="px-3 py-1 text-xs rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                      Voir détails
                    </button>
                  )}
                  {onDismiss && (
                    <button
                      onClick={() => onDismiss(alert.id)}
                      className="px-3 py-1 text-xs rounded-lg bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
                    >
                      Ignorer
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}
```

---

## 📊 4. ANALYTICS & GRAPHIQUES

### 4.1 Graphique d'évolution

```tsx
// apps/web/src/components/charts/ProgressChart.tsx

import React from 'react';
import { PremiumCard } from '@/components/ui/PremiumCard';

interface DataPoint {
  date: string;
  value: number;
}

interface ProgressChartProps {
  title: string;
  data: DataPoint[];
  color?: string;
}

export function ProgressChart({ title, data, color = '#60a5fa' }: ProgressChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 100);
  const minValue = Math.min(...data.map((d) => d.value), 0);

  return (
    <PremiumCard variant="default">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      
      <div className="relative h-48">
        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          {/* Grille de fond */}
          <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <line x1="0" y1="150" x2="400" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

          {/* Gradient pour l'aire sous la courbe */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Aire sous la courbe */}
          <path
            d={generateAreaPath(data, maxValue, minValue)}
            fill="url(#areaGradient)"
          />

          {/* Ligne principale */}
          <path
            d={generateLinePath(data, maxValue, minValue)}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points de données */}
          {data.map((point, i) => {
            const x = (i / (data.length - 1)) * 400;
            const y = 200 - ((point.value - minValue) / (maxValue - minValue)) * 200;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill={color}
                className="transition-all hover:r-6 cursor-pointer"
              >
                <title>{point.date}: {point.value}%</title>
              </circle>
            );
          })}
        </svg>
      </div>

      {/* Dates en bas */}
      <div className="flex justify-between mt-2 text-xs text-[var(--text-secondary)]">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </PremiumCard>
  );
}

function generateLinePath(data: DataPoint[], max: number, min: number): string {
  return data
    .map((point, i) => {
      const x = (i / (data.length - 1)) * 400;
      const y = 200 - ((point.value - min) / (max - min)) * 200;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function generateAreaPath(data: DataPoint[], max: number, min: number): string {
  const linePath = generateLinePath(data, max, min);
  const lastX = ((data.length - 1) / (data.length - 1)) * 400;
  return `${linePath} L ${lastX} 200 L 0 200 Z`;
}
```

---

## 🎯 5. RESPONSIVE & MOBILE

Tous les composants sont responsive par défaut grâce à Tailwind CSS:

```tsx
// Exemple de layout responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards s'adaptent automatiquement */}
</div>

// Navigation mobile avec hamburger
<nav className="md:hidden">
  {/* Menu burger */}
</nav>
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION UI/UX

### Phase 1: Design System
- [ ] Créer palette de couleurs dans `globals.css`
- [ ] Implémenter composants de base (PremiumCard, ProgressBar, Badge)
- [ ] Ajouter animations CSS (@keyframes)
- [ ] Tester sur différents navigateurs

### Phase 2: Dashboard Élève
- [ ] WeeklyDashboard avec objectifs
- [ ] ProgressBar par notion
- [ ] AchievementGrid
- [ ] JourneyTimeline
- [ ] Tests E2E Playwright

### Phase 3: Dashboard Enseignant
- [ ] ClassHeatmap
- [ ] AlertsPanel
- [ ] ProgressChart (SVG)
- [ ] Export CSV
- [ ] Tests E2E Playwright

---

*Document créé le 2025-11-20 - UI/UX Premium pour NSI PMF*
