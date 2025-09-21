const React = require('react');
const { Document, Page, View, Text } = require('@react-pdf/renderer');
const { styles, Header, Footer, MarkdownRenderer } = require('./pdf-components');

/* -------- Helpers -------- */

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

    if (!objectif) objectif = l; // première phrase comme objectif
  }
  return { objectif, activites, ressources };
}

function renderWeekUniform(week) {
  const { objectif, activites, ressources } = extractOAR(week.text);
  const items = [];
  items.push(React.createElement(Text, { key: `wk-${week.i}-title`, style: styles.subtitle }, `Semaine ${week.i}`));

  if (objectif) items.push(React.createElement(Text, { key: `wk-${week.i}-obj`, style: styles.p }, `Objectif : ${objectif}`));

  if (activites && activites.length) {
    items.push(React.createElement(Text, { key: `wk-${week.i}-act-h`, style: styles.p }, 'Activités :'));
    for (let idx = 0; idx < activites.length; idx++) {
      items.push(React.createElement(Text, { key: `wk-${week.i}-act-${idx}`, style: styles.bullet }, `• ${activites[idx]}`));
    }
  }

  if (ressources && ressources.length) {
    items.push(React.createElement(Text, { key: `wk-${week.i}-res-h`, style: styles.p }, 'Ressources :'));
    for (let j = 0; j < ressources.length; j++) {
      const r = String(ressources[j] || '').replace(/^[-*•]\s+/, '');
      items.push(React.createElement(MarkdownRenderer, { key: `wk-${week.i}-res-${j}`, text: `- ${r}`, perfOptimized: true }));
    }
  }

  return React.createElement(View, { key: `wk-wrap-${week.i}`, style: { marginBottom: 12 } }, ...items);
}

function renderPlan(text) {
  const weeks = splitWeeks(text);
  if (weeks.length === 0) {
    let t = String(text || '');
    // Normaliser les en-têtes Semaine -> titres h2, tolérer ":", "-", "–" ou rien
    t = t.replace(/^\s*Semaine\s*(\d+)\s*[:\-–]?\s*/gmi, '## Semaine $1\n');
    return React.createElement(MarkdownRenderer, { text: t, perfOptimized: true });
  }
  return React.createElement(View, null, ...weeks.map(w => renderWeekUniform(w)));
}

function weakDomainsFromScores(scores) {
  const pairs = [
    ['python', 'Python'],
    ['structures', 'Structures'],
    ['donnees', 'Données'],
    ['logique', 'Logique/Encodage'],
    ['web', 'Web/HTTP'],
    ['lecture_algo', 'Lecture d’algorithmes'],
  ];
  const out = [];
  for (const [k, label] of pairs) {
    const v = Number(scores[`${k}_pct`] || 0);
    if (v < 50) out.push({ key: k, label, pct: v });
  }
  return out;
}

function renderAxesDiagnostic(text, scores) {
  const axes = weakDomainsFromScores(scores).slice(0, 4);
  if (axes.length === 0 && (!text || String(text).trim().length < 10)) return null;

  const children = [];
  children.push(React.createElement(Text, { key: 'ax-title', style: styles.calloutTitle }, 'Axes de vigilance — Analyse personnalisée'));

  if (text && String(text).trim().length >= 10) {
    children.push(React.createElement(MarkdownRenderer, { key: 'ax-md', text: String(text), perfOptimized: true }));
  }

  for (const a of axes) {
    const idx = axes.indexOf(a) + 1;
    children.push(React.createElement(Text, { key: `ax-h-${a.key}`, style: styles.subtitle }, `Axe de vigilance ${idx}`));
    children.push(React.createElement(Text, { key: `ax-lbl-${a.key}`, style: styles.p }, `${a.label} — ${a.pct}%`));
    children.push(React.createElement(Text, { key: `ax-sugg-${a.key}`, style: styles.p }, 'Suggestion : proposer un travail ciblé sur ce domaine avec exercices progressifs.'));
  }

  return React.createElement(View, { style: styles.callout }, ...children);
}

function renderIndicateurs(scores, text) {
  if (text && text.trim().length > 10) {
    return React.createElement(MarkdownRenderer, { text, perfOptimized: true });
  }
  const lows = weakDomainsFromScores(scores);
  if (lows.length === 0) return null;
  const bullets = lows.map(a => `- ${a.label} : suivi de 3 exercices hebdomadaires, grille de critères (méthode, rigueur, autonomie).`).join('\n');
  return React.createElement(MarkdownRenderer, { text: bullets, perfOptimized: true });
}

function renderConclusion(scores) {
  const highs = [];
  const lows = [];
  const entries = [
    ['Python', 'python_pct'],
    ['Structures', 'structures_pct'],
    ['Données', 'donnees_pct'],
    ['Logique/Encodage', 'logique_pct'],
    ['Web/HTTP', 'web_pct'],
    ['Lecture d’algorithmes', 'lecture_algo_pct'],
  ];
  for (const [label, k] of entries) {
    const v = Number(scores[k] || 0);
    if (v >= 60) highs.push(label);
    if (v < 50) lows.push(label);
  }
  const lines = [];
  if (highs.length) lines.push(`✅ Points forts : ${highs.join(', ')}.`);
  if (lows.length) lines.push(`⚠️ Priorités : ${lows.join(', ')}.`);
  lines.push('🎯 Recommandations : planifier 2 créneaux guidés/semaine sur les domaines prioritaires, suivre via micro-tâches et retour hebdomadaire.');
  return React.createElement(MarkdownRenderer, { text: lines.join('\n') });
}

/* -------- Main Component -------- */

module.exports = function EnseignantBilanPDF({ student = {}, context = {}, scores = {}, analysis = {}, logoSrc = null, generatedAt = '' }) {
  const synth = String(analysis.synthese_profil || '');
  const diag = String(analysis.diagnostic_pedagogique || '');
  const plan = String(analysis.plan_4_semaines || '');
  const indic = String(analysis.indicateurs_pedago || '');
  const pistes = String(analysis.pistes_pedagogiques || '');

  return (
    React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: styles.page },

        React.createElement(Header, { title: 'Bilan Enseignant — NSI', student, context, logoSrc, generatedAt }),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Synthèse du profil'),
          React.createElement(MarkdownRenderer, { text: synth || '- Synthèse non fournie.', perfOptimized: true })
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Diagnostic pédagogique'),
          renderAxesDiagnostic(diag, scores)
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Plan sur 4 semaines'),
          renderPlan(plan)
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Indicateurs pédagogiques'),
          renderIndicateurs(scores, indic)
        ),

        pistes && pistes.trim().length > 20 ? React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Pistes pédagogiques issues des référentiels'),
          React.createElement(MarkdownRenderer, { text: pistes, perfOptimized: true })
        ) : null,

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Conclusion finale'),
          renderConclusion(scores)
        ),

        React.createElement(Footer, { left: `${student.family_name || ''} ${student.given_name || ''}`, right: 'NSI PMF' })
      )
    )
  );
};
