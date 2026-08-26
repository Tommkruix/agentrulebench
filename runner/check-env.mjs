import { loadSecrets } from "./env.mjs";

const { loaded, dir } = loadSecrets();
const present = (k) => (process.env[k] ? "yes" : "no");
console.log(`secrets dir loaded: ${loaded} (${dir})`);
for (const k of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION", "VERTEX_PROJECT", "VERTEX_LOCATION"]) {
  console.log(`  ${k}: ${present(k)}`);
}
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(`  (creds json basename: ${process.env.GOOGLE_APPLICATION_CREDENTIALS.split("/").pop()})`);
}
