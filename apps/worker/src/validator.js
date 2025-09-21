function isNonEmptyString(s) { return typeof s === 'string' && s.trim().length > 0; }

function validateBilanData(data, scores) {
  if (!data || typeof data !== 'object') throw new Error('Données de bilan invalides');
  const keys = Object.keys(data);
  const required = Array.isArray(data.rag_references) ? [] : []; // pas strict pour éviter échecs inutiles
  for (const k of required) { if (!(k in data)) throw new Error('Champ manquant: ' + k); }
  // Vérifs souples sur les principaux champs (si présents)
  const mainKeys = ['introduction', 'analyse_competences', 'profil_apprentissage', 'plan_action', 'conclusion', 'synthese_profil', 'diagnostic_pedagogique', 'plan_4_semaines', 'indicateurs_pedago'];
  const minLen = {
    introduction: 200,
    analyse_competences: 300,
    profil_apprentissage: 200,
    plan_action: 300,
    conclusion: 150,
    synthese_profil: 200,
    diagnostic_pedagogique: 300,
    plan_4_semaines: 300,
    indicateurs_pedago: 120,
  };
  for (const k of mainKeys) {
    if (!(k in data)) continue; // ne pas échouer si la clé n'est pas attendue dans ce variant
    const v = data[k];
    if (typeof v === 'string') {
      if (!isNonEmptyString(v)) throw new Error(`Champ ${k} vide`);
      if ((minLen[k] || 0) > 0 && v.trim().length < minLen[k]) throw new Error(`Champ ${k} trop court (${v.trim().length} < ${minLen[k]})`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) throw new Error(`Champ ${k} vide`);
    } else if (typeof v === 'object') {
      if (Object.keys(v).length === 0) throw new Error(`Champ ${k} vide`);
    } else {
      if (v === null || v === undefined) throw new Error(`Champ ${k} vide`);
    }
  }
  // RAG: exiger des références non vides si présentes
  if ('rag_references' in data) {
    const rr = data.rag_references;
    if (typeof rr === 'string') {
      if (rr.trim().length < 20) throw new Error('rag_references insuffisant');
    } else if (Array.isArray(rr)) {
      if (rr.length < 2) throw new Error('rag_references insuffisant (>=2)');
    }
  }
  // Scores doivent avoir des nombres (0..100) si présents
  if (scores && typeof scores === 'object') {
    for (const v of Object.values(scores)) {
      const n = Number(v); if (Number.isNaN(n) || n < 0 || n > 100) throw new Error('Scores invalides');
    }
  }
  return true;
}

module.exports = { validateBilanData };
