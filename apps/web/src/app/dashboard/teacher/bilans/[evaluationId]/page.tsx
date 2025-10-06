"use client";
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { buildTeacherSidebar } from '@/lib/menu';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Evaluation = { id: number; title: string; date: string; };
type Bilan = {
  studentEmail: string;
  noteFinale?: string;
  appreciationGenerale?: string;
  pointsForts?: any;
  axesAmelioration?: any;
  conseils?: any;
};

export default function TeacherEvaluationDetailPage() {
  const params = useParams<{ evaluationId: string; }>();
  const sp = useSearchParams();
  const evaluationId = params?.evaluationId;
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [bilans, setBilans] = useState<Bilan[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(sp?.get('studentEmail') || null);
  const [selectedBilan, setSelectedBilan] = useState<Bilan | null>(null);

  useEffect(() => {
    if (!evaluationId) return;
    (async () => {
      try {
        // charger la liste des bilans pour cette évaluation
        const r = await fetch(`/api/teacher/bilans?evaluationId=${encodeURIComponent(String(evaluationId))}`);
        const d = await r.json();
        if (r.ok && d.ok) {
          setEvaluation(d.evaluation || null);
          setBilans(Array.isArray(d.bilans) ? d.bilans : []);
          if (!selectedEmail && Array.isArray(d.bilans) && d.bilans.length > 0) {
            setSelectedEmail(d.bilans[0].studentEmail);
          }
        }
      } catch {}
    })();
  }, [evaluationId]);

  useEffect(() => {
    if (!evaluationId || !selectedEmail) { setSelectedBilan(null); return; }
    (async () => {
      try {
        const r = await fetch(`/api/teacher/bilans?evaluationId=${encodeURIComponent(String(evaluationId))}&studentEmail=${encodeURIComponent(selectedEmail)}`);
        const d = await r.json();
        if (r.ok && d.ok) setSelectedBilan(d.bilan || null);
      } catch { setSelectedBilan(null); }
    })();
  }, [evaluationId, selectedEmail]);

  const items = useMemo(() => buildTeacherSidebar().resources, []);

  const renderList = (val?: any) => {
    const arr: string[] = Array.isArray(val) ? val : (val && typeof val === 'object' ? Object.values(val) as string[] : []);
    const flat = arr.map((it: any) => {
      if (typeof it === 'string') return it;
      if (it && typeof it === 'object' && typeof it.text === 'string') return it.text;
      return JSON.stringify(it);
    }).filter((s) => s && s.trim().length > 0);
    if (!flat.length) return <div className="text-sm text-[var(--fg)]/60">—</div>;
    return (
      <ul className="list-disc pl-5 space-y-1">
        {flat.map((it, idx) => (<li key={idx} className="text-sm">{String(it)}</li>))}
      </ul>
    );
  };

  return (
    <Layout
      sidebar={<div className="space-y-2">
        <div className="px-1">
          <h2 className="text-lg font-poppins">Bilans évaluations</h2>
          <p className="text-sm text-[var(--fg)]/70">Enseignant</p>
        </div>
        <SidebarNav items={items} />
      </div>}
    >
      <div className="p-4 space-y-6">
        <div>
          <div className="text-xl font-semibold">{evaluation?.title || 'Évaluation'}</div>
          <div className="text-sm text-[var(--fg)]/70">{evaluation?.date ? new Date(evaluation.date).toLocaleDateString() : ''}</div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm text-[var(--fg)]/70">Élèves</div>
            <div className="border rounded-md divide-y">
              {bilans.map((b) => (
                <button key={b.studentEmail}
                  onClick={() => setSelectedEmail(b.studentEmail)}
                  className={`w-full text-left px-3 py-2 hover:bg-white/5 ${selectedEmail === b.studentEmail ? 'bg-white/10' : ''}`}>
                  <div className="text-sm font-medium">{b.studentEmail}</div>
                  <div className="text-xs text-[var(--fg)]/60">Note: {b.noteFinale || '—'}</div>
                </button>
              ))}
              {bilans.length === 0 && (
                <div className="px-3 py-2 text-sm text-[var(--fg)]/60">Aucun bilan</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-[var(--fg)]/70">Bilan sélectionné</div>
            {selectedBilan ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[var(--fg)]/70">Élève</div>
                  <div className="text-base font-medium">{selectedBilan.studentEmail}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--fg)]/70">Note finale</div>
                  <div className="text-base font-medium">{selectedBilan.noteFinale || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--fg)]/70">Appréciation générale</div>
                  <div className="text-base whitespace-pre-wrap">{selectedBilan.appreciationGenerale || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--fg)]/70">Points forts</div>
                  {renderList(selectedBilan.pointsForts)}
                </div>
                <div>
                  <div className="text-sm text-[var(--fg)]/70">Axes d'amélioration</div>
                  {renderList(selectedBilan.axesAmelioration)}
                </div>
                <div>
                  <div className="text-sm text-[var(--fg)]/70">Conseils</div>
                  {renderList(selectedBilan.conseils)}
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--fg)]/60">Sélectionnez un élève pour afficher son bilan.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
