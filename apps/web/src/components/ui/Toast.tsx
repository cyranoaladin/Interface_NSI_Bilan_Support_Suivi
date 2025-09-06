'use client';
import * as React from 'react';

type Toast = { id: number; message: string; variant?: 'info' | 'success' | 'error'; };

const Ctx = React.createContext<{
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  remove: (id: number) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode; }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = (t: Omit<Toast, 'id'>) => setToasts((x) => [...x, { ...t, id: Date.now() }]);
  const remove = (id: number) => setToasts((x) => x.filter(t => t.id !== id));
  return (
    <Ctx.Provider value={{ toasts, push, remove }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-xl px-3 py-2 text-sm border ${t.variant === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-200' : t.variant === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-white/10 bg-white/10 text-[var(--fg)]'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
