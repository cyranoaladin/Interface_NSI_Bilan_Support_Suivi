/* Idempotent seed: upsert CurrTheme + Notion per YAML */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { PrismaClient } from "@prisma/client";

type YTheme = { code:string; title:string; order:number; notions:{code:string; title:string}[] };
type YDoc = { program:string; code:string; version:string; themes:YTheme[] };

const prisma = new PrismaClient();

async function main() {
  const file = path.resolve(process.cwd(), "curriculum/terminale-nsi.fr.yml");
  const doc = yaml.load(fs.readFileSync(file, "utf8")) as YDoc;

  // Root theme (optional umbrella)
  const root = await prisma.currTheme.upsert({
    where: { code: doc.code },
    update: { title: doc.program, order: 0, parentId: null },
    create: { code: doc.code, title: doc.program, order: 0, parentId: null },
  });
  const parentId = root.id;

  // Themes
  for (const t of doc.themes) {
    const theme = await prisma.currTheme.upsert({
      where: { code: t.code },
      update: { title: t.title, order: t.order, parentId },
      create: { code: t.code, title: t.title, order: t.order, parentId },
    });
    // Notions
    let ord = 1;
    for (const n of t.notions) {
      await prisma.notion.upsert({
        where: { code: n.code },
        update: { title: n.title, themeId: theme.id, order: ord },
        create: { code: n.code, title: n.title, themeId: theme.id, order: ord },
      });
      ord++;
    }
  }

  console.log("✅ Seed curriculum OK");
}

main().catch((e)=>{ console.error(e); process.exit(1); }).finally(()=> prisma.$disconnect());
