import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MAX_OUT = 20000;
const clip = (s) => (s.length > MAX_OUT ? `${s.slice(0, MAX_OUT)}\n...[truncated]` : s);

function safe(repo, p) {
  const abs = path.resolve(repo, p ?? ".");
  const root = path.resolve(repo);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error("path escapes repo");
  return abs;
}

export const TOOL_DEFS = [
  { name: "list_dir", description: "List entries at a repo-relative directory.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "read_file", description: "Read a repo-relative file's contents.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "write_file", description: "Create or overwrite a repo-relative file with the given content.", input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
  { name: "edit_file", description: "Replace the first exact occurrence of old_string with new_string in a repo-relative file.", input_schema: { type: "object", properties: { path: { type: "string" }, old_string: { type: "string" }, new_string: { type: "string" } }, required: ["path", "old_string", "new_string"] } },
  { name: "grep", description: "Regex-search file contents under an optional repo-relative path.", input_schema: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] } },
  { name: "run_shell", description: "Run a shell command in the repo root (e.g. to run lint or tests). Bounded by a timeout.", input_schema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
  { name: "finish", description: "Signal that the task is complete.", input_schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] } },
];

export function executeTool(name, input, ctx) {
  const { repo } = ctx;
  try {
    switch (name) {
      case "list_dir": {
        const abs = safe(repo, input.path);
        if (!existsSync(abs)) return `ERROR: no such path ${input.path}`;
        return clip(readdirSync(abs, { withFileTypes: true }).map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).join("\n"));
      }
      case "read_file": {
        const abs = safe(repo, input.path);
        if (!existsSync(abs)) return `ERROR: no such file ${input.path}`;
        return clip(readFileSync(abs, "utf8"));
      }
      case "write_file": {
        const abs = safe(repo, input.path);
        mkdirSync(path.dirname(abs), { recursive: true });
        writeFileSync(abs, input.content);
        return `wrote ${input.path}`;
      }
      case "edit_file": {
        const abs = safe(repo, input.path);
        if (!existsSync(abs)) return `ERROR: no such file ${input.path}`;
        const cur = readFileSync(abs, "utf8");
        if (!cur.includes(input.old_string)) return `ERROR: old_string not found in ${input.path}`;
        writeFileSync(abs, cur.replace(input.old_string, input.new_string));
        return `edited ${input.path}`;
      }
      case "grep": {
        const target = input.path ? safe(repo, input.path) : repo;
        try {
          return clip(execFileSync("grep", ["-rn", "-E", input.pattern, target], { encoding: "utf8", timeout: 20000, maxBuffer: 8 * 1024 * 1024 }));
        } catch (e) {
          return e.status === 1 ? "(no matches)" : `ERROR: ${String(e).slice(0, 200)}`;
        }
      }
      case "run_shell": {
        try {
          return clip(execFileSync("bash", ["-c", input.command], { cwd: repo, encoding: "utf8", timeout: ctx.shellTimeout ?? 180000, env: ctx.env ?? process.env, maxBuffer: 8 * 1024 * 1024 }));
        } catch (e) {
          return clip(`exit=${e.status ?? "?"}\n${e.stdout ?? ""}${e.stderr ?? ""}`);
        }
      }
      case "finish":
        return "ok";
      default:
        return `ERROR: unknown tool ${name}`;
    }
  } catch (e) {
    return `ERROR: ${String(e.message ?? e).slice(0, 300)}`;
  }
}

export function gitDiff(repo) {
  try {
    execFileSync("git", ["-C", repo, "add", "-A"], { stdio: "ignore" });
    return execFileSync("git", ["-C", repo, "diff", "--cached"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  } catch (e) {
    return `(diff error: ${String(e).slice(0, 160)})`;
  }
}
