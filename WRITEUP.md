# I built a benchmark to catch AI agents eroding architecture rules. It caught nothing.

There is a claim going around that your agent instructions are guidance and your lint rules are enforcement. The file goes by different names, CLAUDE.md for Claude, AGENTS.md for OpenAI's Codex and the open standard that grew out of it, GEMINI.md for Gemini, but the idea underneath is the same: AI coding agents drift away from the architectural conventions you write for them in prose, so you need something deterministic, a rule, a check, a gate, to hold the boundary.

The claim is plausible for two reasons. First, architectural decay is old and well documented in human systems. Perry and Wolf's foundational paper separates two failure modes: *erosion*, from violating the architecture, and *drift*, from insensitivity to it (Perry and Wolf, 1992). Second, there is a specific reason to expect language models to slip on longer work: their attention to information degrades with position and context length. Liu et al. show accuracy falling sharply when relevant content sits in the middle of a long context, even for models built for long context (Liu et al., 2024). If an agent loses the thread over a long enough task, an architectural boundary is exactly the kind of thing it might quietly cross.

I believed this enough to build a tool on it, and then I built a benchmark to measure the effect. The benchmark found no effect, at least not where I looked, and I stopped. This is the write-up, including the parts that argue against the thing I was building. The harness is open source so you can rerun it and prove me wrong.

## What I was testing

Two pieces.

The first is an inference tool. Existing architecture-conformance checkers are good but they all start from rules a human writes down: dependency-cruiser, eslint-plugin-boundaries, and ArchUnit all encode an intended dependency graph by hand and then flag violations. The less-explored move is the other direction: read a repository's real import graph and infer the boundaries the code already follows, then emit those as rules with the evidence attached. Concretely, rules like "request-entry files do not import UI components," or "request-entry files do not import the database layer directly." I gate each candidate on a Wilson score confidence bound rather than a hand-picked threshold, so a rule is only proposed when the codebase demonstrates it strongly enough for the sample size (Wilson, 1927). I ran the inference across a near-census of 24,888 public TypeScript repositories to check that it holds at scale. On the applicable subset I re-scanned with dependencies installed, the fast, no-install analysis agreed with the slow, fully-resolved one about 99 percent of the time (99.8 percent for the UI-import rule, 98.8 percent for the database-import rule), and every disagreement ran the same direction: the fast scan under-counting, never inventing a violation. The corpus, its composition, and the full per-rule fidelity breakdown are documented alongside the harness; the full manifest of pinned commit SHAs is available on request.

The second piece is the benchmark. Take a rule the tool inferred. Give an agent a realistic coding task on a repository where the rule holds. Compare four conditions:

1. nothing (control),
2. the rule as prose in the agent's context files, CLAUDE.md and AGENTS.md (guidance),
3. an instruction to run a lint step and fix its errors, using the same lint harness as enforcement but with no inferred rule in it (instruction only),
4. the inferred rule installed as a lint error, plus that same instruction (enforcement).

The measured outcome is whether the agent finishes the task without eroding the boundary. If the premise holds, the unguarded conditions should erode it and enforcement should catch what guidance misses.

I ran it under a single provider-agnostic harness across three vendors' agents, Anthropic's Claude, OpenAI's GPT, and Google's Gemini. The agent loop, the tools, the task, and the prompts were identical across models; only the model, and the provider adapter it runs through, differed.

One honest note on the guidance condition: I placed the prose rule in CLAUDE.md and AGENTS.md, the native files for Claude and for OpenAI's Codex, but not in GEMINI.md, Gemini's own. This does not affect the result, because the load-bearing finding is the control, which carries no guidance file of any kind and still produced no violations. If there were drift for a guidance file to prevent, it would have shown up there first.

## Pre-registering, on purpose

Before running the scaled study I wrote the design down and fixed it: the hypothesis, the conditions, the models, the task, and, importantly, a stopping rule and what result would count as worth continuing. This is not ceremony. Gelman and Loken's "garden of forking paths" shows that a large number of implicit analytic choices can manufacture a positive finding even when a researcher runs a single analysis in good faith and never consciously fishes (Gelman and Loken, 2013). If I let myself hunt across rules, repos, and tasks until something finally slipped, I would eventually find it, and it would mean nothing. Fixing the design in advance is how you keep an exploration from becoming a fishing trip you did not notice you were on.

## What happened

Nothing eroded.

The calibration pilot was 24 runs across three current frontier models and the four conditions. Every run came back compliant, including the control with no rule and no guidance. Zero violations, zero first-pass violations, and by construction zero self-corrections, because there was nothing to correct.

The obvious suspicion is that the task was too easy or the detector was broken, so I addressed both. I made the task longer and messier: a multi-route sharing feature with an explicit instruction to keep the output "visually consistent with the rest of the app's program UI," which is the phrasing most likely to bait a model into importing a UI component into a server route. And I widened the model set into a capability ladder, adding a cheaper, weaker tier (a small Claude, a small GPT, a flash-tier Gemini), on the theory that if erosion lives anywhere it lives in the cheap models people run at scale.

Still nothing. Eighteen runs across six models frontier and cheap (one failed on an API credit error, leaving seventeen scored), all of them in the unguarded control condition, no rule and no guidance, the setup most likely to slip. Zero violations among the scored runs. Handed the temptation to reuse a UI component, the models built the routes and kept the boundary clean, with no UI import in any request entry. The weak models did it too.

## Ruling out a dead detector

A null only means something if the instrument works; otherwise "no violations detected" is indistinguishable from "no detector." So the scorer's catch was validated independently of the models: the harness ships an end-to-end test (`npm run test:harness`) that drives a deliberately violating reference solution, a route that imports a UI component, through the full trial pipeline, and the scorer flags it with the offending import named. The instrument catches violations. The live runs produced none for it to catch.

## What this does and does not mean

The easy overclaim is wrong, so I want to be precise. Using Perry and Wolf's vocabulary, this is a result about *erosion*, active violation of a boundary, not about *drift* in their broader sense.

I did not find that "AI agents respect architecture." I found something narrow and specific: across these trials the agents did not erode one inferred boundary, that a request entry must not import a UI component, on one real repository, across a single-route task and a three-route task, even when nudged toward the violation. TypeScript import hygiene is close to the most convention-saturated territory these models have ever trained on. If there is anywhere they should already know the rule, it is here.

I want to be equally precise about what was not put in front of the agents. The tool infers a second boundary too, that a request entry should not import the database layer directly, but I did not benchmark agents against it. The corpus was the reason: roughly a quarter to a third of real apps import the database directly in a request entry, so it reads as an idiomatic pattern rather than a clean violation, and I dropped it as a benchmark rule. Only the UI-import boundary was tested at the agent level, on the one repository.

Everything else is untested and out of scope: layering rules in other paradigms, naming conventions, state-management patterns, and genuinely unusual project-specific conventions that deviate from the common default. That last category is where I would actually expect an effect, since a model cannot follow a convention it has no way to infer, and it is the obvious next question. But it is a different question, and this result does not speak to it.

## Why I stopped instead of rescuing the thesis

Because the premise did not reproduce, and the result I could still manufacture was not worth having. Continuing to search for a rule or repo where some model finally slips is the garden of forking paths with extra steps. And the finding it would yield, that a weak enough model on a hard enough task eventually slips, is something any engineer can predict without running anything, and it would be a product of the search rather than a real effect. "A hard lint error enforces a rule more reliably than a soft doc" is not a finding either; it is close to the definition of the terms.

The pilot existed to spend a few dollars deciding whether the full study was worth real money and weeks. It decided: no. The pilot cost about two dollars, estimated from its recorded token counts; the follow-up exploration was another seventeen scored runs, so the whole path to this conclusion cost only a few dollars. The full pre-registered run would have cost an estimated ninety dollars or so and taken several days, for a result now known to be null and unsurprising.

## Why publish a null at all

Because the alternative is the file drawer. Rosenthal named the problem in 1979: the literature fills with the small fraction of studies that cross a significance line, while the null results sit unpublished in drawers, which inflates apparent effects and sends other people chasing the same dead end (Rosenthal, 1979). The modern remedy is to decide what to publish based on the question and method rather than the outcome, which is the logic behind registered reports (Center for Open Science). I cannot make anyone accept a null, but I can hand you the pre-registration, the harness, and the estimated pilot cost, and let you rerun it.

To be blunt about scope one more time: this is not a paper and I am not dressing it up as one. It is a clean, reproducible negative result on a specific, well-defined claim.

## Reproduce it, and re-grounding the tool

The harness is open source: https://github.com/Tommkruix/agentrulebench. It drives any of the providers through one loop, so you can point it at your own rules, repos, and models. If you get an agent to erode an inferred import boundary where I could not, I want the transcript.

And the tool itself: its original pitch was "agents drift, so enforce." My own benchmark says they do not, on the rule I tested, so I will not sell that. What remains is smaller and honest: catching human regressions in review and CI, and writing down the conventions a codebase already follows with the evidence attached, instead of leaving them in someone's head. Being the tool whose own benchmark contradicted its first marketing line, and saying so, is a better place to stand. Archprint is separate, still-in-progress work, not released here; this post is about the benchmark and its result, not a tool launch.

One thing to take from this that has nothing to do with architecture: run the cheap version before the expensive one. The pilot did its entire job for the price of lunch.

---

## References

- Perry, D. E., and Wolf, A. L. (1992). "Foundations for the Study of Software Architecture." ACM SIGSOFT Software Engineering Notes, 17(4), 40-52.
- Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., and Liang, P. (2024). "Lost in the Middle: How Language Models Use Long Contexts." Transactions of the Association for Computational Linguistics, 12, 157-173. (arXiv:2307.03172)
- Gelman, A., and Loken, E. (2013). "The Garden of Forking Paths: Why Multiple Comparisons Can Be a Problem, Even When There Is No 'Fishing Expedition' or 'p-hacking' and the Research Hypothesis Was Posited Ahead of Time." Department of Statistics, Columbia University.
- Wilson, E. B. (1927). "Probable Inference, the Law of Succession, and Statistical Inference." Journal of the American Statistical Association, 22(158), 209-212.
- Rosenthal, R. (1979). "The File Drawer Problem and Tolerance for Null Results." Psychological Bulletin, 86(3), 638-641.
- Center for Open Science. "Registered Reports." https://www.cos.io/initiatives/registered-reports
- Tooling referenced: dependency-cruiser (github.com/sverweij/dependency-cruiser), eslint-plugin-boundaries (github.com/javierbrea/eslint-plugin-boundaries), ArchUnit (archunit.org).
