import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function SubmissionResult({ params }: { params: { id: string } }) {
  const res = await fetch(`${process.env.APP_BASE_URL || ""}/api/submission/${params.id}/result`, { cache: "no-store" });
  const json = await res.json();
  if (!json?.ok) return <div className="p-6">Erreur: {json?.error}</div> as any;
  const { score, items } = json.data as any;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Résultats</h1>
      <div>Score global: <b>{Math.round(score * 100)}%</b></div>
      <div className="space-y-2">
        {items.map((it:any, idx:number) => (
          <div key={idx} className="border border-white/10 rounded-xl p-3">
            <div>Item {idx+1}: {Math.round(it.score * 100)}%</div>
            {it.feedback && <pre className="text-xs opacity-80 mt-2">{JSON.stringify(it.feedback, null, 2)}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}
