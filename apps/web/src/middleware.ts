import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

async function getRoleFromCookie(req: NextRequest): Promise<'TEACHER' | 'STUDENT' | null> {
  const ck = req.cookies.get('session');
  if (!ck?.value) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret');
    const { payload } = await jwtVerify(ck.value, secret, { algorithms: ['HS256'] });
    const role = (payload as any)?.role;
    if (role === 'TEACHER' || role === 'STUDENT') return role;
    return null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname } = url;

  // Laisser passer login, API, statiques Next
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

  // Protection des ressources enseignant BDD (statiques)
  if (pathname.startsWith('/NSI/BDD_NSI/enseignant')) {
    const role = await getRoleFromCookie(req);
    if (role !== 'TEACHER') {
      // Redirige vers le hub BDD en mode élève
      return NextResponse.redirect(new URL('/bdd-nsi?role=eleve&solutions=off', req.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/NSI/BDD_NSI/enseignant/:path*'] };
