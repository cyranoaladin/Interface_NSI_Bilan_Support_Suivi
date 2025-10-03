'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string; external?: boolean; targetBlank?: boolean; };

export function SidebarNav({ items }: { items: NavItem[]; }) {
  const pathname = usePathname();
  return (
    <nav className="mt-4 space-y-1">
      {items.map((it) => {
        const active = pathname === it.href || pathname?.startsWith(it.href + '/');
        // Pour les ressources statiques/public (ex: /tp-algo), éviter Link pour ne pas générer ?_rsc
        if (it.external || it.href.startsWith('/tp-algo') || /\/[^/]+\.[a-zA-Z0-9]+$/.test(it.href)) {
          return (
            <a
              key={it.href}
              href={it.href}
              target={it.targetBlank !== false ? '_blank' : undefined}
              rel={it.targetBlank !== false ? 'noopener noreferrer' : undefined}
              className={`block px-3 py-2 rounded-xl text-sm ${active ? 'bg-white/10 text-white' : 'text-[var(--fg)]/80 hover:bg-white/5'}`}
            >
              {it.label}
            </a>
          );
        }
        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch={false}
            className={`block px-3 py-2 rounded-xl text-sm ${active ? 'bg-white/10 text-white' : 'text-[var(--fg)]/80 hover:bg-white/5'}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
