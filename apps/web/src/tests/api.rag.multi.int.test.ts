/**
 * Tests d’intégration RAG en appelant directement les handlers App Router
 */
import fs from "fs";
import path from "path";
import { RAG_MAPPING_PATH, RESOURCES_DIR } from "@/lib/paths";
import { POST as RAG_SEARCH } from "@/app/api/rag/search/route";
import { POST as RAG_VALIDATE } from "@/app/api/rag/validate/route";

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

describe("API Integration :: RAG Workflow Premium (App Router handlers)", () => {
  let ragMapping: any;

  beforeAll(async () => {
    ragMapping = JSON.parse(fs.readFileSync(RAG_MAPPING_PATH, "utf8"));
  });

  it("POST search doit renvoyer des extraits valides pour une section élève", async () => {
    const payload = {
      query: "Analyse compétences en NSI",
      section: "eleve:analyse_competences",
    };

    const req = new Request("http://test/api/rag/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res = await RAG_SEARCH(req as any);
    const body = await (res as any).json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("results");
    expect(Array.isArray(body.results)).toBe(true);

    for (const result of body.results) {
      const resourcePath = path.join(RESOURCES_DIR, result.source);
      expect(fs.existsSync(resourcePath)).toBe(true);
    }
  });

  it("POST validate doit confirmer la présence des ressources du mapping", async () => {
    const section = "eleve:analyse_competences";
    const flat = flatten(ragMapping);
    const found = flat.find((f) => f.section === section);
    const sources = found ? found.files : [];

    const req = new Request("http://test/api/rag/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section }),
    });
    const res = await RAG_VALIDATE(req as any);
    const body = await (res as any).json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("valid");
    expect(body.valid).toBe(true);

    for (const src of sources) {
      const resourcePath = path.join(RESOURCES_DIR, src);
      expect(fs.existsSync(resourcePath)).toBe(true);
    }
  });

  it("POST validate doit échouer si une section inexistante est demandée", async () => {
    const req = new Request("http://test/api/rag/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "inconnue:section" }),
    });
    const res = await RAG_VALIDATE(req as any);
    const body = await (res as any).json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty("error");
  });
});
