'use client';

import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { KeyRound, LogOut } from 'lucide-react';
import * as React from 'react';

export default function StudentResourcesPage() {
  const [endpoint, setEndpoint] = React.useState('/api/ressources/premiere');
  const [title, setTitle] = React.useState<string>('Ressources NSI Première');
  const [srcDoc, setSrcDoc] = React.useState<string>('');
  const [classe, setClasse] = React.useState<string>('');
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me');
        const d = await r.json();
        if (r.ok && d?.ok) {
          const classeStr = String(d.classe || '');
          setClasse(classeStr);
          const isTerm = /(\bterm\b|\bterminal\b|\bterminale\b|\btnsi\b)/i.test(classeStr.toLowerCase());
          const ep = isTerm ? '/api/ressources/terminale' : '/api/ressources/premiere';
          setEndpoint(ep);
          setTitle(isTerm ? 'Ressources Terminale' : 'Ressources NSI Première');
          try {
            const htmlRes = await fetch(`${ep}?v=${Date.now()}`, { cache: 'no-store' });
            let html = await htmlRes.text();
            // Ne retire que les scripts manifestement dangereux si encore présents (déjà fait serveur)
            const suspicious = /(getContext\s*\(|new\s+Chart\s*\(|Chart\.|ressourcesChart)/i;
            html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, (block) => (suspicious.test(block) && !/cdn\.tailwindcss\.com/i.test(block) ? '' : block));
            html = html.replace(/<canvas[\s\S]*?<\/canvas>/gi, '');
            setSrcDoc(html);
          } catch {}
        }
      } catch {}
    })();
  }, []);
  return (
    <Layout
      right={<div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => { window.location.href = '/change-password'; }} title="Changer mon mot de passe">
          <KeyRound className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={async () => { try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}; window.location.href = '/login'; }}>
          <LogOut className="h-4 w-4" /> Déconnexion
        </Button>
      </div>}
      sidebar={<div>
        <div className="px-1">
          <h2 className="text-lg font-poppins">Ressources</h2>
          <p className="text-sm text-[var(--fg)]/70">Catalogue NSI</p>
        </div>
        {(() => {
          const c = (classe || '').toLowerCase();
          const isTerm = /(\bterm\b|\bterminal\b|\bterminale\b|\btnsi\b)/i.test(c);
          if (isTerm) {
            return (
              <SidebarNav items={[
                { href: '/dashboard/student', label: 'Mes bilans' },
                { href: '/bilan/initier', label: 'Questionnaire' },
                { href: '/dashboard/student/ressources', label: 'Ressources Terminale' },
              ]} />
            );
          }
          return (
            <SidebarNav items={[
              { href: '/dashboard/student', label: 'Mes bilans' },
              { href: '/bilan/initier', label: 'Questionnaire' },
              { href: '/dashboard/student/ressources', label: 'Ressources NSI Première' },
              { href: '/tp-algo/index.html', label: 'TP Algo Python' },
            ]} />
          );
        })()}
      </div>}
    >
      <div className="space-y-4">
        <h1 className="text-2xl">{title}</h1>
        <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: '80vh' }}>
          <iframe title="Ressources NSI" srcDoc={srcDoc} className="w-full h-full bg-white" />
        </div>
      </div>
    </Layout>
  );
}
