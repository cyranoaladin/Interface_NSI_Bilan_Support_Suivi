import fs from "node:fs";
import { PrismaClient, ExerciseType, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();
type J = any;

function mapType(t: string): ExerciseType {
  if ((t || "").toUpperCase() === "MCQ") return "QCM" as ExerciseType;
  if ((t || "").toUpperCase() === "CODING") return "CODING" as ExerciseType;
  if ((t || "").toUpperCase() === "OUVERT") return "OUVERT" as ExerciseType;
  return "QCM" as ExerciseType;
}

function mapDifficulty(d: string | undefined): Difficulty {
  const v = (d || "MEDIUM").toUpperCase();
  if (v === "EASY") return "EASY" as Difficulty;
  if (v === "HARD") return "HARD" as Difficulty;
  return "MEDIUM" as Difficulty;
}

async function main() {
  const raw = fs.readFileSync("data/exercises.bac.min.json","utf8");
  const items = JSON.parse(raw) as J[];

  for (const ex of items) {
    const type = mapType(ex.type);
    const difficulty = mapDifficulty(ex.difficulty);
    const created = await prisma.exercise.upsert({
      where: { code: ex.code },
      update: {
        type,
        title: ex.title,
        statementMd: ex.statementMd,
        solutionJson: type === "QCM" ? { answerKey: ex.answerKey } : null,
        testsJson: type === "CODING" ? ex.tests ?? null : null,
        starterCode: ex.starter ?? null,
        difficulty
      },
      create: {
        code: ex.code,
        type,
        title: ex.title,
        statementMd: ex.statementMd,
        solutionJson: type === "QCM" ? { answerKey: ex.answerKey } : null,
        testsJson: type === "CODING" ? ex.tests ?? null : null,
        starterCode: ex.starter ?? null,
        difficulty
      },
      select: { id: true }
    });

    if (Array.isArray(ex.notions) && ex.notions.length) {
      await prisma.exerciseNotion.deleteMany({ where: { exerciseId: created.id }});
      const notions = await prisma.notion.findMany({ where: { code: { in: ex.notions }}, select: { id:true, code:true }});
      if (notions.length) {
        await prisma.exerciseNotion.createMany({
          data: notions.map(n => ({ exerciseId: created.id, notionId: n.id }))
        });
      }
    }
  }

  console.log("✅ Seed exercises OK");
}

main().catch((e)=>{ console.error(e); process.exit(1); }).finally(()=> prisma.$disconnect());
