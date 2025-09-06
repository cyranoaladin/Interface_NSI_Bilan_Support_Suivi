export type PedagoScores = Record<string, number>;
export type PedagoProfile = Record<string, any>;

export function scorePedagoNSI(survey: any, answers: Record<string, any>): PedagoScores {
  // Placeholder générique: moyenne normalisée des Likert (1..5 -> 0..1) par section si disponible
  const scores: PedagoScores = {};
  const sections: any[] = survey?.sections || [];
  for (const sec of sections) {
    const id = sec.id || sec.title || 'section';
    const qs: any[] = sec.questions || [];
    const vals: number[] = [];
    for (const q of qs) {
      const v = answers[q.id];
      if (typeof v === 'number') {
        const norm = (v - 1) / 4; // map 1..5 -> 0..1
        if (!isNaN(norm)) vals.push(Math.max(0, Math.min(1, norm)));
      }
    }
    if (vals.length) scores[id] = Number((vals.reduce((a, c) => a + c, 0) / vals.length).toFixed(3));
  }
  return scores;
}

export function deriveProfileNSI(pedagoScores: PedagoScores, pedagoRawAnswers: Record<string, any>): PedagoProfile {
  // Placeholder: dérive quelques indices simples
  const p: PedagoProfile = {};
  const mot = pedagoScores['Motivation'] ?? avg(Object.values(pedagoScores));
  const org = pedagoScores['Organisation'] ?? avg(Object.values(pedagoScores));
  const stress = 1 - (pedagoScores['Stress'] ?? 0.5);
  p['IDX_MOTIVATION'] = round5(mot * 5);
  p['IDX_ORGANISATION'] = round5(org * 5);
  p['IDX_STRESS'] = round5(stress * 5);
  return p;
}

function avg(arr: number[]) { return arr.length ? arr.reduce((a, c) => a + c, 0) / arr.length : 0.5; }
function round5(x: number) { return Math.round(x * 10) / 10; }
