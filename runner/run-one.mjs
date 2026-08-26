import path from "node:path";
import { loadSecrets } from "./env.mjs";
import { modelFor } from "./models.mjs";
import { loadTask, runTrial } from "./trial.mjs";

loadSecrets();
const [, , taskId = "T1-embed", condition = "C0", which = "anthropic", tier = "smoke"] = process.argv;

const factories = {
  anthropic: (await import("./providers/anthropic.mjs")).anthropicProvider,
  openai: (await import("./providers/openai.mjs")).openaiProvider,
  gemini: (await import("./providers/gemini.mjs")).geminiProvider,
};
const model = modelFor(tier, which);
const provider = factories[which]({ model });
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` };
const task = loadTask(taskId);

console.log(`LIVE trial: task=${taskId} condition=${condition} provider=${which} model=${model}`);
const rec = await runTrial({ repoName: task.repo, task, condition, provider, env });

console.log("\n=== RESULT ===");
console.log(`acceptancePassed : ${rec.acceptancePassed}`);
console.log(`compliant        : ${rec.compliant}`);
console.log(`violationFree    : ${rec.violationFree}`);
console.log(`firstPassViolated: ${rec.firstPassViolated}  selfCorrected: ${rec.selfCorrected}`);
console.log(`steps=${rec.steps} hitStepLimit=${rec.hitStepLimit} tools=[${rec.toolCalls.join(",")}]`);
console.log(`tokens in/out    : ${rec.usage.input_tokens}/${rec.usage.output_tokens}  wall=${rec.wallMs}ms`);
if (rec.violations.length) console.log(`violations       : ${JSON.stringify(rec.violations)}`);
if (!rec.acceptancePassed) console.log(`acceptance out   :\n${rec.acceptanceOut}`);
