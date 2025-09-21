const React = require('react');
const { Document, Page, View, Text } = require('@react-pdf/renderer');
const { styles, Header, Footer, ScoreTable, MarkdownRenderer } = require('./pdf-components');

// --- Helpers (aligned with Enseignant version) ---
function splitWeeks(text) {
  const content = String(text || '');
  const weeks = [];
  for (let i = 1; i <= 4; i++) {
    const label = new RegExp(`Semaine\\s*${i}\\s*[:\\-–]?`, 'i');
    const nextLabel = new RegExp(`Semaine\\s*${i + 1}\\s*[:\\-–]?`, 'i');
    const start = content.search(label);
    if (start === -1) continue;
    const rest = content.slice(start);
    const endRel = rest.search(nextLabel);
    const segment = endRel === -1 ? rest : rest.slice(0, endRel);
    weeks.push({ i, text: segment.replace(label, '').trim() });
  }
  return weeks;
}
function extractOAR(block) {
  const lines = String(block || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let objectif = '';
  const activites = [];
  const ressources = [];
  const objRe = /^Objectif\s*[:：]\s*/i;
  const actRe = /^Activit[é|e]s?\s*[:：]\s*/i;
  const resRe = /^Ressources?\s*[:：]\s*/i;

  for (const l of lines) {
    if (objRe.test(l)) { objectif = l.replace(objRe, '').trim(); continue; }
    if (actRe.test(l)) {
      const cleaned = l
        .replace(actRe, '')
        .trim()
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+[\.)]\s+/, '');
      activites.push(cleaned);
      continue;
    }
    if (resRe.test(l)) {
      const cleaned = l
        .replace(resRe, '')
        .trim()
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+[\.)]\s+/, '');
      ressources.push(cleaned);
      continue;
    }

    if (/^[-*•]\s+/.test(l)) {
      const stripped = l
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+[\.)]\s+/, '');
      if (/https?:\/\//i.test(stripped)) ressources.push(stripped);
      else activites.push(stripped);
      continue;
    }

    if (!objectif) objectif = l; // fallback: première phrase comme objectif
  }
  return { objectif, activites, ressources };
}

function renderStudentIntro(student) {
  const name = `${student.given_name || ''}`.trim();

  const p1 = `Ce bilan a pour objectif de t’accompagner dans ta progression en NSI. Il te permet d’identifier clairement tes points forts, de repérer les compétences à renforcer et de suivre une trajectoire structurée vers la réussite.`;

  const p2 = `Le document que tu tiens entre tes mains comprend :`;

  const listItems = [
    `Un état des lieux précis de tes compétences, présenté dans un tableau de scores, pour savoir où tu en es dans chaque domaine du programme.`,
    `Un profil d’apprentissage personnalisé, qui met en valeur tes acquis et indique les axes de progression prioritaires.`,
    `Une feuille de route de 4 semaines, avec des objectifs concrets, des activités guidées et des ressources sélectionnées pour progresser étape par étape.`,
    `Des méthodes et conseils pratiques, pour apprendre efficacement et consolider durablement tes acquis.`,
  ];

  const p3 = `Nos conseils : avance avec régularité et curiosité. Chaque activité est conçue pour t’apporter une petite victoire qui, cumulée aux autres, construira ta réussite. Garde confiance : avec constance et méthode, tu peux atteindre tes objectifs et réussir pleinement en NSI.`;

  return React.createElement(View, null,
    React.createElement(Text, { style: styles.p }, p1),
    React.createElement(Text, { style: styles.p }, p2),
    ...listItems.map((item, idx) =>
      React.createElement(Text, { key: idx, style: [styles.p, styles.listItem] }, `• ${item}`)
    ),
    React.createElement(Text, { style: styles.p }, p3),
  );
}

function renderCompetences(scoreRows, scores) {
  return React.createElement(View, null,
    React.createElement(Text, { style: styles.p },
      `Le tableau ci-dessous présente tes compétences par domaine. Commence par consolider les chapitres où tes scores sont les plus bas, puis élargis progressivement ton travail aux autres notions. Des exercices courts, réguliers et bien ciblés sont la meilleure stratégie pour progresser durablement.`
    ),
    React.createElement(Text, { style: styles.p }, ' '),
    React.createElement(ScoreTable, { rows: scoreRows })
  );
}

function strengthsFromScores(s) {
  const m = [];
  if ((s.python_pct || 0) >= 60) m.push('Bases Python');
  if ((s.structures_pct || 0) >= 60) m.push('Structures de données');
  if ((s.donnees_pct || 0) >= 60) m.push('Manipulation de données');
  if ((s.logique_pct || 0) >= 60) m.push('Logique / encodage');
  if ((s.web_pct || 0) >= 60) m.push('Web / HTTP');
  if ((s.lecture_algo_pct || 0) >= 60) m.push('Lecture d’algorithmes');
  return m;
}
function lowsFromScores(s) {
  const m = [];
  if ((s.python_pct || 0) < 50) m.push('Bases Python');
  if ((s.structures_pct || 0) < 50) m.push('Structures de données');
  if ((s.donnees_pct || 0) < 50) m.push('Manipulation de données');
  if ((s.logique_pct || 0) < 50) m.push('Logique / encodage');
  if ((s.web_pct || 0) < 50) m.push('Web / HTTP');
  if ((s.lecture_algo_pct || 0) < 50) m.push('Lecture d’algorithmes');
  return m;
}

function renderProfile(analysisText, scores) {
  const strong = strengthsFromScores(scores);
  const weak = lowsFromScores(scores);
  return React.createElement(View, null,
    React.createElement(Text, { style: styles.subtitle }, 'Tes points forts'),
    (strong.length ? strong : ['Organisation du travail', 'Motivation en progression']).map((t, i) =>
      React.createElement(Text, { key: 'pf-' + i, style: styles.listItem }, `• ${t}`)
    ),
    React.createElement(Text, { style: styles.subtitle }, 'Axes de vigilance'),
    (weak.length ? weak : ['Réactivation des bases', 'Lecture d’algorithmes pas à pas']).map((t, i) =>
      React.createElement(Text, { key: 'ax-' + i, style: styles.listItem }, `• ${t}`)
    ),
    analysisText && analysisText.trim()
      ? React.createElement(View, null,
        React.createElement(Text, { style: styles.p }, ' '),
        React.createElement(MarkdownRenderer, { text: analysisText, perfOptimized: true })
      )
      : null
  );
}

function renderWeekUniform(week) {
  const { objectif, activites, ressources } = extractOAR(week.text);
  const items = [];
  items.push(React.createElement(Text, { key: `wk-${week.i}-title`, style: styles.subtitle }, `Semaine ${week.i}`));
  if (objectif) items.push(React.createElement(Text, { key: `wk-${week.i}-obj`, style: styles.p }, `Objectif : ${objectif}`));
  if (activites?.length) {
    items.push(React.createElement(Text, { key: `wk-${week.i}-act-h`, style: styles.p }, 'Activités :'));
    activites.forEach((a, idx) => {
      const cleaned = String(a || '')
        .replace(/^\s*[-*•]\s+/, '')
        .replace(/^\s*\d+[\.)]\s+/, '');
      items.push(React.createElement(Text, { key: `wk-${week.i}-act-${idx}`, style: styles.listItem }, `• ${cleaned}`));
    });
  }
  if (ressources?.length) {
    items.push(React.createElement(Text, { key: `wk-${week.i}-res-h`, style: styles.p }, 'Ressources :'));
    ressources.forEach((r, j) =>
      items.push(React.createElement(MarkdownRenderer, { key: `wk-${week.i}-res-${j}`, text: `- ${String(r || '').replace(/^[-*•]\s+/, '')}` }))
    );
  }
  return React.createElement(View, { key: `wk-wrap-${week.i}`, style: { marginBottom: 12 } }, ...items);
}

function renderPlanAction(text) {
  const weeks = splitWeeks(text);
  if (weeks.length === 0) {
    let t = String(text || '');
    // Normaliser lignes débutant par "Semaine X" (avec ou sans ":") en titres markdown
    t = t.replace(/^\s*Semaine\s*(\d+)\s*[:\-–]?\s*/gmi, '## Semaine $1\n');
    return React.createElement(MarkdownRenderer, { text: t, perfOptimized: true });
  }
  return React.createElement(View, null, ...weeks.map(w => renderWeekUniform(w)));
}

function renderNumberedMethods(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  let idx = 1;
  for (const l of lines) {
    const cleaned = l.replace(/^\d+[\.)]\s+/, '').replace(/^[-*•]\s+/, '');
    items.push(
      React.createElement(Text, { key: 'm-' + idx, style: { ...styles.p, marginBottom: 8 } }, `${idx}. ${cleaned}`)
    );
    idx++;
  }
  if (!items.length) return React.createElement(MarkdownRenderer, { text, perfOptimized: true });
  return React.createElement(View, null, ...items);
}

function condenseConclusion(text) {
  const s = String(text || '').replace(/\s+/g, ' ').replace(/^[:\-\s]*/, '');
  const parts = s.split(/(?<=[\.!?])\s+/).slice(0, 2);
  const out = parts.length ? parts : [s.slice(0, 240)];
  return React.createElement(View, null,
    ...out.map((p, i) =>
      React.createElement(Text, { key: 'c-' + i, style: styles.p }, p)
    )
  );
}

module.exports = function EleveBilanPDF({ student = {}, context = {}, scores = {}, analysis = {}, logoSrc = null, generatedAt = '' }) {
  try { console.log('[EleveBilanPDF] version=v2 ci=ci-dessous breakProfil=true links=clickable'); } catch {}
  const scoreRows = [
    { k: 'python', label: 'Python', v: Number(scores.python_pct || 0) },
    { k: 'structures', label: 'Structures', v: Number(scores.structures_pct || 0) },
    { k: 'donnees', label: 'Données', v: Number(scores.donnees_pct || 0) },
    { k: 'logique', label: 'Logique & Encodage', v: Number(scores.logique_pct || 0) },
    { k: 'web', label: 'Web / HTTP', v: Number(scores.web_pct || 0) },
    { k: 'lecture_algo', label: 'Lecture d’algorithmes', v: Number(scores.lecture_algo_pct || 0) },
  ];
  return (
    React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: styles.page },
        React.createElement(Header, { title: 'Bilan Élève — NSI', student, context, logoSrc, generatedAt }),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Introduction'),
          renderStudentIntro(student)
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Analyse des compétences'),
          renderCompetences(scoreRows, scores)
        ),

        React.createElement(View, { style: styles.section, break: true },
          React.createElement(Text, { style: styles.h2 }, 'Profil d’apprentissage'),
          renderProfile(String(analysis.profil_apprentissage || ''), scores)
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Feuille de route (4 semaines)'),
          renderPlanAction(String(analysis.plan_action || ''))
        ),

        React.createElement(View, { style: { ...styles.section, marginTop: 18 } },
          React.createElement(Text, { style: styles.h2 }, 'Méthodes & Conseils'),
          renderNumberedMethods(String(analysis.methodes_conseils || ''))
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Conclusion'),
          condenseConclusion(String(analysis.conclusion || ''))
        ),

        React.createElement(Footer, { left: `${student.family_name || ''} ${student.given_name || ''}`, right: 'NSI PMF' })
      )
    )
  );
};
