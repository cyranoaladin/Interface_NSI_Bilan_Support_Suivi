import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const Schema = z.object({ studentEmail: z.string().email().optional(), matiere: z.string().optional(), niveau: z.string().optional() });

export async function POST(req: NextRequest) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = Schema.parse(await req.json().catch(() => ({})));
  let studentId: string | undefined = undefined;
  if (body.studentEmail) {
    const st = await prisma.student.findUnique({ where: { email: body.studentEmail.toLowerCase() } });
    if (!st) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
    studentId = st.id;
  } else {
    const st = await prisma.student.findUnique({ where: { email } });
    studentId = st?.id;
  }

  const bilan = await prisma.bilan.create({
    data: {
      userId: user.id,
      studentId,
      matiere: body.matiere || 'NSI',
      niveau: body.niveau || 'Terminale',
      status: 'PENDING',
    }
  });

  return NextResponse.json({ ok: true, bilanId: bilan.id });
}
