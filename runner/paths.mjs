import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = ROOT;
export const TASKS = path.join(ROOT, "tasks");
export const REPOS = path.join(ROOT, "repos");
export const RESULTS = path.join(ROOT, "results");
