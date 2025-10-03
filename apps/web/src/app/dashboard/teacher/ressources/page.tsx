'use client';

import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { KeyRound, LogOut } from 'lucide-react';
import * as React from 'react';

export default function TeacherResourcesPage() {
  const [srcDoc, setSrcDoc] = React.useState<string>('');
  const [ownerName, setOwnerName] = React.useState<string>('');
  const [groups, setGroups] = React.useState<Array<{ id: string; name: string; code: string; count?: number; }>>([]);
  const [selectedId, setSelectedId] = React.useState<string>('');
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/ressources/premiere?v=${Date.now()}`, { cache: 'no-store' });
        let html = await res.text();
        // Ne retire que les scripts manifestement dangereux si encore présents
        const suspicious = /(getContext\s*\(|new\s+Chart\s*\(|Chart\.|ressourcesChart)/i;
        html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, (block) => (suspicious.test(block) && !/cdn\.tailwindcss\.com/i.test(block) ? '' : block));
        html = html.replace(/<canvas[\s\S]*?<\/canvas>/gi, '');
        setSrcDoc(html);
      } catch {}
      try {
        const me = await fetch('/api/me');
        const meJson = await me.json();
        if (me.ok && meJson.ok && meJson.role === 'TEACHER') {
          setOwnerName(`${meJson.firstName} ${meJson.lastName}`);
        }
      } catch {}
      try {
        const r = await fetch('/api/teacher/groups');
        const d = await r.json();
        if (r.ok && d.ok) {
          const gs = d.groups.map((g: any) => ({ id: g.id, name: g.name, code: g.code, count: g.count ?? undefined }));
          setGroups(gs);
          if (gs.length > 0) setSelectedId(gs[0].id);
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
      sidebar={<div className="space-y-2">
        <div className="px-1">
          <h2 className="text-lg font-poppins">{ownerName || 'Espace Enseignant'}</h2>
        </div>
        <div className="mt-2">
          <h3 className="text-sm text-[var(--fg)]/70 px-3 mb-1">Mes groupes</h3>
          <ul className="space-y-1">
            {groups.map(g => (
              <li key={g.id}>
                <a href={`/dashboard/teacher?groupId=${encodeURIComponent(g.id)}`} className={`block w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 ${selectedId === g.id ? 'bg-white/10' : ''}`}>
                  <span className="font-medium">{g.name}</span>
                  <span className="text-xs text-[var(--fg)]/60"> {' '}({g.code})</span>
                  {typeof g.count === 'number' && <span className="text-xs text-[var(--fg)]/50"> {' — '}{g.count} élèves</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6">
          <h3 className="text-sm text-[var(--fg)]/70 px-3 mb-1">Ressources</h3>
          <SidebarNav items={[
            { href: '/dashboard/teacher/ressources', label: 'Ressources NSI Première' },
            { href: '/dashboard/teacher/ressources-terminale', label: 'Ressources Terminale' },
            { href: '/tp-algo/index.html', label: 'TP Algo Python' },
          ]} />
        </div>
      </div>}
    >
      <div className="space-y-4">
        <h1 className="text-2xl">Ressources NSI Première</h1>
        <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: '80vh' }}>
          <iframe title="Ressources NSI Première" srcDoc={srcDoc} className="w-full h-full bg-white" />
        </div>
      </div>
    </Layout>
  );
}
