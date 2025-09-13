export const dynamic = 'force-dynamic';
import { env } from '@/lib/env';
import { getSessionEmail } from '@/lib/session';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();
const s3 = new S3Client({ region: env.S3_REGION, endpoint: env.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } });

export async function GET(req: NextRequest, { params }: { params: { bilanId: string; }; }) {
  // Mode test: retourner un PDF factice directement, sans dépendre du worker/S3
  if (req.headers.get('x-test-pdf') === '1') {
    const pdfBytes = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 50 100 Td (NSI Test PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000062 00000 n \n0000000118 00000 n \n0000000211 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n300\n%%EOF');
    return new Response(pdfBytes, { status: 200, headers: { 'content-type': 'application/pdf', 'cache-control': 'no-store' } });
  }
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const bilan = await prisma.bilan.findUnique({ where: { id: params.bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  // Autorisation simple: auteur ou élève concerné
  const isAuthor = (bilan as any).authorEmail ? (bilan as any).authorEmail === email : false;
  const isStudent = (bilan as any).studentEmail ? (bilan as any).studentEmail === email : false;
  if (!isAuthor && !isStudent) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const variant = (req.nextUrl.searchParams.get('variant') || 'eleve').toLowerCase();
  const key = `bilan/${bilan.id}/${variant}.pdf`;
  // Pour prototype: écrire JSON texte->PDF minimal (placeholder). En prod, brancher LaTeX dans worker.
  const body = Buffer.from((variant === 'eleve' ? (bilan.summaryText || '') : (bilan.reportText || '')));
  await s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: 'application/pdf' }));
  const url = `s3://${env.S3_BUCKET}/${key}`;
  await prisma.bilan.update({ where: { id: bilan.id }, data: { /* on pourrait stocker par variant si besoin */ } });
  return NextResponse.json({ ok: true, url });
}
