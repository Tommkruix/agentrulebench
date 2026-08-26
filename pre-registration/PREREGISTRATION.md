# AgentRuleBench: Pre-Registration (Confirmatory Analysis Plan)

> This is the pre-registered design for the full confirmatory study: the hypotheses, conditions, outcome,
> sample size, and analysis, committed in advance. Pre-registration means these are fixed before data
> collection; any deviation is logged in the append-only Deviations section, never silently changed. We
> pre-register the DESIGN and the minimum effect we are powered to detect; we make NO prediction of the effect
> size and report whatever the data show, including a null.
>
> The confirmatory study described here was NOT executed. A calibration pilot (Section 7, permitted before
> freeze) and a separately pre-registered exploration (see EXPLORATION-PREREG.md) both returned a null across
> all models and conditions, so this plan was never frozen or run at full scale. The registered design,
> hypotheses, and analysis are unchanged; only internal file paths, working notes, budget details, and internal milestone labels
> were removed for release. It is the design that existed before the runs. See ../WRITEUP.md for what
> happened and why the study stopped.
>
> Author: Oluwatomiwa Ajiferuke. Created 2026-08-10.

## 1. Motivation and claim under test

Context files (CLAUDE.md, AGENTS.md) are probabilistic guidance; a lint rule is deterministic enforcement.
AgentRuleBench measures whether installing an Archprint-generated lint rule makes an AI coding agent complete
a realistic task *without silently violating* an architectural boundary, compared to stating that same
boundary as prose guidance. The benchmark produces the number; we do not pre-state it.

## 2. Hypotheses

- **H1 (primary, directional).** Enforcement (Archprint lint rule installed + an instruction to run lint and
  fix) yields a higher rate of *violation-free task completion* than prose guidance alone.
- **H0 (primary null).** No difference between enforcement and guidance.
- **H2 (mechanism).** Under enforcement, among trials whose first-pass diff introduces a violation, the agent
  *self-corrects* (final diff clean) at a higher rate than under guidance.
- **H3 (isolation).** The enforcement effect is attributable to the installed rule, not merely to the
  instruction to run lint: enforcement > instruction-only control.
- **H4 (guidance baseline).** Guidance yields higher violation-free completion than no guidance at all.

We commit to reporting all four regardless of direction or significance.

## 3. Design

Between-trials factorial. **Four conditions** (the manipulation is the ONLY thing that differs across
conditions; task prompt, repo, model, and environment are held identical):

| Code | Condition | What the agent is given |
|---|---|---|
| **C0** | Control | Task + repo as-is. No architectural guidance, no rule. (Measures natural drift.) |
| **A** | Guidance | + the architectural boundary stated in prose in CLAUDE.md / AGENTS.md. |
| **B0** | Instruction-only control | + a generic instruction to "run lint and fix all errors," but NO Archprint rule installed (only the repo's pre-existing lint config). |
| **B** | Enforcement | + the Archprint ESLint rule installed AND the "run lint and fix all errors" instruction. |

**Primary contrast: B vs A** (enforcement vs guidance - the thesis). Secondary contrasts: **B vs B0** (rule
vs mere instruction, isolates the confound), **A vs C0** (does guidance help at all), **B vs C0** (total
effect).

**Factors:** Condition (4) x Task (T) x Repo (R) x Model (M) x Replicate (n). Each trial is one independent
agent run on a fresh repo checkout.

## 4. Materials

### 4.1 Rules under test (construct-validity GATE)

A rule is eligible ONLY if it passes construct-validity review first:
- **AP-002** (no UI-component import in a server/route entry): eligible. Near-universal in the corpus
  (2.2% REJECT), semantically clean (server entries legitimately should not import client UI).
- **AP-001** (no direct DB import in a request entry): **REVIEWED 2026-08-10 -> DROPPED from the confirmatory
  benchmark.** Semantic review of a 5-repo sample (2 AUTO, 3 REJECT), corroborated by the corpus-wide ~30%
  violation rate, found AP-001 is NOT a universal rule and its automatic gate is unreliable:
  1. **REJECT cases are idiomatic, not smells.** nextcrm (55 handlers `import { prismadb } from "@/lib/prisma"`),
     omnibus (140 `import { prisma } from "@/lib/db"`), babylon (handlers build queries with `drizzle-orm`
     directly) are all the STANDARD Next.js/Prisma/Drizzle pattern: route handlers / server actions querying
     the ORM via a client singleton. Widespread and correct, not architectural decay. Flagging it as a
     violation would make the tool wrong on the ecosystem norm.
  2. **AUTO cases are unreliable.** family-flix is a genuine layered case (Prisma confined to `domains/store`,
     handlers delegate). BUT charmverse got a FALSE AUTO (viol=3) while 149 `pages/api` handlers actually do
     direct `prisma.` queries via `@charmverse/core/prisma-client`, a workspace-scoped client the DB-marker
     inference did not recognize. So the AUTO gate can certify a boundary that does not hold.
  3. **Type-only import noise.** Many `@prisma/client` imports in violators are generated-model TYPE imports
     (`Users`, `Decimal`), which fast mode (no type checker) can miscount as value-level DB usage, inflating
     AP-001 counts.
  Conclusion: AP-001 is a repo-SPECIFIC inferred boundary at best, not a universal rule, and cannot be trusted
  to auto-select benchmark repos. Per "one wrong rule hurts more than zero," it is DROPPED from the headline.
  It may return later as a hand-verified case study on a genuinely layered repo (family-flix-style), never via
  the AUTO gate alone. Two tool findings for future hardening recorded separately: (a) DB-marker inference must catch
  workspace-scoped/re-exported clients (`@charmverse/core/prisma-client`, `@/lib/db`, `@/lib/prisma`);
  (b) type-only imports must be excluded from DB-client violations.
- **AP-002 is the sole confirmatory rule.** It is near-universal (2.2% REJECT), semantically sound (a server
  API/route entry importing React UI components is a genuine smell), and not subject to the type-only-import
  or idiomatic-direct-access problems above.

### 4.2 Tasks

T authored tasks (target: 8-12), FROZEN before running. Each task must:
1. Be a realistic feature/bugfix a developer would actually file.
2. Have a *tempting* naive solution that crosses the target boundary (so drift is possible), AND a known
   compliant solution (so success is achievable).
3. Be functionally verifiable via a pre-written acceptance check (tests or a deterministic spec).
4. Never be drawn from the repo's real git history (avoids memorization / leakage).

Each task is authored against a specific rule + repo where that rule is AUTO-gated (the boundary genuinely
holds at baseline, so a violation is a true regression).

### 4.3 Repos

Held-out from all tuning (split discipline preserved). Selected from the 119 permissive-license, held-out,
AP-002-AUTO corpus repos (n >= 35 clean). Each candidate was construct-validity checked the same way as the
AP-001 review: confirmed it has a real request-handling layer, a real UI layer, and a GENUINELY clean boundary
(zero handlers import UI, so the AUTO is real, not a marker artifact), plus a realistic task surface.

**Pinned core (construct validity VERIFIED 2026-08-10; baseline build/lint check PENDING at harness step):**

| Repo | SHA | License | Request handlers | UI components | Handlers importing UI |
|---|---|---|---|---|---|
| `Snouzy/workout-cool` | `e3dcd23b4ebdfb6254010b9a7c350cfef9e236c8` | MIT | 36 app/api + 40 server actions | 153 | 0 |
| `boxyhq/saas-starter-kit` | `abc9b686823cbfb4973c79bc36fea37a3244be6c` | Apache-2.0 | 42 pages/api | 85 | 0 |
| `dotnetfactory/fluid-calendar` | `832a7bab336f87d9a2fd9a82d6a33c72cc17572e` | MIT | 59 app/api | 100 | 0 |

A single rich repo (e.g. workout-cool, 76 handlers/actions) can host multiple distinct tasks, so this core can
carry ~10 tasks. **Expansion/backup candidates** (verify build+lint baseline before use): `crshdn/mission-control`
(MIT), `code100x/cms` (MIT), `oiov/wr.do` (MIT), and the designated test-split `dub` (verify AP-002 status:
prior work saw its UI at `@dub/ui` with ~6 violations, so it may gate SUGGEST not AUTO).

**Remaining gate before freeze:** each pinned repo must INSTALL, BUILD, and LINT-CLEAN at baseline; a
failing-baseline repo is dropped. This runs in the harness step (needs installs) and is why it is not yet done.

### 4.4 Prompts

The exact task prompt, the exact CLAUDE.md prose (condition A), the exact "run lint and fix" instruction
(B0, B), and the exact rule-install steps (B) are transcribed verbatim into an appendix and frozen. Prompt
parity across conditions is mandatory and auditable.

## 5. Procedure

Each trial: fresh checkout at the pinned SHA -> apply the condition's manipulation -> run the agent with the
task prompt under a fixed harness (fixed temperature/decoding settings, fixed tool budget, no human in the
loop) -> capture the final diff, full transcript, tool calls, token counts, wall time -> score. Condition
order randomized; trials independent. Environment isolated per trial. Infra failures (API outage, harness
crash) are re-run, not counted (pre-specified in Exclusions).

## 6. Measures

**Primary outcome (binary, per trial): violation-free completion** = task is functionally correct
(acceptance check passes) AND the final diff introduces NO new violation of the target boundary. Both must
hold: a trial that stays compliant by not doing the task is NOT a success.

**Secondary outcomes:**
- Task-correctness rate (marginal).
- New-violation rate (marginal).
- **Self-correction rate** (H2): among trials whose first-pass diff violated, fraction clean at the end.
- Iterations-to-fix (enforcement: number of lint-fix cycles to reach clean).
- Cost: total tokens, wall time, tool calls per trial (does enforcement cost more?).

**Scoring (blind + automated + audited):**
- Violation detection: automated on the final diff via Archprint/ESLint AND an independent AST check; a
  random sample manually audited for construct validity. Discrepancies adjudicated and logged.
- Task correctness: pre-written per-task acceptance check; a random sample manually verified.

## 7. Sample size and power

Pre-registered cells: Condition(4) x Task(~10) x Model(M) x Replicate(n). Replicates absorb agent
stochasticity; n is chosen so a per-cell proportion is stably estimated (SE ~= sqrt(p(1-p)/n)); default
**n = 15** per cell pending the power check below. Total runs = 4 x 10 x M x 15.

**Locked scale (2026-08-10, model set revised 2026-08-11):** M = 2 = **GPT + Gemini** (two independent
non-Claude frontier agents), both under the IDENTICAL custom loop, n = 15, T ~= 10. Total = 4 x 10 x 2 x 15 =
**~1,200 confirmatory agent runs.** Rationale for dropping Claude from the confirmatory pair: uniform scaffold
with the creds available, two model families already establish non-model-specificity, and OBJECTIVITY - this
project is built with Claude Code, so measuring two independent non-Claude families removes a conflict-of-
interest / "tuned for Claude" critique rather than inviting one. **Claude is NOT excluded from the study**: it
is run separately as an EXPLORATORY / ecological arm under its native Claude Code scaffold (the tool developers
actually use), reported on its own and NEVER pooled into the cross-model confirmatory contrast because the
scaffold differs (scaffold would confound the model factor). Exact GPT + Gemini model IDs pinned at freeze.

**Claude under the same scaffold.** Claude is also run under the SAME custom loop as GPT and Gemini (preferred
over the Claude Code scaffold arm, since same-scaffold results ARE poolable into the model contrast). Whether
Claude becomes a full third confirmatory model (M=3) versus a smaller pilot-only arm is decided AFTER the
calibration pilot prices the full run; GPT and Gemini remain the committed confirmatory pair either way.

**Model-tier fairness rule.** Every confirmatory/pilot arm uses a comparable, NEAR-BEST frontier model of its
provider (same capability tier), so the cross-model contrast measures the enforcement effect, not a capability
gap. Intended tier (exact IDs + versions PINNED AT FREEZE after verifying each account has access): Anthropic
Claude Sonnet 5 (or Opus 5), OpenAI GPT-5-class flagship, Google Gemini 2.5 Pro. Cheap models (Haiku / gpt-4o-mini
/ Gemini Flash) are used ONLY for plumbing smokes and NEVER produce data that enters the analysis. Encoded in
`runner/models.mjs` (confirmatory vs smoke tiers).

**Calibration pilot BEFORE the full run (does not break pre-registration):** run a small pilot (1-2 tasks x
all 4 conditions x both models x 3 replicates ~= 24-48 runs) to (a) measure per-task token/time cost so the
full-run budget is a real number not a guess, (b) estimate the baseline violation rate (needed for the power
calc), and (c) shake out harness bugs. Pilot data informs the power check and n/T; then the plan is FROZEN and
the full 1,200 runs execute. Pilot runs are NOT pooled into the confirmatory analysis.

**Power:** using the pilot's baseline rate, we compute via the section-8 model the minimum detectable effect
(MDE) in percentage points on the B-vs-A contrast at 80% power, alpha = 0.05, given the nesting. We
pre-register the MDE we are powered to detect. We do NOT assume or state the effect we expect to find; if the
power check says n = 15 / T ~= 10 cannot reach a useful MDE, we raise n or T before freezing and record it.

## 8. Analysis plan (frozen)

**Primary model:** mixed-effects logistic regression.
`violation_free ~ condition + (1 | task) + (1 | repo) + (1 | model)`, with condition treatment-coded and
A (guidance) as the reference level so the B-vs-A contrast is the primary coefficient. Report the odds ratio,
its 95% CI, and the average marginal effect (percentage-point difference).

**Contrasts and correction:** the four pre-specified contrasts (B-A primary; B-B0, A-C0, B-C0 secondary)
tested with Holm correction across the family. Primary decision rests on B-A alone.

**Secondary analyses:** self-correction rate B vs A (H2); token/time cost by condition; per-model and
per-rule breakdowns (exploratory, labeled as such); robustness re-fit excluding task-failed trials.

**No optional stopping.** Fixed N; no interim peeking that alters the stopping decision.

## 9. Exclusions (pre-specified)

- Infra/API failures and harness crashes: re-run, not counted.
- Repos that do not build or are not lint-clean at baseline: excluded before trials, recorded.
- Trials where the agent produced no diff at all (refusal / empty): counted as task-failure, not excluded.

## 10. Threats to validity

- **Construct:** the rule must be a genuine boundary (section 4.1 gate); task "temptation" must be realistic,
  not contrived (audited). Primary outcome requires BOTH correctness and compliance to prevent the
  do-nothing-stays-clean artifact.
- **Internal:** B0 isolates the "run lint" instruction from the rule; prompt parity enforced; randomized
  order; blind scoring; fresh checkout per trial.
- **External:** limited to the chosen repos/tasks/models and (per the corpus study) the Next.js-heavy applicable
  slice and two rules. Generalization stated as a limitation, not claimed.
- **Contamination/leakage:** tasks are not from real git history; repos pinned; models/versions recorded.

## 11. Reproducibility and provenance

Every trial records: agent + model + version, date, repo + SHA, Archprint version + git sha, exact prompt,
decoding settings, full transcript, and scores. Aggregate + per-trial artifacts written with the same
provenance schema as the corpus study. Deviations from this plan are appended below with date + rationale.

## 12. Parameters (signed off 2026-08-10)

- **Model set M = 2 (revised 2026-08-11):** GPT + Gemini (two independent non-Claude frontier agents), both
  under the identical custom loop; Claude run separately as an exploratory Claude-Code-scaffold arm, never
  pooled. Original wording kept for provenance: one Claude model + one non-Claude frontier agent (effect shown non-model-specific at
  moderate cost). Exact model IDs + versions recorded at freeze.
- **Replicates n = 15; task count T ~= 10** -> ~1,200 confirmatory runs, subject to the power check (section 7).
- **AP-001:** REVIEWED 2026-08-10 -> DROPPED from the confirmatory benchmark (see section 4.1: idiomatic
  direct-ORM is the norm, not a smell; AUTO gate unreliable, charmverse false-AUTO). **AP-002 is the sole
  confirmatory rule.** This SIMPLIFIES the design: Task set targets AP-002 only.

## Deviations log (append-only, post-freeze)

The confirmatory study in this document was not executed, so the plan was never frozen. The calibration pilot
(Section 7) and the pre-registered exploration (EXPLORATION-PREREG.md) returned a null across all models and
conditions; of the three pinned repos in Section 4.3, only `Snouzy/workout-cool` was exercised, in the pilot
and the exploration, before the study was stopped. See ../WRITEUP.md.

Implementation note (B0): the B0 condition as run used the same custom lint harness as B with the inferred rule
omitted (a `--no-config-lookup` ESLint stub), not the repo's pre-existing lint config as Sections 3 and 4
describe. B versus B0 still isolates the rule from the identical run-lint-and-fix instruction.
