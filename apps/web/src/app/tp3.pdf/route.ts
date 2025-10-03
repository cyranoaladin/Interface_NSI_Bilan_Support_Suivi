import fs from 'fs/promises';
import path from 'path';

const FILE_PATH = '/app/apps/web/public/tp-algo/TP3_NSI_Premiere.pdf';

export async function GET() {
  try {
    const buf = await fs.readFile(path.normalize(FILE_PATH));
    const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    return new Response(u8, { headers: { 'content-type': 'application/pdf' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

export async function HEAD() {
  try {
    await fs.access(path.normalize(FILE_PATH));
    return new Response(null, { status: 200, headers: { 'content-type': 'application/pdf' } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
