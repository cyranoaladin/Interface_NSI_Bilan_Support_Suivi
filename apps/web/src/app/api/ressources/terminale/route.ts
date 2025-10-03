import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const overridePath = process.env.RES_TERMINALE_HTML;
  const candidates = [
    overridePath,
    '/home/alaeddine/Interface_NSI_2025_2026_local/Ressources_NSI_Terminale.html',
    '/app/Ressources_NSI_Terminale.html',
    path.join(process.cwd(), 'Ressources_NSI_Terminale.html'),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      let html = buf.toString('utf-8');
      // Balanced sanitization: remove only suspicious script blocks (canvas/Chart usage) and any <canvas>
      const beforeHtml = html;
      const suspicious = /(getContext\s*\(|new\s+Chart\s*\(|Chart\.|ressourcesChart)/i;
      html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, (block) => (suspicious.test(block) && !/cdn\.tailwindcss\.com/i.test(block) ? '' : block));
      html = html.replace(/<canvas[\s\S]*?<\/canvas>/gi, '');
      const sanitized = beforeHtml !== html;

      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-frame-options': 'SAMEORIGIN',
          'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
          'pragma': 'no-cache',
          'x-served-from': p,
          'x-sanitized': sanitized ? '1' : '0',
        }
      });
    } catch {}
  }
  return NextResponse.json({ ok: false, error: 'Ressource Terminale non trouvée' }, { status: 404 });
}
