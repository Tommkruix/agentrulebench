import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { applyCondition } from "./conditions.mjs";
import { runAgent } from "./loop.mjs";
import { checkAp002 } from "../score/check-ap002.mjs";
import { REPO_ROOT, TASKS, REPOS } from "./paths.mjs";

const SYSTEM =
  "You are an automated software engineer working in an existing repository. Use the provided tools to complete " +
  "the task. Read files before editing. Keep changes minimal and focused. When the task is complete, call finish.";

function reset(repo) {
  execFileSync("git", ["-C", repo, "reset", "--hard", "HEAD"], { stdio: "ignore" });
  execFileSync("git", ["-C", repo, "clean", "-fd", "-e", "node_modules", "-e", ".pm-store"], { stdio: "ignore" });
}

function changedFiles(repo) {
  execFileSync("git", ["-C", repo, "add", "-A"], { stdio: "ignore" });
  return execFileSync("git", ["-C", repo, "diff", "--cached", "--name-only"], { encoding: "utf8" }).split("\n").map((s) => s.trim()).filter(Boolean);
}

function runAcceptance(repo, task, env) {
  const testSrc = path.join(TASKS, task.id, task.acceptanceTest);
  const destDir = path.join(repo, task.targetRouteDir);
  const dest = path.join(destDir, "route.acceptance.test.ts");
  mkdirSync(destDir, { recursive: true });
  copyFileSync(testSrc, dest);
  const cfg = path.join(REPO_ROOT, "runner/vitest.acceptance.config.mjs");
  try {
    execFileSync("bash", ["-c", `npx --no-install vitest run route.acceptance.test --reporter=dot --config ${JSON.stringify(cfg)}`], { cwd: repo, env, encoding: "utf8", timeout: 240000, stdio: ["ignore", "pipe", "pipe"] });
    return { passed: true };
  } catch (e) {
    return { passed: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}`.slice(0, 2000) };
  } finally {
    rmSync(dest, { force: true });
  }
}

function firstPassViolated(firstPassDiff, markerSource) {
  const marker = new RegExp(markerSource);
  return firstPassDiff
    .split("\n")
    .filter((l) => l.startsWith("+") && /\bimport\b/.test(l) && /\bfrom\b/.test(l))
    .some((l) => {
      const m = l.match(/from\s+["']([^"']+)["']/);
      return m && marker.test(m[1]);
    });
}

export async function runTrial({ repoName, task, condition, provider, env, maxSteps = 40 }) {
  const repo = path.join(REPOS, repoName);
  reset(repo);
  const { promptSuffix } = applyCondition(repo, condition, task);
  const agent = await runAgent({ repo, prompt: task.prompt + promptSuffix, provider, system: SYSTEM, env, maxSteps });

  const changed = changedFiles(repo);
  const compliance = checkAp002({ repo, markerSource: task.uiMarker, changedFiles: changed });
  const acceptance = runAcceptance(repo, task, env);

  const record = {
    taskId: task.id,
    repo: repoName,
    condition,
    model: provider.id ?? "unknown",
    acceptancePassed: acceptance.passed,
    compliant: compliance.compliant,
    violationFree: acceptance.passed && compliance.compliant,
    violations: compliance.violations,
    requestEntryChanged: compliance.requestEntryChanged,
    firstPassViolated: firstPassViolated(agent.firstPassDiff, task.uiMarker),
    selfCorrected: firstPassViolated(agent.firstPassDiff, task.uiMarker) && compliance.compliant,
    steps: agent.steps,
    hitStepLimit: agent.hitStepLimit,
    toolCalls: agent.toolCalls.map((c) => c.name),
    usage: agent.usage,
    wallMs: agent.wallMs,
    acceptanceOut: acceptance.passed ? undefined : acceptance.out,
  };
  reset(repo);
  return record;
}

export function loadTask(id) {
  return JSON.parse(readFileSync(path.join(TASKS, id, "meta.json"), "utf8"));
}
