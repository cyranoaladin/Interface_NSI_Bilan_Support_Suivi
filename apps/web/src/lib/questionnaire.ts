import fs from 'fs'; import path from 'path';
export function loadQuestionnaire() {
  const candidates = [
    path.resolve(process.cwd(), 'questionnaire_nsi_terminale.json'),
    '/app/questionnaire_nsi_terminale.json',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  }
  throw new Error('questionnaire_nsi_terminale.json introuvable');
}

