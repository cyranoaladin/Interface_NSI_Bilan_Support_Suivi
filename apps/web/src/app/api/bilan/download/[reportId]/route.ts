export const dynamic = 'force-dynamic';
import { env } from '@/lib/env';
import { getSession } from '@/lib/session';
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

function parseS3Url(url: string): { bucket: string; key: string; } | null {
  if (!url.startsWith('s3://')) return null;
  const without = url.slice('s3://'.length);
  const slash = without.indexOf('/');
  if (slash <= 0) return null;
  const bucket = without.slice(0, slash);
  const key = without.slice(slash + 1);
  return { bucket, key };
}

export async function GET(req: NextRequest, { params }: { params: { reportId: string; }; }) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const report = await prisma.report.findUnique({
    where: { id: params.reportId },
    include: { attempt: { select: { studentEmail: true } } },
  });
  if (!report) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Authorization: student owner or teacher
  const isOwnerStudent = report.attempt?.studentEmail && report.attempt.studentEmail === session.email;
  const isTeacher = session.role === 'TEACHER';
  if (!isOwnerStudent && !isTeacher) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  if (!report.pdfUrl) {
    return NextResponse.json({ ok: false, error: 'PDF not available yet' }, { status: 404 });
  }

  // If pdfUrl is S3, stream it; otherwise redirect
  const s3Loc = parseS3Url(report.pdfUrl);
  if (s3Loc) {
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: s3Loc.bucket, Key: s3Loc.key }));
      const body = obj.Body as any; // Readable
      const filename = s3Loc.key.split('/').pop() || 'bilan.pdf';
      return new Response(body as unknown as ReadableStream, {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `inline; filename="${filename}"`,
          'cache-control': 'no-store',
        },
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'File not found in storage' }, { status: 404 });
    }
  }

  // Fallback: redirect to absolute URL
  try {
    return NextResponse.redirect(report.pdfUrl);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid pdfUrl' }, { status: 400 });
  }
}

