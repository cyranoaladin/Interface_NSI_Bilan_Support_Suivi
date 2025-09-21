import fs from "fs";
import path from "path";

function isPdf(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
const fd = fs.openSync(filePath, 'r');
  const b = Buffer.alloc(4);
  fs.readSync(fd, b, 0, 4, 0);
  fs.closeSync(fd);
  return b.toString() === '%PDF';
}

async function main() {
const baseDir = path.resolve("docs/audit_pdfs", new Date().toISOString().split("T")[0]);

  if (!fs.existsSync(baseDir)) {
    console.error(`❌ Aucun dossier trouvé: ${baseDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".pdf"));
  if (files.length === 0) {
    console.error(`❌ Aucun PDF généré dans ${baseDir}`);
    process.exit(1);
  }

  console.log(`[AUDIT] Vérification des PDFs dans ${baseDir}`);
  let bad = 0;
  for (const f of files) {
    const fullPath = path.join(baseDir, f);
    const size = fs.statSync(fullPath).size;
    const headerOk = isPdf(fullPath);
    const sizeOk = size >= 10 * 1024;
    if (!headerOk || !sizeOk) {
      console.warn(`⚠️ PDF suspect: ${f} headerOk=${headerOk} size=${size} bytes`);
      bad++;
    } else {
      console.log(`✅ PDF OK: ${f} (${(size/1024).toFixed(1)} KB)`);
    }
  }
  if (bad > 0) {
    console.error(`❌ ${bad} PDF(s) suspects`);
    process.exit(1);
  }
}

main();
