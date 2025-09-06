import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMail } from '@/lib/mail';
import { signMagicToken } from '@/lib/jwt';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const r = new Redis(process.env.REDIS_URL!);
const schema = z.object({ email: z.string().email() });

async function limited(key: string, limit = 5, windowSec = 300) {
  const now = Math.floor(Date.now() / 1000);
  const k = `ratelimit:${key}:${Math.floor(now / windowSec)}`;
  const n = await r.incr(k);
  if (n === 1) await r.expire(k, windowSec);
  return n <= limit;
}

export async function POST(req: NextRequest) {
  const { email } = schema.parse(await req.json());
  if (!email.endsWith('@ert.tn'))
    return NextResponse.json({ ok: false, error: 'Domaine non autorisé' }, { status: 403 });

  if (!(await limited(`magic:${email}`)))
    return NextResponse.json({ ok: false, error: 'Trop de demandes' }, { status: 429 });

  const student = await prisma.student.findUnique({ where: { email } });
  if (!student)
    return NextResponse.json({ ok: false, error: 'Adresse inconnue' }, { status: 404 });

  const token = await signMagicToken(email, 15);
  const url = new URL('/api/auth/callback', process.env.APP_BASE_URL!);
  url.searchParams.set('token', token);
  await sendMail({
    to: email,
    subject: 'Connexion — Plateforme NSI',
    text: `Lien (15 min): ${url.toString()}`,
    html: `<p>Lien (15 min): <a href="${url.toString()}">Se connecter</a></p>`,
  });
  return NextResponse.json({ ok: true });
}

