export const dynamic = 'force-dynamic';
import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const Schema = z.object({
  studentEmail: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length === 0 ? undefined : v),
    z.string().email().optional()
  ),
  matiere: z.string().optional(),
  niveau: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => ({} as any));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }
  const body = parsed.data as z.infer<typeof Schema>;
  // Déterminer l'auteur (enseignant/élève) et l'email élève ciblé
  let authorEmail = session.email;
  let authorRole: 'teacher' | 'student' = session.role === 'TEACHER' ? 'teacher' : 'student';
  let studentEmail: string | undefined = undefined;
  if (session.role === 'TEACHER') {
    if (body.studentEmail) {
      const st = await prisma.student.findUnique({ where: { email: body.studentEmail.toLowerCase() } });
      if (!st) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
      studentEmail = st.email;
    }
  } else if (session.role === 'STUDENT') {
    // Un élève crée un bilan pour lui-même
    studentEmail = session.email;
  } else {
    return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
  }

  const bilan = await prisma.bilan.create({
    data: {
      authorEmail,
      authorRole,
      studentEmail,
      matiere: body.matiere || 'NSI',
      niveau: body.niveau || 'Terminale',
      status: 'PENDING',
    }
  });

  return NextResponse.json({ ok: true, bilanId: bilan.id });
}
