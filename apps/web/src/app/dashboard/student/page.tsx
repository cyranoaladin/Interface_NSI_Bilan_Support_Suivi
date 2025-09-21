'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { Download, KeyRound, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

type SimpleReport = { id: string; pdfUrl: string | null; attemptId?: string; };

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState('');
  const [classe, setClasse] = useState('');
  const [latestReport, setLatestReport] = useState<SimpleReport | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me');
        const d = await r.json();
        if (r.ok && d.ok && d.role === 'STUDENT') {
          setStudentName(`${d.givenName} ${d.familyName}`);
          setClasse(d.classe || '');
        }
      } catch {}
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
      } catch {}
    })();
  }, []);

  const [pdfReady, setPdfReady] = useState(false);

  useEffect(() => {
    let timer: any;
    async function checkReady() {
      try {
        if (latestReport && latestReport.pdfUrl) {
          const url = `/api/bilan/download/${latestReport.id}`;
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) { setPdfReady(true); return; }
        }
      } catch {}
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
          try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
          window.location.href = '/login';
        }}><LogOut className="h-4 w-4" /> Déconnexion</Button>
      </div>}
      sidebar={<div>
        <div className="px-1">
          <h2 className="text-lg font-poppins">{studentName || 'Mon tableau de bord'}</h2>
          <p className="text-sm text-[var(--fg)]/70">{classe || 'NSI'}</p>
        </div>
        <SidebarNav items={[
          { href: '/dashboard/student', label: 'Accueil' },
        ]} />
      </div>}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-xl">Bienvenue sur NSI-PMF</h3>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--fg)]/80">Commence par le questionnaire de rentrée pour générer ton bilan personnalisé.</p>
          </CardContent>
        </Card>

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
                <Button variant="link" disabled={downloading} onClick={async () => {
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
                }} className="inline-flex items-center gap-2 text-electric">
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
