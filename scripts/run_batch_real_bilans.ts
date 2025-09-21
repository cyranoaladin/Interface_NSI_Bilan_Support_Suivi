import fs from "fs";
import path from "path";
import { generateRealBilan } from "./generate_fake_bilan";

async function runBatch() {
  console.log("[BATCH] Starting real bilans...");
  const dir = path.join(process.cwd(), "test", "data", "student_answers");
  if (!fs.existsSync(dir)) {
    console.error(`[BATCH] Answers dir missing: ${dir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();

  const tasks = files.map((file, idx) => async () => {
    const email = `eleve${idx + 1}@pmf.tn`;
    try {
      console.log(`[BATCH][START] ${email} (${file})`);
      const payload = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      const bilanId = await generateRealBilan(email, payload);
      console.log(`[BATCH][SUCCESS] ${email} bilanId=${bilanId}`);
      const auditDir = path.resolve("docs/audit_pdfs", new Date().toISOString().split("T")[0]);
      const elevePdf = path.join(auditDir, `${bilanId}_eleve.pdf`);
      const enseignantPdf = path.join(auditDir, `${bilanId}_enseignant.pdf`);
      console.log(`[BATCH][CHECK] PDFs attendus :\n - ${elevePdf}\n - ${enseignantPdf}`);
    } catch (err: any) {
      console.error(`[BATCH][ERROR] ${email}: ${err?.message || err}`);
    }
  });

  // Exécuter toutes les tâches en parallèle
  await Promise.all(tasks.map(fn => fn()));
  console.log("[BATCH] Completed (parallel).");
}

runBatch().catch((err) => {
  console.error("[BATCH][FATAL]", err);
  process.exit(1);
});
