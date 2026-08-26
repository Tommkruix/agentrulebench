import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { applyCaching, readUsage } from "../cache.mjs";

export function bedrockProvider({ model, maxTokens = 4096, region } = {}) {
  const id = model || process.env.BEDROCK_MODEL || "anthropic.claude-sonnet-5";
  const client = new AnthropicBedrockMantle({ awsRegion: region || process.env.AWS_REGION || "us-east-1" });
  return {
    id,
    async chat({ system, messages, tools }) {
      const cached = applyCaching({ system, messages, tools });
      const resp = await client.messages.create({
        model: id,
        max_tokens: maxTokens,
        ...(cached.system ? { system: cached.system } : {}),
        messages: cached.messages,
        tools: cached.tools,
      });
      const content = [];
      for (const b of resp.content ?? []) {
        if (b.type === "tool_use") content.push({ type: "tool_use", id: b.id, name: b.name, input: b.input });
        else if (b.type === "text" && b.text) content.push({ type: "text", text: b.text });
      }
      return { content, usage: readUsage(resp.usage) };
    },
  };
}
