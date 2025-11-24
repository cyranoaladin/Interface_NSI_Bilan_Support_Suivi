#!/usr/bin/env node

/**
 * Script pour vérifier directement l'état des données dans la base
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

// Récupérer l'URL de la base de données
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ Erreur: Aucune variable DATABASE_URL trouvée dans .env');
  console.log('Variables actuelles dans .env:');
  require('child_process').execSync('cat .env', { stdio: 'inherit' });
  process.exit(1);
}

console.log('🔍 Connexion à la base de données PostgreSQL...');
console.log('Using DATABASE_URL:', DATABASE_URL.replace(/:\/\/.*@/, '://***@'));

async function checkDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false // désactiver SSL pour la connexion locale
  });

  try {
    // Tester la connexion
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connexion réussie à la base de données');
    console.log('   Timestamp serveur:', testResult.rows[0].now);

    // Vérifier les tables importantes
    console.log('\n📋 VÉRIFICATION DES TABLES IMPORTANTES:');

    // Vérifier la table des groupes
    try {
      const groupsResult = await pool.query('SELECT * FROM "Group" ORDER BY "name"');
      console.log(`\n   🏫 Groupes trouvés: ${groupsResult.rowCount}`);
      groupsResult.rows.forEach(row => {
        console.log(`   - ${row.code}: ${row.name} (${row.academicYear})`);
      });
    } catch (e) {
      console.log('   ❌ Erreur lors de la lecture de la table Group:', e.message);
    }

    // Vérifier les enseignants
    try {
      const teachersResult = await pool.query('SELECT "email", "firstName", "lastName" FROM "Teacher"');
      console.log(`\n   👨‍🏫 Enseignants trouvés: ${teachersResult.rowCount}`);
      teachersResult.rows.forEach(row => {
        console.log(`   - ${row.firstName} ${row.lastName} (${row.email})`);
      });
    } catch (e) {
      console.log('   ❌ Erreur lors de la lecture de la table Teacher:', e.message);
    }

    // Vérifier les associations enseignant-groupe
    try {
      const teacherGroupsResult = await pool.query(`
        SELECT t."email" as "teacherEmail", g."code" as "groupCode", tg."role"
        FROM "TeacherOnGroup" tg
        JOIN "Teacher" t ON t."email" = tg."teacherEmail"
        JOIN "Group" g ON g."id" = tg."groupId"
        ORDER BY t."email", g."code"
      `);
      console.log(`\n   🔗 Associations Enseignant-Groupe: ${teacherGroupsResult.rowCount}`);
      teacherGroupsResult.rows.forEach(row => {
        console.log(`   - ${row.teacherEmail} → ${row.groupCode} (role: ${row.role})`);
      });
    } catch (e) {
      console.log('   ❌ Erreur lors de la lecture de la table TeacherOnGroup:', e.message);
    }

    // Vérifier les élèves
    try {
      const studentsResult = await pool.query(`
        SELECT s."email", s."givenName", s."familyName", s."classe", g."code" as "groupName"
        FROM "Student" s
        LEFT JOIN "Group" g ON s."groupId" = g."id"
        ORDER BY s."classe", s."familyName", s."givenName"
        LIMIT 20
      `);
      console.log(`\n   👥 Élèves trouvés: ${studentsResult.rowCount} (affichant les 20 premiers)`);
      studentsResult.rows.forEach(row => {
        console.log(`   - ${row.familyName} ${row.givenName} (${row.email}) - ${row.groupName || 'AUCUN_GROUPE'} [classe: ${row.classe}]`);
      });
    } catch (e) {
      console.log('   ❌ Erreur lors de la lecture de la table Student:', e.message);
    }

    // Compter les élèves par groupe
    try {
      const studentCountsResult = await pool.query(`
        SELECT g."code" as "groupCode", COUNT(s."email") as "studentCount"
        FROM "Group" g
        LEFT JOIN "Student" s ON s."groupId" = g."id"
        GROUP BY g."code"
        ORDER BY g."code"
      `);
      console.log(`\n   📊 Répartition des élèves par groupe:`);
      studentCountsResult.rows.forEach(row => {
        console.log(`   - ${row.groupCode}: ${row.studentCount} élèves`);
      });
    } catch (e) {
      console.log('   ❌ Erreur lors du comptage des élèves par groupe:', e.message);
    }

    // Vérifier spécifiquement les groupes de Première
    try {
      console.log('\n🔍 ANALYSE SPÉCIFIQUE DES ÉLÈVES DE PREMIÈRE:');
      const premiereStudentsResult = await pool.query(`
        SELECT s."email", s."givenName", s."familyName", g."code" as "groupCode", 
               t."email" as "teacherEmail", t."firstName", t."lastName"
        FROM "Student" s
        LEFT JOIN "Group" g ON s."groupId" = g."id"
        LEFT JOIN "TeacherOnGroup" tog ON tog."groupId" = g."id"
        LEFT JOIN "Teacher" t ON t."email" = tog."teacherEmail"
        WHERE g."code" LIKE '1G%'
        ORDER BY g."code", s."familyName", s."givenName"
      `);
      console.log(`   Élèves de Première (1G*) trouvés: ${premiereStudentsResult.rowCount}`);
      
      const grouping = {};
      premiereStudentsResult.rows.forEach(row => {
        if (!grouping[row.groupCode]) grouping[row.groupCode] = [];
        if (row.teacherEmail) {
          grouping[row.groupCode].push(`${row.familyName} ${row.givenName} - enseignant: ${row.firstName} ${row.lastName} (${row.teacherEmail})`);
        } else {
          grouping[row.groupCode].push(`${row.familyName} ${row.givenName} (AUCUN ENSEIGNANT ASSIGNÉ)`);
        }
      });
      
      for (const [groupCode, students] of Object.entries(grouping)) {
        console.log(`\n   🎓 Groupe ${groupCode} (${students.length} élèves):`);
        students.slice(0, 5).forEach(student => {
          console.log(`     • ${student}`);
        });
        if (students.length > 5) {
          console.log(`     • ... et ${students.length - 5} autres`);
        }
      }
    } catch (e) {
      console.log('   ❌ Erreur lors de l\'analyse des élèves de Première:', e.message);
    }

    console.log('\n✅ ANALYSE COMPLÈTE DE LA BASE DE DONNÉES TERMINÉE');

    // Résumé des problèmes potentiels
    console.log('\n🔍 RÉSUMÉ DES POTENTIELS PROBLÈMES:');
    
    try {
      // Vérifier les groupes de Première sans enseignants assignés
      const groupsWithoutTeachers = await pool.query(`
        SELECT g."code", COUNT(s."email") as "studentCount"
        FROM "Group" g
        LEFT JOIN "Student" s ON s."groupId" = g."id"
        LEFT JOIN "TeacherOnGroup" tog ON tog."groupId" = g."id"
        WHERE g."code" LIKE '1G%'
        AND tog."groupId" IS NULL
        GROUP BY g."code"
      `);
      
      if (groupsWithoutTeachers.rowCount > 0) {
        console.log('   ❌ PROBLÈME IDENTIFIÉ: Groupes de Première sans enseignants assignés:');
        groupsWithoutTeachers.rows.forEach(row => {
          console.log(`      - ${row.code} a ${row.studentCount} élèves mais aucun enseignant assigné!`);
        });
      } else {
        console.log('   ✅ AUCUN PROBLÈME: Tous les groupes de Première ont au moins un enseignant assigné');
      }
    } catch (e) {
      console.log('   ❓ Impossible de vérifier les groupes sans enseignants:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur pendant la vérification:', error.message);
    if (error.detail) console.error('Détails:', error.detail);
  } finally {
    await pool.end();
  }
}

// Exécuter la vérification
checkDatabase()
  .then(() => {
    console.log('\n🎉 Vérification terminée!');
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
  });