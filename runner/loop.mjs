import { executeTool, gitDiff, TOOL_DEFS } from "./tools.mjs";

const TRANSIENT = /fetch failed|socket|other side closed|ECONN|ETIMEDOUT|network|\b(429|500|502|503|504)\b|overloaded|rate.?limit|timeout|aborted/i;

async function chatWithRetry(provider, args, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await provider.chat(args);
    } catch (e) {
      lastErr = e;
      if (i === tries - 1 || !TRANSIENT.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1) + Math.floor((i * 137) % 500)));
    }
  }
  throw lastErr;
}

export async function runAgent({ repo, prompt, provider, system, maxSteps = 40, env, shellTimeout }) {
  const ctx = { repo, env, shellTimeout };
  const messages = [{ role: "user", content: [{ type: "text", text: prompt }] }];
  const toolCalls = [];
  let usageIn = 0;
  let usageOut = 0;
  let usageCacheRead = 0;
  let usageCacheWrite = 0;
  let steps = 0;
  let finished = false;
  let firstPassDiff = null;
  const t0 = Date.now();

  while (steps < maxSteps && !finished) {
    steps++;
    const resp = await chatWithRetry(provider, { system, messages, tools: TOOL_DEFS });
    usageIn += resp.usage?.input_tokens ?? 0;
    usageOut += resp.usage?.output_tokens ?? 0;
    usageCacheRead += resp.usage?.cache_read_input_tokens ?? 0;
    usageCacheWrite += resp.usage?.cache_creation_input_tokens ?? 0;
    messages.push({ role: "assistant", content: resp.content });

    const toolUses = resp.content.filter((c) => c.type === "tool_use");
    if (toolUses.length === 0) break;

    const results = [];
    for (const tu of toolUses) {
      toolCalls.push({ name: tu.name, input: tu.input });
      if (tu.name === "run_shell" && /\blint\b/i.test(tu.input?.command ?? "") && firstPassDiff === null) {
        firstPassDiff = gitDiff(repo);
      }
      if (tu.name === "finish") {
        finished = true;
        results.push({ type: "tool_result", tool_use_id: tu.id, content: "ok" });
        continue;
      }
      const out = executeTool(tu.name, tu.input, ctx);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: String(out) });
    }
    messages.push({ role: "user", content: results });
  }

  const finalDiff = gitDiff(repo);
  if (firstPassDiff === null) firstPassDiff = finalDiff;
  return {
    finalDiff,
    firstPassDiff,
    toolCalls,
    steps,
    hitStepLimit: steps >= maxSteps && !finished,
    usage: { input_tokens: usageIn, output_tokens: usageOut, cache_read_input_tokens: usageCacheRead, cache_creation_input_tokens: usageCacheWrite },
    wallMs: Date.now() - t0,
    transcript: messages,
  };
}
