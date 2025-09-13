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
  // 1) Préférer le QCM inclus dans le questionnaire final (volet_connaissances) s'il est présent
  const finalFull = tryReadJson([
    path.resolve(process.cwd(), 'data/questionnaire_nsi_terminale.final.json'),
    '/app/data/questionnaire_nsi_terminale.final.json',
  ]);
  if (finalFull && finalFull.workflow && Array.isArray(finalFull.workflow.stages)) {
    const qcmStage = finalFull.workflow.stages.find((s: any) => s.id === 'volet_connaissances');
    if (qcmStage && Array.isArray(qcmStage.items) && qcmStage.items.length > 0) {
      return { version: finalFull.version || 'from_final', items: qcmStage.items } as QcmData;
    }
  }

  // 2) Fallback: fichier QCM dédié
  const data = tryReadJson([
    path.resolve(process.cwd(), 'data/qcm_premiere_for_terminale_nsi.json'),
    '/app/data/qcm_premiere_for_terminale_nsi.json',
  ]);
  if (!data) return { version: 'empty', items: [] };
  return data as QcmData;
}

export function loadPedagoSurvey(): PedagoSurvey {
  // 1) Essayer le fichier dédié Volet 2 s'il existe et contient des sections/questions
  const dedicated = tryReadJson([
    path.resolve(process.cwd(), 'data/pedago_survey_terminale_nsi.json'),
    '/app/data/pedago_survey_terminale_nsi.json',
  ]);
  if (dedicated && ((Array.isArray(dedicated.sections) && dedicated.sections.length > 0) || (Array.isArray(dedicated.questions) && dedicated.questions.length > 0))) {
    return dedicated as PedagoSurvey;
  }

  // 2) Fallback: extraire le Volet 2 depuis le questionnaire complet final
  const full = tryReadJson([
    path.resolve(process.cwd(), 'data/questionnaire_nsi_terminale.final.json'),
    '/app/data/questionnaire_nsi_terminale.final.json',
  ]);
  if (full && full.workflow && Array.isArray(full.workflow.stages)) {
    const stage = full.workflow.stages.find((s: any) => s.id === 'volet_pedagogique_specifique_nsi');
    if (stage && Array.isArray(stage.questions)) {
      return { version: full.version || 'fallback', sections: [], questions: stage.questions } as PedagoSurvey;
    }
  }

  // 3) Vide par défaut
  return { version: 'empty', sections: [], questions: [] } as PedagoSurvey;
}
