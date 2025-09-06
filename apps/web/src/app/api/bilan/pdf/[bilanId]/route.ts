import { env } from '@/lib/env';
import { getSessionEmail } from '@/lib/session';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();
const s3 = new S3Client({ region: env.S3_REGION, endpoint: env.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } });

export async function GET(req: NextRequest, { params }: { params: { bilanId: string; }; }) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const bilan = await prisma.bilan.findUnique({ where: { id: params.bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (bilan.userId !== user.id && bilan.studentId) {
    const st = await prisma.student.findUnique({ where: { id: bilan.studentId } });
    if (!st || st.email !== email) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const variant = (req.nextUrl.searchParams.get('variant') || 'eleve').toLowerCase();
  const key = `bilan/${bilan.id}/${variant}.pdf`;
  // Pour prototype: écrire JSON texte->PDF minimal (placeholder). En prod, brancher LaTeX dans worker.
  const body = Buffer.from((variant === 'eleve' ? (bilan.summaryText || '') : (bilan.reportText || '')));
  await s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: 'application/pdf' }));
  const url = `s3://${env.S3_BUCKET}/${key}`;
  await prisma.bilan.update({ where: { id: bilan.id }, data: { /* on pourrait stocker par variant si besoin */ } });
  return NextResponse.json({ ok: true, url });
}
