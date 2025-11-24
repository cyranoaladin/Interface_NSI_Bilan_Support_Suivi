/**
 * Script pour réparer les associations enseignant-groupe manquantes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTeacherGroupAssociations() {
  console.log('🔧 RÉPARATION DES ASSOCIATIONS ENSEIGNANT-GROUPE');

  // Configurons les associations correctes selon le script original
  const assignments = [
    { teacherEmail: 'alaeddine.benrhouma@ert.tn', groupCode: 'TNSI' },
    { teacherEmail: 'alaeddine.benrhouma@ert.tn', groupCode: '1G1' },
    { teacherEmail: 'pierre.caillabet@ert.tn', groupCode: 'TNSI' },
    { teacherEmail: 'pierre.caillabet@ert.tn', groupCode: '1G1' },
    { teacherEmail: 'pierre.caillabet@ert.tn', groupCode: '1G2' },
    { teacherEmail: 'hatem.bouhlel@ert.tn', groupCode: '1G3' },
  ];

  for (const assignment of assignments) {
    // Trouver l'enseignant
    const teacher = await prisma.teacher.findUnique({
      where: { email: assignment.teacherEmail }
    });

    if (!teacher) {
      console.log(`❌ Enseignant non trouvé: ${assignment.teacherEmail}`);
      continue;
    }

    // Trouver le groupe
    const group = await prisma.group.findUnique({
      where: { code: assignment.groupCode }
    });

    if (!group) {
      console.log(`❌ Groupe non trouvé: ${assignment.groupCode}`);
      continue;
    }

    // Vérifier si l'association existe déjà
    const existing = await prisma.teacherOnGroup.findUnique({
      where: {
        teacherEmail_groupId: {
          teacherEmail: assignment.teacherEmail,
          groupId: group.id
        }
      }
    });

    if (existing) {
      console.log(`ℹ️  Association existe déjà: ${assignment.teacherEmail} → ${assignment.groupCode}`);
    } else {
      // Créer la nouvelle association
      await prisma.teacherOnGroup.create({
        data: {
          teacherEmail: assignment.teacherEmail,
          groupId: group.id,
          role: 'teacher'
        }
      });
      console.log(`✅ Association créée: ${assignment.teacherEmail} → ${assignment.groupCode}`);
    }
  }

  // Vérification finale
  console.log('\n📊 VÉRIFICATION FINALE DES ASSOCIATIONS:');
  const finalAssignments = await prisma.teacherOnGroup.findMany({
    include: {
      teacher: { select: { firstName: true, lastName: true, email: true } },
      group: { select: { code: true } }
    }
  });

  for (const assignment of finalAssignments) {
    console.log(`   - ${assignment.teacher.firstName} ${assignment.teacher.lastName} (${assignment.teacher.email}) → ${assignment.group.code}`);
  }

  console.log(`\n✅ ${finalAssignments.length} associations enseignant-groupe sont maintenant configurées.`);
  console.log('   Les élèves de Première NSI devraient maintenant être visibles dans le dashboard enseignant pour les enseignants qui leur sont assignés.');
}

// Exécuter la réparation
fixTeacherGroupAssociations()
  .then(() => {
    console.log('\n✅ Réparation terminée avec succès!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de la réparation:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });