import clsx from 'clsx';
import * as React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx('rounded-xl bg-[#101826] border border-white/10 shadow-soft', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx('px-6 py-4 border-b border-white/10', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx('px-6 py-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx('px-6 py-4 border-t border-white/10', className)} {...props}>
      {children}
    </div>
  );
}
