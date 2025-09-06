import clsx from 'clsx';
import * as React from 'react';

export function Table({ children, className, loading = false, skeletonRows = 5 }: { children: React.ReactNode; className?: string; loading?: boolean; skeletonRows?: number; }) {
  return (
    <div className={clsx('overflow-x-auto rounded-xl border border-white/10', className)}>
      <table className="min-w-full text-sm">
        {children}
      </table>
      {loading && (
        <div className="p-3">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse bg-white/5 rounded my-2" />
          ))}
        </div>
      )}
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode; }) {
  return (
    <thead className="text-left text-[var(--fg)]/70">
      {children}
    </thead>
  );
}

export function TR({ children }: { children: React.ReactNode; }) { return <tr className="border-t border-white/10">{children}</tr>; }
export function TH({ children, className }: { children: React.ReactNode; className?: string; }) { return <th className={clsx('py-2 px-3', className)}>{children}</th>; }
export function TD({ children, className }: { children: React.ReactNode; className?: string; }) { return <td className={clsx('py-2 px-3', className)}>{children}</td>; }
