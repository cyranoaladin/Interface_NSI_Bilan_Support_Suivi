/**
 * Script pour corriger spécifiquement les données des élèves de Première NSI
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function fixPremiereStudents() {
  console.log('🔧 CORRECTION DES DONNÉES D\'ÉLÈVES DE PREMIÈRE NSI');

  // D'abord, essayons d'identifier les groupes
  const groups = await prisma.group.findMany({
    where: {
      code: { in: ['1G1', '1G2', '1G3'] }
    }
  });

  console.log(`\n📋 Groupes identifiés: ${groups.map(g => g.code).join(', ')}`);

  if (groups.length !== 3) {
    console.log('❌ ERREUR: Certains groupes de Première sont manquants');
    console.log('   Groupe(s) manquant(s):', ['1G1', '1G2', '1G3'].filter(code => !groups.some(g => g.code === code)));
    return;
  }

  // Lisons les fichiers CSV pour obtenir les vrais élèves de Première
  const fs = require('fs');
  const { parse } = require('csv-parse/sync');

  const csvFiles = [
    { code: '1G1', path: 'PREMIERE_NSI_G1.csv' },
    { code: '1G2', path: 'PREMIERE_NSI_G2.csv' },
    { code: '1G3', path: 'PREMIERE_NSI_G3.csv' }
  ];

  const passwordHash = await bcrypt.hash('password123', 12);

  for (const { code, path } of csvFiles) {
    if (!fs.existsSync(path)) {
      console.log(`\n⚠️  Fichier CSV manquant: ${path}`);
      continue;
    }

    console.log(`\n📖 Traitement de ${path} pour le groupe ${code}:`);

    const raw = fs.readFileSync(path, 'utf8');
    const records = parse(raw, {
      columns: true,
      delimiter: ';',
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    const group = groups.find(g => g.code === code);
    if (!group) {
      console.log(`  ❌ Groupe ${code} non trouvé dans la base`);
      continue;
    }

    let importedCount = 0;

    for (const r of records) {
      const familyName = (r['Nom'] || '').trim();
      const givenName = (r['Prénom'] || '').trim();
      const email = (r['Adresse E-mail'] || '').trim().toLowerCase();
      const classe = (r['Classe'] || '').trim();
      const specialites = (r['Spécialités gardées'] || '').trim();

      if (!email || !familyName || !givenName) {
        console.log(`  ⚠️  Ligne ignorée: email ou nom manquant`);
        continue;
      }

      // Vérifie si l'élève existe déjà
      const existingStudent = await prisma.student.findUnique({
        where: { email }
      });

      if (existingStudent) {
        // Mets à jour l'élève s'il est dans un mauvais groupe
        if (existingStudent.groupId !== group.id) {
          await prisma.student.update({
            where: { email },
            data: {
              groupId: group.id,
              classe: code,
              specialites: specialites
            }
          });
          console.log(`  ✏️  Mis à jour: ${familyName} ${givenName} (${email}) → ${code}`);
        } else {
          console.log(`  ℹ️  Déjà présent: ${familyName} ${givenName} (${email})`);
        }
      } else {
        // Crée un nouvel élève
        await prisma.student.create({
          data: {
            email,
            givenName,
            familyName,
            classe: code,
            specialites,
            active: true,
            passwordHash: passwordHash,
            passwordChangeRequired: true,
            groupId: group.id,
          },
        });
        console.log(`  ➕ Créé: ${familyName} ${givenName} (${email}) → ${code}`);
        importedCount++;
      }
    }

    console.log(`  ✅ ${importedCount} nouveaux élèves importés pour le groupe ${code}`);
  }

  // Vérifions les données finales
  console.log('\n📊 VÉRIFICATION FINALE:');
  
  for (const group of groups) {
    const studentCount = await prisma.student.count({
      where: { groupId: group.id }
    });
    console.log(`   - ${group.code}: ${studentCount} élèves`);
  }

  console.log('\n🎉 CORRECTION TERMINEE !');
  console.log('   Les élèves de Première NSI sont maintenant correctement importés dans la base.');
  console.log('   Ils devraient apparaître dans le dashboard enseignant pour les enseignants assignés à ces groupes.');
}

// Exécuter la correction
fixPremiereStudents()
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