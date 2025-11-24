declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => any;

import {
  datasetCatalog,
  defaultSolutionOverrides,
  evaluationScenarios,
  quizSets
} from "../content";
import {
  buildQuizPayloads,
  packBuilderCommonDocs,
  packBuilderSolutionFiles,
  packBuilderTeacherDocs,
  resourcesForDataset,
  uniquePackResources
} from "../pack-builder";
import { DatasetKey } from "../types";

describe("BDD NSI content integrity", () => {
  const expectedKeys: DatasetKey[] = ["bibliotheque", "cinema", "reseau", "velo", "classe"];

  test("dataset catalog covers every dataset key", () => {
    const catalogKeys = datasetCatalog.map((entry) => entry.key).sort();
    expect(catalogKeys).toEqual([...expectedKeys].sort());
  });

  test("each dataset entry exposes CSV files and imports", () => {
    datasetCatalog.forEach((entry) => {
      expect(entry.csv.length).toBeGreaterThan(0);
      expect(entry.csv.every((href) => href.endsWith(".csv"))).toBe(true);
      expect(entry.ddl.endsWith(".sql")).toBe(true);
      expect(entry.imports.length).toBeGreaterThan(0);
      expect(entry.imports.every((href) => href.endsWith(".sql"))).toBe(true);
      if (entry.e2e) {
        expect(entry.e2e.endsWith(".sql")).toBe(true);
      }
    });
  });

  test("pack builder solution mapping aligns with datasets", () => {
    const solutionKeys = Object.keys(packBuilderSolutionFiles).sort();
    expect(solutionKeys).toEqual([...expectedKeys].sort());

    expectedKeys.forEach((key) => {
      if (key === "classe") {
        expect(packBuilderSolutionFiles[key]).toBeNull();
      } else {
        const file = packBuilderSolutionFiles[key];
        expect(typeof file).toBe("string");
        if (typeof file === "string") {
          expect(file.endsWith(".sql")).toBe(true);
        }
      }
    });
  });

  test("resourcesForDataset aggregates all related assets", () => {
    datasetCatalog.forEach((entry) => {
      const resources = resourcesForDataset(entry.key);
      const csvTargets = entry.csv.map((href) => `assets/${href}`);
      csvTargets.forEach((target) => {
        expect(resources.some((res) => res.target === target)).toBe(true);
      });

      if (entry.e2e) {
        expect(resources.some((res) => res.href === entry.e2e)).toBe(true);
      }

      const unique = uniquePackResources(resources);
      const targets = unique.map((item) => item.target);
      expect(new Set(targets).size).toBe(targets.length);
    });
  });

  test("teacher documents stay marked as text payloads", () => {
    [...packBuilderTeacherDocs, ...packBuilderCommonDocs].forEach((resource) => {
      expect(resource.type === undefined || resource.type === "text").toBe(true);
      expect(resource.target.startsWith("assets/")).toBe(true);
    });
  });

  test("default overrides stay aligned with scenarios", () => {
    const overrideKeys = Object.keys(defaultSolutionOverrides.scenarios).sort();
    const scenarioKeys = evaluationScenarios.map((scenario) => scenario.id).sort();
    expect(overrideKeys).toEqual(scenarioKeys);
  });

  test("quiz payload builder serialises every quiz", () => {
    const payloads = buildQuizPayloads();
    expect(payloads.length).toBe(quizSets.length);
    payloads.forEach(({ quiz, payload }) => {
      expect(payload).toEqual(JSON.stringify(JSON.parse(payload), null, 2));
      expect(quiz.questions.length).toBeGreaterThan(0);
    });
  });
});
