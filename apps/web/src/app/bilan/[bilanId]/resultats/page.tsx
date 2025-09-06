'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useEffect, useState } from 'react';

export default function Resultats({ params }: { params: { bilanId: string; }; }) {
  const { bilanId } = params;
  const [bilan, setBilan] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/bilan/${bilanId}`);
      const d = await r.json();
      if (r.ok) setBilan(d.bilan); else setMsg(d.error || 'Erreur');
    })();
  }, [bilanId]);

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-poppins">Résultats du bilan</h1>
      {msg && <p className="text-red-400">{msg}</p>}
      {bilan && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-xl">Statut</h2>
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fg)]/90">{bilan.status}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-xl">Résumé élève</h2>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#0f1723] border border-white/10 p-4">{bilan.summaryText}</pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-xl">Rapport enseignant</h2>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#0f1723] border border-white/10 p-4">{bilan.reportText}</pre>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="primary" onClick={async () => {
              const r = await fetch('/api/bilan/generate-summary-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bilanId }) });
              push({ message: r.ok ? 'Résumé en cours de génération' : 'Erreur génération résumé', variant: r.ok ? 'success' : 'error' });
              window.location.reload();
            }}>Générer résumé élève</Button>
            <Button variant="secondary" onClick={async () => {
              const r = await fetch('/api/bilan/generate-report-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bilanId }) });
              push({ message: r.ok ? 'Rapport en cours de génération' : 'Erreur génération rapport', variant: r.ok ? 'success' : 'error' });
              window.location.reload();
            }}>Générer rapport enseignant</Button>
          </div>
        </div>
      )}
    </div>
  );
}
