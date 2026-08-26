import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { readUsage } from "../cache.mjs";

let cached = null;

function loadServiceAccount() {
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!p) throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set (Vertex service-account JSON in env/)");
  return JSON.parse(readFileSync(p, "utf8"));
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const claim = { iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claim)}`;
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`gcp token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  cached = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cached.token;
}

function toContents(messages) {
  const nameById = {};
  for (const m of messages) if (m.role === "assistant") for (const b of m.content) if (b.type === "tool_use") nameById[b.id] = b.name;
  return messages.map((m) => {
    if (m.role === "user") {
      const parts = [];
      for (const b of m.content) {
        if (b.type === "text") parts.push({ text: b.text });
        else if (b.type === "tool_result") parts.push({ functionResponse: { name: nameById[b.tool_use_id] ?? "unknown", response: { result: String(b.content) } } });
      }
      return { role: "user", parts };
    }
    const parts = [];
    for (const b of m.content) {
      if (b.type === "text" && b.text) parts.push({ text: b.text });
      else if (b.type === "tool_use") parts.push({ functionCall: { name: b.name, args: b.input ?? {} }, ...(b.thoughtSignature ? { thoughtSignature: b.thoughtSignature } : {}) });
    }
    return { role: "model", parts };
  });
}

const stripSchema = (s) => {
  if (!s || typeof s !== "object") return s;
  const { $schema, additionalProperties, ...rest } = s;
  return rest;
};

export function geminiProvider({ model, maxTokens = 4096 } = {}) {
  const id = model || process.env.GEMINI_MODEL || "gemini-2.5-pro";
  const apiKey = process.env.GEMINI_API_KEY;
  const useApiKey = Boolean(apiKey);
  let sa;
  let endpoint;
  if (useApiKey) {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`;
  } else {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    if (!project) throw new Error("Neither GEMINI_API_KEY nor GOOGLE_CLOUD_PROJECT set for Gemini");
    sa = loadServiceAccount();
    endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${id}:generateContent`;
  }
  return {
    id,
    async chat({ system, messages, tools }) {
      const headers = { "content-type": "application/json" };
      if (useApiKey) headers["x-goog-api-key"] = apiKey;
      else headers.authorization = `Bearer ${await accessToken(sa)}`;
      const body = {
        contents: toContents(messages),
        tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: stripSchema(t.input_schema) })) }],
        generationConfig: { maxOutputTokens: maxTokens },
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      };
      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`vertex ${res.status}: ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const content = [];
      let i = 0;
      for (const p of parts) {
        if (p.text) content.push({ type: "text", text: p.text });
        else if (p.functionCall) content.push({ type: "tool_use", id: `gm-${i++}-${Math.floor(Date.now() % 1e6)}`, name: p.functionCall.name, input: p.functionCall.args ?? {}, thoughtSignature: p.thoughtSignature });
      }
      return { content, usage: readUsage(data.usageMetadata) };
    },
  };
}
