"use client";
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { buildStudentSidebar } from '@/lib/menu';
import { useEffect, useState } from 'react';

type Evaluation = { id: number; title: string; date: string; };

export default function EvaluationsListPage() {
  const [items, setItems] = useState<Evaluation[]>([]);
  const [classe, setClasse] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/me');
        const meJson = await me.json();
        if (me.ok && meJson.ok && meJson.role === 'STUDENT') setClasse(meJson.classe || null);
      } catch {}
      try {
        const r = await fetch('/api/evaluations');
        const d = await r.json();
        if (r.ok && d.ok) setItems(d.evaluations || []);
      } catch {}
    })();
  }, []);

  return (
    <Layout
      sidebar={<div>
        <div className="px-1">
          <h2 className="text-lg font-poppins">Bilans évaluations</h2>
          <p className="text-sm text-[var(--fg)]/70">Mes évaluations</p>
        </div>
        <SidebarNav items={buildStudentSidebar({ role: 'STUDENT', classe })} />
      </div>}
    >
      <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((ev) => (
          <a key={ev.id} href={`/bilans/${ev.id}`} className="block rounded-xl border border-white/10 p-4 hover:bg-white/5">
            <div className="text-base font-medium">{ev.title}</div>
            <div className="text-sm text-[var(--fg)]/70">{new Date(ev.date).toLocaleDateString()}</div>
          </a>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-[var(--fg)]/70">Aucune évaluation pour le moment.</div>
        )}
      </div>
    </Layout>
  );
}
