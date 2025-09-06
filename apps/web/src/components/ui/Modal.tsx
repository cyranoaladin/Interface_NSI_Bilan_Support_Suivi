'use client';
import * as React from 'react';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-xl border border-white/10 bg-[#0f1723] shadow-soft">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-poppins">{title}</h3>
            <button className="text-[var(--fg)]/70 hover:text-white" onClick={onClose}>×</button>
          </div>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
