"use client";
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { buildStudentSidebar } from '@/lib/menu';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Evaluation = { id: number; title: string; date: string; };
type Bilan = {
  noteFinale?: string;
  appreciationGenerale?: string;
  pointsForts?: string[] | any;
  axesAmelioration?: string[] | any;
  conseils?: string[] | any;
};

export default function EvaluationDetailPage() {
  const params = useParams<{ evaluationId: string; }>();
  const evaluationId = params?.evaluationId;
  const [classe, setClasse] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [bilan, setBilan] = useState<Bilan | null>(null);

  useEffect(() => {
    if (!evaluationId) return;
    (async () => {
      try {
        const me = await fetch('/api/me');
        const meJson = await me.json();
        if (me.ok && meJson.ok && meJson.role === 'STUDENT') setClasse(meJson.classe || null);
      } catch {}
      try {
        const r = await fetch(`/api/bilans/${evaluationId}`);
        const d = await r.json();
        if (r.ok && d.ok) {
          setEvaluation(d.evaluation);
          setBilan(d.bilan);
        }
      } catch {}
    })();
  }, [evaluationId]);

  const renderList = (val?: any) => {
    const arr: string[] = Array.isArray(val) ? val : (val && typeof val === 'object' ? Object.values(val) as string[] : []);
    // Normaliser les éléments potentiellement objets {text: "..."}
    const flat = arr.map((it: any) => {
      if (typeof it === 'string') return it;
      if (it && typeof it === 'object') {
        if (typeof (it as any).text === 'string') return (it as any).text;
        return JSON.stringify(it);
      }
      return String(it);
    }).filter((s: string) => s && s.trim().length > 0);
    if (!flat || flat.length === 0) return <div className="text-sm text-[var(--fg)]/60">—</div>;
    return (
      <ul className="list-disc pl-5 space-y-1">
        {flat.map((it, idx) => (<li key={idx} className="text-sm">{String(it)}</li>))}
      </ul>
    );
  };

  return (
    <Layout
      sidebar={<div>
        <div className="px-1">
          <h2 className="text-lg font-poppins">Bilans évaluations</h2>
          <p className="text-sm text-[var(--fg)]/70">Détail</p>
        </div>
        <SidebarNav items={buildStudentSidebar({ role: 'STUDENT', classe })} />
      </div>}
    >
      <div className="p-4 space-y-4">
        <div>
          <div className="text-xl font-semibold">{evaluation?.title || 'Évaluation'}</div>
          <div className="text-sm text-[var(--fg)]/70">{evaluation?.date ? new Date(evaluation.date).toLocaleDateString() : ''}</div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-[var(--fg)]/70">Note finale</div>
              <div className="text-base font-medium">{bilan?.noteFinale || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--fg)]/70">Appréciation générale</div>
              <div className="text-base whitespace-pre-wrap">{bilan?.appreciationGenerale || '—'}</div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-[var(--fg)]/70">Points forts</div>
              {renderList(bilan?.pointsForts)}
            </div>
            <div>
              <div className="text-sm text-[var(--fg)]/70">Axes d'amélioration</div>
              {renderList(bilan?.axesAmelioration)}
            </div>
            <div>
              <div className="text-sm text-[var(--fg)]/70">Conseils</div>
              {renderList(bilan?.conseils)}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
