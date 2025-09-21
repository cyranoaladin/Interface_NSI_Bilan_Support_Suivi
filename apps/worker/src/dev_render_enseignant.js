const path = require('path');
const fs = require('fs');
const React = require('react');

(async () => {
  try {
    const { renderToFile } = require('@react-pdf/renderer');
    // Purge cache pour charger la dernière version
    try { delete require.cache[require.resolve('./pdf-components')]; } catch {}
    try { delete require.cache[require.resolve('./EnseignantBilan.js')]; } catch {}
    const EnseignantBilanPDF = require('./EnseignantBilan.js');

    const outDir = '/app/docs/audit_pdfs/dev';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, 'dev_enseignant_test.pdf');

    const student = { family_name: 'Test', given_name: 'Élève' };
    const context = { csv_classe: 'T00' };
    const scores = { python_pct: 30, structures_pct: 45, donnees_pct: 80, logique_pct: 40, web_pct: 55, lecture_algo_pct: 35 };
    const analysis = {
      synthese_profil: 'Synthèse courte pour test.',
      diagnostic_pedagogique: '- Axe: Bases Python\n- Axe: Lecture d’algorithmes',
      plan_4_semaines: 'Semaine 1: Objectif : Ciblage.\nActivités :\n- 1) Faire X\n- 2) Faire Y\nRessources :\n- [e-NSI](https://e-nsi.gitlab.io/pratique/)\n- https://example.com\n\nSemaine 2: Objectif : Ciblage 2.\nActivités :\n- 1) Faire A\nRessources :\n- https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      indicateurs_pedago: '1. Indicateur A\n2. Indicateur B',
      pistes_pedagogiques: 'Piste 1.\nPiste 2.'
    };
    const generatedAt = new Date().toLocaleDateString('fr-FR');

    const comp = React.createElement(EnseignantBilanPDF, { student, context, scores, analysis, logoSrc: null, generatedAt });
    await renderToFile(comp, out);
    console.log('OK dev enseignant render:', out);
    process.exit(0);
  } catch (e) {
    console.error('DEV_ENSEIGNANT_RENDER_ERR', e && (e.stack || e.message || e));
    process.exit(1);
  }
})();
