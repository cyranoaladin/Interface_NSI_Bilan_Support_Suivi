import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const requester = await getSessionEmail();
  if (!requester) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const teacher = await prisma.teacher.findUnique({ where: { email: requester } });
  if (!teacher) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const { email } = schema.parse(await req.json());
  const student = await prisma.student.findUnique({ where: { email: email.toLowerCase() } });
  if (!student) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });

  const temp = 'password123';
  const hash = await bcrypt.hash(temp, 12);
  await prisma.student.update({ where: { email: student.email }, data: { passwordHash: hash, passwordChangeRequired: true } });
  return NextResponse.json({ ok: true, tempPassword: temp });
}
