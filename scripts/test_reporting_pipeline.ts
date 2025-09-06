import 'dotenv/config';
import fs from 'fs';
import https from 'https';
import path from 'path';

function fillTemplate(tex: string, dict: any): string {
  return tex.replace(/\{\{\{?\s*([\w\.\_]+)\s*\}?\}\}/g, (_: string, key: string) => {
    const parts = key.split('.');
    let v: any = dict;
    for (const p of parts) { v = (v ?? {})[p]; if (v === undefined) return ''; }
    return String(v);
  });
}
function deepTemplate<T = any>(value: any, dict: any): T {
  if (value === null || value === undefined) return value as T;
  if (typeof value === 'string') {
    const m = value.match(/^\s*\{\{\{?\s*([\w\.\_]+)\s*\}?\}\}\s*$/);
    if (m) {
      const parts = m[1].split('.');
      let v: any = dict; for (const p of parts) { v = (v ?? {})[p]; if (v === undefined) return '' as any; }
      return v as any;
    }
    if (/\{\{.*\}\}/.test(value)) return fillTemplate(value, dict) as any;
    return value as T;
  }
  if (Array.isArray(value)) return value.map((v) => deepTemplate(v, dict)) as any;
  if (typeof value === 'object') {
    const out: any = {}; for (const [k, v] of Object.entries(value)) out[k] = deepTemplate(v, dict);
    return out as T;
  }
  return value as T;
}
function setByPath(obj: any, p: string, val: any) {
  const parts = String(p || '').split('.');
  let cur = obj; for (let i = 0; i < parts.length - 1; i++) { const k = parts[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }
  cur[parts[parts.length - 1]] = val;
}

async function openaiJSON(system: string, user: string, model: string) {
  const key = process.env.OPENAI_API_KEY || '';
  if (!key) {
    return { synthese_projet: 'STUB', forces_percues: ['motivation'], faiblesses_percues: ['organisation'], principales_craintes: ['temps'], attentes_pedagogiques_cles: ['pratique guidée'] };
  }
  const payload = JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], response_format: { type: 'json_object' } });
  const options: https.RequestOptions = {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };
  const data: any = await new Promise((resolve, reject) => {
    const req = https.request('https://api.openai.com/v1/chat/completions', options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
  const txt = data?.choices?.[0]?.message?.content || '{}';
  try { return JSON.parse(txt); } catch { return {}; }
}

function loadQuestionnaire() {
  const cands = [
    path.resolve(process.cwd(), 'data/questionnaire_nsi_terminale.final.json'),
    path.resolve(process.cwd(), 'questionnaire_nsi_terminale.json')
  ];
  for (const p of cands) { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); }
  throw new Error('questionnaire file not found');
}

async function main() {
  const qjson = loadQuestionnaire();

  // 1) Jeu de données factice
  const fake = {
    student: { givenName: 'Alice', familyName: 'Durand', classe: 'TNSI-1', id: 'stu_demo_1' },
    scores: { python: 0.62, structures: 0.48, donnees: 0.55, logique: 0.6, web: 0.51, lecture_algo: 0.58 },
    answers: {
      projets_post_bac: { value: 'École d’ingénieurs info ou licence maths-info.' },
      attentes_resultats_nsi: { value: 'Maîtriser les graphes et améliorer ma rigueur en code.' },
      attentes_enseignement_nsi: { value: 'Des projets réguliers, plus de pratiques guidées.' },
      craintes_anticipees_nsi: { value: 'Gestion du temps en groupe et la difficulté du Grand Oral.' },
      methode_efficace_nsi: { value: 'Refaire les exercices et coder un petit projet chaque semaine.' },
      auto_evaluation_depart: { value: 'À l’aise en Python, faible en structures avancées et SQL.' },
      volet_pedagogique_specifique_nsi: {
        A1: 'Intérêt info et projet d’études',
        A2: 'École ingé info',
        M5: 'Crainte de projets longs',
        T6: 'Pratique régulière sur petits projets'
      }
    },
    rag: ['Référence programme...', 'Extraits objectifs prérequis...']
  };

  // dict pour templating
  const dict: any = {
    auth: { given_name: fake.student.givenName, family_name: fake.student.familyName },
    context: { csv_classe: fake.student.classe, student_id: fake.student.id },
    scoring: { sections: { volet_connaissances: fake.scores } },
    answers: fake.answers,
    pre_analysis: {},
    rag: fake.rag
  };

  // 2) Pré-analyse
  const pre = (qjson.reporting && qjson.reporting.pre_analysis) || [];
  for (const step of pre) {
    if (step.action === 'llm_request') {
      const resolvedInputs = deepTemplate(step.inputs || {}, dict);
      const userPayload = { inputs: resolvedInputs };
      const miniModel = step.model || 'gpt-4o-mini';
      const out = await openaiJSON('Tu es un assistant qui produit uniquement du JSON valide.', `${step.prompt}\n\nDonnées:\n${JSON.stringify(userPayload)}`, miniModel);
      setByPath(dict, step.output_variable || 'pre_analysis.summary', out);
      console.log('--- Pre-analysis result (gpt-4o-mini) ---');
      console.log(JSON.stringify(out, null, 2));
    }
  }

  // 3) Construire payload final
  const inputsSpec = (qjson.reporting && qjson.reporting.inputs) || {};
  const payload = deepTemplate(inputsSpec, dict);
  payload.rag = fake.rag;
  console.log('--- Final payload (to gpt-4o) ---');
  console.log(JSON.stringify(payload, null, 2));

  // 4) Appel final (optionnel, ici on valide le flux et affiche un message)
  console.log('Succès: Pré-analyse exécutée et payload final construit.');
}

main().catch(e => { console.error(e); process.exit(1); });
