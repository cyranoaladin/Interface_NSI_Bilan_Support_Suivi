import fs from "fs";
import path from "path";
import { RAG_MAPPING_PATH, RESOURCES_DIR } from "@/lib/paths";
import { POST as RAG_VALIDATE_ALL } from "@/app/api/rag/validate/all/route";
import { POST as RAG_SEARCH } from "@/app/api/rag/search/route";

let ragMapping: Record<string, any> = {};

beforeAll(async () => {
  ragMapping = JSON.parse(fs.readFileSync(RAG_MAPPING_PATH, "utf8"));
});

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

describe("API Integration :: RAG Multi-Routes (App Router handlers)", () => {
  it("POST validate/all renvoie des détails valides pour toutes les sections", async () => {
    const res = await RAG_VALIDATE_ALL();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveProperty("valid");
    expect(body).toHaveProperty("details");
    expect(Array.isArray(body.details)).toBe(true);

    const flat = flatten(ragMapping);
    for (const { section, files } of flat) {
      const detail = body.details.find((d: any) => d.section === section);
      expect(detail).toBeDefined();
      for (const file of files) {
        const filePath = path.join(RESOURCES_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    }
  });

  it("POST search renvoie {results} pour chaque section du mapping", async () => {
    const flat = flatten(ragMapping);
    for (const { section } of flat) {
      const req = new Request("http://test/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      const res = await RAG_SEARCH(req as any);
      const body = await (res as any).json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("section", section);
      expect(body).toHaveProperty("results");
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBeGreaterThan(0);

      for (const r of body.results) {
        expect(typeof r.source).toBe("string");
        expect(typeof r.excerpt).toBe("string");
      }
    }
  });
});
