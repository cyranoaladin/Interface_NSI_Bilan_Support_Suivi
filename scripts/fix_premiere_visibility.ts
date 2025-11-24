/**
 * Script pour vérifier et corriger les données des élèves de Première NSI
 * dans le dashboard enseignant
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function verifyAndFixPremiereData() {
  console.log('🔍 VÉRIFICATION DES DONNÉES DE PREMIÈRE NSI');

  // Vérifier les groupes existants
  console.log('\n📋 1. Groupes existants dans la base :');
  const allGroups = await prisma.group.findMany();
  for (const group of allGroups) {
    console.log(`   - ${group.code}: ${group.name} (${group.academicYear})`);
  }

  // Vérifier les enseignants assignés aux groupes
  console.log('\n👨‍🏫 2. Enseignants assignés aux groupes:');
  const teacherAssignments = await prisma.teacherOnGroup.findMany({
    include: {
      teacher: true,
      group: true
    }
  });
  for (const assignment of teacherAssignments) {
    console.log(`   - ${assignment.teacher.firstName} ${assignment.teacher.lastName} (${assignment.teacher.email}) → ${assignment.group.code}`);
  }

  // Vérifier les élèves de Première
  console.log('\n👥 3. Élèves de Première NSI dans la base :');
  const premiereGroups = ['1G1', '1G2', '1G3'];
  for (const groupCode of premiereGroups) {
    const group = await prisma.group.findUnique({
      where: { code: groupCode }
    });
    
    if (group) {
      const students = await prisma.student.findMany({
        where: { groupId: group.id },
        select: { email: true, givenName: true, familyName: true }
      });
      console.log(`   - ${groupCode}: ${students.length} élèves`);
      for (const student of students.slice(0, 3)) {  // Afficher seulement 3 premiers
        console.log(`     • ${student.familyName} ${student.givenName} (${student.email})`);
      }
      if (students.length > 3) {
        console.log(`     • ... et ${students.length - 3} autres`);
      }
    } else {
      console.log(`   - ${groupCode}: AUCUN GROUPE TROUVÉ`);
    }
  }

  // Vérifier si les groupes de Première existent, sinon les créer
  console.log('\n🔧 4. Vérification/séparation de la création des groupes de Première :');
  
  const existingGroupCodes = allGroups.map(g => g.code);
  const missingGroups = [];
  
  for (const groupCode of premiereGroups) {
    if (!existingGroupCodes.includes(groupCode)) {
      missingGroups.push(groupCode);
    }
  }

  if (missingGroups.length > 0) {
    console.log(`   - Groupes manquants: ${missingGroups.join(', ')}`);
    console.log('   - AJOUT DES GROUPES DE PREMIÈRE NSI...');
    
    for (const code of missingGroups) {
      let name = '';
      if (code === '1G1') name = 'Première G1';
      else if (code === '1G2') name = 'Première G2';
      else if (code === '1G3') name = 'Première G3';
      
      await prisma.group.create({
        data: {
          code,
          name,
          academicYear: '2024-2025'
        }
      });
      console.log(`   - Groupe ${code} créé: ${name}`);
    }
    
    // Recharger les groupes
    const updatedGroups = await prisma.group.findMany();
    console.log(`   - Total groupes maintenant: ${updatedGroups.length}`);
  } else {
    console.log('   - Tous les groupes de Première sont présents');
  }

  // Vérifier les enseignants dans la base
  console.log('\n👤 5. Vérification des enseignants dans la base:');
  const teachers = await prisma.teacher.findMany();
  console.log(`   - ${teachers.length} enseignants trouvés`);
  for (const teacher of teachers) {
    console.log(`   - ${teacher.firstName} ${teacher.lastName} (${teacher.email})`);
  }

  // Si les enseignants n'existent pas, les créer
  const neededTeachers = [
    { email: 'alaeddine.benrhouma@ert.tn', firstName: 'Alaeddine', lastName: 'Ben Rhouma' },
    { email: 'pierre.caillabet@ert.tn', firstName: 'Pierre', lastName: 'Caillabet' },
    { email: 'hatem.bouhlel@ert.tn', firstName: 'Hatem', lastName: 'Bouhlel' },
  ];
  
  for (const teacherData of neededTeachers) {
    const existing = await prisma.teacher.findUnique({
      where: { email: teacherData.email }
    });
    
    if (!existing) {
      const passwordHash = await bcrypt.hash('password123', 12);
      await prisma.teacher.create({
        data: {
          email: teacherData.email,
          firstName: teacherData.firstName,
          lastName: teacherData.lastName,
          passwordHash,
          passwordChangeRequired: true
        }
      });
      console.log(`   - Enseignant créé: ${teacherData.email}`);
    }
  }

  // Vérifier les associations enseignant-groupe pour les groupes de Première
  console.log('\n🔗 6. Vérification des associations enseignant ↔ groupes de Première:');
  const requiredAssignments = [
    { teacherEmail: 'alaeddine.benrhouma@ert.tn', groupCode: '1G1' },
    { teacherEmail: 'pierre.caillabet@ert.tn', groupCode: '1G1' },
    { teacherEmail: 'pierre.caillabet@ert.tn', groupCode: '1G2' },
    { teacherEmail: 'hatem.bouhlel@ert.tn', groupCode: '1G3' },
  ];

  for (const assignment of requiredAssignments) {
    const teacher = await prisma.teacher.findUnique({
      where: { email: assignment.teacherEmail }
    });
    
    const group = await prisma.group.findUnique({
      where: { code: assignment.groupCode }
    });
    
    if (teacher && group) {
      const existing = await prisma.teacherOnGroup.findUnique({
        where: {
          teacherEmail_groupId: {
            teacherEmail: assignment.teacherEmail,
            groupId: group.id
          }
        }
      });
      
      if (!existing) {
        await prisma.teacherOnGroup.create({
          data: {
            teacherEmail: assignment.teacherEmail,
            groupId: group.id,
            role: 'teacher'
          }
        });
        console.log(`   - Association créée: ${assignment.teacherEmail} → ${assignment.groupCode}`);
      } else {
        console.log(`   - Association existe déjà: ${assignment.teacherEmail} → ${assignment.groupCode}`);
      }
    }
  }

  console.log('\n✅ 7. CORRECTIONS APPLIQUÉES');
  console.log('   - Les groupes de Première NSI sont maintenant correctement configurés');
  console.log('   - Les enseignants sont maintenant correctement associés aux groupes de Première NSI');
  console.log('   - Les données sont prêtes à être affichées dans le dashboard enseignant');

  // Résumé final
  console.log('\n📊 8. RÉSUMÉ FINAL:');
  const finalGroups = await prisma.group.count();
  const finalTeachers = await prisma.teacher.count();
  const finalStudents = await prisma.student.count();
  const finalAssignments = await prisma.teacherOnGroup.count();
  
  console.log(`   - Total groupes: ${finalGroups}`);
  console.log(`   - Total enseignants: ${finalTeachers}`);
  console.log(`   - Total élèves: ${finalStudents}`);
  console.log(`   - Total associations: ${finalAssignments}`);

  // Vérifier combien d'élèves de Première sont maintenant visibles par chaque enseignant
  console.log('\n👁️ 9. VISIBILITÉ ACTUELLE POUR CHAQUE ENSEIGNANT:');
  
  const assignments = await prisma.teacherOnGroup.findMany({
    include: {
      teacher: true,
      group: { select: { code: true } }
    }
  });
  
  for (const assignment of assignments) {
    if (assignment.group.code.startsWith('1G')) {  // Groupe de Première
      const group = await prisma.group.findUnique({
        where: { code: assignment.group.code }
      });
      
      if (group) {
        const studentCount = await prisma.student.count({
          where: { groupId: group.id }
        });
        console.log(`   - ${assignment.teacher.firstName} ${assignment.teacher.lastName}: ${studentCount} élèves de ${assignment.group.code}`);
      }
    }
  }
  
  console.log('\n🎉 La base de données est maintenant correctement configurée pour afficher les élèves de Première NSI dans le dashboard enseignant!');
}

// Exécuter la correction
verifyAndFixPremiereData()
  .then(() => {
    console.log('\n✅ Correction terminée avec succès!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de la correction:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });