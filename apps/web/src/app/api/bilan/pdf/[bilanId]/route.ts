export const dynamic = 'force-dynamic';
import { env } from '@/lib/env';
import { getSessionEmail } from '@/lib/session';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});

export async function GET(req: NextRequest, { params }: { params: { bilanId: string; }; }) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const bilan = await prisma.bilan.findUnique({ where: { id: params.bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const isAuthor = bilan.authorEmail === email;
  const isStudent = bilan.studentEmail ? bilan.studentEmail === email : false;
  if (!isAuthor && !isStudent) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const variant = (req.nextUrl.searchParams.get('variant') || 'eleve').toLowerCase();

  // Trouver le dernier Report pour l'élève de ce bilan, du type demandé
  const attempts = await prisma.attempt.findMany({
    where: { studentEmail: bilan.studentEmail || email },
    select: { id: true },
    orderBy: { submittedAt: 'desc' },
    take: 10,
  });
  if (attempts.length === 0) return NextResponse.json({ ok: false, error: 'No attempts yet' }, { status: 404 });
  const attemptIds = attempts.map(a => a.id);
  const report = await prisma.report.findFirst({
    where: { attemptId: { in: attemptIds }, type: variant },
    orderBy: { publishedAt: 'desc' },
  });
  if (!report?.pdfUrl) return NextResponse.json({ ok: false, error: 'PDF not available yet' }, { status: 404 });

  // Stream depuis S3 si url s3://
  if (report.pdfUrl.startsWith('s3://')) {
    const without = report.pdfUrl.slice('s3://'.length);
    const idx = without.indexOf('/');
    if (idx <= 0) return NextResponse.json({ ok: false, error: 'Invalid S3 URL' }, { status: 400 });
    const bucket = without.slice(0, idx);
    const key = without.slice(idx + 1);
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = obj.Body as any;
      const filename = key.split('/').pop() || `${variant}.pdf`;
      return new Response(body as unknown as ReadableStream, {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `inline; filename="${filename}"`,
          'cache-control': 'no-store',
        },
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: 'File not found in storage' }, { status: 404 });
    }
  }

  // Sinon: rediriger vers l'URL
  try {
    return NextResponse.redirect(report.pdfUrl);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid pdfUrl' }, { status: 400 });
  }
}
