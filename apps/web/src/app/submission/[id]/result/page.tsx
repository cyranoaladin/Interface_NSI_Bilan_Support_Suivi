import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function SubmissionResult({ params }: { params: { id: string } }) {
  const res = await fetch(`${process.env.APP_BASE_URL || ''}/api/submission/${params.id}/result`, { cache: 'no-store' });
  const json = await res.json();
  const result = json?.result;
  if (!result) return <div className="p-6">Aucun résultat.</div> as any;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Résultats</h1>
      <div>Score global: <b>{Math.round((result.totalScore ?? 0) * 100)}%</b></div>
      <div className="space-y-2">
        {result.items.map((it:any, idx:number) => (
          <div key={idx} className="border border-white/10 rounded-xl p-3">
            <div>Item {idx+1} — {it.exerciseTitle}: {Math.round((it.score ?? 0) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
