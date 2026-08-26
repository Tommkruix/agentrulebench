const safeParse = (s) => {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
};

function toResponsesInput(messages) {
  const input = [];
  for (const m of messages) {
    if (m.role === "user") {
      for (const b of m.content) if (b.type === "tool_result") input.push({ type: "function_call_output", call_id: b.tool_use_id, output: String(b.content) });
      const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      if (text) input.push({ role: "user", content: text });
    } else {
      const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      if (text) input.push({ role: "assistant", content: text });
      for (const b of m.content) if (b.type === "tool_use") input.push({ type: "function_call", call_id: b.id, name: b.name, arguments: JSON.stringify(b.input ?? {}) });
    }
  }
  return input;
}

export function openaiProvider({ model, maxTokens = 8000, effort } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set (add OPEN_API_KEY to env/.env)");
  const id = model || process.env.OPENAI_MODEL || "gpt-5.6-terra";
  const reasoningEffort = effort || process.env.OPENAI_EFFORT || "low";
  return {
    id,
    async chat({ system, messages, tools }) {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: id,
          store: false,
          reasoning: { effort: reasoningEffort },
          max_output_tokens: maxTokens,
          ...(system ? { instructions: system } : {}),
          input: toResponsesInput(messages),
          tools: tools.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.input_schema })),
        }),
      });
      if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      const content = [];
      for (const o of data.output ?? []) {
        if (o.type === "message") {
          const text = (o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text).join("");
          if (text) content.push({ type: "text", text });
        } else if (o.type === "function_call") {
          content.push({ type: "tool_use", id: o.call_id, name: o.name, input: safeParse(o.arguments) });
        }
      }
      return {
        content,
        usage: {
          input_tokens: data.usage?.input_tokens ?? 0,
          output_tokens: data.usage?.output_tokens ?? 0,
          cache_read_input_tokens: data.usage?.input_tokens_details?.cached_tokens ?? 0,
          cache_creation_input_tokens: 0,
        },
      };
    },
  };
}
