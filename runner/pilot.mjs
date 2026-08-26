import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CONDITIONS } from "./conditions.mjs";
import { loadSecrets } from "./env.mjs";
import { modelFor } from "./models.mjs";
import { loadTask, runTrial } from "./trial.mjs";
import { RESULTS } from "./paths.mjs";

loadSecrets();
const OUT = path.join(RESULTS, "pilot-results.jsonl");
mkdirSync(path.dirname(OUT), { recursive: true });
const REPS = Number(process.env.PILOT_REPS || 2);
const TASK = loadTask("T1-embed");
const ENV = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` };

const PRICES = {
  "claude-sonnet-5": { in: 3, cached: 0.3, out: 15 },
  "gpt-5.6-terra": { in: 2, cached: 0.2, out: 12 },
  "gemini-pro-latest": { in: 1.25, cached: 0.125, out: 10 },
};
function costOf(backend, model, u = {}) {
  const p = PRICES[model];
  if (!p) return 0;
  const out = ((u.output_tokens || 0) / 1e6) * p.out;
  if (backend === "claude") {
    return ((u.input_tokens || 0) * p.in + (u.cache_read_input_tokens || 0) * p.cached + (u.cache_creation_input_tokens || 0) * p.in * 1.25) / 1e6 + out;
  }
  const total = u.input_tokens || 0;
  const cread = u.cache_read_input_tokens || 0;
  return (Math.max(0, total - cread) * p.in + cread * p.cached) / 1e6 + out;
}

const backends = {
  claude: { factory: (await import("./providers/anthropic.mjs")).anthropicProvider, model: modelFor("confirmatory", "anthropic"), shared: false },
  gpt: { factory: (await import("./providers/openai.mjs")).openaiProvider, model: modelFor("confirmatory", "openai"), shared: true },
  gemini: { factory: (await import("./providers/gemini.mjs")).geminiProvider, model: modelFor("confirmatory", "gemini"), shared: true },
};

writeFileSync(OUT, "");
const rows = [];
const t0 = Date.now();
for (const [name, b] of Object.entries(backends)) {
  const provider = b.factory({ model: b.model });
  for (const condition of CONDITIONS) {
    for (let rep = 0; rep < REPS; rep++) {
      const started = Date.now();
      let rec;
      try {
        rec = await runTrial({ repoName: TASK.repo, task: TASK, condition, provider, env: ENV });
        rec.cost = costOf(name, b.model, rec.usage);
      } catch (e) {
        rec = { taskId: TASK.id, condition, model: b.model, error: /credit|balance|quota|insufficient|unauthor|forbidden|api.?key/i.test(String(e)) ? "provider_credit_or_auth_error" : String(e).slice(0, 160) };
      }
      rec.backend = name;
      rec.rep = rep;
      rec.wallSec = Math.round((Date.now() - started) / 1000);
      rows.push(rec);
      appendFileSync(OUT, `${JSON.stringify(rec)}\n`);
      console.log(`${name}/${condition}#${rep}: vf=${rec.violationFree} acc=${rec.acceptancePassed} comp=${rec.compliant} fpViol=${rec.firstPassViolated} selfCorr=${rec.selfCorrected} tok=${rec.usage?.input_tokens}/${rec.usage?.output_tokens} cR=${rec.usage?.cache_read_input_tokens} $${(rec.cost || 0).toFixed(3)} ${rec.wallSec}s${rec.error ? ` ERR:${rec.error.slice(0, 90)}` : ""}`);
      if (b.shared) await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

console.log("\n===== PILOT SUMMARY =====");
for (const name of Object.keys(backends)) {
  const rs = rows.filter((r) => r.backend === name && !r.error);
  const errs = rows.filter((r) => r.backend === name && r.error).length;
  if (!rs.length) {
    console.log(`\n${name} (${backends[name].model}): 0 ok / ${errs} err`);
    continue;
  }
  const avg = (f) => rs.reduce((s, r) => s + (f(r) || 0), 0) / rs.length;
  const pct = (f) => Math.round((rs.filter(f).length / rs.length) * 100);
  const cpt = avg((r) => r.cost);
  const spt = avg((r) => r.wallSec);
  console.log(`\n${name} (${backends[name].model}) - ${rs.length} ok / ${errs} err`);
  console.log(`  tokens in/out avg: ${Math.round(avg((r) => r.usage.input_tokens))}/${Math.round(avg((r) => r.usage.output_tokens))}   cacheRead avg: ${Math.round(avg((r) => r.usage.cache_read_input_tokens))}`);
  console.log(`  $/trial avg: ${cpt.toFixed(3)}   wall avg: ${Math.round(spt)}s   steps avg: ${avg((r) => r.steps).toFixed(1)}`);
  console.log(`  violationFree ${pct((r) => r.violationFree)}%  acceptance ${pct((r) => r.acceptancePassed)}%  compliant ${pct((r) => r.compliant)}%  firstPassViol ${pct((r) => r.firstPassViolated)}%  selfCorrected ${pct((r) => r.selfCorrected)}%`);
  console.log(`  projection: 300 trials = $${(cpt * 300).toFixed(2)}, ~${((spt * 300) / 3600).toFixed(1)}h (concurrency 1)  |  600 trials = $${(cpt * 600).toFixed(2)}, ~${((spt * 600) / 3600).toFixed(1)}h`);
}
console.log(`\ntotal pilot wall: ${Math.round((Date.now() - t0) / 60000)} min, ${rows.length} trials`);
