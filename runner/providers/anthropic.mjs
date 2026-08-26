import { applyCaching, readUsage } from "../cache.mjs";

export function anthropicProvider({ model, maxTokens = 4096 } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set (add CLAUDE_API_KEY to env/.env)");
  const id = model || process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  return {
    id,
    async chat({ system, messages, tools }) {
      const cached = applyCaching({ system, messages, tools });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: id,
          max_tokens: maxTokens,
          ...(cached.system ? { system: cached.system } : {}),
          messages: cached.messages,
          tools: cached.tools,
        }),
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      return { content: data.content, usage: readUsage(data.usage) };
    },
  };
}
