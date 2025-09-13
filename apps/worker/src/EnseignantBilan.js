const React = require('react');
const { Document, Page, Text, View, Image, StyleSheet } = require('@react-pdf/renderer');

const ACCENT = '#0B5ED7';
const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 12, fontFamily: 'Times-Roman', color: '#111' },
  header: { marginBottom: 14, borderBottomWidth: 2, borderBottomColor: ACCENT, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 700, color: ACCENT },
  meta: { fontSize: 10, color: '#444', marginTop: 2 },
  section: { marginTop: 14 },
  h2: { fontSize: 14, marginBottom: 6, fontWeight: 700, color: ACCENT },
  p: { fontSize: 12, lineHeight: 1.4 },
  scoresTable: { marginTop: 8, borderWidth: 1, borderColor: '#ccc' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  cellHeader: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, backgroundColor: '#f2f6fc' },
  cell: { flex: 1, padding: 6, fontSize: 11 }
});

module.exports = function EnseignantBilanPDF({ student = {}, context = {}, scores = {}, analysis = {}, logoSrc = null, generatedAt = '' }) {
  const scoreRows = [
    { k: 'python', label: 'Python', v: Number(scores.python_pct || 0) },
    { k: 'structures', label: 'Structures', v: Number(scores.structures_pct || 0) },
    { k: 'donnees', label: 'Données', v: Number(scores.donnees_pct || 0) },
    { k: 'logique', label: 'Logique & Encodage', v: Number(scores.logique_pct || 0) },
    { k: 'web', label: 'Web/HTTP', v: Number(scores.web_pct || 0) },
    { k: 'lecture_algo', label: 'Lecture d’algorithmes', v: Number(scores.lecture_algo_pct || 0) },
  ];
  return (
    React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: styles.page },
        React.createElement(View, { style: styles.header },
          React.createElement(View, null,
            React.createElement(Text, { style: styles.title }, 'Bilan Enseignant — NSI'),
            React.createElement(Text, { style: styles.meta }, `${student.family_name || ''} ${student.given_name || ''} · ${context.csv_classe || ''}`),
            React.createElement(Text, { style: styles.meta }, generatedAt ? `Généré le ${generatedAt}` : '')
          ),
          logoSrc ? React.createElement(Image, { src: logoSrc, style: { width: 64, height: 64 } }) : null
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Synthèse du profil'),
          React.createElement(Text, { style: styles.p }, String(analysis.synthese_profil || ''))
        ),
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Diagnostic pédagogique'),
          React.createElement(Text, { style: styles.p }, String(analysis.diagnostic_pedagogique || ''))
        ),
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Scores détaillés — Pré-requis de Première'),
          React.createElement(View, { style: styles.scoresTable },
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.cellHeader }, 'Domaine'),
              React.createElement(Text, { style: styles.cellHeader }, 'Score')
            ),
            ...scoreRows.map(r => (
              React.createElement(View, { style: styles.row, key: r.k },
                React.createElement(Text, { style: styles.cell }, r.label),
                React.createElement(Text, { style: styles.cell }, `${r.v}%`)
              )
            ))
          )
        ),
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Plan 4 semaines'),
          React.createElement(Text, { style: styles.p }, String(analysis.plan_4_semaines || ''))
        ),
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Indicateurs pédagogiques'),
          React.createElement(Text, { style: styles.p }, String(analysis.indicateurs_pedago || ''))
        ),
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.h2 }, 'Pistes Pédagogiques Issues des Référentiels'),
          React.createElement(Text, { style: styles.p }, String(analysis.pistes_pedagogiques || ''))
        )
      )
    )
  );
};
