import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/session';
import Busboy from 'busboy';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { Client } from 'pg';
import { Queue } from 'bullmq';
import { env } from '@/lib/env';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 1) Auth de session
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Connexion PG
  const pg = new Client({ connectionString: process.env.DATABASE_URL || env.DATABASE_URL });
  await pg.connect();

  try {
    // 3) Vérifier rôle (teacher/admin)
    const roleRes = await pg.query('SELECT role FROM "User" WHERE email=$1', [email]);
    const role: string | undefined = roleRes.rows[0]?.role;
    if (!role || (role !== 'teacher' && role !== 'admin')) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // 4) Vérifier content-type multipart (Busboy n’a besoin que de ce header)
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json(
        { ok: false, error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // 5) Dossier de dépôt (volume monté en prod via docker-compose)
    const uploadsDir = '/data/rag_uploads';
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    // 6) Conversion du flux Web → flux Node et parsing Busboy
    const nodeReadable = req.body ? Readable.fromWeb(req.body as any) : null;
    if (!nodeReadable) {
      return NextResponse.json({ ok: false, error: 'Empty body' }, { status: 400 });
    }

    const { path: savedPath, title, mime: detectedMime } = await new Promise<{
      path: string;
      title: string;
      mime: string;
    }>((resolve, reject) => {
      const bb = Busboy({
        headers: { 'content-type': contentType },
        limits: { fileSize: 20 * 1024 * 1024 }, // 20MB (cohérent avec Nginx client_max_body_size)
      });

      let resolved = false;

      bb.on('file', (fieldname, file, info) => {
        const id = uuidv4();
        const mimeType = info.mimeType || 'application/octet-stream';
        const ext = (mime.extension(mimeType) as string) || 'bin';
        const finalTitle = info.filename || id;
        const savePath = path.join(uploadsDir, `${id}.${ext}`);
        const ws = fs.createWriteStream(savePath);

        // Sécurité taille (si limite atteinte, Busboy émettra 'limit' côté file)
        file.on('limit', () => {
          try {
            ws.destroy();
            fs.promises.unlink(savePath).catch(() => {});
          } finally {
            reject(new Error('File too large'));
          }
        });

        file.pipe(ws);
        ws.on('finish', () => {
          if (!resolved) {
            resolved = true;
            resolve({ path: savePath, title: finalTitle, mime: mimeType });
          }
        });
        ws.on('error', (err) => reject(err));
      });

      bb.on('error', (err) => reject(err));
      bb.on('finish', () => {
        if (!resolved) reject(new Error('No file uploaded'));
      });

      nodeReadable.pipe(bb);
    });

    // 7) Insert document et enqueue job d’ingestion
    const insert = await pg.query(
      `INSERT INTO documents (source, path, title, meta)
       VALUES ('upload', $1, $2, '{}'::jsonb)
       RETURNING id`,
      [savedPath, title]
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
