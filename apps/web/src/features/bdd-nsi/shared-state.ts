import { datasetCatalog } from "./content";
import { DatasetKey } from "./types";

export type Role = "eleve" | "enseignant";

export interface SharedStateSnapshot {
  role: Role;
  dataset: DatasetKey;
  showSolutions: boolean;
}

export const storageKeys = {
  role: "nsi_bdd_role",
  dataset: "nsi_bdd_dataset",
  solutions: "nsi_bdd_show_solutions"
} as const;

const defaultDataset = (): DatasetKey => datasetCatalog[0]?.key ?? "bibliotheque";

const isValidRole = (value: string | null | undefined): value is Role =>
  value === "eleve" || value === "enseignant";

export const normalizeDataset = (value: string | null | undefined): DatasetKey => {
  if (!value) return defaultDataset();
  return datasetCatalog.some((entry) => entry.key === value)
    ? (value as DatasetKey)
    : defaultDataset();
};

export const toSolutionToken = (flag: boolean): "on" | "off" => (flag ? "on" : "off");

export const fromSolutionToken = (
  token: string | null | undefined,
  fallback: boolean
): boolean => {
  if (token === "on") return true;
  if (token === "off") return false;
  return fallback;
};

export const persistSharedState = (snapshot: SharedStateSnapshot): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKeys.role, snapshot.role);
    window.localStorage.setItem(storageKeys.dataset, snapshot.dataset);
    window.localStorage.setItem(storageKeys.solutions, toSolutionToken(snapshot.showSolutions));
  } catch (error) {
    console.warn("Impossible d’enregistrer l’état partagé", error);
  }
};

export const syncUrlWithState = (snapshot: SharedStateSnapshot): void => {
  if (typeof window === "undefined" || typeof window.history === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("role", snapshot.role);
    url.searchParams.set("dataset", snapshot.dataset);
    url.searchParams.set("solutions", toSolutionToken(snapshot.showSolutions));
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
    console.warn("Impossible de synchroniser l’URL", error);
  }
};

export const initializeSharedState = (): SharedStateSnapshot => {
  const fallbacks: SharedStateSnapshot = {
    role: "eleve",
    dataset: defaultDataset(),
    showSolutions: false
  };

  if (typeof window === "undefined") {
    return fallbacks;
  }

  try {
    const url = new URL(window.location.href);
    const getFromSources = (
      paramName: string,
      storageKey: (typeof storageKeys)[keyof typeof storageKeys],
      fallback: string
    ) => {
      const urlValue = url.searchParams.get(paramName);
      if (urlValue !== null && urlValue !== undefined && urlValue !== "") {
        return urlValue;
      }
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null && stored !== undefined && stored !== "") {
        return stored;
      }
      return fallback;
    };

    const rawRole = getFromSources("role", storageKeys.role, fallbacks.role);
    const role: Role = isValidRole(rawRole) ? rawRole : fallbacks.role;
    const rawDataset = getFromSources("dataset", storageKeys.dataset, fallbacks.dataset);
    const dataset = normalizeDataset(rawDataset);
    const rawSolutions = getFromSources(
      "solutions",
      storageKeys.solutions,
      role === "enseignant" ? "on" : "off"
    );
    const showSolutions = fromSolutionToken(rawSolutions, role === "enseignant");

    const snapshot: SharedStateSnapshot = { role, dataset, showSolutions };
    persistSharedState(snapshot);
    syncUrlWithState(snapshot);
    return snapshot;
  } catch (error) {
    console.warn("Initialisation de l’état partagé impossible", error);
    return fallbacks;
  }
};

export const composeStudentUrl = (snapshot: SharedStateSnapshot): string => {
  if (typeof window === "undefined") return "";
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("role", "eleve");
    url.searchParams.set("dataset", snapshot.dataset);
    url.searchParams.set("solutions", "off");
    return url.toString();
  } catch (error) {
    console.warn("Impossible de composer l’URL élève", error);
    return "";
  }
};
