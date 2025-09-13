'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Questionnaire({ params }: { params: { bilanId: string; }; }) {
  const { bilanId } = params;
  const router = useRouter();
  const [qcm, setQcm] = useState<any>({ items: [] });
  const [pedago, setPedago] = useState<any>({});
  const [answersQcm, setAnswersQcm] = useState<Record<string, any>>({});
  const [answersPed, setAnswersPed] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState('');
  const [locked, setLocked] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      // Vérifier état du bilan pour verrouiller si déjà traité
      try {
        const rb = await fetch(`/api/bilan/${bilanId}`);
        const db = await rb.json();
        if (rb.ok && db?.bilan?.status && db.bilan.status !== 'PENDING') {
          setLocked(true);
          setMsg('Tu as déjà complété ce bilan. Consulte tes résultats sur ton tableau de bord.');
        }
      } catch {}
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
          <h2 className="text-xl">Volet 1 — QCM</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(qcm.items || []).map((it: any) => {
              const rawCode = typeof it.code === 'string' ? it.code : '';
              let codeBody = '' as string;
              if (rawCode) {
                const parts = rawCode.split('\n');
                if (parts.length > 1 && /^[a-zA-Z]+$/.test((parts[0] || '').trim())) {
                  codeBody = parts.slice(1).join('\n');
                } else {
                  codeBody = rawCode;
                }
              }
              return (
                <div key={it.id}>
                  <div className="font-medium mb-1">{it.statement || it.id}</div>
                  {codeBody && (
                    <div className="mt-2 mb-3">
                      <pre className="w-full overflow-x-auto rounded-xl bg-[#0b1220] border border-white/10 p-3 text-[13px] leading-relaxed text-[var(--fg)]/90">
                        <code>{codeBody}</code>
                      </pre>
                    </div>
                  )}
                  {Array.isArray(it.choices) && it.choices.map((c: any) => (
                    <label key={c.k} className="block text-sm">
                      <input disabled={locked} type={it.type === 'msq' ? 'checkbox' : 'radio'} name={it.id} value={c.k}
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
                  {it.type === 'short' && (
                    <input
                      type="text"
                      className="mt-2 w-full rounded-xl bg-[#0f1723] border border-white/10 px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-electric/50"
                      placeholder="Réponse courte..."
                      disabled={locked}
                      onChange={e => setAnswersQcm({ ...answersQcm, [it.id]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl">Volet 2 — Profil pédagogique</h2>
        </CardHeader>
        <CardContent>
          {Array.isArray(pedago?.questions) && pedago.questions.length > 0 ? (
            <div className="space-y-4">
              {pedago.questions.map((q: any) => (
                <div key={q.id}>
                  <div className="font-medium mb-1">{q.label || q.statement || q.id}</div>
                  {Array.isArray(q.options) && q.type === 'single' && (
                    <div className="space-y-1">
                      {q.options.map((opt: any, idx: number) => (
                        <label key={idx} className="block text-sm">
                          <input disabled={locked} type="radio" name={q.id} className="mr-2" onChange={() => setAnswersPed({ ...answersPed, [q.id]: opt })} /> {String(opt)}
                        </label>
                      ))}
                    </div>
                  )}
                  {Array.isArray(q.options) && q.type === 'multi' && (
                    <div className="space-y-1">
                      {q.options.map((opt: any, idx: number) => (
                        <label key={idx} className="block text-sm">
                          <input disabled={locked} type="checkbox" className="mr-2" onChange={(e) => {
                            const cur = new Set(answersPed[q.id] || []);
                            if (e.currentTarget.checked) cur.add(opt); else cur.delete(opt);
                            setAnswersPed({ ...answersPed, [q.id]: Array.from(cur) });
                          }} /> {String(opt)}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === 'text' && (
                    <textarea disabled={locked} className="w-full rounded-xl bg-[#0f1723] border border-white/10 px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-electric/50" rows={4} placeholder={q.placeholder || ''}
                      onChange={e => setAnswersPed({ ...answersPed, [q.id]: e.target.value })} />
                  )}
                  {q.type === 'likert' && (
                    <div className="flex gap-3">
                      {[1, 2, 3, 4, 5].map(v => (
                        <label key={v} className="text-sm">
                          <input type="radio" name={q.id} className="mr-1" onChange={() => setAnswersPed({ ...answersPed, [q.id]: v })} /> {v}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <textarea className="w-full rounded-xl bg-[#0f1723] border border-white/10 px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-electric/50" rows={4} placeholder="Notes pédagogiques"
              onChange={e => setAnswersPed({ ...answersPed, notes: e.target.value })} />
          )}
        </CardContent>
      </Card>

      <Button variant="primary" disabled={locked} onClick={async () => {
        const r = await fetch(`/api/bilan/${bilanId}/submit-answers`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qcmAnswers: answersQcm, pedagoAnswers: answersPed })
        });
        const d = await r.json();
        if (r.ok) { push({ message: 'Réponses soumises', variant: 'success' }); router.push('/dashboard/student'); }
        else if (r.status === 409) { setLocked(true); const err = d.error || 'Déjà soumis.'; setMsg(err); push({ message: err, variant: 'warning' }); }
        else { const err = d.error || 'Erreur'; setMsg(err); push({ message: err, variant: 'error' }); }
      }}>Soumettre</Button>
      {msg && <p className="mt-3 text-red-400">{msg}</p>}
    </div>
  );
}
