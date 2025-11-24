import { getSession } from '@/lib/auth-utils';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.email || session.role !== 'TEACHER') return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { email } = await req.json().catch(() => ({} as any));
  if (!email) return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  const st = await prisma.student.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!st) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
  // Supprimer les bilans PENDING existants (au cas où) et autoriser une nouvelle soumission
  await prisma.bilan.deleteMany({ where: { studentEmail: st.email, status: 'PENDING' } });
  // Créer un nouveau bilan PENDING ou laisser la page /bilan/initier le créer à la demande
  return NextResponse.json({ ok: true });
}
