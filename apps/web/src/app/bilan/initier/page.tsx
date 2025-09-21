'use client';
import { useEffect } from 'react';

export default function InitierBilan() {
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/bilan/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d?.bilanId) {
          window.location.replace(`/bilan/${d.bilanId}/questionnaire`);
          return;
        }
      } catch {}
      // fallback en cas d'erreur
      window.location.replace('/dashboard/student');
    })();
  }, []);
  return null;
}
