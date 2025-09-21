import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
export const CONFIG_DIR = path.join(PROJECT_ROOT, "config");
export const RESOURCES_DIR = path.join(PROJECT_ROOT, "resources");
export const RAG_MAPPING_PATH = path.join(CONFIG_DIR, "rag_mapping.json");
