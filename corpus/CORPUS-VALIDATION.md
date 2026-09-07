# Corpus Validation

This is the scale evidence behind two claims in the write-up: that the rule inference runs across a near-census of public TypeScript repositories, and that the fast, no-install scan agrees closely with a slow, dependencies-installed scan. Every number here is computed from the run artifacts. Repository composition and parameters are in `corpus-summary.json`; the full manifest of 24,888 pinned commit SHAs is available on request. The repository-level operational figures below (throughput, deep-install success rate, marker distribution, and the size of the deep-rescanned subset) are summarized from the corpus-run logs, which are not shipped in full.

A note on scope. This corpus mining is descriptive: it characterizes how often two inferred architectural boundaries hold in the wild. It is not the causal benchmark (that is AgentRuleBench, the rest of this repository). It is also the work of archprint (https://github.com/Tommkruix/archprint), an open-source inference tool published on npm; it is included here because the write-up cites these numbers, so a reader can check them.

## The corpus

A near-census, not a sample: within the eligibility window below, the entire qualifying population was enumerated rather than drawn from.

Eligibility (as of 2026-08-05): public, non-fork, non-archived TypeScript repositories; at least 50 stars; 200 KB to about 2 GB; pushed within the previous 24 months; a root `tsconfig.json` or `tsconfig.base.json` present; at most 5 repositories per owner (a diversity guard). GitHub search returns at most 1,000 results per query, so the population was partitioned into 16 star-tier windows and crawled window by window (53 completed windows) to enumerate the full eligible set without truncation.

Yield: 26,384 eligible before the owner cap, 1,496 dropped by the cap, final corpus 24,888 repositories. Every repository's commit SHA was verified on pin (24,888 verified, 0 unverified); no SHA is fabricated.

Composition of the 24,888:

- Star tiers: 10k+ 310; 2k to 10k 1,368; 500 to 2k 3,555; 100 to 500 10,853; 50 to 100 8,802.
- Framework signal: other 16,594; Next 3,361; Vite-React 3,113; Express 1,148; Nest 320; Astro 189; Remix 40; unknown 123.
- Kind: single-package 20,321; monorepo 4,567.
- License: MIT 14,442; Apache-2.0 2,046; GPL-3.0 1,096; AGPL-3.0 878; none or null 4,042; and a long tail of others.

## The two boundaries

- **AP-002**: a server or route entry file must not import UI-component modules.
- **AP-001**: a request-entry file must not import the database layer directly.

## How often the boundaries hold (fast scan, full corpus)

Of the 24,888 repositories, the scan recognized a server or request-entry role file in only about 10 percent of applicable app directories. That low applicability is itself a central external-validity finding: the role classifier is Next.js-centric and does not yet model many frameworks (see Limitations). Across 2.69 million files there were 0 timeouts, 0 crashes, and 0 scan errors.

Two measures are kept distinct: the confidence gate's verdict (AUTO, SUGGEST, or REJECT) and whether an app actually contains a violation.

| Boundary | Applicable apps | AUTO | SUGGEST | REJECT | Apps with at least one violation |
|---|---|---|---|---|---|
| AP-002 (no UI in a server entry) | 2,023 | 202 (10.0%) | 1,777 (87.8%) | 44 (2.2%) | 108 (5.3%) |
| AP-001 (no DB in a request entry) | 2,522 | 82 (3.3%) | 1,817 (72.0%) | 623 (24.7%) | 746 (29.6%) |

Two read-outs. First, the dominant verdict is SUGGEST (88 percent and 72 percent): most real repositories do not have enough clean observations to auto-enforce, and the Wilson gate correctly declines to AUTO rather than over-claim. Second, the two boundaries are not equally respected. AP-002 is nearly universal (2.2 percent REJECT, 5.3 percent of apps carry any violation). AP-001 is much weaker: 24.7 percent REJECT, 29.6 percent of apps import the database directly at the request layer. That is why AP-001 was dropped as a benchmark rule: at that prevalence it is idiomatic, not a clean violation.

## Fast versus deep fidelity

The applicable subset (2,412 repositories) was re-scanned in deep mode, with each repository's dependencies installed first (always with install scripts disabled), so the deep scan can resolve barrel and alias-hidden imports the fast scan cannot see. Per-app gate-status agreement between the two (a repository can hold several applicable app directories, so the per-app denominators below exceed the 2,412 repositories):

| Boundary | Agreement | Disagreements (all one direction) |
|---|---|---|
| AP-002 | 99.8% (2,001 / 2,005) | 4, all SUGGEST to REJECT |
| AP-001 | 98.8% (2,473 / 2,502) | 29 (26 SUGGEST to REJECT, 2 AUTO to REJECT, 1 AUTO to SUGGEST) |

Every disagreement runs one direction: the deep scan finds a hidden forbidden import the fast scan missed. So the fast scan can only ever over-state adherence, never falsely accuse clean code. That is the credibility-safe direction. Deep-install succeeded on 60.3 percent of app installs; the rest hit stale lockfiles or version mismatches and degraded to first-party resolution, which can only shrink the apparent gap, not inflate it.

## Marker inference

AP-002's forbidden target (what counts as a UI module) is inferred per repository, not hard-coded. The inferred marker was `components` in most apps (1,689), but a long tail used a different token: `ui` (87), `_components` (51), `registry` (13), and 141 distinct markers in total. A hard-coded `components` marker would silently fail on those, which is the case for inferring the marker per repository.

## Provenance

Archprint 0.1.0, Node v22.16.0, on a single 8 vCPU / 16.5 GB cloud instance. Gate thresholds: Wilson 95 percent lower bound at least 0.90, at most 3 exceptions, role confidence at least 0.80. Fast full run: 72.5 minutes, 2.69 million files, about $0.55. Deep run: about 7 hours on the applicable subset. Determinism: identical repository and version yield identical output; results are sorted and SHAs are pinned.

## Limitations

- **Applicability and framework coverage.** Only about 10 percent of the corpus produced a role file the classifier recognized, and that slice is dominated by Next.js-style app directories. At the time of this run (archprint 0.1.0) the classifier was Next.js-centric. archprint has since added Nest, SvelteKit, Nuxt, Remix, and React/Vue/Svelte/Angular component detection; re-censusing on the newer classifier, and modeling Astro, Express, Fastify, and plain React SPAs with no server layer, is open work.
- **Rule coverage.** These results rest on two rules. A broader, diverse rule set (layering, dependency direction, public-API boundaries, feature-slice isolation) is needed before any general "mines your architecture" claim.
- **Deep-install ceiling.** 60.3 percent install success caps how much of the corpus has a full gold-standard comparison; the fast-versus-deep number is honest but rests on that subset.
- **A `.tsx` request-entry under-count.** At corpus-run time the classifier matched request entries by `route.ts` and `pages/api/*.ts`, so `.tsx` request entries (next/og image routes, which are always `.tsx`) were misclassified as UI components. This slightly under-counts AP-002 applicability and hides any violation in a `.tsx` handler. It was fixed later in the classifier (now matching `route.tsx?` and `pages/api/*.tsx?`); a re-scan would refine the AP-002 figures. It does not affect the fast-versus-deep conclusion, since both modes used the same classifier.

## Reproducibility

The pinned commit SHA for every repository in the corpus is recorded and verified on pin, along with per-run provenance (tool version, Node, date, host, and gate thresholds). `corpus-summary.json` holds the composition and the exact eligibility parameters; the full 24,888-entry manifest is available.
