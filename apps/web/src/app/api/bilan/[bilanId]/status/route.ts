export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '@prisma/client';
import { getSessionEmail } from '@/lib/session';

const prisma = new PrismaClient();
let redisClient: any;
function getRedis() {
  if (redisClient) return redisClient;
  try {
    // Lazy require to avoid ESM issues under Next runtime
    const Redis = require('ioredis');
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    redisClient = new Redis(url);
  } catch {}
  return redisClient;
}

export async function GET(req: NextRequest, { params }: { params: { bilanId: string } }) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // Deterministic test hold: always check transient in-memory and Redis keys
  // If any hold is present, return PROCESSING_AI_REPORT before consulting DB.
  try {
    const mod: any = await import('@/app/api/_test_state');
    if (mod && typeof mod.shouldHold === 'function' && mod.shouldHold(params.bilanId)) {
      return NextResponse.json({ status: 'PROCESSING_AI_REPORT' });
    }
  } catch {}
  try {
    const r = getRedis();
    if (r) {
      const key = `test:status:hold:${params.bilanId}`;
      const v = await r.get(key);
      if (v) {
        return NextResponse.json({ status: 'PROCESSING_AI_REPORT' });
      }
    }
  } catch {}

  const bilan = await prisma.bilan.findUnique({ where: { id: params.bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const isAuthor = bilan.authorEmail === email;
  const isStudent = bilan.studentEmail ? bilan.studentEmail === email : false;
  if (!isAuthor && !isStudent) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({ status: bilan.status || 'PENDING' });
}
