const path = require('path');
const fs = require('fs');
const React = require('react');

(async () => {
  try {
    const { renderToFile } = require('@react-pdf/renderer');
    // Purge cache pour charger la dernière version
    try { delete require.cache[require.resolve('./pdf-components')]; } catch {}
    try { delete require.cache[require.resolve('./EleveBilan.js')]; } catch {}
    const EleveBilanPDF = require('./EleveBilan.js');

    const outDir = '/app/docs/audit_pdfs/dev';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, 'dev_eleve_test.pdf');

    const student = { family_name: 'Test', given_name: 'Élève' };
    const context = { csv_classe: 'T00' };
    const scores = { python_pct: 100, structures_pct: 100, donnees_pct: 100, logique_pct: 100, web_pct: 100, lecture_algo_pct: 100 };
    const analysis = {
      profil_apprentissage: 'Texte profil pour test des espacements et titres.',
      plan_action: 'Semaine 1: Objectif : Démo.\nActivités :\n- 1) Faire X\n- 2) Faire Y\nRessources :\n- [e-NSI](https://e-nsi.gitlab.io/pratique/)\n- https://www.youtube.com/watch?v=dQw4w9WgXcQ\n\nSemaine 2: Objectif : Démo 2.\nActivités :\n- 1) Faire A\nRessources :\n- https://example.com',
      methodes_conseils: '1. Conseil A\n2. Conseil B',
      conclusion: 'Conclusion de test.'
    };
    const generatedAt = new Date().toLocaleDateString('fr-FR');

    const comp = React.createElement(EleveBilanPDF, { student, context, scores, analysis, logoSrc: null, generatedAt });
    await renderToFile(comp, out);
    console.log('OK dev render:', out);
    process.exit(0);
  } catch (e) {
    console.error('DEV_RENDER_ERR', e && (e.stack || e.message || e));
    process.exit(1);
  }
})();
