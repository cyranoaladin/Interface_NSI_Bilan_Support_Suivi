import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname } = url;

  // Laisser passer login, API, statiques
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Protection des pages dashboard: redirige vers /login si pas de cookie session
  if (pathname.startsWith('/dashboard')) {
    const session = req.cookies.get('session');
    if (!session?.value) {
      const next = encodeURIComponent(url.pathname + url.search);
      return NextResponse.redirect(new URL(`/login?next=${next}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
