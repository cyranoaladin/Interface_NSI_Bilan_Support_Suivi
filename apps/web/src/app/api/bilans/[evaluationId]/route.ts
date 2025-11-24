import { getSession } from '@/lib/auth-utils';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { evaluationId: string; }; }) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const evaluationId = params.evaluationId;

  try {
    const evaluation = await (prisma as any).evaluation.findUnique({ where: { id: Number(evaluationId) } });
    if (!evaluation) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    // Si student: retourner son propre bilan. Si teacher: autorisé à consulter tout bilan.
    if (session.role === 'STUDENT') {
      const evalId = Number(evaluationId);
      // Essai 1: email exact
      let bilan = await (prisma as any).evaluationBilan.findUnique({
        where: { studentEmail_evaluationId: { studentEmail: session.email, evaluationId: evalId } },
      });
      if (!bilan) {
        // Essai 2: variantes avec / sans suffixe "-e" avant @ert.tn
        const lower = String(session.email).toLowerCase();
        const m = lower.match(/^(.+?)(-e)?(@ert\.tn)$/i);
        if (m) {
          const base = m[1];
          const hasE = !!m[2];
          const domain = m[3];
          const alt = hasE ? `${base}${domain}` : `${base}-e${domain}`;
          bilan = await (prisma as any).evaluationBilan.findUnique({
            where: { studentEmail_evaluationId: { studentEmail: alt, evaluationId: evalId } },
          });
        }
      }
      if (!bilan) {
        // Essai 3: rapprochement par nom de l'élève (variantes orthographiques)
        const toAscii = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
        const norm = (s: string) => toAscii(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
        const lev = (a: string, b: string) => {
          const m = a.length, n = b.length;
          if (m === 0) return n; if (n === 0) return m;
          const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
          for (let i = 0; i <= m; i++) dp[i][0] = i;
          for (let j = 0; j <= n; j++) dp[0][j] = j;
          for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
              const cost = a[i - 1] === b[j - 1] ? 0 : 1;
              dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
          }
          return dp[m][n];
        };
        const meStudent = await (prisma as any).student.findUnique({ where: { email: session.email }, select: { givenName: true, familyName: true } });
        let ref = meStudent as { givenName?: string; familyName?: string; } | null;
        if (!ref) {
          // Dériver prénom/nom depuis l'email: local-part séparé par '.' ou '-'
          const local = String(session.email).split('@')[0] || '';
          const parts = local.split(/[._-]+/).filter(Boolean);
          if (parts.length >= 2) {
            ref = { givenName: parts[0], familyName: parts.slice(1).join(' ') };
          }
        }
        if (ref) {
          const candidates: any[] = await (prisma as any).evaluationBilan.findMany({
            where: { evaluationId: evalId },
            include: { student: { select: { givenName: true, familyName: true, email: true } } },
          });
          const gn = norm(ref.givenName || '');
          const fn = norm(ref.familyName || '');
          let best: any = null; let bestScore = 1e9;
          for (const c of candidates) {
            const cgn = norm(c?.student?.givenName || '');
            const cfn = norm(c?.student?.familyName || '');
            if (cgn && gn && cfn && fn) {
              const score = lev(cgn, gn) + lev(cfn, fn);
              if (score < bestScore) { bestScore = score; best = c; }
            }
          }
          if (best && bestScore <= 2) {
            bilan = best;
          }
        }
      }
      if (!bilan) return NextResponse.json({ ok: true, evaluation, bilan: null });
      return NextResponse.json({ ok: true, evaluation, bilan });
    }

    // Teacher: possibilité de spécifier ?studentEmail=...
    const { searchParams } = new URL(req.url);
    const studentEmail = searchParams.get('studentEmail');
    if (!studentEmail) {
      // retourner tous les bilans agrégés pour l'évaluation (utiles pour listing côté prof)
      const bilans = await (prisma as any).evaluationBilan.findMany({ where: { evaluationId: Number(evaluationId) } });
      return NextResponse.json({ ok: true, evaluation, bilans });
    }
    const bilan = await (prisma as any).evaluationBilan.findUnique({
      where: { studentEmail_evaluationId: { studentEmail, evaluationId: Number(evaluationId) } },
    });
    return NextResponse.json({ ok: true, evaluation, bilan });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
