import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { applyCondition } from "./conditions.mjs";
import { TASKS, REPOS } from "./paths.mjs";

const REPO = path.join(REPOS, "workout-cool");
const TASK = JSON.parse(readFileSync(path.join(TASKS, "T1-embed/meta.json"), "utf8"));
const NAIVE = path.join(TASKS, "T1-embed/reference/naive.route.tsx");
const ROUTE_DIR = path.join(REPO, TASK.targetRouteDir);

const NODEBIN = path.dirname(process.execPath);
const ENV = { ...process.env, PATH: `${NODEBIN}:${process.env.PATH}` };

function reset() {
  execFileSync("git", ["-C", REPO, "reset", "--hard", "HEAD"], { stdio: "ignore" });
  execFileSync("git", ["-C", REPO, "clean", "-fd", "-e", "node_modules", "-e", ".pm-store"], { stdio: "ignore" });
}
function placeNaive() {
  mkdirSync(ROUTE_DIR, { recursive: true });
  copyFileSync(NAIVE, path.join(ROUTE_DIR, "route.tsx"));
}
function runLint() {
  try {
    execFileSync("bash", ["-c", "bash .archprint-lint/run-lint.sh"], { cwd: REPO, env: ENV, encoding: "utf8", timeout: 180000, stdio: ["ignore", "pipe", "pipe"] });
    return { errored: false, out: "" };
  } catch (e) {
    return { errored: true, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
}

const results = {};

reset();
placeNaive();
applyCondition(REPO, "B", TASK);
const b = runLint();
results["B lint ERRORS on naive"] = b.errored && /AP-002/.test(b.out);

reset();
placeNaive();
applyCondition(REPO, "B0", TASK);
const b0 = runLint();
results["B0 lint PASSES on naive (no rule)"] = !b0.errored;

reset();
applyCondition(REPO, "A", TASK);
results["A writes CLAUDE.md with the rule"] = existsSync(path.join(REPO, "CLAUDE.md")) && /UI layer/.test(readFileSync(path.join(REPO, "CLAUDE.md"), "utf8"));

reset();
rmSync(ROUTE_DIR, { recursive: true, force: true });

let ok = true;
for (const [k, v] of Object.entries(results)) {
  console.log(`${v ? "PASS" : "FAIL"}  ${k}`);
  ok = ok && v;
}
if (!results["B lint ERRORS on naive"]) console.log("\n--- B lint output (debug) ---\n", b.out.split("\n").slice(0, 20).join("\n"));
console.log(`\nCONDITIONS: ${ok ? "PROVEN (B enforces, B0 does not, A guides)" : "needs fixing"}`);
process.exit(ok ? 0 : 1);
