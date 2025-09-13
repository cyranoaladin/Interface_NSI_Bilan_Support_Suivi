export const dynamic = 'force-dynamic';
import { loadPedagoSurvey, loadQcmData } from '@/lib/bilan_data';
import fs from 'fs';
import path from 'path';

function loadVolet2FromFinal(): any | null {
  const candidates = [
    path.resolve(process.cwd(), 'data/questionnaire_nsi_terminale.final.json'),
    '/app/data/questionnaire_nsi_terminale.final.json',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const full = JSON.parse(fs.readFileSync(p, 'utf8'));
        const stage = full?.workflow?.stages?.find((s: any) => s.id === 'volet_pedagogique_specifique_nsi');
        if (stage && Array.isArray(stage.questions) && stage.questions.length > 0) {
          return { version: full.version || 'final', sections: [], questions: stage.questions };
        }
      }
    } catch {}
  }
  return null;
}

export async function GET() {
  const qcm = loadQcmData();
  let pedago = loadPedagoSurvey();
  if (!pedago || !Array.isArray((pedago as any).questions) || (pedago as any).questions.length === 0) {
    const fallback = loadVolet2FromFinal();
    if (fallback) pedago = fallback as any;
  }
  return new Response(JSON.stringify({ ok: true, qcm, pedago }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store, must-revalidate'
    }
  });
}
