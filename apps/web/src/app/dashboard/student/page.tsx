'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { Download, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState('');
  const [classe, setClasse] = useState('');
  const [questionnaireSubmitted] = useState(false);
  const [latestReportId, setLatestReportId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me');
        const d = await r.json();
        if (r.ok && d.ok && d.role === 'STUDENT') {
          setStudentName(`${d.familyName} ${d.givenName}`);
          setClasse(d.classe || '');
        }
      } catch {}
      try {
        const r2 = await fetch('/api/my/reports');
        const d2 = await r2.json();
        if (r2.ok && d2.ok && Array.isArray(d2.reports) && d2.reports.length > 0) {
          const rep = d2.reports.find((x: any) => x.type === 'eleve') || d2.reports[0];
          setLatestReportId(rep.id);
        }
      } catch {}
    })();
  }, []);

  return (
    <Layout
      right={<Button variant="ghost" onClick={async () => {
        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
        window.location.href = '/login';
      }}><LogOut className="h-4 w-4" /> Déconnexion</Button>}
      sidebar={<div>
        <div className="px-1">
          <h2 className="text-lg font-poppins">{studentName || 'Mon tableau de bord'}</h2>
          <p className="text-sm text-[var(--fg)]/70">{classe || 'NSI'}</p>
        </div>
        <SidebarNav items={[
          { href: '/dashboard/student', label: 'Accueil' },
          { href: '/bilan/initier', label: 'Questionnaire' },
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
            {questionnaireSubmitted ? (
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm">Questionnaire soumis</span>
            ) : (
              <Button variant="primary" onClick={() => { window.location.href = '/bilan/initier'; }}>Commencer le questionnaire</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xl">Bilan PDF</h3>
          </CardHeader>
          <CardContent>
            {latestReportId ? (
              <a href={`/api/bilan/download/${latestReportId}`} className="inline-flex items-center gap-2 text-electric hover:underline">
                <Download className="h-4 w-4" /> Télécharger le bilan
              </a>
            ) : <p className="text-[var(--fg)]/70">Disponible après génération.</p>}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
