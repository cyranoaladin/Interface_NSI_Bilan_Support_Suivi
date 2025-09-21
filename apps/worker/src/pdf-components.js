const React = require('react');
const fs = require('fs');
const { Text, View, Image, StyleSheet, Font, Link } = require('@react-pdf/renderer');

// Font Inter (si dispo)
let HAS_INTER = false;
try {
  if (fs.existsSync('/tmp/fonts/inter-400.ttf') && fs.existsSync('/tmp/fonts/inter-700.ttf')) {
    Font.register({
      family: 'Inter', fonts: [
        { src: '/tmp/fonts/inter-400.ttf', fontWeight: 400 },
        { src: '/tmp/fonts/inter-700.ttf', fontWeight: 700 }
      ]
    });
    HAS_INTER = true;
  }
} catch {}

const COLORS = {
  primary: '#2b6cb0',
  secondary: '#0d9488',
  text: '#111',
  muted: '#555',
  tableHeader: '#f2f6fc',
  border: '#ddd',
  ok: '#198754',
  warn: '#FD7E14',
  bad: '#DC3545',
  info: '#3b82f6',
  success: '#16a34a',
  warning: '#f59e0b'
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: (HAS_INTER ? 'Inter' : 'Helvetica'), color: COLORS.text, lineHeight: 1.5 },

  // Titres & sous-titres
  h1: { fontSize: 18, fontWeight: 700, color: COLORS.primary, marginBottom: 10 },
  h2: { fontSize: 15, marginBottom: 8, fontWeight: 700, color: COLORS.primary },
  subtitle: { fontSize: 12, fontWeight: 700, marginTop: 12, marginBottom: 6, color: COLORS.text },

  // Paragraphes & listes
  p: { fontSize: 11, lineHeight: 1.5, marginBottom: 6 },
  bullet: { fontSize: 11, marginLeft: 14, marginBottom: 4 },
  checklist: { fontSize: 11, marginLeft: 14, marginBottom: 4 },

  // Header & Footer
  headerRow: { marginBottom: 14, borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 700, color: COLORS.primary },
  headerMeta: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 10, color: COLORS.muted, flexDirection: 'row', justifyContent: 'space-between' },

  // Tableaux
  table: { marginTop: 8, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  rowAlt: { flexDirection: 'row', backgroundColor: '#fafafa', borderBottomWidth: 1, borderColor: '#eee' },
  th: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, backgroundColor: COLORS.tableHeader },
  td: { flex: 1, padding: 6, fontSize: 11 },

  // Badges
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, fontSize: 10, color: 'white', alignSelf: 'flex-start', fontWeight: 700 },

  // Callouts
  callout: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, marginVertical: 8 },
  calloutTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4 },

  // Variantes colorées
  calloutInfo: { backgroundColor: '#eff6ff', borderColor: COLORS.info },
  calloutSuccess: { backgroundColor: '#ecfdf5', borderColor: COLORS.success },
  calloutWarning: { backgroundColor: '#fffbeb', borderColor: COLORS.warning },

  // Liens
  link: { color: COLORS.primary, textDecoration: 'underline' }
});

function masteryBadge(pct) {
  let color = COLORS.bad; let label = 'À renforcer';
  if (pct >= 75) { color = COLORS.ok; label = 'Solide'; }
  else if (pct >= 50) { color = COLORS.warn; label = 'Moyen'; }
  return { color, label };
}

function Header({ title, student = {}, context = {}, logoSrc = null, generatedAt = '' }) {
  const schoolYear = '2025-2026';
  return (
    React.createElement(View, { style: styles.headerRow },
      React.createElement(View, null,
        React.createElement(Text, { style: styles.headerTitle }, title),
        React.createElement(Text, { style: styles.headerMeta }, `${student.family_name || ''} ${student.given_name || ''} · ${context.csv_classe || ''}`),
        React.createElement(Text, { style: styles.headerMeta }, `${schoolYear}${generatedAt ? ' · Généré le ' + generatedAt : ''}`)
      ),
      logoSrc ? React.createElement(Image, { src: logoSrc, style: { width: 64, height: 64 } }) : null
    )
  );
}

function Footer({ left = '', right = '' }) {
  return (
    React.createElement(View, { style: styles.footer, fixed: true },
      React.createElement(Text, null, left),
      React.createElement(Text, { render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}` }),
      React.createElement(Text, null, right)
    )
  );
}

function ScoreTable({ rows = [] }) {
  return (
    React.createElement(View, { style: styles.table },
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.th }, 'Domaine'),
        React.createElement(Text, { style: styles.th }, 'Score'),
        React.createElement(Text, { style: styles.th }, 'Niveau de maîtrise')
      ),
      ...rows.map((r, idx) => {
        const { color, label } = masteryBadge(r.v);
        const rowStyle = idx % 2 === 0 ? styles.row : styles.rowAlt;
        return React.createElement(View, { style: rowStyle, key: r.k },
          React.createElement(Text, { style: styles.td }, r.label),
          React.createElement(Text, { style: styles.td }, `${r.v}%`),
          React.createElement(View, { style: styles.td },
            React.createElement(Text, { style: { ...styles.badge, backgroundColor: color } }, label)
          )
        );
      })
    )
  );
}

// Minimal Markdown renderer for React-PDF
// Supports: headings (#, ##), bullet lists (-, *, •), simple paragraphs, and clickable link formatting
function MarkdownRenderer({ text = '', perfOptimized = false }) {
  const lines = String(text || '').replace(/\r/g, '').split(/\n+/);
  const elements = [];
  let key = 0;

  function urlToLabel(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch { return 'Lien'; }
  }

  function renderInline(str) {
    // Replace inline code/backticks and bold markers for safe PDF text
    let t = String(str)
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1');
    // Keep only link label for inline rendering fallback; actual clickable Link handled below
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1');
    // Hide bare URLs in inline text; clickable link handled in container
    t = t.replace(/https?:\/\/\S+/g, '');
    return t;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Headings
    const h = line.match(/^#{1,6}\s+(.+)/);
    if (h) {
      const content = renderInline(h[1]);
      elements.push(React.createElement(Text, { key: `md-h-${key++}`, style: styles.h2 }, content));
      continue;
    }
    // Bullets (support clickable links inside)
    const b = line.match(/^[-*•]\s+(.+)/);
    if (b) {
      const bulletContent = b[1];
      const parts = [];
      let lastIndex = 0; let m;
      const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
      while ((m = linkRe.exec(bulletContent)) !== null) {
        const before = bulletContent.slice(lastIndex, m.index);
        if (before) parts.push(React.createElement(Text, { key: `md-bt-${key++}`, style: styles.bullet }, `- ${renderInline(before)}`));
        const label = m[1]; const url = m[2];
        parts.push(React.createElement(View, { key: `md-bl-${key++}`, style: styles.bullet },
          React.createElement(Text, null, '- '),
          React.createElement(Link, { src: url, style: styles.link }, label)
        ));
        lastIndex = m.index + m[0].length;
      }
      const after = bulletContent.slice(lastIndex);
      if (after && parts.length === 0) {
        elements.push(React.createElement(Text, { key: `md-b-${key++}`, style: styles.bullet }, `- ${renderInline(after)}`));
      } else if (after) {
        parts.push(React.createElement(Text, { key: `md-ba-${key++}`, style: styles.bullet }, `- ${renderInline(after)}`));
      }
      if (parts.length) elements.push(React.createElement(View, { key: `md-bv-${key++}` }, ...parts));
      continue;
    }
    // Paragraph with clickable links: bracket links and bare URLs
    const parts = [];
    let lastIndex = 0; let m;
    const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    const urlRe = /https?:\/\/\S+/g;
    while ((m = linkRe.exec(line)) !== null) {
      const before = line.slice(lastIndex, m.index);
      if (before) parts.push(React.createElement(Text, { key: `md-t-${key++}`, style: styles.p }, renderInline(before)));
      const label = m[1]; const url = m[2];
      parts.push(React.createElement(Link, { key: `md-l-${key++}`, src: url, style: styles.link }, label));
      lastIndex = m.index + m[0].length;
    }
    let tail = line.slice(lastIndex);
    let um;
    let tailIndex = 0;
    while ((um = urlRe.exec(tail)) !== null) {
      const before = tail.slice(tailIndex, um.index);
      if (before) parts.push(React.createElement(Text, { key: `md-ut-${key++}`, style: styles.p }, renderInline(before)));
      const url = um[0];
      parts.push(React.createElement(Link, { key: `md-ul-${key++}`, src: url, style: styles.link }, urlToLabel(url)));
      tailIndex = um.index + um[0].length;
    }
    const after = tail.slice(tailIndex);
    if (after) parts.push(React.createElement(Text, { key: `md-ta-${key++}`, style: styles.p }, renderInline(after)));
    if (!parts.length) {
      elements.push(React.createElement(Text, { key: `md-p-${key++}`, style: styles.p }, renderInline(line)));
    } else {
      elements.push(React.createElement(View, { key: `md-v-${key++}` }, ...parts));
    }
  }
  if (!elements.length) return null;
  return React.createElement(View, null, ...elements);
}

module.exports = {
  COLORS,
  styles,
  Header,
  Footer,
  ScoreTable,
  masteryBadge,
  MarkdownRenderer
};
