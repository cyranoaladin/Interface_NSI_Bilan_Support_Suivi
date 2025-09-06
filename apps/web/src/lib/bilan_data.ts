import fs from 'fs';
import path from 'path';

export type QcmItem = {
  id: string;
  domain: string;
  type: 'mcq' | 'msq' | 'short';
  weight?: number;
  statement?: string;
  choices?: { k: string; text: string; correct?: boolean; }[];
  answer?: string; // for short
  difficulty?: string;
};

export type QcmData = {
  version?: string;
  items: QcmItem[];
};

export type PedagoQuestion = any; // structure libre suivant le JSON Volet 2
export type PedagoSurvey = {
  version?: string;
  sections?: any[];
  questions?: PedagoQuestion[];
};

function tryReadJson(candidates: string[]): any {
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    } catch {
      // ignore and continue
    }
  }
  return null;
}

export function loadQcmData(): QcmData {
  const data = tryReadJson([
    path.resolve(process.cwd(), 'data/qcm_premiere_for_terminale_nsi.json'),
    '/app/data/qcm_premiere_for_terminale_nsi.json',
  ]);
  if (!data) return { version: 'empty', items: [] };
  return data as QcmData;
}

export function loadPedagoSurvey(): PedagoSurvey {
  const data = tryReadJson([
    path.resolve(process.cwd(), 'data/pedago_survey_terminale_nsi.json'),
    '/app/data/pedago_survey_terminale_nsi.json',
  ]);
  if (!data) return { version: 'empty', sections: [], questions: [] } as PedagoSurvey;
  return data as PedagoSurvey;
}
