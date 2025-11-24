"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmissionIndex() {
  const [id, setId] = useState('');
  const router = useRouter();
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Résultats — rechercher une soumission</h1>
      <div className="flex items-center gap-2">
        <input value={id} onChange={(e)=> setId(e.target.value)} placeholder="submissionId" className="px-2 py-1 rounded border border-white/10 bg-white/5" />
        <button onClick={()=> id && router.push(`/submission/${encodeURIComponent(id)}/result`)} className="px-3 py-1 rounded bg-white/10 hover:bg-white/15">Voir</button>
      </div>
    </div>
  );
}