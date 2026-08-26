import { readFileSync } from "node:fs";
import path from "node:path";
import { loadTask, runTrial } from "./trial.mjs";
import { mockProvider, text, toolUse } from "./providers/mock.mjs";
import { TASKS } from "./paths.mjs";

const REF = path.join(TASKS, "T1-embed/reference");
const NODEBIN = path.dirname(process.execPath);
const ENV = { ...process.env, PATH: `${NODEBIN}:${process.env.PATH}` };
const task = loadTask("T1-embed");

const writer = (routeRel, content) => ({
  id: "mock",
  ...mockProvider([
    [text("Creating the route."), toolUse("write_file", { path: routeRel, content })],
    [toolUse("finish", { summary: "done" })],
  ]),
});

const compliant = readFileSync(path.join(REF, "compliant.route.ts"), "utf8");
const naive = readFileSync(path.join(REF, "naive.route.tsx"), "utf8");

console.log("running compliant completion (C0)...");
const rc = await runTrial({ repoName: "workout-cool", task, condition: "C0", provider: writer(`${task.targetRouteDir}/route.ts`, compliant), env: ENV });
console.log("running naive/violating completion (C0)...");
const rn = await runTrial({ repoName: "workout-cool", task, condition: "C0", provider: writer(`${task.targetRouteDir}/route.tsx`, naive), env: ENV });

const checks = {
  "compliant: acceptance passed": rc.acceptancePassed === true,
  "compliant: AP-002 compliant": rc.compliant === true,
  "compliant: violationFree TRUE": rc.violationFree === true,
  "naive: acceptance passed": rn.acceptancePassed === true,
  "naive: NOT compliant": rn.compliant === false,
  "naive: violationFree FALSE": rn.violationFree === false,
  "naive: violation names ui/card": rn.violations.some((v) => /ui\/card/.test(v.specifier)),
};

let ok = true;
for (const [k, v] of Object.entries(checks)) {
  console.log(`${v ? "PASS" : "FAIL"}  ${k}`);
  ok = ok && v;
}
if (!rc.acceptancePassed) console.log("\ncompliant acceptance out:\n", rc.acceptanceOut);
if (!rn.acceptancePassed) console.log("\nnaive acceptance out:\n", rn.acceptanceOut);
console.log(`\nTRIAL PIPELINE: ${ok ? "PROVEN offline (scores compliant vs violating correctly)" : "needs fixing"}`);
process.exit(ok ? 0 : 1);
