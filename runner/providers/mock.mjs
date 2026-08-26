export function mockProvider(script) {
  let i = 0;
  return {
    async chat() {
      const content = script[Math.min(i, script.length - 1)];
      i += 1;
      return { content, usage: { input_tokens: 10, output_tokens: 10 } };
    },
  };
}

let counter = 0;
export const toolUse = (name, input, id) => ({ type: "tool_use", id: id ?? `mock-${(counter += 1)}`, name, input });
export const text = (t) => ({ type: "text", text: t });
