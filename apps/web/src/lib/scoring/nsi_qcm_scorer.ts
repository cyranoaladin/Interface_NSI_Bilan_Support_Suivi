import { QcmData } from '../bilan_data';

export type ResultsQCM = {
  totalPoints: number;
  totalMax: number;
  global_mastery_percent: number;
  by_domain: Record<string, { points: number; max: number; percent: number; feedback?: string; }>;
  critical_lacunes: string[];
};

export function scoreQCM(qcm: QcmData, answers: Record<string, any>): ResultsQCM {
  const by_domain: ResultsQCM['by_domain'] = {};
  let totalPoints = 0; let totalMax = 0;

  for (const item of qcm.items) {
    const weight = item.weight ?? 1;
    const domain = item.domain || 'general';
    if (!by_domain[domain]) by_domain[domain] = { points: 0, max: 0, percent: 0 };
    by_domain[domain].max += weight;
    totalMax += weight;

    const a = answers[item.id];
    if (a == null) continue;
    if (item.type === 'mcq') {
      const correctK = (item.choices || []).find(c => c.correct)?.k;
      if (a === correctK) { by_domain[domain].points += weight; totalPoints += weight; }
    } else if (item.type === 'msq') {
      const correctSet = new Set((item.choices || []).filter(c => c.correct).map(c => c.k));
      const given = new Set(Array.isArray(a) ? a : a ? [a] : []);
      const ok = correctSet.size === given.size && [...correctSet].every(k => given.has(k));
      if (ok) { by_domain[domain].points += weight; totalPoints += weight; }
    } else if (item.type === 'short') {
      const expected = (item.answer || '').trim();
      const given = String(a || '').trim();
      if (expected && given && normalize(expected) === normalize(given)) { by_domain[domain].points += weight; totalPoints += weight; }
    }
  }

  for (const d of Object.keys(by_domain)) {
    const s = by_domain[d];
    s.percent = s.max > 0 ? Math.round((s.points / s.max) * 100) : 0;
  }

  const global_mastery_percent = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;

  const critical_lacunes = Object.entries(by_domain)
    .filter(([_, v]) => v.percent < 50)
    .map(([k]) => k);

  return { totalPoints, totalMax, global_mastery_percent, by_domain, critical_lacunes };
}

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}
