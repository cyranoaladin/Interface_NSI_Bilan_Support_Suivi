import { buildStudentSidebar, buildTeacherSidebar } from '../menu';

describe('menu builders', () => {
  test('student première: includes Mes bilans, Bilans évaluations, Questionnaire, Ressources Première, TP Algo', () => {
    const items = buildStudentSidebar({ role: 'STUDENT', classe: '1G1 Première' });
    const labels = items.map(i => i.label);
    expect(labels).toEqual([
      'Mes bilans',
      'Bilans évaluations',
      'Questionnaire',
      'Ressources NSI Première',
      'TP Algo Python',
    ]);
    const hrefs = items.map(i => i.href);
    expect(hrefs).toEqual([
      '/dashboard/student',
      '/bilans',
      '/bilan/initier',
      '/dashboard/student/ressources',
      '/tp-algo/index.html',
    ]);
  });

  test('student terminale: includes Mes bilans, Bilans évaluations, Questionnaire, Ressources Terminale only', () => {
    for (const c of ['TNSI', 'Terminale', 'terminale NSI']) {
      const items = buildStudentSidebar({ role: 'STUDENT', classe: c });
      const labels = items.map(i => i.label);
      expect(labels).toEqual([
        'Mes bilans',
        'Bilans évaluations',
        'Questionnaire',
        'Ressources Terminale',
      ]);
      const hrefs = items.map(i => i.href);
      expect(hrefs).toEqual([
        '/dashboard/student',
        '/bilans',
        '/bilan/initier',
        '/dashboard/student/ressources',
      ]);
    }
  });

  test('teacher resources: includes Bilans évaluations, Première, Terminale, TP Algo', () => {
    const { resources } = buildTeacherSidebar();
    const labels = resources.map(i => i.label);
    expect(labels).toEqual([
      'Bilans évaluations',
      'Ressources NSI Première',
      'Ressources Terminale',
      'TP Algo Python',
    ]);
    const hrefs = resources.map(i => i.href);
    expect(hrefs).toEqual([
      '/dashboard/teacher/bilans',
      '/dashboard/teacher/ressources',
      '/dashboard/teacher/ressources-terminale',
      '/tp-algo/index.html',
    ]);
  });
});
