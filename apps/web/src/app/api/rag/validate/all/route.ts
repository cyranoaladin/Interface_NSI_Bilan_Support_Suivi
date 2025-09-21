import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { RAG_MAPPING_PATH, RESOURCES_DIR } from "@/lib/paths";

function normalizeEntry(p: string) {
  if (p?.startsWith("resources/")) return p.slice("resources/".length);
  if (p?.startsWith("/resources/")) return p.slice("/resources/".length);
  return p;
}

function flatten(mapping: any, prefix = ""): { section: string; files: string[] }[] {
  const out: { section: string; files: string[] }[] = [];
  if (Array.isArray(mapping)) {
    out.push({ section: prefix || "root", files: mapping.map(normalizeEntry) });
  } else if (mapping && typeof mapping === "object") {
    for (const [k, v] of Object.entries(mapping)) {
      const sect = prefix ? `${prefix}:${k}` : k;
      out.push(...flatten(v, sect));
    }
  }
  return out;
}

export async function POST() {
  try {
    const ragMapping = JSON.parse(fs.readFileSync(RAG_MAPPING_PATH, "utf8"));

    const details = flatten(ragMapping).map(({ section, files }) => {
      const missing = files.filter((f) => !fs.existsSync(path.join(RESOURCES_DIR, f)));
      return { section, valid: missing.length === 0, missing };
    });

    const allValid = details.every((d) => d.valid);

    console.log("Handler called: /api/rag/validate/all", "sections:", details.length, "allValid:", allValid);
    return NextResponse.json({ valid: allValid, details });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
