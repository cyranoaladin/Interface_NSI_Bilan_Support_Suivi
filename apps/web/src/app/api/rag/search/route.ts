import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse"; // nécessite `npm install pdf-parse`
import { RAG_MAPPING_PATH, RESOURCES_DIR } from "@/lib/paths";

// 🔧 Utilitaire : charge rag_mapping.json
function loadMapping() {
  const mappingPath = RAG_MAPPING_PATH;
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`rag_mapping.json introuvable : ${mappingPath}`);
  }
  const raw = fs.readFileSync(mappingPath, "utf8");
  return JSON.parse(raw);
}

function normalizeEntry(p: string) {
  if (p?.startsWith("resources/")) return p.slice("resources/".length);
  if (p?.startsWith("/resources/")) return p.slice("/resources/".length);
  return p;
}

function getFilesForSection(mapping: any, sectionKey: string): string[] {
  const parts = sectionKey.split(":");
  let node: any = mapping;
  for (const part of parts) {
    if (!node || typeof node !== "object") return [];
    node = node[part];
  }
  if (Array.isArray(node)) return node.map(normalizeEntry);
  return [];
}

// 🔧 Utilitaire : lit un fichier de /resources et renvoie du texte
async function readResource(file: string): Promise<string> {
  const filePath = path.join(RESOURCES_DIR, file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable : ${file}`);
  }

  if (file.endsWith(".md") || file.endsWith(".txt")) {
    return fs.readFileSync(filePath, "utf8");
  }

  if (file.endsWith(".json")) {
    return JSON.stringify(JSON.parse(fs.readFileSync(filePath, "utf8")), null, 2);
  }

  if (file.endsWith(".pdf")) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text.slice(0, 2000); // limite pour éviter surcharge
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { section, query } = body;

    if (!section || typeof section !== "string") {
      return NextResponse.json(
        { error: "Section invalide ou manquante" },
        { status: 400 }
      );
    }

    const mapping = loadMapping();
    const sources: string[] = getFilesForSection(mapping, section);

    if (!sources.length) {
      return NextResponse.json(
        { error: `Aucune source définie pour la section '${section}'` },
        { status: 400 }
      );
    }

    const results: { source: string; excerpt: string }[] = [];

    for (const src of sources) {
      try {
        const content = await readResource(src);

        // Si un query est fourni → filtrer les extraits pertinents
        let excerpt = content;
        if (query && typeof query === "string") {
          const idx = content.toLowerCase().indexOf(query.toLowerCase());
          if (idx !== -1) {
            excerpt = content.slice(Math.max(0, idx - 200), idx + 200);
          } else {
            excerpt = content.slice(0, 300); // fallback : début du texte
          }
        } else {
          excerpt = content.slice(0, 300);
        }

        results.push({ source: src, excerpt });
      } catch (err: any) {
        results.push({ source: src, excerpt: `❌ Erreur lecture : ${err.message}` });
      }
    }

    return NextResponse.json({
      section,
      query: query || null,
      results,
    });
  } catch (err: any) {
    console.error("Erreur dans /api/rag/search :", err.message);
    return NextResponse.json(
      { error: "Erreur interne serveur", details: err.message },
      { status: 500 }
    );
  }
}
