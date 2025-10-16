"use client";
import useSWR from "swr";
const fetcher = (u:string)=>fetch(u).then(r=>r.json());

export default function StudentProgress() {
  const { data } = useSWR("/api/student/mastery", fetcher);
  const mastery = data?.data?.mastery ?? [];
  const avg = mastery.length ? mastery.reduce((a:any,b:any)=>a+b.mastery,0)/mastery.length : 0;

  return (
    <div className="border border-white/10 rounded-xl p-3">
      <div className="text-sm opacity-70">Progression notionnelle</div>
      <div className="mt-2 h-2 w-full bg-white/10 rounded">
        <div className="h-2 bg-green-500 rounded" style={{ width: `${Math.round(avg*100)}%`}} />
      </div>
      <div className="mt-2 text-xs opacity-70">{Math.round(avg*100)}% moyen</div>
    </div>
  );
}
