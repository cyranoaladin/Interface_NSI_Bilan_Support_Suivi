"use client";
import dynamic from "next/dynamic";
import useSWR from "swr";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const fetcher = (u:string) => fetch(u).then(r=>r.json());

export default function QuizPlay({ params }: { params: { id: string } }) {
  if (process.env.NEXT_PUBLIC_FEATURE_QUIZ !== "1" && process.env.FEATURE_QUIZ !== "1") {
    return <div className="p-6 text-sm opacity-70">FEATURE_QUIZ=0</div>;
  }
  const { data } = useSWR(`/api/quiz/${params.id}`, fetcher);
  const quiz = data?.quiz;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Quiz</h1>
      {!quiz ? <div>Chargement…</div> :
        quiz.items.map((it:any) => (
          <div key={it.id} className="border border-white/10 rounded-xl p-3 space-y-2">
            <div className="font-medium">{it.exercise.title}</div>
            <div className="prose prose-invert" dangerouslySetInnerHTML={{ __html: it.exercise.statementMd }} />
            {it.exercise.type === "CODING" && (
              <Monaco height="240px" defaultLanguage="python" defaultValue="# votre code ici" />
            )}
          </div>
        ))
      }
    </div>
  );
}
