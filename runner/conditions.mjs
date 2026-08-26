import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const LINT_INSTRUCTION =
  "\n\nBefore you finish, run the project linter with exactly this command and fix ALL reported errors:\n" +
  "  bash .archprint-lint/run-lint.sh\n" +
  "Re-run it until it reports no errors. Do not call finish while it still reports errors.";

function lintScopeGlob(targetRouteDir) {
  return `${targetRouteDir.replace(/\[[^\]]+\]/g, "*")}/route.{ts,tsx}`;
}

function eslintConfigSource({ globs, markerSource, withRule }) {
  const rulesBlock = withRule
    ? `plugins: { archprint: { rules: { "no-ui-in-server-entry": rule } } },\n    rules: { "archprint/no-ui-in-server-entry": "error" },`
    : `rules: {},`;
  return `import tsParser from "@typescript-eslint/parser";

const marker = new RegExp(${JSON.stringify(markerSource)});
const rule = {
  meta: { type: "problem", docs: { description: "AP-002: request-entry files must not import the UI layer." } },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") return;
        if (marker.test(node.source.value)) {
          context.report({ node, message: "AP-002: request-entry file must not import the UI layer ('" + node.source.value + "'). Build markup inline or in a server-only helper." });
        }
      },
    };
  },
};

export default [
  {
    files: ${JSON.stringify(globs)},
    languageOptions: { parser: tsParser, ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
    ${rulesBlock}
  },
];
`;
}

function writeLintHarness(repo, task, withRule) {
  const dir = path.join(repo, ".archprint-lint");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "eslint.config.mjs"), eslintConfigSource({ globs: [lintScopeGlob(task.targetRouteDir)], markerSource: task.uiMarker, withRule }));
  writeFileSync(
    path.join(dir, "run-lint.sh"),
    "#!/usr/bin/env bash\n" +
      "cd \"$(dirname \"$0\")/..\"\n" +
      "npx --no-install eslint --no-config-lookup --config .archprint-lint/eslint.config.mjs .\n",
  );
}

function appendOrCreate(file, text) {
  if (existsSync(file)) appendFileSync(file, `\n${text}`);
  else writeFileSync(file, text);
}

export function applyCondition(repo, cond, task) {
  switch (cond) {
    case "C0":
      return { promptSuffix: "" };
    case "A": {
      const prose = `## Architecture rules\n\n${task.proseRule}\n`;
      for (const f of ["CLAUDE.md", "AGENTS.md"]) appendOrCreate(path.join(repo, f), prose);
      return { promptSuffix: "" };
    }
    case "B0":
      writeLintHarness(repo, task, false);
      return { promptSuffix: LINT_INSTRUCTION };
    case "B":
      writeLintHarness(repo, task, true);
      return { promptSuffix: LINT_INSTRUCTION };
    default:
      throw new Error(`unknown condition ${cond}`);
  }
}

export const CONDITIONS = ["C0", "A", "B0", "B"];
