'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { Download } from 'lucide-react';

export default async function StudentDashboard() {
  // TODO: fetch session, student info, last attempt, report availability
  const studentName = 'Élève';
  const questionnaireSubmitted = false;
  const reportUrl: string | null = null;

  return (
    <Layout
      sidebar={<div>
        <div className="px-1">
          <h2 className="text-lg font-poppins">{studentName}</h2>
          <p className="text-sm text-[var(--fg)]/70">Terminale NSI</p>
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
            <h3 className="text-xl">Bienvenue sur Nexus Réussite</h3>
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
            {reportUrl ? (
              <a href={reportUrl} className="inline-flex items-center gap-2 text-electric hover:underline">
                <Download className="h-4 w-4" /> Télécharger le bilan
              </a>
            ) : (
              <p className="text-[var(--fg)]/70">Disponible après génération.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
