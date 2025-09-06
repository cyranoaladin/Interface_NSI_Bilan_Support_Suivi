import { loadPedagoSurvey, loadQcmData } from '@/lib/bilan_data';

export async function GET() {
  const qcm = loadQcmData();
  const pedago = loadPedagoSurvey();
  return new Response(JSON.stringify({ ok: true, qcm, pedago }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}
