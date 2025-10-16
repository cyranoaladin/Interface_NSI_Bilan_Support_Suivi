import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherProgram() {
  if (process.env.FEATURE_CURRICULUM !== "1") {
    return <div className="p-6 text-sm opacity-70">FEATURE_CURRICULUM=0</div>;
  }
  const themes = await prisma.currTheme.findMany({
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    include: { notions: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Programme & ressources</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h2 className="font-medium">Arbre des notions</h2>
          <div className="border border-white/10 rounded-xl p-3 space-y-2">
            {themes.map(t => (
              <div key={t.id}>
                <div className="font-medium">{t.code} — {t.title}</div>
                <ul className="ml-4 list-disc">
                  {t.notions.map((n:any) => (
                    <li key={n.id} className="flex items-center gap-2">
                      <input type="checkbox" className="accent-blue-500" />
                      <span>{n.code} — {n.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="font-medium">Journal (couverture)</h2>
          <div className="text-sm opacity-70">UI minimale (POST /api/curriculum/coverage à brancher)</div>
        </div>
      </div>
    </div>
  );
}
