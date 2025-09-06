import { clearSessionCookie } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
