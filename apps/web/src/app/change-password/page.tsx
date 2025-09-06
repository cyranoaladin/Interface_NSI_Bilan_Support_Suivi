'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';

export default function ChangePassword() {
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <h1 className="text-2xl">Changer le mot de passe</h1>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input type="password" label="Nouveau mot de passe" placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)} />
                <Button variant="primary" loading={loading} onClick={async () => {
                  setLoading(true); setMsg('');
                  const r = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: pwd }) });
                  setLoading(false);
                  setMsg(r.ok ? 'Mot de passe changé.' : 'Erreur.');
                  push({ message: r.ok ? 'Mot de passe changé.' : 'Erreur lors du changement', variant: r.ok ? 'success' : 'error' });
                  if (r.ok) window.location.href = '/dashboard';
                }}>Changer</Button>
                {msg && <p className="text-sm text-[var(--fg)]/80">{msg}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
