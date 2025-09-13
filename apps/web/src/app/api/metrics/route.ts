import { env } from '@/lib/env';
import metrics from '@/lib/metrics';
import { Queue } from 'bullmq';
import { NextRequest, NextResponse } from 'next/server';
import { Registry } from 'prom-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    // Collect BullMQ stats (best effort)
    const connection = { url: process.env.REDIS_URL || env.REDIS_URL } as any;
    const queues = [
      new Queue('generate_reports', { connection }),
      new Queue('rag_ingest', { connection }),
    ];
    for (const q of queues) {
      try {
        const [w, a, f, c, d, p] = await Promise.all([
          q.getWaitingCount(),
          q.getActiveCount(),
          q.getFailedCount(),
          q.getCompletedCount(),
          q.getDelayedCount(),
          q.getPausedCount?.() ?? Promise.resolve(0),
        ]);
        await metrics.collectBullmq(q.name, { waiting: w, active: a, failed: f, completed: c, delayed: d, paused: Number(p) });
      } catch {}
      try { await q.close(); } catch {}
    }

    const body = await (metrics.registry as Registry).metrics();
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'metrics error' }, { status: 500 });
  }
}
