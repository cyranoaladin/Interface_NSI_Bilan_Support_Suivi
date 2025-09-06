import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const schema = z.object({ newPassword: z.string().min(8) });

export async function POST(req: NextRequest) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { newPassword } = schema.parse(await req.json());
  const hash = await bcrypt.hash(newPassword, 12);
  // Tente Teacher puis Student
  const t = await prisma.teacher.findUnique({ where: { email } });
  if (t) {
    await prisma.teacher.update({ where: { email }, data: { passwordHash: hash, passwordChangeRequired: false } });
    return NextResponse.json({ ok: true });
  }
  const s = await prisma.student.findUnique({ where: { email } });
  if (s) {
    await prisma.student.update({ where: { email }, data: { passwordHash: hash, passwordChangeRequired: false } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
