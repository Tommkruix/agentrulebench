# AgentRuleBench

AgentRuleBench tests a widely repeated claim: that AI coding agents drift from the architectural conventions you write in prose (CLAUDE.md, AGENTS.md, GEMINI.md), so you need a deterministic lint rule to hold the boundary.

On the rule measured here, they did not drift. Across three vendors' agents and every condition, including an unguarded control and a deliberately baited task, current agents did not import a UI component into a request-entry file. This repository is the harness, the pre-registration, and the raw run data, so you can rerun it and check the result yourself.

Read the full write-up in [WRITEUP.md](WRITEUP.md): the premise, the method, the numbers, and a careful account of what the null does and does not mean.

## Repository layout

- `WRITEUP.md`: the full write-up, and the basis for the public post.
- `pre-registration/`: the design, written before the runs (PREREGISTRATION.md and the follow-up exploration).
- `runner/`: the provider-agnostic agent loop and the four experimental conditions.
- `score/`: the independent TypeScript-AST compliance scorer (it does not reuse the lint rule it checks).
- `tasks/`: the two coding tasks, a single-route and a three-route feature.
- `results/`: the actual pilot and exploration run data (JSONL).
- `corpus/`: the near-census corpus validation and composition that back the scale numbers in the write-up.
- `docs/REPRODUCE.md`: exact setup and run steps, plus the model and cost table.

## Quickstart

```bash
npm install
cp env/.env.example env/.env      # add the provider keys you want to run
bash scripts/fetch-repos.sh       # clone the benchmark repo at its pinned SHA
npm run check-env                 # confirm which keys are visible
npm run pilot                     # or: npm run gate
```

Full instructions, the exact models, trial counts, and estimated cost are in [docs/REPRODUCE.md](docs/REPRODUCE.md).

## Scope of the result

This is a narrow, specific finding, not "AI agents respect architecture." Only one boundary was tested at the agent level (a request entry must not import a UI component), on one repository. A second inferred boundary (no direct database import in a request entry) was analyzed at corpus scale and dropped as a benchmark rule, because roughly a quarter to a third of real apps do it, so it is idiomatic rather than a clean violation. Everything beyond the TypeScript import boundary is out of scope. See [WRITEUP.md](WRITEUP.md) for the full account.

## License

MIT. Copyright (c) 2026 Oluwatomiwa Ajiferuke. See [LICENSE](LICENSE).
