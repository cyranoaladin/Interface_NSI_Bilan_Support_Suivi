export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// Magic link feature has been removed from the project.
export async function POST() {
  return NextResponse.json({ ok: false, error: 'Magic link removed' }, { status: 410 });
}
