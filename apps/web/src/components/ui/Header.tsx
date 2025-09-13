import Link from 'next/link';
import * as React from 'react';
import { Logo } from './Logo';

export function Header({ right }: { right?: React.ReactNode; }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-[#0b132b]/70 bg-[#0b132b] border-b border-white/10">
      <div className="container flex items-center justify-between h-14">
        <Link href="/" className="inline-flex items-center gap-2">
          <Logo size={28} />
          <span className="font-poppins text-[var(--fg)]">NSI-PMF</span>
        </Link>
        <div className="flex items-center gap-2">
          {right}
        </div>
      </div>
    </header>
  );
}
