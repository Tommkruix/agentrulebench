export const MODELS = {
  confirmatory: {
    bedrock: process.env.BEDROCK_MODEL || "anthropic.claude-sonnet-5",
    anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    openai: process.env.OPENAI_MODEL || "gpt-5.6-terra",
    gemini: process.env.GEMINI_MODEL || "gemini-pro-latest",
  },
  mid: {
    bedrock: process.env.BEDROCK_MID_MODEL || "anthropic.claude-haiku-4-5",
    anthropic: process.env.ANTHROPIC_MID_MODEL || "claude-haiku-4-5",
    openai: process.env.OPENAI_MID_MODEL || "gpt-5.6-luna",
    gemini: process.env.GEMINI_MID_MODEL || "gemini-2.5-flash",
  },
  smoke: {
    bedrock: "anthropic.claude-sonnet-5",
    anthropic: "claude-haiku-4-5-20251001",
    openai: "gpt-4o-mini",
    gemini: "gemini-2.5-flash",
  },
};

export function modelFor(tier, provider) {
  const m = MODELS[tier]?.[provider];
  if (!m) throw new Error(`no model for tier=${tier} provider=${provider}`);
  return m;
}
