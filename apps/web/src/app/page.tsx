'use client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const { push } = useToast();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <h1 className="text-2xl">Nexus Réussite</h1>
              <p className="text-sm mt-1 text-[var(--fg)]/70">Plateforme pédagogique NSI — Connexion</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input label="Email" placeholder="prenom.nom@ert.tn" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Mot de passe" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button variant="primary" loading={loading} onClick={async () => {
                  setLoading(true); setMsg('');
                  const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                  setLoading(false);
                  if (!r.ok) { setMsg('Identifiants invalides'); push({ message: 'Identifiants invalides', variant: 'error' }); return; }
                  const data = await r.json();
                  if (data.mustChangePassword) window.location.href = '/change-password';
                  else window.location.href = '/dashboard';
                }}>Se connecter</Button>
                {msg && <p className="text-red-400 text-sm">{msg}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
