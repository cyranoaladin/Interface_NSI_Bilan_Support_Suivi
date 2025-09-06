'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <h1 className="text-2xl">Connexion</h1>
              <p className="text-sm text-[var(--fg)]/70">Accédez à la plateforme Nexus Réussite</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input placeholder="email @ert.tn" value={email} onChange={e => setEmail(e.target.value)} />
                <Input type="password" placeholder="mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
                <Button variant="primary" loading={loading} onClick={async () => {
                  setLoading(true); setMsg('');
                  const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                  setLoading(false);
                  if (r.ok) {
                    const data = await r.json();
                    if (data.mustChangePassword) window.location.href = '/change-password'; else window.location.href = '/dashboard';
                  } else setMsg('Identifiants invalides');
                }}>Se connecter</Button>
                {msg && <p className="text-sm text-red-400">{msg}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
