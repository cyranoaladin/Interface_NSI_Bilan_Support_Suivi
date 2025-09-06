import clsx from 'clsx';
import * as React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'success' | 'warning' | 'danger'; };

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const styles: Record<string, string> = {
    default: 'bg-white/10 text-[var(--fg)]',
    success: 'bg-green-500/20 text-green-300',
    warning: 'bg-yellow-500/20 text-yellow-300',
    danger: 'bg-red-500/20 text-red-300',
  };
  return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs', styles[variant], className)} {...props} />;
}
