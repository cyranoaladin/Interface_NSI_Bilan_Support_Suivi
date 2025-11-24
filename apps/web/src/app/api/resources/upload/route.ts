import { NextResponse } from 'next/server';
import Busboy from 'busboy';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ ok: false, error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const bb = Busboy({ headers: { 'content-type': contentType } } as any);
    const tmpDir = '/app/uploads';
    fs.mkdirSync(tmpDir, { recursive: true });

    let savedPath: string | null = null;
    let filename = 'upload.bin';
    let mimeType = 'application/octet-stream';
    let sizeBytes = 0;
    let notionId: string | null = null;

    const doneP = new Promise<void>((resolve, reject) => {
      bb.on('file', (_name: string, file: any, info: any) => {
        filename = info?.filename || filename;
        mimeType = info?.mimeType || mimeType;
        const storageKey = `${Date.now()}_${filename}`.replace(/\s+/g, '_');
        const full = path.join(tmpDir, storageKey);
        savedPath = full;
        const ws = fs.createWriteStream(full);
        file.on('data', (d: Buffer) => { sizeBytes += d.length; });
        file.pipe(ws);
        ws.on('finish', () => {});
      });
      bb.on('field', (name: string, val: string) => {
        if (name === 'notionId') notionId = val;
      });
      bb.on('error', reject);
      bb.on('close', resolve);
    });

    const arrayBuf = await req.arrayBuffer();
    bb.end(Buffer.from(arrayBuf));
    await doneP;

    if (!savedPath) return NextResponse.json({ ok: false, error: 'No file' }, { status: 400 });

    const doc = await prisma.resourceDocument.create({
      data: {
        uploaderId: 'teacher-demo',
        title: filename,
        description: null,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        storageKey: savedPath,
        status: 'UPLOADED',
      },
    });
    if (notionId) {
      await prisma.resourceDocumentNotion.create({ data: { docId: doc.id, notionId } });
    }

    return NextResponse.json({ ok: true, docId: doc.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'upload_failed' }, { status: 500 });
  }
}