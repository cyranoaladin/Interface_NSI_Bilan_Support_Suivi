'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useEffect, useState } from 'react';

export default function Questionnaire({ params }: { params: { bilanId: string; }; }) {
  const { bilanId } = params;
  const [qcm, setQcm] = useState<any>({ items: [] });
  const [pedago, setPedago] = useState<any>({});
  const [answersQcm, setAnswersQcm] = useState<Record<string, any>>({});
  const [answersPed, setAnswersPed] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState('');
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/bilan/questionnaire-structure');
      const d = await r.json();
      if (d.ok) { setQcm(d.qcm || { items: [] }); setPedago(d.pedago || {}); }
    })();
  }, []);

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-poppins">Questionnaire NSI</h1>

      <Card>
        <CardHeader>
          <h2 className="text-xl">Volet 1 — QCM (extrait)</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(qcm.items || []).slice(0, 10).map((it: any) => (
              <div key={it.id}>
                <div className="font-medium mb-1">{it.statement || it.id}</div>
                {Array.isArray(it.choices) && it.choices.map((c: any) => (
                  <label key={c.k} className="block text-sm">
                    <input type={it.type === 'msq' ? 'checkbox' : 'radio'} name={it.id} value={c.k}
                      onChange={e => {
                        if (it.type === 'msq') {
                          const cur = new Set(answersQcm[it.id] || []);
                          if (e.currentTarget.checked) cur.add(c.k); else cur.delete(c.k);
                          setAnswersQcm({ ...answersQcm, [it.id]: Array.from(cur) });
                        } else {
                          setAnswersQcm({ ...answersQcm, [it.id]: c.k });
                        }
                      }} className="mr-2" /> {c.text}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl">Volet 2 — Profil pédagogique (extrait)</h2>
        </CardHeader>
        <CardContent>
          <textarea className="w-full rounded-xl bg-[#0f1723] border border-white/10 px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-electric/50" rows={4} placeholder="Notes pédagogiques"
            onChange={e => setAnswersPed({ ...answersPed, notes: e.target.value })} />
        </CardContent>
      </Card>

      <Button variant="primary" onClick={async () => {
        const r = await fetch(`/api/bilan/${bilanId}/submit-answers`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qcmAnswers: answersQcm, pedagoAnswers: answersPed })
        });
        const d = await r.json();
        if (r.ok) { push({ message: 'Réponses soumises', variant: 'success' }); window.location.href = `/bilan/${bilanId}/resultats`; }
        else { const err = d.error || 'Erreur'; setMsg(err); push({ message: err, variant: 'error' }); }
      }}>Soumettre</Button>
      {msg && <p className="mt-3 text-red-400">{msg}</p>}
    </div>
  );
}
