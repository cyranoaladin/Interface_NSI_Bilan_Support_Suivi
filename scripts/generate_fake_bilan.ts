import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const TEACHER_EMAIL = process.env.TEST_USER || "alaeddine.benrhouma@ert.tn";
const TEACHER_PASS = process.env.TEST_PASS || "password123";

async function loginTeacher(): Promise<string> {
  const r = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-mode": "true" },
    body: JSON.stringify({ email: TEACHER_EMAIL, password: TEACHER_PASS })
  });
  if (!r.ok) throw new Error(`Login failed: ${r.status} ${await r.text()}`);
  const setCookie = r.headers.get("set-cookie") || "";
  const cookie = (setCookie.split(/,\s?/)[0] || '').split(';')[0] || '';
  if (!cookie) throw new Error("No cookie in response");
  return cookie; // e.g. session=eyJhbGciOi...
}

export async function generateRealBilan(studentEmail: string, payload: any) {
  console.log(`[REAL BILAN] Mode réel HTTP pour ${studentEmail}`);
  const cookie = await loginTeacher();

  // Normaliser le payload pour submit-answers (les 2 champs sont optionnels côté API)
  const answers = (() => {
    if (payload?.qcmAnswers || payload?.pedagoAnswers) return payload;
    return { qcmAnswers: {}, pedagoAnswers: payload || {} };
  })();

  // 1) Création du bilan (avec fallback si l'élève n'existe pas)
  async function tryCreate(body: any) {
    return await fetch(`${API_BASE}/api/bilan/create`, {
      method: "POST",
      headers: { "content-type": "application/json", Cookie: cookie },
      body: JSON.stringify(body)
    });
  }
  let createRes = await tryCreate({ studentEmail, matiere: "NSI", niveau: "Terminale" });
  if (!createRes.ok) {
    let t = '';
    try { t = await createRes.text(); } catch {}
    if (createRes.status === 404 && t.includes('Student not found')) {
      console.warn(`[REAL BILAN] Élève introuvable (${studentEmail}), création sans studentEmail...`);
      createRes = await tryCreate({ matiere: "NSI", niveau: "Terminale" });
    }
  }
  if (!createRes.ok) throw new Error(`[REAL BILAN] Échec création bilan (${createRes.status}) ${await createRes.text()}`);
  const createJson: any = await createRes.json();
  const bilanId = createJson?.bilanId;
  if (!bilanId) throw new Error("[REAL BILAN] create n'a pas retourné bilanId");
  console.log(`[REAL BILAN] bilanId=${bilanId}`);

  // 2) Soumettre les réponses
  const submitRes = await fetch(`${API_BASE}/api/bilan/${bilanId}/submit-answers`, {
    method: "POST",
    headers: { "content-type": "application/json", Cookie: cookie, "x-test-mode": "false" },
    body: JSON.stringify(answers)
  });
  if (!submitRes.ok) throw new Error(`[REAL BILAN] Échec submit-answers (${submitRes.status}) ${await submitRes.text()}`);
  console.log(`[REAL BILAN] Réponses envoyées pour ${studentEmail}`);

  // 3) Poll du statut
  for (let i = 0; i < 120; i++) { // jusqu'à ~10 min (120 * 5s)
    try {
      const st = await fetch(`${API_BASE}/api/bilan/${bilanId}/status`, { headers: { Cookie: cookie } });
      if (!st.ok) {
        console.warn(`[STATUS] HTTP ${st.status}, tentative ${i+1}/120`);
      } else {
        const js: any = await st.json();
        if (js?.status === "GENERATED") break;
        console.log(`[STATUS] ${studentEmail} → ${js?.status}`);
      }
    } catch (e: any) {
      console.warn(`[STATUS] exception: ${e?.message || e}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  // 4) Télécharger les PDFs
  const outDir = path.join(process.cwd(), "docs", "audit_pdfs", new Date().toISOString().split("T")[0]);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const variant of ["eleve", "enseignant"]) {
    const pdfRes = await fetch(`${API_BASE}/api/bilan/pdf/${bilanId}?variant=${variant}`, { headers: { Cookie: cookie } });
    if (!pdfRes.ok) { console.warn(`[PDF] ${variant} indisponible (${pdfRes.status})`); continue; }
    const buf = Buffer.from(await pdfRes.arrayBuffer());
    const outPath = path.join(outDir, `${bilanId}_${variant}.pdf`);
    fs.writeFileSync(outPath, buf);
    console.log(`[PDF] Généré: ${outPath} (${(buf.length/1024).toFixed(1)} KB)`);
  }

  return bilanId;
}

// CLI rapide: ts-node -P tsconfig.scripts.json scripts/generate_fake_bilan.ts <answersFile> <studentEmail>
if (require.main === module) {
  (async () => {
    const [answersFile, email] = process.argv.slice(2);
    if (!answersFile || !email) {
      console.error("Usage: ts-node -P tsconfig.scripts.json scripts/generate_fake_bilan.ts <answersFile> <studentEmail>");
      process.exit(1);
    }
    const payload = JSON.parse(fs.readFileSync(path.resolve(answersFile), 'utf-8'));
    try {
      const id = await generateRealBilan(email, payload);
      console.log(`[CLI] Done bilanId=${id}`);
    } catch (e: any) {
      console.error(`[CLI][ERROR]`, e?.message || e);
      process.exit(1);
    }
  })();
}
