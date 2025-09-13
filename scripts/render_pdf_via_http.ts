import { execSync } from 'child_process';
import fs from 'fs';

async function main() {
  const reportId = process.argv.find(a => a.startsWith('--report='))?.split('=')[1] || '';
  const outPath = process.argv.find(a => a.startsWith('--out='))?.split('=')[1] || 'docs/artifacts_premium_new/enseignant_premium_final.png';
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  if (!reportId) throw new Error('Missing --report=<reportId>');

  const url = `${base.replace(/\/$/, '')}/api/bilan/download/${reportId}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmpPdf = '/tmp/report_teacher_http.pdf';
  fs.writeFileSync(tmpPdf, buf);

  fs.mkdirSync('docs/artifacts_premium_new', { recursive: true });
  execSync(`pdftoppm -png -singlefile ${tmpPdf} ${outPath.replace(/\.png$/, '')}`);
  console.log('Saved:', outPath);
}

main().catch(e => { console.error(e); process.exit(1); });


