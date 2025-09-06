import clsx from 'clsx';
import * as React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id || React.useId();
  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm mb-1 text-[var(--fg)]/80">{label}</label>
      )}
      <input
        id={inputId}
        className="w-full rounded-xl bg-[#0f1723] border border-white/10 px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-electric/50"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
