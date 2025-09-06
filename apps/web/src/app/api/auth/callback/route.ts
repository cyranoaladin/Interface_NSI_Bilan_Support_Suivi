import { NextRequest, NextResponse } from 'next/server';
export async function GET(req: NextRequest) {
  // Magic link désactivé
  return NextResponse.json({ ok: false, error: 'Magic link disabled' }, { status: 410 });
}
