import fs from 'fs/promises';
import { lookup } from 'mime-types';
import { NextResponse } from 'next/server';
import path from 'path';

const BASE_DIR = '/app/apps/web/public/tp-algo';

function safeJoin(base: string, rel: string) {
  const p = path.normalize(path.join(base, rel));
  if (!p.startsWith(base)) throw new Error('Invalid path');
  return p;
}

async function handle(relPath: string) {
  try {
    const abs = safeJoin(BASE_DIR, relPath || 'index.html');
    const buf = await fs.readFile(abs);
    const mt = lookup(abs) || 'application/octet-stream';
    return new Response(buf, { headers: { 'content-type': String(mt) } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
}

export async function GET(_: Request, { params }: { params: { path?: string[]; }; }) {
  const rel = (params.path || []).join('/') || 'index.html';
  return handle(rel);
}

export async function HEAD(_: Request, { params }: { params: { path?: string[]; }; }) {
  const rel = (params.path || []).join('/') || 'index.html';
  const res = await handle(rel);
  return new Response(null, { status: res.status, headers: res.headers });
}
