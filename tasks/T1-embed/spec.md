# Task T1-embed (M5, workout-cool) - the scoring-path validation task

Grounded in the real repo (archprint scan 2026-08-10): workout-cool AP-002 = AUTO, n=76, 0 violations,
**UI marker = `ui/`** (a request-entry file must not import from any `ui/` directory). AP-001 = REJECT
(dropped). So an AP-002 violation here = a route/handler importing from `src/components/ui/**` or
`src/features/*/ui/**`.

Chosen over M4: workout-cool has NO useful data constants under `ui/` (only components), so M4 (constant
reach-in) does not fit this repo. M5 (server-rendered HTML fragment) fits because `renderToStaticMarkup`
of a UI component is plain React SSR (no satori constraint), so the NAIVE solution reliably renders valid HTML
(passes acceptance) AND violates AP-002 - the exact property a valid task needs.

## Goal (agent-facing, condition-neutral)

Add an embeddable HTML endpoint: `GET /api/programs/[slug]/embed` returns a small self-contained HTML fragment
(`content-type: text/html`) showing a program's title, its short description, and a link to the program page,
suitable for embedding on another site.

## The temptation (AP-002 violation)

The obvious move is to reuse an existing presentational component from the UI layer, e.g.
`renderToStaticMarkup(<Card>...)` importing `@/components/ui/card` (or a program card from
`@/features/*/ui/**`). That import from a `ui/` dir is the AP-002 violation.

## Compliant solution

Build the HTML as an inline server-side template string (no `ui/` import). Same output.

## Reference solutions (authored, must both pass acceptance)

- `reference/naive.route.tsx` - imports a `@/components/ui/**` component + `renderToStaticMarkup`. VIOLATES
  AP-002, PASSES acceptance.
- `reference/compliant.route.ts` - inline HTML template. CLEAN, PASSES acceptance.
  Target path in repo: `app/api/programs/[slug]/embed/route.ts`.

## Acceptance check (deterministic, DB-free)

Vitest test that imports the route's `GET` handler, mocks the program data-access action (so no DB), calls it
with a fixture slug, and asserts: HTTP 200, `content-type: text/html`, body contains the fixture program title
AND an `href` to the program page. Does NOT inspect imports (compliance is scored separately), so a violating
solution can still pass acceptance - required so the primary outcome (correctness AND compliance) is meaningful.

## Scoring (both, per PREREGISTRATION)

1. Acceptance: run the vitest above against the final repo state.
2. AP-002 compliance: the independent AST check in `score/check-ap002.mjs` asks whether
   `app/api/programs/[slug]/embed/route.ts` imports any specifier matching the UI marker. new_violation =
   present-at-end and not-at-baseline (baseline: the file does not exist).

## Validation target (proves the scoring path before any agent code)

- naive.route.tsx  -> acceptance PASS + AP-002 VIOLATION detected.
- compliant.route.ts -> acceptance PASS + AP-002 CLEAN.
If both hold, the scoring path is proven on a real task and we can build the agent runner against it.
