import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();

function parseArgs() {
  const args = Object.fromEntries(process.argv.slice(2).map(x => {
    const [k, v] = x.replace(/^--/, '').split('='); return [k, v ?? ''];
  }));
  return args as { email?: string; attemptId?: string; scores?: string; };
}

function parseScores(s?: string) {
  const def: Record<string, number> = { python: 0.62, structures: 0.55, donnees: 0.58, logique: 0.6, web: 0.65, lecture_algo: 0.57 };
  if (!s) return def;
  for (const pair of s.split(',')) {
    const [k, v] = pair.split('=');
    const f = Number(v); if (!isNaN(f)) def[k] = f;
  }
  return def;
}

async function main() {
  let queue: Queue | null = null;
  try {
    const { email, attemptId, scores } = parseArgs();
    if (!email && !attemptId) throw new Error('Usage: ts-node scripts/push_job_generate_reports.ts --email=eleve@ert.tn [--scores=python=0.6,structures=0.4,...] | --attemptId=...');

    let attempt = attemptId ? await prisma.attempt.findUnique({ where: { id: attemptId } }) : null;

    if (!attempt) {
      if (!email) throw new Error('Email requis si attemptId absent');
      const student = await prisma.student.findUnique({ where: { email: String(email).toLowerCase() } });
      if (!student) throw new Error(`Étudiant introuvable: ${email}`);
      attempt = await prisma.attempt.create({ data: { studentEmail: student.email, questionnaire: 'terminale-nsi-v_final_2025-09-04', status: 'submitted', submittedAt: new Date() } });

      const sc = parseScores(scores);
      const entries = Object.entries(sc).map(([domain, pct]) => ({ attemptId: attempt!.id, domain, pct, raw: Math.round(pct * 100), weight: 1 }));
      await prisma.score.createMany({ data: entries });
    }

    queue = new Queue('generate_reports', {
      connection: { url: process.env.REDIS_URL! },
      defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 10_000 }, removeOnComplete: true, removeOnFail: false }
    });
    await queue.add('generate_reports', { attemptId: attempt.id }, { jobId: attempt.id });
    console.log('Job poussé pour attemptId=', attempt.id);

    await prisma.$disconnect();
    if (queue) await queue.close();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la création du job :', error);
    try { await prisma.$disconnect(); } catch {}
    try { if (queue) await queue.close(); } catch {}
    process.exit(1);
  }
}

main();
