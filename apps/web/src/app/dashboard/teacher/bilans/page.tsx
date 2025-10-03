"use client";
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { buildTeacherSidebar } from '@/lib/menu';
import { useEffect, useState } from 'react';

type Evaluation = { id: number; title: string; date: string; };

export default function TeacherBilansPage() {
  const [items, setItems] = useState<Evaluation[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/teacher/bilans');
        const d = await r.json();
        if (r.ok && d.ok) setItems(d.evaluations || []);
      } catch {}
    })();
  }, []);

  return (
    <Layout
      sidebar={<div className="space-y-2">
        <div className="px-1">
          <h2 className="text-lg font-poppins">Bilans évaluations</h2>
          <p className="text-sm text-[var(--fg)]/70">Enseignant</p>
        </div>
        <div className="mt-2">
          <SidebarNav items={buildTeacherSidebar().resources} />
        </div>
      </div>}
    >
      <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((ev) => (
          <a key={ev.id} href={`/dashboard/teacher/bilans/${ev.id}`} className="block rounded-xl border border-white/10 p-4 hover:bg-white/5">
            <div className="text-base font-medium">{ev.title}</div>
            <div className="text-sm text-[var(--fg)]/70">{new Date(ev.date).toLocaleDateString()}</div>
          </a>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-[var(--fg)]/70">Aucune évaluation.</div>
        )}
      </div>
    </Layout>
  );
}
