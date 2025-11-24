"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuizIndex() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function generate() {
    setBusy(true);
    try {
      const r = await fetch('/api/quiz/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
      const j = await r.json();
      const id = j?.quiz?.id || j?.quizId;
      if (!id) throw new Error('Generation failed');
      router.push(`/quiz/${id}/play`);
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Quiz</h1>
      <p className="text-sm opacity-70">Générez un quiz de démonstration puis lancez l'épreuve.</p>
      <button onClick={generate} disabled={busy} className="px-3 py-2 rounded bg-white/10 hover:bg-white/15 disabled:opacity-50">
        {busy ? 'Génération…' : 'Générer un quiz'}
      </button>
    </div>
  );
}