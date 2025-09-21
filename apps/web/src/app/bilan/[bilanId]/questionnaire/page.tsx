'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

function prettyPython(code: string): string {
  try {
    let s = String(code || '');
    s = s.replace(/\r\n?/g, '\n');

    // 1) If one-liner, split basic statements
    if (!s.includes('\n')) {
      s = s.replace(/;\s*/g, '\n');
      // Force newlines before typical headers if present inline
      s = s.replace(/\s+(for\s+[^:]*:)/g, '\n$1');
      s = s.replace(/\s+(if\s+[^:]*:)/g, '\n$1');
      s = s.replace(/\s+(elif\s+[^:]*:)/g, '\n$1');
      s = s.replace(/\s+(else\s*:)/g, '\n$1');
      s = s.replace(/\s+(while\s+[^:]*:)/g, '\n$1');
      s = s.replace(/\s+(try\s*:)/g, '\n$1');
      s = s.replace(/\s+(except\b[^:]*:)/g, '\n$1');
      s = s.replace(/\s+(finally\s*:)/g, '\n$1');
      s = s.replace(/\s+(with\s+[^:]*:)/g, '\n$1');
      s = s.replace(/\s+(def\s+[^:]*:)/g, '\n$1');
      s = s.replace(/\s+(class\s+[^:]*:)/g, '\n$1');
      s = s.replace(/\s+return\s+/g, '\nreturn ');
    }

    // 2) Ensure newline after ':' that starts a block
    s = s.replace(/:\s*(?!\n)/g, ':\n');

    // 3) Indentation pass: +1 indent after lines ending with ':',
    //    dedent for elif/else/except/finally before applying line.
    const lines = s.split('\n');
    let indent = 0;
    const dedentRe = /^(\s*)(elif\b.*:|else\s*:|except\b.*:|finally\s*:)/;
    const incRe = /^(\s*)(if\b.*:|for\b.*:|while\b.*:|try\s*:|with\b.*:|def\b.*:|class\b.*:)/;

    const out: string[] = [];
    for (let raw of lines) {
      let line = raw.trim();
      if (line.length === 0) { out.push(''); continue; }
      // Dedent before rendering for elif/else/except/finally
      if (dedentRe.test(line)) {
        indent = Math.max(0, indent - 1);
      }
      out.push(' '.repeat(indent * 4) + line);
      // Increase indent after block openers
      if (incRe.test(line)) {
        indent += 1;
      }
    }

    // 4) Compact excessive blank lines
    let res = out.join('\n').replace(/\n{3,}/g, '\n\n');
    return res;
  } catch {
    return code;
  }
}

function extractCodeBlock(raw: string): { lang: string | null; code: string } {
  try {
    const text = String(raw || '');
    // Case 1: fenced block ```lang\n...``` (newline optional)
    const m = text.match(/```\s*([a-zA-Z0-9_-]+)?\s*\n?([\s\S]*?)```/);
    if (m) {
      const lang = (m[1] || '').trim() || null;
      let body = (m[2] || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\s+$/,'');
      if (lang === 'python') body = prettyPython(body);
      return { lang, code: body };
    }
    // Case 2: first line language hint (e.g. "python\n...")
    const m2 = text.match(/^\s*([a-zA-Z]+)\s*\n([\s\S]*)$/);
    if (m2) {
      const lang = (m2[1] || '').trim() || null;
      let body = (m2[2] || '').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
      if (lang === 'python') body = prettyPython(body);
      return { lang, code: body };
    }
    // Default
    return { lang: null, code: text.replace(/\r\n/g,'\n').replace(/\r/g,'\n') };
  } catch {
    return { lang: null, code: String(raw || '') };
  }
}

function renderStatementWithCode(stmt: string) {
  const text = String(stmt || '');
  const parts: any[] = [];
  const re = /```\s*([a-zA-Z0-9_-]+)?\s*\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      const plain = text.slice(lastIndex, m.index);
      if (plain.trim().length > 0) parts.push({ type: 'text', value: plain });
    }
    const lang = (m[1] || '').trim() || null;
    const code = (m[2] || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    parts.push({ type: 'code', lang, code });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    if (tail.trim().length > 0) parts.push({ type: 'text', value: tail });
  }

  if (parts.length === 0) return <div className="font-medium mb-1 whitespace-pre-wrap">{text}</div>;
  function renderInlineSegments(text: string) {
    const out: any[] = [];
    let i = 0;
    const re = /`([^`]+)`/g;
    let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(<span key={`t-${i++}`} className="whitespace-pre-wrap">{text.slice(last, m.index)}</span>);
      const code = m[1] || '';
      const isBlock = /;|\b(for|if|elif|else|def|class|while|try|except|finally|with|return)\b/.test(code);
      if (isBlock) {
        const pretty = prettyPython(code);
        out.push(
          <div key={`b-${i++}`} className="mt-2 mb-3">
            <pre className="w-full overflow-x-auto rounded-xl bg-[#0b1220] border border-white/10 p-3 text-[13px] leading-relaxed text-[var(--fg)]/90 whitespace-pre font-mono">
              <code className="language-python">{pretty}</code>
            </pre>
          </div>
        );
      } else {
        out.push(<code key={`c-${i++}`} className="px-1 py-0.5 rounded bg-[#0b1220] border border-white/10">{code}</code>);
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(<span key={`t-${i++}`} className="whitespace-pre-wrap">{text.slice(last)}</span>);
    return out;
  }

  return (
    <div className="mb-2">
      {parts.map((p, idx) => {
        if (p.type === 'text') {
          return <div key={idx} className="font-medium mb-1">{renderInlineSegments(p.value)}</div>;
        }
        const pretty = p.lang === 'python' ? prettyPython(p.code) : p.code;
        return (
          <div key={idx} className="mt-2 mb-3">
            <pre className="w-full overflow-x-auto rounded-xl bg-[#0b1220] border border-white/10 p-3 text-[13px] leading-relaxed text-[var(--fg)]/90 whitespace-pre font-mono">
              <code className={p.lang ? `language-${p.lang}` : undefined}>{pretty}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}

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
              const { lang, code } = rawCode ? extractCodeBlock(rawCode) : { lang: null, code: '' };
              const codeBody = code && code.trim().length > 0 ? (lang === 'python' ? prettyPython(code) : code) : '';
              return (
                <div key={it.id}>
                  {renderStatementWithCode(it.statement || it.id)}
                  {codeBody && (
                    <div className="mt-2 mb-3">
                      <pre className="w-full overflow-x-auto rounded-xl bg-[#0b1220] border border-white/10 p-3 text-[13px] leading-relaxed text-[var(--fg)]/90 whitespace-pre font-mono">
                        <code className={lang ? `language-${lang}` : undefined}>{codeBody}</code>
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
