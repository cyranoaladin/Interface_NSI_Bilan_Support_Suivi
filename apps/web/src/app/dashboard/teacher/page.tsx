"use client";
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Layout } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { Table, TD, TH, THead, TR } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { ExternalLink, FileText, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TeacherDashboard() {
  const { push } = useToast();
  const [groups] = useState([
    { id: 'g1', name: 'TEDS NSI' },
    { id: 'g2', name: '1EDS NSI1' },
  ]);
  const [selectedId, setSelectedId] = useState('g1');
  const [students, setStudents] = useState<Array<{ email: string; name: string; }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState<Array<{ id: string; type: string; pdfUrl: string | null; publishedAt: string | null; }>>([]);
  const [modalStudentEmail, setModalStudentEmail] = useState<string | null>(null);
  const [modalFilter, setModalFilter] = useState<'all' | 'eleve' | 'enseignant'>('all');
  const selected = groups.find(g => g.id === selectedId)!;

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setStudents([
        { email: 'eleve1@ert.tn', name: 'Élève Un' },
        { email: 'eleve2@ert.tn', name: 'Élève Deux' },
      ]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedId]);

  return (
    <Layout
      sidebar={<div className="space-y-2">
        <div className="px-1">
          <h2 className="text-lg font-poppins">Espace Enseignant</h2>
          <p className="text-sm text-[var(--fg)]/70">Gestion des groupes</p>
        </div>
        <SidebarNav items={[{ href: '/dashboard/teacher', label: 'Groupes' }]} />
        <div className="mt-4">
          <h3 className="text-sm text-[var(--fg)]/70 px-3 mb-1">Mes Groupes</h3>
          <ul className="space-y-1">
            {groups.map(g => (
              <li key={g.id}>
                <button className={`block w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 ${selectedId === g.id ? 'bg-white/10' : ''}`} onClick={() => setSelectedId(g.id)}>{g.name}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>}
    >
      <div className="space-y-6">
        <h1 className="text-2xl">{selected.name}</h1>

        <Card>
          <CardHeader>
            <h3 className="text-xl">Élèves</h3>
          </CardHeader>
          <CardContent>
            <Table loading={loading}>
              <THead>
                <TR>
                  <TH>Nom</TH>
                  <TH>Email</TH>
                  <TH>Statut</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <tbody>
                {students.map(s => (
                  <TR key={s.email}>
                    <TD>{s.name}</TD>
                    <TD>{s.email}</TD>
                    <TD><Badge variant="default">Actif</Badge></TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={async () => {
                          const r = await fetch(`/api/teacher/bilans?studentEmail=${encodeURIComponent(s.email)}`);
                          const d = await r.json();
                          if (r.ok && d.ok) { setModalRows(d.bilans); setModalStudentEmail(s.email); setModalOpen(true); } else { push({ message: d.error || 'Erreur chargement bilans', variant: 'error' }); }
                        }}><FileText className="h-4 w-4" /> Voir bilans</Button>
                        <Button variant="outline" onClick={async () => {
                          const r = await fetch('/api/teacher/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: s.email }) });
                          push({ message: r.ok ? 'Mot de passe réinitialisé' : 'Erreur de réinitialisation', variant: r.ok ? 'success' : 'error' });
                        }}><RotateCcw className="h-4 w-4" /> Réinitialiser mot de passe</Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xl">Ingestion RAG</h3>
          </CardHeader>
          <CardContent>
            <form action="/api/rag/upload" method="post" encType="multipart/form-data" className="space-y-3">
              <input type="file" name="file" className="block w-full text-sm" />
              <Button type="submit" variant="primary">Uploader</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Bilans PDF">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--fg)]/70">Filtrer:</span>
              <div className="inline-flex rounded-xl border border-white/10 overflow-hidden">
                <button className={`px-3 py-1 text-sm ${modalFilter === 'all' ? 'bg-white/10' : ''}`} onClick={() => setModalFilter('all')}>Tous</button>
                <button className={`px-3 py-1 text-sm ${modalFilter === 'eleve' ? 'bg-white/10' : ''}`} onClick={() => setModalFilter('eleve')}>Élève</button>
                <button className={`px-3 py-1 text-sm ${modalFilter === 'enseignant' ? 'bg-white/10' : ''}`} onClick={() => setModalFilter('enseignant')}>Enseignant</button>
              </div>
            </div>
            <div>
              <Button variant="outline" onClick={async () => {
                if (!modalStudentEmail) return;
                const r = await fetch(`/api/teacher/bilans?studentEmail=${encodeURIComponent(modalStudentEmail)}`);
                const d = await r.json();
                if (r.ok && d.ok) { setModalRows(d.bilans); push({ message: 'Liste rafraîchie', variant: 'success' }); }
                else { push({ message: d.error || 'Erreur de rafraîchissement', variant: 'error' }); }
              }}>Rafraîchir</Button>
            </div>
          </div>
          {modalRows.length === 0 ? (
            <p className="text-sm text-[var(--fg)]/70">Aucun bilan pour cet élève.</p>
          ) : (
            <ul className="space-y-2">
              {modalRows.filter(b => modalFilter === 'all' ? true : (modalFilter === 'eleve' ? b.type === 'eleve' : b.type === 'enseignant')).map(b => (
                <li key={b.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm">{b.type === 'eleve' ? 'Bilan Élève' : 'Bilan Enseignant'}</div>
                    <div className="text-xs text-[var(--fg)]/60">{b.publishedAt ?? 'Non publié'}</div>
                  </div>
                  <div>
                    {b.pdfUrl ? (
                      <div className="flex items-center gap-2">
                        <a className="text-electric hover:underline" href={b.pdfUrl} download>Télécharger</a>
                        <a className="inline-flex items-center gap-1 text-[var(--fg)]/80 hover:text-white" href={b.pdfUrl} target="_blank" rel="noreferrer">
                          Ouvrir <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--fg)]/60">PDF indisponible</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
