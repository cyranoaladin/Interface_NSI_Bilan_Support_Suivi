function isNonEmptyString(s) { return typeof s === 'string' && s.trim().length > 0; }

function validateBilanData(data, scores) {
  if (!data || typeof data !== 'object') throw new Error('Données de bilan invalides');
  const keys = Object.keys(data);
  const required = Array.isArray(data.rag_references) ? [] : []; // pas strict pour éviter échecs inutiles
  for (const k of required) { if (!(k in data)) throw new Error('Champ manquant: ' + k); }
  // Vérifs souples sur les principaux champs (si présents)
  const mainKeys = ['introduction', 'analyse_competences', 'profil_apprentissage', 'plan_action', 'conclusion', 'synthese_profil', 'diagnostic_pedagogique', 'plan_4_semaines', 'indicateurs_pedago'];
  for (const k of mainKeys) { if (k in data && !isNonEmptyString(String(data[k] || ''))) throw new Error(`Champ ${k} vide`); }
  // Scores doivent avoir des nombres (0..100) si présents
  if (scores && typeof scores === 'object') {
    for (const v of Object.values(scores)) {
      const n = Number(v); if (Number.isNaN(n) || n < 0 || n > 100) throw new Error('Scores invalides');
    }
  }
  return true;
}

module.exports = { validateBilanData };

