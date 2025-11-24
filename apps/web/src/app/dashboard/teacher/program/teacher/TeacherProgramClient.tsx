"use client";
import useSWR from 'swr';
import { useCallback, useMemo, useState } from 'react';

type Notion = { id: string; code: string; title: string; description?: string; order: number };
type Theme = { id: string; code: string; title: string; order: number; notions: Notion[] };

type CoverageAgg = { notionId: string; count: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TeacherProgramClient() {
  const [groupId, setGroupId] = useState<string | undefined>(undefined);
  const teacherId = 'teacher-demo';

  const { data, mutate, isLoading } = useSWR<{ tree: Theme[]; coverage: CoverageAgg[] }>(
    `/api/curriculum/tree${groupId ? `?groupId=${encodeURIComponent(groupId)}` : ''}`,
    fetcher
  );

  const coverageByNotion = useMemo(() => {
    const m = new Map<string, number>();
    (data?.coverage ?? []).forEach((c: any) => m.set(String(c.notionid || c.notionId), Number(c.count ?? 0)));
    return m;
  }, [data]);

  const postCoverage = useCallback(
    async (notionId: string) => {
      if (!teacherId) return;
      const body = { groupId, teacherId, notionId };
      const res = await fetch('/api/curriculum/coverage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert('Échec: ' + (j?.message || res.status));
      } else {
        mutate();
      }
    },
    [groupId, teacherId, mutate]
  );

  return (
    <div className="container py-6">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Programme & ressources</h1>
          <p className="text-sm opacity-70">Cochez ce qui a été abordé et liez des documents par notion.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Groupe</label>
          <input
            className="px-2 py-1 rounded border border-white/10 bg-white/5"
            placeholder="ex: TNSI"
            onChange={(e) => setGroupId(e.target.value || undefined)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div>Chargement…</div>
        ) : (
          (data?.tree ?? []).map((t) => (
            <details key={t.id} className="rounded-lg border border-white/10 bg-white/5">
              <summary className="cursor-pointer px-3 py-2">
                <span className="font-semibold">{t.code}</span> — {t.title}
              </summary>
              <div className="p-3 space-y-2">
                {(t.notions ?? []).map((n) => {
                  const count = coverageByNotion.get(n.id) || 0;
                  return (
                    <div key={n.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
                      <div>
                        <div className="font-medium">{n.code} — {n.title}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs opacity-75">Couvert: {count}</span>
                        <button
                          className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15"
                          onClick={() => postCoverage(n.id)}
                        >
                          Marquer couvert
                        </button>
                        <UploadForNotion notionId={n.id} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

function UploadForNotion({ notionId }: { notionId: string }) {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const onSelect = (e: any) => setFile(e.target.files?.[0] ?? null);
  const upload = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('notionId', notionId);
      const r = await fetch('/api/resources/upload', { method: 'POST', body: form });
      if (!r.ok) throw new Error('Upload failed');
      setFile(null);
      alert('Document envoyé ✅');
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [file, notionId]);
  return (
    <div className="flex items-center gap-2">
      <input type="file" onChange={onSelect} className="text-xs" />
      <button disabled={!file || busy} onClick={upload} className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15 disabled:opacity-50">
        {busy ? 'Envoi…' : 'Uploader'}
      </button>
    </div>
  );
}
