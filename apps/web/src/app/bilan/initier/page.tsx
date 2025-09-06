'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';

export default function InitierBilan() {
  const [studentEmail, setStudentEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <h1 className="text-2xl">Initier un bilan NSI</h1>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input placeholder="Email élève (optionnel)" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} />
                <Button variant="primary" loading={loading} onClick={async () => {
                  setLoading(true); setMsg('');
                  const r = await fetch('/api/bilan/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentEmail }) });
                  const data = await r.json();
                  setLoading(false);
                  if (r.ok) {
                    push({ message: 'Bilan créé', variant: 'success' });
                    window.location.href = `/bilan/${data.bilanId}/questionnaire`;
                  } else {
                    const err = data.error || 'Erreur'; setMsg(err);
                    push({ message: err, variant: 'error' });
                  }
                }}>Créer le bilan</Button>
                {msg && <p className="text-sm text-red-400">{msg}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
