"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ChangePasswordForm() {
  const router = useRouter();
  const [pwd, setPwd] = useState('');
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null); setErr(null);
    try {
      const r = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: pwd }) });
      if (!r.ok) throw new Error('Failed');
      setOk('Mot de passe changé');
      // Rediriger selon le rôle renvoyé par l'API
      try { const data = await r.json(); if (data?.role === 'TEACHER') router.replace('/dashboard/teacher'); else if (data?.role === 'STUDENT') router.replace('/dashboard/student'); else router.replace('/dashboard'); } catch {}
    } catch {
      setErr('Erreur');
    }
  };
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input className="w-full px-3 py-2 rounded bg-gray-800 text-white" placeholder="Nouveau mot de passe" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
      <button className="px-4 py-2 bg-blue-600 rounded text-white" type="submit">Changer</button>
      {ok && <p className="text-green-500">{ok}</p>}
      {err && <p className="text-red-500">{err}</p>}
    </form>
  );
}
