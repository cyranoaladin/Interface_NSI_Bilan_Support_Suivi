"use client";
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Layout } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Table, TD, TH, THead, TR } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { ExternalLink, FileText, KeyRound, LogOut, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TeacherDashboard() {
  const { push } = useToast();
  const [ownerName, setOwnerName] = useState<string>('');
  const [groups, setGroups] = useState<Array<{ id: string; name: string; code: string; count?: number; }>>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [students, setStudents] = useState<Array<{ email: string; name: string; }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState<Array<{ id: string; type: string; pdfUrl: string | null; publishedAt: string | null; }>>([]);
  const [modalStudentEmail, setModalStudentEmail] = useState<string | null>(null);
  const [modalFilter, setModalFilter] = useState<'all' | 'eleve' | 'enseignant'>('all');
  const [pdfReadyMap, setPdfReadyMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
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

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/teacher/students?groupId=${encodeURIComponent(selectedId)}`);
        const d = await r.json();
        if (r.ok && d.ok) {
          setStudents(d.students);
          // maj du compteur sur le groupe sélectionné (hors élèves de test)
          const filteredCount = (Array.isArray(d.students) ? d.students : []).filter((s: any) => {
            const e = String(s?.email || '').toLowerCase();
            return !(e.includes('+eleve_') || e.startsWith('test.'));
          }).length;
          setGroups(prev => prev.map(g => g.id === selectedId ? { ...g, count: filteredCount } : g));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedId]);

  // Optionally auto-check readiness in background for visible rows
  useEffect(() => {
    let timer: any;
    async function checkRows() {
      const next = { ...pdfReadyMap };
      for (const b of modalRows) {
        if (!b?.id || !b?.pdfUrl) continue;
        if (next[b.id]) continue;
        try {
          const res = await fetch(`/api/bilan/download/${b.id}`, { method: 'HEAD' });
          if (res.ok) next[b.id] = true;
        } catch {}
      }
      setPdfReadyMap(next);
    }
    (async () => {
      await checkRows();
      timer = setInterval(checkRows, 5000);
    })();
    return () => { if (timer) clearInterval(timer); };
  }, [modalRows]);

  const selected = groups.find(g => g.id === selectedId) || null;

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
      sidebar={<div className="space-y-2">
        <div className="px-1">
          <h2 className="text-lg font-poppins">{ownerName || 'Espace Enseignant'}</h2>
          <p className="text-sm text-[var(--fg)]/70">Sélectionner un groupe</p>
        </div>
        <div className="mt-4">
          <h3 className="text-sm text-[var(--fg)]/70 px-3 mb-1">Mes groupes</h3>
          <ul className="space-y-1">
            {groups.map(g => (
              <li key={g.id}>
                <button className={`block w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 ${selectedId === g.id ? 'bg-white/10' : ''}`} onClick={() => setSelectedId(g.id)}>
                  <span className="font-medium">{g.name}</span>
                  <span className="ml-2 text-xs text-[var(--fg)]/60">({g.code})</span>
                  {typeof g.count === 'number' && <span className="ml-2 text-xs text-[var(--fg)]/50">— {g.count} élèves</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>}
    >
      <div className="space-y-6">
        <h1 className="text-2xl">{selected ? `${selected.name} (${selected.code})` : 'Mes groupes'}</h1>

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
                        <Button variant="secondary" onClick={async () => {
                          const r = await fetch('/api/teacher/students/reactivate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: s.email }) });
                          push({ message: r.ok ? 'Soumission réactivée' : 'Erreur de réactivation', variant: r.ok ? 'success' : 'error' });
                        }}>Réactiver la soumission</Button>
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
              <input type="file" name="file" required accept=".pdf,.txt,.md,.mdx,.html,.htm" className="block w-full text-sm" />
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
                if (r.ok && d.ok) {
                  setModalRows(d.bilans);
                  // reset readiness map and recheck
                  const next: Record<string, boolean> = {};
                  setPdfReadyMap(next);
                  push({ message: 'Liste rafraîchie', variant: 'success' });
                } else { push({ message: d.error || 'Erreur de rafraîchissement', variant: 'error' }); }
              }}>Rafraîchir</Button>
            </div>
          </div>
          {modalRows.length === 0 ? (
            <p className="text-sm text-[var(--fg)]/70">Aucun bilan pour cet élève.</p>
          ) : (
            <ul className="space-y-2">
              {modalRows
                .filter(b => (modalFilter === 'all' ? true : (modalFilter === 'eleve' ? b.type === 'eleve' : b.type === 'enseignant')) && !!b.pdfUrl)
                .map(b => (
                  <li key={b.id} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm">{b.type === 'eleve' ? 'Bilan Élève' : 'Bilan Enseignant'}</div>
                      <div className="text-xs text-[var(--fg)]/60">{b.publishedAt ?? 'Non publié'}</div>
                    </div>
                    <div>
                      {b.id && b.pdfUrl ? (
                        <div className="flex items-center gap-2">
                          <Button variant="link" onClick={async () => {
                            try {
                              const res = await fetch(`/api/bilan/download/${b.id}`, { method: 'HEAD' });
                              if (res.ok) {
                                window.open(`/api/bilan/download/${b.id}`, '_blank', 'noopener,noreferrer');
                              } else {
                                push({ message: 'PDF en préparation — réessaie dans quelques instants.', variant: 'warning' });
                              }
                            } catch {
                              push({ message: 'Impossible d\'ouvrir le PDF pour le moment.', variant: 'error' });
                            }
                          }} className="text-electric">
                            Ouvrir <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--fg)]/60">PDF en préparation</span>
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
