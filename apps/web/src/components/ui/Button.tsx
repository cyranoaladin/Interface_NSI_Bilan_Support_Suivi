import clsx from 'clsx';
import * as React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  loading?: boolean;
};

export function Button({ className, variant = 'primary', disabled, loading, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-electric/60 disabled:opacity-60 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-electric text-white hover:bg-[#1a6bc7] focus:ring-electric/60',
    secondary: 'bg-graphite text-[var(--fg)] hover:bg-[#242a31] border border-white/10',
    ghost: 'bg-transparent text-[var(--fg)] hover:bg-white/5',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'bg-transparent text-[var(--fg)] border border-white/20 hover:bg-white/5',
  };
  return (
    <button
      className={clsx(base, variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
