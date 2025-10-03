// Seed des évaluations et bilans depuis bilans_evaluation_TAD.json (version JS pour éviter TS typing)
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function parseName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  if (parts.length === 0) return { familyName: '', givenName: '' };
  if (parts.length === 1) return { familyName: parts[0], givenName: '' };
  const givenName = parts[0];
  const familyName = parts.slice(1).join(' ');
  return { familyName, givenName };
}

async function main() {
  const jsonPath = path.resolve('/app/bilans_evaluation_TAD.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const rows = JSON.parse(raw);

  // Précharger les élèves de Terminale et créer un index nom-normalisé -> email
  const termStudents = await prisma.student.findMany({
    where: { classe: { contains: 'term', mode: 'insensitive' } },
    select: { email: true, givenName: true, familyName: true },
  });
  const toAscii = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const norm = (s) => toAscii(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  const nameKey = (gn, fn) => norm(`${gn} ${fn}`);
  const altKey = (gn, fn) => norm(`${fn} ${gn}`);
  const nameToEmail = new Map();
  for (const s of termStudents) {
    nameToEmail.set(nameKey(s.givenName, s.familyName), s.email);
    nameToEmail.set(altKey(s.givenName, s.familyName), s.email);
  }

  const title = rows[0]?.evaluation_title || 'Évaluation';
  const evaluation = await prisma.evaluation.upsert({
    where: { id: 1 },
    update: { title },
    create: { id: 1, title, date: new Date() },
  });

  // Assurer un groupe Terminale
  let termGroup = await prisma.group.findFirst({ where: { name: { contains: 'termin', mode: 'insensitive' } } });
  if (!termGroup) {
    termGroup = await prisma.group.upsert({
      where: { code: 'Terminale' },
      update: {},
      create: { code: 'Terminale', name: 'Terminale', academicYear: '2025-2026' },
    });
  }
  const defaultPasswordHash = await bcrypt.hash('password123', 12);

  // Associer un enseignant par défaut au groupe Terminale (visible sur son tableau)
  const defaultTeacherEmail = 'alaeddine.benrhouma@ert.tn';
  let teacher = await prisma.teacher.findUnique({ where: { email: defaultTeacherEmail } });
  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        email: defaultTeacherEmail,
        firstName: 'Alaeddine',
        lastName: 'Benrhouma',
        passwordHash: defaultPasswordHash,
        passwordChangeRequired: true,
      }
    });
  }
  // Lier l’enseignant au groupe Terminale si absent
  try {
    await prisma.teacherOnGroup.upsert({
      where: { teacherEmail_groupId: { teacherEmail: teacher.email, groupId: termGroup.id } },
      update: {},
      create: { teacherEmail: teacher.email, groupId: termGroup.id, role: 'teacher' },
    });
  } catch {}

  let created = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const { givenName, familyName } = parseName(r.student_name);
    // Priorité à l'email explicite si fourni dans le JSON
    let email = (r.student_email ? String(r.student_email).trim().toLowerCase() : null) ||
      nameToEmail.get(nameKey(givenName, familyName)) ||
      nameToEmail.get(altKey(givenName, familyName)) ||
      null;
    let studentObj = null;
    if (email) {
      // Valider l'existence en base; sinon, ne pas forcer cet email aveuglément
      const existsStudent = await prisma.student.findUnique({ where: { email } });
      if (existsStudent) {
        studentObj = { email: existsStudent.email };
      }
    }
    if (!studentObj) {
      // Tenter mapping par nom
      const mapped = nameToEmail.get(nameKey(givenName, familyName)) || nameToEmail.get(altKey(givenName, familyName)) || null;
      if (mapped) {
        const existsMapped = await prisma.student.findUnique({ where: { email: mapped } });
        if (existsMapped) {
          studentObj = { email: existsMapped.email };
        }
      }
    }
    if (!studentObj) {
      // Créer l'élève manquant (Terminale)
      const local = `${norm(givenName).replace(/\s+/g, '.')}.${norm(familyName).replace(/\s+/g, '.')}`.replace(/\.+/g, '.');
      email = `${local}@ert.tn`;
      try {
        const createdStudent = await prisma.student.create({
          data: {
            email,
            givenName: givenName || 'Élève',
            familyName: familyName || 'Terminale',
            classe: 'Terminale',
            specialites: 'NSI',
            active: true,
            passwordHash: defaultPasswordHash,
            passwordChangeRequired: true,
            groupId: termGroup.id,
          }
        });
        studentObj = { email: createdStudent.email };
        nameToEmail.set(nameKey(givenName, familyName), email);
        nameToEmail.set(altKey(givenName, familyName), email);
      } catch (e) {
        // Fallback: si l'élève existe déjà via cet email, l'utiliser
        try {
          const existingByEmail = await prisma.student.findUnique({ where: { email } });
          if (existingByEmail) {
            studentObj = { email: existingByEmail.email };
          } else {
            console.error('[seed-evaluations] create student failed', email, e?.message || e);
            skipped++;
            continue;
          }
        } catch (ee) {
          console.error('[seed-evaluations] lookup student failed', email, ee?.message || ee);
          skipped++;
          continue;
        }
      }
    }

    // Maintenant que l’élève est assuré, créer/mettre à jour son bilan
    const where = { studentEmail_evaluationId: { studentEmail: studentObj.email, evaluationId: evaluation.id } };
    const exists = await prisma.evaluationBilan.findUnique({ where });
    const pointsForts = JSON.parse(JSON.stringify(r.points_forts ?? []));
    const axesAmelioration = JSON.parse(JSON.stringify(r.axes_amelioration ?? []));
    const conseils = JSON.parse(JSON.stringify(r.conseils ?? []));

    if (exists) {
      await prisma.evaluationBilan.update({
        where: { id: exists.id },
        data: {
          noteFinale: r.note_finale ?? exists.noteFinale ?? '',
          appreciationGenerale: r.appreciation_generale ?? exists.appreciationGenerale ?? '',
          pointsForts: (r.points_forts != null ? pointsForts : exists.pointsForts ?? []),
          axesAmelioration: (r.axes_amelioration != null ? axesAmelioration : exists.axesAmelioration ?? []),
          conseils: (r.conseils != null ? conseils : exists.conseils ?? []),
        },
      });
      updated++;
    } else {
      await prisma.evaluationBilan.create({
        data: {
          studentEmail: studentObj.email,
          evaluationId: evaluation.id,
          noteFinale: r.note_finale ?? '',
          appreciationGenerale: r.appreciation_generale ?? '',
          pointsForts,
          axesAmelioration,
          conseils,
        },
      });
      created++;
    }
  }

  console.log(`[seed-evaluations] evaluation=${evaluation.title} created=${created} updated=${updated} skipped=${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); process.exit(0); });
