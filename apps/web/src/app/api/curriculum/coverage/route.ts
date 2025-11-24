import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const Body = z.object({
  groupId: z.string().min(1).optional(),
  teacherId: z.string().min(1),
  notionId: z.string().min(1),
  coveredAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const body = Body.parse(json);

  const ev = await prisma.teacherCoverage.create({
    data: {
      groupId: body.groupId ?? null,
      teacherId: body.teacherId,
      notionId: body.notionId,
      coveredAt: body.coveredAt ? new Date(body.coveredAt) : undefined,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ ok: true, event: ev }, { status: 201 });
}
