// Minimal React-PDF test inside worker container environment
const fs = require('fs');
const path = require('path');
const React = require('react');

(async () => {
  try {
    const { renderToBuffer, Document, Page, Text, Font } = require('@react-pdf/renderer');
    try {
      // Force built-in Helvetica
      Font.register({ family: 'Helvetica' });
    } catch {}

    const doc = React.createElement(Document, null,
      React.createElement(Page, { size: 'A4' },
        React.createElement(Text, null, 'Hello React-PDF Test (worker)')
      )
    );

    const buf = await renderToBuffer(doc);
    const outDir = path.join('/app', 'docs', 'audit_pdfs', new Date().toISOString().split('T')[0]);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'react_pdf_test.pdf');
    fs.writeFileSync(outPath, buf);
    console.log('✅ PDF minimal généré :', outPath, `(${(buf.length/1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('❌ Erreur React-PDF:', err && (err.stack || err.message || err));
    process.exit(1);
  }
})();
