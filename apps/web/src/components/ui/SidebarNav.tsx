'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string; };

export function SidebarNav({ items }: { items: NavItem[]; }) {
  const pathname = usePathname();
  return (
    <nav className="mt-4 space-y-1">
      {items.map((it) => {
        const active = pathname === it.href || pathname?.startsWith(it.href + '/');
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`block px-3 py-2 rounded-xl text-sm ${active ? 'bg-white/10 text-white' : 'text-[var(--fg)]/80 hover:bg-white/5'}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
