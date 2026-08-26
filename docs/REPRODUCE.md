# Reproducing AgentRuleBench

This is the exact harness behind the write-up. It runs a coding agent against a real repository under four conditions and scores, with an independent TypeScript AST pass, whether the agent imported a UI component into a request-entry file.

## Requirements

- Node.js >= 20
- git
- A package manager for the benchmark repo (workout-cool uses pnpm)
- API access for the providers you want to run (see `env/.env.example`)

## Setup

```bash
npm install                      # harness dependencies
cp env/.env.example env/.env     # then fill in the providers you want to run
bash scripts/fetch-repos.sh      # clones the benchmark repo at its pinned SHA into repos/
(cd repos/workout-cool && pnpm install)   # install the benchmark repo's own dependencies
npm run check-env                # confirms which provider keys are visible
```

Secrets live only in `env/.env` (and any Vertex service-account JSON in `env/`). Both are gitignored. Nothing is transmitted anywhere except the model providers you configure.

## Running

```bash
npm run pilot     # T1-embed, 4 conditions, the frontier models
npm run gate      # T-share, control-only, the full capability ladder
```

Each writes JSONL to `results/`. The committed `results/pilot-results.jsonl` and `results/gate-probe.jsonl` are our own runs, kept as evidence; a rerun overwrites them.

## How scoring works

`score/check-ap002.mjs` reads the TypeScript AST of every request-entry file the agent changed (role classification is vendored in `score/vendor/role-classifier.js`) and flags any non-type import whose specifier matches the task's UI marker. This is a separate code path from the lint rule installed in the enforcement condition, so a pass is not circular. Type-only imports are ignored (they are erased at runtime). To confirm the scorer catches a real violation, run `npm run test:harness`, which drives a deliberately violating reference solution through the full pipeline.

## What we ran, and what we found

Study conducted August 2026; closed 2026-08-12. Benchmark repo: `github.com/Snouzy/workout-cool` at `e3dcd23b4ebdfb6254010b9a7c350cfef9e236c8`.

| Run | Task | Models | Conditions | Trials | Violations | Acceptance |
|---|---|---|---|---|---|---|
| Pilot | T1-embed (single route) | claude-sonnet-5, gpt-5.6-terra, gemini-pro-latest | C0, A, B0, B (x2 reps) | 24 | 0 | 24 / 24 |
| Exploration | T-share (three routes) | above + claude-haiku-4.5, gpt-5.6-luna, gemini-2.5-flash | C0 only (x3 reps) | 18 (17 scored, 1 API error) | 0 (scored) | compliance-only |

Conditions: **C0** control (no rule, no guidance), **A** rule as prose in CLAUDE.md and AGENTS.md, **B0** the same lint harness and "run the lint step and fix errors" instruction as B, but with no inferred rule installed, **B** the inferred rule installed as a lint error plus that same instruction.

Pilot cost, estimated from recorded token counts and per-model unit prices (see `runner/pilot.mjs`): **$1.81** total (claude-sonnet-5 $0.61, gpt-5.6-terra $0.27, gemini-pro-latest $0.93, over 8 trials each). The exploration recorded token usage but not dollar cost.

## Caveats for a rerun

- **One repo, one rule.** Only the UI-import boundary was tested at the agent level, on a single repository. The database-import rule was analyzed at corpus scale and dropped as a benchmark rule (roughly a quarter to a third of real apps import the database directly in a request entry, so it is idiomatic, not a clean violation).
- **Model IDs are pinned as-run.** Providers deprecate model IDs over time (for example, gemini-2.5-pro became unavailable to new keys during this work). An exact-ID rerun may require substituting the current nearest-tier model; `runner/models.mjs` is where the tiers are defined.
- **Community keys.** If you run GPT or Gemini on a shared key, the pilot spaces out requests on backends flagged shared; scale deliberately.
