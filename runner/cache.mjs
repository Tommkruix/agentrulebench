const BP = { type: "ephemeral" };

export function applyCaching({ system, messages, tools }) {
  const cachedTools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
  let systemOut;
  if (system) {
    systemOut = [{ type: "text", text: system, cache_control: BP }];
  } else if (cachedTools.length) {
    cachedTools[cachedTools.length - 1] = { ...cachedTools[cachedTools.length - 1], cache_control: BP };
  }
  const cachedMessages = messages.map((m, mi) => {
    if (mi !== messages.length - 1) return m;
    const blocks = m.content.map((b) => ({ ...b }));
    if (blocks.length) blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: BP };
    return { ...m, content: blocks };
  });
  return { system: systemOut, messages: cachedMessages, tools: cachedTools };
}

export function readUsage(u = {}) {
  return {
    input_tokens: u.input_tokens ?? u.prompt_tokens ?? u.promptTokenCount ?? 0,
    output_tokens: u.output_tokens ?? u.completion_tokens ?? u.candidatesTokenCount ?? 0,
    cache_read_input_tokens: u.cache_read_input_tokens ?? u.prompt_tokens_details?.cached_tokens ?? u.cachedContentTokenCount ?? 0,
    cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
  };
}
