import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runAgent } from "./loop.mjs";
import { mockProvider, text, toolUse } from "./providers/mock.mjs";

const repo = mkdtempSync(path.join(tmpdir(), "arb-smoke-"));
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { stdio: "ignore" });
git("init", "-q");
writeFileSync(path.join(repo, "seed.txt"), "hello\n");
git("add", "-A");
git("-c", "user.email=a@b.c", "-c", "user.name=x", "commit", "-qm", "seed");

const script = [
  [text("Inspecting the repo."), toolUse("list_dir", { path: "." })],
  [toolUse("read_file", { path: "seed.txt" })],
  [toolUse("write_file", { path: "src/new.ts", content: "export const x = 1;\n" })],
  [toolUse("edit_file", { path: "src/new.ts", old_string: "1", new_string: "2" })],
  [toolUse("run_shell", { command: "echo running lint" })],
  [toolUse("finish", { summary: "done" })],
];

const r = await runAgent({ repo, prompt: "do the thing", provider: mockProvider(script), system: "you are a coding agent" });

const checks = {
  "6 steps": r.steps === 6,
  "tool sequence": r.toolCalls.map((c) => c.name).join(",") === "list_dir,read_file,write_file,edit_file,run_shell,finish",
  "finalDiff adds src/new.ts": r.finalDiff.includes("src/new.ts"),
  "edit applied (value 2)": r.finalDiff.includes("export const x = 2"),
  "firstPassDiff captured before lint": r.firstPassDiff.includes("src/new.ts"),
  "usage tracked": r.usage.input_tokens > 0 && r.usage.output_tokens > 0,
  "not step-limited": r.hitStepLimit === false,
};
rmSync(repo, { recursive: true, force: true });

let ok = true;
for (const [k, v] of Object.entries(checks)) {
  console.log(`${v ? "PASS" : "FAIL"}  ${k}`);
  ok = ok && v;
}
console.log(`\nLOOP MECHANICS: ${ok ? "PROVEN offline (no tokens spent)" : "FAILED"}`);
process.exit(ok ? 0 : 1);
