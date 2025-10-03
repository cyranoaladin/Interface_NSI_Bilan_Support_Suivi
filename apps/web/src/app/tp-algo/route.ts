import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

const BASE_DIR = '/app/apps/web/public/tp-algo';

async function readFileSafe(rel: string) {
  const clean = '/' + rel.replace(/^\/+/, '');
  const abs = path.join(BASE_DIR, clean);
  const normalized = path.normalize(abs);
  if (!normalized.startsWith(BASE_DIR)) throw new Error('Invalid path');
  return fs.readFile(normalized);
}

export async function GET() {
  try {
    const buf = await readFileSafe('index.html');
    return new Response(buf, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
}

export async function HEAD() {
  try {
    await readFileSafe('index.html');
    return new Response(null, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
