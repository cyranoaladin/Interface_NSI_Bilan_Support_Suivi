'use client';

import type { NavItem } from '@/components/ui/SidebarNav';

export type UserRole = 'TEACHER' | 'STUDENT';

export type ProfileContext = {
  role: UserRole;
  classe?: string | null;
};

function isTerminale(classeRaw: string | null | undefined): boolean {
  const c = String(classeRaw || '').toLowerCase();
  return /(\bterm\b|\bterminal\b|\bterminale\b|\btnsi\b)/i.test(c);
}

export function buildStudentSidebar(ctx: ProfileContext): NavItem[] {
  const items: NavItem[] = [];
  const terminale = isTerminale(ctx.classe);
  // Bilans toujours visibles côté élève
  items.push({ href: '/dashboard/student', label: 'Mes bilans' });
  // Bilans évaluations
  items.push({ href: '/bilans', label: 'Bilans évaluations' });
  // Accès direct au questionnaire
  items.push({ href: '/bilan/initier', label: 'Questionnaire' });
  // Cours BDD NSI
  items.push({ href: '/bdd-nsi', label: 'Cours: Bases de données' });
  // Ressources selon niveau
  if (terminale) {
    items.push({ href: '/dashboard/student/ressources', label: 'Ressources Terminale' });
  } else {
    items.push({ href: '/dashboard/student/ressources', label: 'Ressources NSI Première' });
    // Lien TP algo uniquement pour Première
    items.push({ href: '/tp-algo/index.html', label: 'TP Algo Python' });
  }
  return items;
}

export function buildTeacherSidebar(): { groupsLabel: string; resources: NavItem[]; } {
  return {
    groupsLabel: 'Mes groupes',
    resources: [
      { href: '/dashboard/teacher/bilans', label: 'Bilans évaluations' },
      { href: '/bdd-nsi', label: 'Cours: Bases de données' },
      { href: '/dashboard/teacher/ressources', label: 'Ressources NSI Première' },
      { href: '/dashboard/teacher/ressources-terminale', label: 'Ressources Terminale' },
      { href: '/tp-algo/index.html', label: 'TP Algo Python' },
      { href: '/mentions-legales', label: 'Mentions légales' },
    ],
  };
}

export function buildSidebar(ctx: ProfileContext): NavItem[] {
  if (ctx.role === 'TEACHER') {
    // Les enseignants consomment actuellement une section dédiée dans la page (groupes + ressources)
    // Cette fonction reste pour homogénéité si un jour on factorise complètement.
    return buildTeacherSidebar().resources;
  }
  return buildStudentSidebar(ctx);
}
