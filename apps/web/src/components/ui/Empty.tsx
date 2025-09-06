
export function Empty({ title = 'Aucune donnée', subtitle }: { title?: string; subtitle?: string; }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1723] p-8 text-center">
      <h3 className="font-poppins text-lg">{title}</h3>
      {subtitle && <p className="text-sm text-[var(--fg)]/70 mt-1">{subtitle}</p>}
    </div>
  );
}
