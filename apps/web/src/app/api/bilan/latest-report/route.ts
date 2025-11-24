export const dynamic = 'force-dynamic';
import { env } from '@/lib/env';
import { getSession } from '@/lib/auth-utils';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});

function parseS3Url(url: string): { bucket: string; key: string; } | null {
  try {
    if (!url?.startsWith('s3://')) return null;
    const without = url.slice('s3://'.length);
    const idx = without.indexOf('/');
    if (idx < 0) return null;
    const bucket = without.slice(0, idx);
    const key = without.slice(idx + 1);
    return { bucket, key };
  } catch {
    return null;
  }
}

async function isReportStreamReady(attemptId: string, type: string, pdfUrl?: string | null): Promise<boolean> {
  // 1) If pdfUrl is s3://..., try HEAD
  if (pdfUrl && pdfUrl.startsWith('s3://')) {
    const loc = parseS3Url(pdfUrl);
    if (loc) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: loc.bucket, Key: loc.key }));
        return true;
      } catch {
        // not ready yet
      }
    }
  }
  // 2) Local artifacts fallback
  const localDir = '/app/docs/artifacts_premium_final';
  const localName = `${type === 'enseignant' ? 'enseignant' : 'eleve'}_${attemptId}.pdf`;
  const localPath = path.join(localDir, localName);
  if (fs.existsSync(localPath)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const typeParam = (searchParams.get('type') || '').toLowerCase(); // optional: 'eleve' | 'enseignant'
  const waitStream = (searchParams.get('wait') || '').toLowerCase() === 'stream';

  try {
    if (session.role === 'STUDENT') {
      // Trouver la dernière tentative de l'élève qui a au moins un report (optionnellement filtré par type)
      const attempt = await prisma.attempt.findFirst({
        where: {
          studentEmail: session.email,
          reports: typeParam ? { some: { type: typeParam } } : { some: {} },
        },
        orderBy: { submittedAt: 'desc' },
      });
      if (!attempt) return NextResponse.json({ ok: false, error: 'No report yet' }, { status: 404 });

      const reports = await prisma.report.findMany({
        where: { attemptId: attempt.id, ...(typeParam ? { type: typeParam } : {}) },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, type: true, pdfUrl: true, publishedAt: true },
      });
      if (reports.length === 0) return NextResponse.json({ ok: false, error: 'No report yet' }, { status: 404 });

      if (waitStream) {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const ready = await Promise.all(reports.map(r => isReportStreamReady(attempt.id, r.type, r.pdfUrl)));
          if (ready.some(Boolean)) break;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      return NextResponse.json({
        ok: true,
        attempt: { id: attempt.id, submittedAt: attempt.submittedAt, status: attempt.status },
        reports,
      });
    }

    if (session.role === 'TEACHER') {
      // Requiert studentEmail param
      const studentEmail = (searchParams.get('studentEmail') || '').toLowerCase();
      if (!studentEmail) return NextResponse.json({ ok: false, error: 'Missing studentEmail' }, { status: 400 });
      const student = await prisma.student.findUnique({ where: { email: studentEmail } });
      if (!student) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
      // Vérifier que l'enseignant a le droit (lien teacherOnGroup)
      const can = await prisma.teacherOnGroup.findUnique({
        where: { teacherEmail_groupId: { teacherEmail: session.email, groupId: student.groupId } },
      });
      if (!can) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

      const attempt = await prisma.attempt.findFirst({
        where: { studentEmail, reports: typeParam ? { some: { type: typeParam } } : { some: {} } },
        orderBy: { submittedAt: 'desc' },
      });
      if (!attempt) return NextResponse.json({ ok: false, error: 'No report yet' }, { status: 404 });

      const reports = await prisma.report.findMany({
        where: { attemptId: attempt.id, ...(typeParam ? { type: typeParam } : {}) },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, type: true, pdfUrl: true, publishedAt: true },
      });
      if (reports.length === 0) return NextResponse.json({ ok: false, error: 'No report yet' }, { status: 404 });

      if (waitStream) {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const ready = await Promise.all(reports.map(r => isReportStreamReady(attempt.id, r.type, r.pdfUrl)));
          if (ready.some(Boolean)) break;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      return NextResponse.json({
        ok: true,
        attempt: { id: attempt.id, submittedAt: attempt.submittedAt, status: attempt.status },
        reports,
      });
    }

    return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
