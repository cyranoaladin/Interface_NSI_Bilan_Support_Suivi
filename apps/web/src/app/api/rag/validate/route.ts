import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { RAG_MAPPING_PATH, RESOURCES_DIR } from "@/lib/paths";

// Fonction utilitaire pour charger rag_mapping.json
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { section } = body;

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

    // Vérification des fichiers dans /resources
    const missing: string[] = [];
    for (const src of sources) {
      const filePath = path.join(RESOURCES_DIR, src);
      if (!fs.existsSync(filePath)) {
        missing.push(src);
      }
    }

    if (missing.length > 0) {
      return NextResponse.json({
        valid: false,
        section,
        missing,
      });
    }

    return NextResponse.json({
      valid: true,
      section,
      checked: sources.length,
    });
  } catch (err: any) {
    console.error("Erreur dans /api/rag/validate :", err.message);
    return NextResponse.json(
      { error: "Erreur interne serveur", details: err.message },
      { status: 500 }
    );
  }
}
