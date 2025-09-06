#!/usr/bin/env node
try { require('dotenv').config({ path: '.env.local' }); } catch {}
const { Queue } = require('bullmq');

// Prisma depuis l'app web (pour bénéficier du client généré)
let PrismaClient;
try { ({ PrismaClient } = require('@prisma/client')); }
catch {
  ({ PrismaClient } = require('../apps/web/node_modules/@prisma/client'));
}

function parseArgs() {
  const args = Object.fromEntries(process.argv.slice(2).map(x => {
    const [k, v] = x.replace(/^--/, '').split('='); return [k, v ?? ''];
  }));
  return args;
}

function parseScores(s) {
  const def = { python: 0.62, structures: 0.55, donnees: 0.58, logique: 0.6, web: 0.65, lecture_algo: 0.57 };
  if (!s) return def;
  for (const pair of s.split(',')) {
    const [k, v] = pair.split('=');
    const f = Number(v); if (!isNaN(f)) def[k] = f;
  }
  return def;
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const { email, scores } = parseArgs();
    let student;
    if (email) {
      student = await prisma.student.findUnique({ where: { email: String(email).toLowerCase() } });
    } else {
      student = await prisma.student.findFirst();
    }
    if (!student) throw new Error('Aucun élève trouvé');
    console.log('Élève sélectionné:', student.familyName, student.givenName, '-', student.email);

    const attempt = await prisma.attempt.create({ data: { studentId: student.id, questionnaire: 'terminale-nsi-v_final_2025-09-04', status: 'submitted', submittedAt: new Date() } });
    const sc = parseScores(scores);
    const entries = Object.entries(sc).map(([domain, pct]) => ({ attemptId: attempt.id, domain, pct, raw: Math.round(pct * 100), weight: 1 }));
    await prisma.score.createMany({ data: entries });

    const q = new Queue('generate_reports', { connection: { url: process.env.REDIS_URL } });
    await q.add('generate_reports', { attemptId: attempt.id }, { removeOnComplete: true, removeOnFail: false });
    console.log('Job poussé pour attemptId=', attempt.id);
  } finally {
    await prisma.$disconnect();
  }
})().catch(e => { console.error(e); process.exit(1); });
