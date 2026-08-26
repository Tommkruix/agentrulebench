import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { classifyFile } from "./vendor/role-classifier.js";

const REQUEST_ENTRY_ROLES = new Set(["CONTROLLER", "ROUTE_HANDLER", "SERVER_ACTION", "API_HANDLER", "TRPC_ROUTER"]);

export function checkAp002({ repo, markerSource, changedFiles }) {
  const marker = new RegExp(markerSource);
  const violations = [];
  const requestEntryChanged = [];
  for (const rel of changedFiles) {
    if (!/\.(ts|tsx)$/.test(rel)) continue;
    if (!REQUEST_ENTRY_ROLES.has(classifyFile(rel).role)) continue;
    requestEntryChanged.push(rel);
    const abs = path.join(repo, rel);
    if (!existsSync(abs)) continue;
    const src = ts.createSourceFile(rel, readFileSync(abs, "utf8"), ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    for (const st of src.statements) {
      if (!ts.isImportDeclaration(st)) continue;
      if (st.importClause?.isTypeOnly) continue;
      const spec = st.moduleSpecifier.text;
      if (marker.test(spec)) violations.push({ file: rel, specifier: spec });
    }
  }
  return { compliant: violations.length === 0, violations, requestEntryChanged };
}
