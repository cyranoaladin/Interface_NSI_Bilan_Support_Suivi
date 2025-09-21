import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname } = url;
  // Désactivé en prod pour éviter d'interférer avec les chunks Next.js
  return NextResponse.next();
}

export const config = { matcher: [] };
