'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { buildStudentSidebar } from '@/lib/menu';
import { Download, KeyRound, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Timeline } from '@/components/ui/Timeline';
import { RadarChart } from '@/components/charts/RadarChart';

type SimpleReport = { id: string; pdfUrl: string | null; attemptId?: string; };

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState('');
  const [classe, setClasse] = useState('');
  const [latestReport, setLatestReport] = useState<SimpleReport | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  // Données de progression (chargées depuis l'API)
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [weakPoints, setWeakPoints] = useState<Array<{ domain: string; score: number }>>([]);
  const [hasProgressionData, setHasProgressionData] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me');
        const d = await r.json();
        if (r.ok && d.ok && d.role === 'STUDENT') {
          const gn = (d.givenName || '').trim();
          const fn = (d.familyName || '').trim();
          const fallback = (d.email || '').split('@')[0];
          setStudentName((gn || fn) ? `${gn} ${fn}`.trim() : fallback);
          setClasse(d.classe || '');
        }
      } catch { }

      try {
        const r2 = await fetch('/api/my/reports');
        const d2 = await r2.json();
        if (r2.ok && d2.ok) {
          setHasSubmitted(!!d2.hasSubmitted);
          if (Array.isArray(d2.reports) && d2.reports.length > 0) {
            const rep = d2.reports.find((x: any) => x.type === 'eleve') || d2.reports[0];
            setLatestReport({ id: rep.id, pdfUrl: rep.pdfUrl || null, attemptId: rep.attemptId });
          }
        }
      } catch { }

      // Charger les données de progression
      try {
        const r3 = await fetch('/api/student/progression');
        const d3 = await r3.json();
        if (r3.ok && d3.ok) {
          setTimelineItems(d3.timeline || []);
          setScores(d3.scores || {});
          setWeakPoints(d3.weakPoints || []);
          setHasProgressionData(d3.hasData || false);
        }
      } catch { }
    })();
  }, []);

  useEffect(() => {
    let timer: any;
    async function checkReady() {
      try {
        if (latestReport && latestReport.pdfUrl) {
          const url = `/api/bilan/download/${latestReport.id}`;
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) { setPdfReady(true); return; }
        }
      } catch { }
      setPdfReady(false);
    }
    (async () => {
      await checkReady();
      timer = setInterval(checkReady, 5000);
    })();
    return () => { if (timer) clearInterval(timer); };
  }, [latestReport?.id, latestReport?.pdfUrl]);

  const showProcessing = hasSubmitted && (!latestReport || !latestReport.pdfUrl || !pdfReady);

  return (
    <Layout
      right={<div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => { window.location.href = '/change-password'; }} title="Changer mon mot de passe">
          <KeyRound className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={async () => {
          try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { }
          window.location.href = '/login';
        }}><LogOut className="h-4 w-4" /> Déconnexion</Button>
      </div>}
      sidebar={<div>
        <div className="px-1">
          <h2 className="text-lg font-poppins">{studentName || 'Mon tableau de bord'}</h2>
          <p className="text-sm text-[var(--fg)]/70">{classe || 'NSI'}</p>
        </div>
        <SidebarNav items={buildStudentSidebar({ role: 'STUDENT', classe })} />
      </div>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonne Gauche: Progression & Next Steps */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Ma Progression</h3>
              </CardHeader>
              <CardContent>
                {hasProgressionData && timelineItems.length > 0 ? (
                  <Timeline items={timelineItems} />
                ) : (
                  <div className="text-center py-8 text-[var(--fg)]/60">
                    <p>Complète ton premier bilan pour voir ta progression !</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Mes Prochaines Étapes</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="mt-1 w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <h4 className="font-medium text-blue-400">Compléter le bilan mi-trimestre</h4>
                      <p className="text-sm text-[var(--fg)]/70">Questionnaire disponible jusqu'au 30/11</p>
                      <Button
                        variant="ghost"
                        className="text-blue-400 p-0 h-auto mt-1 hover:bg-transparent hover:underline"
                        onClick={() => document.getElementById('start_bilan_button')?.click()}
                      >
                        Commencer maintenant →
                      </Button>
                    </div>
                  </div>

                  {weakPoints.length > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="mt-1 w-2 h-2 rounded-full bg-gray-500" />
                      <div>
                        <h4 className="font-medium">Travailler {weakPoints[0].domain}</h4>
                        <p className="text-sm text-[var(--fg)]/70">
                          Score actuel: {weakPoints[0].score}% - Objectif: +10% d'ici fin trimestre
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne Droite: Radar Chart */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Mes Points Forts</h3>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                {hasProgressionData && Object.keys(scores).length > 0 ? (
                  <RadarChart data={scores} size={250} />
                ) : (
                  <div className="text-center py-12 text-[var(--fg)]/60">
                    <p className="text-sm">Tes scores apparaîtront ici après ton premier bilan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-xl">Questionnaire</h3>
          </CardHeader>
          <CardContent>
            <Button id="start_bilan_button" variant="primary" disabled={creating} onClick={async () => {
              try {
                setCreating(true);
                const r = await fetch('/api/bilan/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                const d = await r.json().catch(() => ({}));
                if (r.ok && d?.bilanId) {
                  window.location.href = `/bilan/${d.bilanId}/questionnaire`;
                } else {
                  alert('Erreur lors de la création du bilan.');
                }
              } catch {
                alert('Erreur réseau.');
              } finally {
                setCreating(false);
              }
            }}>
              {creating ? 'Création…' : 'Commencer le questionnaire'}
            </Button>
          </CardContent>
        </Card>

        {showProcessing && (
          <Card>
            <CardHeader>
              <h3 className="text-xl flex items-center gap-2">
                Ton PDF n’est pas encore prêt
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                  <span className="relative inline-block w-2 h-2 rounded-full bg-electric">
                    <span className="absolute inset-0 animate-ping rounded-full bg-electric/50"></span>
                  </span>
                  En traitement…
                </span>
              </h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[var(--fg)]/80">
                  Après la soumission du questionnaire, la plateforme génère ton bilan (1 à 2 minutes en moyenne).
                  Aucun e‑mail n’est envoyé : télécharge le PDF directement depuis ce tableau de bord.
                </p>
                <Button variant="secondary" onClick={async () => {
                  setRefreshing(true);
                  try {
                    const r2 = await fetch('/api/my/reports');
                    const d2 = await r2.json();
                    if (r2.ok && d2.ok && Array.isArray(d2.reports) && d2.reports.length > 0) {
                      const rep = d2.reports.find((x: any) => x.type === 'eleve') || d2.reports[0];
                      setLatestReport({ id: rep.id, pdfUrl: rep.pdfUrl || null });
                    }
                    if (r2.ok && d2.ok) setHasSubmitted(!!d2.hasSubmitted);
                  } finally { setRefreshing(false); }
                }} disabled={refreshing}>
                  {refreshing ? 'Rafraîchissement…' : 'Rafraîchir'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h3 className="text-xl">Bilan PDF</h3>
          </CardHeader>
          <CardContent>
            {latestReport ? (
              latestReport.pdfUrl ? (
                <Button variant="ghost" disabled={downloading} onClick={async () => {
                  setDownloading(true);
                  try {
                    const url = `/api/bilan/download/${latestReport.id}`;
                    const res = await fetch(url, { method: 'GET' });
                    if (res.ok) {
                      // Ouvrir dans un nouvel onglet sans re-télécharger via fetch
                      window.location.href = url;
                    } else {
                      alert('Le PDF n\'est pas encore disponible. Réessaie dans quelques instants.');
                    }
                  } catch {
                    alert('Impossible de récupérer le PDF pour le moment.');
                  } finally {
                    setDownloading(false);
                  }
                }} className="inline-flex items-center gap-2 text-electric hover:bg-transparent hover:underline p-0 h-auto">
                  <Download className="h-4 w-4" /> {downloading ? 'Préparation…' : 'Télécharger le bilan'}
                </Button>
              ) : (
                <p className="text-[var(--fg)]/70">PDF en préparation</p>
              )
            ) : (
              <p className="text-[var(--fg)]/70">Disponible après génération.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
