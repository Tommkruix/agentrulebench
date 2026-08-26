import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadSecrets } from "./env.mjs";
import { runAgent } from "./loop.mjs";

loadSecrets();
const which = process.argv[2] ?? "anthropic";
const tier = process.argv[3] ?? "smoke";
const { anthropicProvider } = await import("./providers/anthropic.mjs");
const { openaiProvider } = await import("./providers/openai.mjs");
const { geminiProvider } = await import("./providers/gemini.mjs");
const { bedrockProvider } = await import("./providers/bedrock.mjs");
const { modelFor } = await import("./models.mjs");
const providers = { anthropic: anthropicProvider, openai: openaiProvider, gemini: geminiProvider, bedrock: bedrockProvider };
const make = providers[which];
if (!make) throw new Error(`unknown provider ${which}`);
const provider = make({ model: modelFor(tier, which) });

const repo = mkdtempSync(path.join(tmpdir(), "arb-live-"));
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { stdio: "ignore" });
git("init", "-q");
execFileSync("bash", ["-lc", `printf 'seed\\n' > "${repo}/seed.txt"`]);
git("add", "-A");
git("-c", "user.email=a@b.c", "-c", "user.name=x", "commit", "-qm", "seed");

console.log(`provider=${which} model=${provider.id}`);
const r = await runAgent({
  repo,
  provider,
  system: "You are a coding agent. Use the provided tools to complete the task. When done, call finish.",
  prompt: "Create a file named hello.txt whose exact contents are the single word: BENCH (no trailing text). Then finish.",
  maxSteps: 8,
});
const made = existsSync(path.join(repo, "hello.txt")) ? readFileSync(path.join(repo, "hello.txt"), "utf8").trim() : "(missing)";
rmSync(repo, { recursive: true, force: true });

console.log("tools used:", r.toolCalls.map((c) => c.name).join(",") || "(none)");
console.log("hello.txt:", JSON.stringify(made));
console.log(`tokens in/out: ${r.usage.input_tokens}/${r.usage.output_tokens} | steps ${r.steps} | wall ${r.wallMs}ms`);
const approxCost = (r.usage.input_tokens / 1e6) * 1 + (r.usage.output_tokens / 1e6) * 5;
console.log(`approx cost this call (rough): $${approxCost.toFixed(5)}`);
console.log(made === "BENCH" ? `\n${which.toUpperCase()} BACKEND: PROVEN live` : `\n${which.toUpperCase()} BACKEND: unexpected output (${made})`);
