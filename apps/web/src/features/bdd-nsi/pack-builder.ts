import { datasetCatalog, quizSets } from "./content";
import {
  DatasetEntry,
  PackBuilderResource,
  PackBuilderSolutionMap,
  QuizQuestionSet
} from "./types";

export const packBuilderSolutionFiles: PackBuilderSolutionMap = {
  bibliotheque: "enseignant/sql/solutions/solutions_biblio.sql",
  cinema: "enseignant/sql/solutions/solutions_cine.sql",
  reseau: "enseignant/sql/solutions/solutions_reseau.sql",
  velo: "enseignant/sql/solutions/solutions_velo.sql",
  classe: null
};

export const packBuilderTeacherDocs: PackBuilderResource[] = [
  { href: "enseignant/docs/grille_competences_A4.html", target: "assets/docs/grille_competences_A4.html", type: "text" },
  { href: "enseignant/docs/corrections_types.md", target: "assets/docs/corrections_types.md", type: "text" },
  { href: "enseignant/sql/corrections/corrections_types.sql", target: "assets/sql/corrections/corrections_types.sql", type: "text" }
];

export const packBuilderCommonDocs: PackBuilderResource[] = [
  { href: "README.md", target: "assets/docs/README.md", type: "text" },
  { href: "PLAN_DE_TESTS.md", target: "assets/docs/PLAN_DE_TESTS.md", type: "text" },
  { href: "mocodo_bank.txt", target: "assets/docs/mocodo_bank.txt", type: "text" }
];

const sanitizeDataset = (dataset?: DatasetEntry): DatasetEntry | undefined => {
  if (dataset) return dataset;
  return datasetCatalog[0];
};

export const manifestForDataset = (datasetKey?: string, datasetSource?: "officiel" | "personnalise" | string): string => {
  const resolvedDataset = sanitizeDataset(datasetCatalog.find((entry) => entry.key === datasetKey));
  const sourceLabel = datasetSource === "personnalise"
    ? "CSV personnalisés (fournis par l’enseignant)"
    : "CSV officiels inclus dans ce pack";

  return [
    "# Pack élève — Terminale NSI",
    `Thème sélectionné : ${resolvedDataset?.label ?? "—"}`,
    `Source des CSV : ${sourceLabel}`,
    "",
    "## Contenu",
    "- index.html (interface standalone)",
    "- assets/ (datasets, scripts SQL, documents, quiz)",
    "",
    "## Démarrage rapide",
    "1. Ouvrir index.html dans un navigateur moderne (Chrome/Edge/Firefox).",
    "2. Importer les CSV via la section « Playground SQL ».",
    "3. Tester les requêtes proposées (indices puis solutions).",
    "4. Explorer les projets et la grille de compétences pour préparer l’évaluation.",
    "",
    "## Partage",
    "Utilisez la page enseignant pour générer un lien élève pré-configuré (solutions masquées)."
  ].join("\n");
};

export const resourcesForDataset = (datasetKey?: string): PackBuilderResource[] => {
  const dataset = sanitizeDataset(datasetCatalog.find((entry) => entry.key === datasetKey));
  if (!dataset) return [];
  const resources: PackBuilderResource[] = [];

  dataset.csv.forEach((href) => {
    resources.push({ href, target: `assets/${href}` });
  });

  if (dataset.ddl) {
    resources.push({ href: dataset.ddl, target: `assets/${dataset.ddl}` });
  }

  dataset.imports.forEach((href) => {
    resources.push({ href, target: `assets/${href}` });
  });

  if (dataset.e2e) {
    resources.push({ href: dataset.e2e, target: `assets/${dataset.e2e}` });
  }

  const solutionFile = packBuilderSolutionFiles[dataset.key];
  if (solutionFile) {
    resources.push({ href: solutionFile, target: `assets/${solutionFile}` });
  }

  return resources;
};

export const uniquePackResources = (resources: PackBuilderResource[]): PackBuilderResource[] => {
  const entries = new Map<string, PackBuilderResource>();
  resources.forEach((resource) => {
    if (!entries.has(resource.target)) {
      entries.set(resource.target, resource);
    }
  });
  return Array.from(entries.values());
};

export const buildQuizPayloads = (): Array<{ quiz: QuizQuestionSet; payload: string; }> => {
  return quizSets.map((quiz) => {
    const items = (quiz.questions || []).map((question, index) => ({
      id: `${quiz.id}_q${index + 1}`,
      q: question,
      choices: [],
      answer: [],
      explain: "",
      tags: [],
      level: "libre"
    }));

    const payload = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      items,
      resources: quiz.resources || []
    };

    return { quiz, payload: JSON.stringify(payload, null, 2) };
  });
};
