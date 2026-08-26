import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENV_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "env");

function parseDotenv(text) {
  const out = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function loadSecrets() {
  if (!existsSync(ENV_DIR)) return { loaded: false, dir: ENV_DIR };
  const envFile = path.join(ENV_DIR, ".env");
  if (existsSync(envFile)) {
    const parsed = parseDotenv(readFileSync(envFile, "utf8"));
    for (const [k, v] of Object.entries(parsed)) if (process.env[k] === undefined) process.env[k] = v;
  }
  const alias = (canonical, ...aliases) => {
    if (process.env[canonical]) return;
    for (const a of aliases) if (process.env[a]) { process.env[canonical] = process.env[a]; return; }
  };
  alias("ANTHROPIC_API_KEY", "CLAUDE_API_KEY", "CLAUDE_KEY");
  alias("OPENAI_API_KEY", "OPEN_API_KEY", "OPENAI_KEY");
  alias("GEMINI_API_KEY", "GOOGLE_API_KEY");

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const json = readdirSync(ENV_DIR).find((f) => f.endsWith(".json"));
    if (json) process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(ENV_DIR, json);
  }
  if (!process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
      if (sa.project_id) process.env.GOOGLE_CLOUD_PROJECT = sa.project_id;
    } catch {
    }
  }
  if (!process.env.GOOGLE_CLOUD_LOCATION) process.env.GOOGLE_CLOUD_LOCATION = "us-central1";
  return { loaded: true, dir: ENV_DIR };
}
