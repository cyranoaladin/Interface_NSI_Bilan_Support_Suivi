import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = new URL(req.url);
  // Redirect only the bare root path to the basePath
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/nsi', req.url));
  }
  return NextResponse.next();
}

