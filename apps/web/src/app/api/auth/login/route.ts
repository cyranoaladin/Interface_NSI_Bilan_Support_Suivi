import { setSessionCookie } from '@/lib/cookies';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function POST(req: NextRequest) {
  const { email, password } = schema.parse(await req.json());
  const lower = email.toLowerCase();
  // Essayer d'abord Teacher
  const teacher = await prisma.teacher.findUnique({ where: { email: lower } });
  if (teacher) {
    const valid = await bcrypt.compare(password, teacher.passwordHash);
    if (!valid) return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
    const token = await new SignJWT({ email: teacher.email, role: 'TEACHER' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setExpirationTime('12h')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
    setSessionCookie(token);
    return NextResponse.json({ ok: true, role: 'TEACHER', mustChangePassword: teacher.passwordChangeRequired });
  }
  // Sinon tenter Student
  const student = await prisma.student.findUnique({ where: { email: lower } });
  if (!student) return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
  const valid = await bcrypt.compare(password, student.passwordHash);
  if (!valid) return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
  const token = await new SignJWT({ email: student.email, role: 'STUDENT' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime('12h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
  setSessionCookie(token);
  return NextResponse.json({ ok: true, role: 'STUDENT', mustChangePassword: student.passwordChangeRequired });
}
