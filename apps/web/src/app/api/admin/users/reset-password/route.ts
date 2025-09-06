import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const requester = await getSessionEmail();
  if (!requester) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const reqUser = await prisma.user.findUnique({ where: { email: requester } });
  if (!reqUser || (reqUser.role !== 'teacher' && reqUser.role !== 'admin'))
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const { email } = schema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
  const temp = crypto.randomBytes(9).toString('base64');
  const hash = await bcrypt.hash(temp, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, mustChangePassword: true } }),
    prisma.passwordReset.create({ data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } })
  ]);
  return NextResponse.json({ ok: true, tempPassword: temp });
}
