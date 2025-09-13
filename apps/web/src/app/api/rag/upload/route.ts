import { env } from '@/lib/env';
import { getSession, getSessionEmail } from '@/lib/session';
import { Queue } from 'bullmq';
import Busboy from 'busboy';
import Redis from 'ioredis';
import mime from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const r = new Redis(process.env.REDIS_URL!);
  async function limited(key: string, limit = 10, windowSec = 60) {
    const now = Math.floor(Date.now() / 1000);
    const k = `ratelimit:${key}:${Math.floor(now / windowSec)}`;
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, windowSec);
    return n <= limit;
  }
  // 1) Auth de session
  const email = await getSessionEmail();
  const session = await getSession();
  if (!email || !session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 1b) Anti‑abus: limiter les uploads fréquents
  if (!(await limited(`rag_upload:${email}`))) {
    return NextResponse.json({ ok: false, error: 'Too Many Requests' }, { status: 429 });
  }

  // 2) Connexion PG
  const pg = new Client({ connectionString: process.env.DATABASE_URL || env.DATABASE_URL });
  await pg.connect();

  try {
    // 3) Vérifier rôle via la session JWT (enseignant uniquement)
    if (session.role !== 'TEACHER') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // 4) Dossier de dépôt (volume monté en prod via docker-compose)
    const uploadsDir = '/data/rag_uploads';
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    // 5) Lire multipart via l’API standard Next (formData)
    // Parse via FormData (API native Next.js)
    const ct = req.headers.get('content-type') || '';
    console.log('[rag/upload] content-type:', ct);
    const tryFormDataFirst = /multipart\/form-data/i.test(ct);
    let savedPath = '';
    let detectedMime = 'application/octet-stream';
    let finalTitle = '';
    let id = uuidv4();
    if (tryFormDataFirst) {
      try {
        const form = await req.formData();
        const isBlobLike = (v: any) => v && typeof v === 'object' && typeof v.arrayBuffer === 'function';
        let fileEntry: any = form.get('file');
        if (!isBlobLike(fileEntry)) {
          for (const [, v] of form.entries()) { if (isBlobLike(v)) { fileEntry = v; break; } }
        }
        if (isBlobLike(fileEntry)) {
          const filename = (fileEntry as any).name || id;
          const mimeType = (fileEntry as any).type || 'application/octet-stream';
          const guessed = (mime.extension(mimeType) as string) || (filename.includes('.') ? filename.split('.').pop()! : 'bin');
          finalTitle = filename;
          savedPath = path.join(uploadsDir, `${id}.${guessed}`);
          const ab = await (fileEntry as any).arrayBuffer();
          await fs.promises.writeFile(savedPath, Buffer.from(ab));
          detectedMime = mimeType;
        }
      } catch (e) {
        console.warn('[rag/upload] formData parse failed, will fallback to Busboy:', (e as any)?.message || e);
      }
    }
    if (!savedPath) {
      // Fallback Busboy sur stream node
      const bb = Busboy({ headers: { 'content-type': ct } });
      const web = req.body; if (!web) { console.error('[rag/upload] no req.body stream for busboy'); return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 }); }
      const nodeStream = Readable.fromWeb(web as any);
      const done = new Promise<void>((resolve, reject) => {
        let gotFile = false;
        bb.on('file', (_name, file, info) => {
          gotFile = true;
          const { filename, mimeType } = info as any;
          try { id = uuidv4(); } catch {}
          finalTitle = filename || id;
          detectedMime = mimeType || 'application/octet-stream';
          const ext = (mime.extension(detectedMime) as string) || (finalTitle.includes('.') ? finalTitle.split('.').pop()! : 'bin');
          savedPath = path.join(uploadsDir, `${id}.${ext}`);
          const ws = fs.createWriteStream(savedPath);
          file.pipe(ws);
          ws.on('finish', resolve);
          ws.on('error', reject);
        });
        bb.on('finish', () => { if (!gotFile) reject(new Error('No file field')); });
        bb.on('error', reject);
      });
      nodeStream.pipe(bb);
      await done.catch((e) => { console.error('[rag/upload] busboy error:', (e as any)?.message || e); });
      if (!savedPath) return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    // 7) Insert document et enqueue job d’ingestion
    const insert = await pg.query(
      `INSERT INTO documents (path, mime, meta)
       VALUES ($1, $2, '{}'::jsonb)
       RETURNING id`,
      [savedPath, detectedMime]
    );
    const documentId = insert.rows[0].id as string;

    const queue = new Queue('rag_ingest', { connection: { url: env.REDIS_URL || process.env.REDIS_URL! } });
    await queue.add(
      'rag_ingest',
      { documentId, path: savedPath, mime: detectedMime },
      { removeOnComplete: true, removeOnFail: false }
    );

    return NextResponse.json({ ok: true, documentId });
  } catch (err: any) {
    // Log minimal, sans PII
    console.error('rag/upload error:', err?.message || err);
    return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 });
  } finally {
    await pg.end().catch(() => {});
  }
}
