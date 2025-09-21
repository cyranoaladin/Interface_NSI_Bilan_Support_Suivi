export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// Email feature has been removed from the project.
export async function POST() {
  return NextResponse.json({ ok: false, error: 'Email feature removed' }, { status: 410 });
}
