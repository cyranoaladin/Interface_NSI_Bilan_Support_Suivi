const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log("Connexion à la base de données réussie.");

    const studentCount = await prisma.student.count();
    const groupCount = await prisma.group.count();
    const teacherCount = await prisma.teacher.count();

    console.log("--- Compteurs Actuels en Base de Données ---");
    console.log(`Élèves (Students): ${studentCount}`);
    console.log(`Groupes (Groups): ${groupCount}`);
    console.log(`Enseignants (Teachers): ${teacherCount}`);
    console.log("-------------------------------------------");
  } catch (e) {
    console.error("Une erreur est survenue :", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("Déconnexion de la base de données.");
  }
}

main();
