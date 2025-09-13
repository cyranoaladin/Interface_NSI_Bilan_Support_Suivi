import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname } = url;
  // Dev: pas d’interférence
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }
  // Rewriter /nsi -> /
  if (pathname === '/nsi') {
    url.pathname = '/';
    return NextResponse.rewrite(url);
  }
  if (pathname.startsWith('/nsi/')) {
    url.pathname = pathname.replace(/^\/nsi/, '');
    return NextResponse.rewrite(url);
  }
  // Rediriger la racine vers /nsi pour cohérence Playwright
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/nsi', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/nsi', '/nsi/:path*', '/'] };
