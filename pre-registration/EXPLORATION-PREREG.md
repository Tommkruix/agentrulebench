# Exploration: Horizon x Capability x Enforcement (PRE-REGISTERED)

> Status: PRE-REGISTERED before running. Written after the calibration pilot returned a **null** (0% violations
> across 3 frontier models x 4 conditions x T1-embed, including unguarded C0/A; instrument validated - planted
> violations DO fail the lint + scorer; first-pass violations also 0%). This document fixes the exploration
> design in advance so it cannot become a fishing expedition. Author: Oluwatomiwa Ajiferuke. Created 2026-08-12.

## Why this exploration exists

The original thesis ("enforcement beats guidance") is, on the pilot evidence, **not supported for inferable
import-boundary rules on short tasks** - frontier agents already comply, so there is no gap to close. That flat
result is also not novel (derivable from first principles). We run ONE bounded exploration to test whether a
genuinely non-obvious effect exists, and we are prepared to conclude it does not.

## The single pre-registered hypothesis (H)

> Architectural drift is a JOINT function of task horizon and model capability: near-zero for frontier models on
> short tasks, but RISING with task length and FALLING with model capability. Enforcement's marginal value
> (B vs A) tracks that curve - largest where unguarded violation is highest (long tasks, weak models).

The novel, non-obvious content is the SHAPE and THRESHOLD: at what capability tier do violations appear, and how
steep is the gradient. The direction ("weaker models violate more") is guessable; the curve is empirical.

## Design

- **Rule under test:** AP-002 (no UI-layer import in a request entry) on workout-cool, where the boundary is
  genuine (0 handlers import UI at baseline) and the instrument is validated. AP-002 chosen over AP-001 because
  its compliant/violating paths are unambiguous and the scorer is proven.
- **Task:** ONE long-horizon, multi-file feature (vs the pilot's single-file task) designed so the violating
  shortcut (reuse a UI component in the server/API layer) is genuinely the faster path over many steps.
- **Capability ladder (the independent variable):**
  - Frontier: Claude Sonnet 5, GPT-5.6-terra, Gemini-pro-latest.
  - Mid: Claude Haiku 4.5, GPT-5.6-luna (or gpt-5-mini), Gemini-2.5-flash.
  - Low/open-weights: added ONLY if the mid tier shows a non-zero gradient (deferred to avoid scope creep).
- **Conditions:** the same 4 (C0 / A / B0 / B). The GATE below uses C0 only.

## STAGE 1 - the base-rate GATE (run first, cheap, decides everything)

Run **C0 only** (no rule, no guidance) x the 6-model ladder x 3 reps = 18 trials, scoring **compliance only**
(did any changed request-entry file import the UI layer). No acceptance test needed at this stage.

**Decision rule, fixed in advance (novelty-aware - "weaker model violates more" is OBVIOUS and does not count):**
- **FRONTIER models violate (>0%)** -> the NON-obvious result: frontier agents (the ones people actually run)
  drift architecturally under realistic multi-step pressure. H's interesting premise holds -> proceed to Stage 2.
- **Frontier = 0%, only mid/weak models violate** -> this is just the expected capability->compliance gradient,
  which any engineer can predict; it is NOT novel on its own. Per the novelty bar -> **lean STOP**, report the
  Stage-1 table, and do not build the full study on this alone.
- **Zero violations anywhere on the ladder** -> agents comply even under long-horizon pressure -> **STOP**,
  report the null in full.
Rationale for the frontier gate: the whole point of the exploration is a finding a smart person could NOT
already conclude. "Newer/bigger models comply better" is not that. Only frontier drift, or a surprising
enforcement interaction, would be.

## STAGE 2 - the full study (only if Stage 1 passes)

Full 4 conditions x the ladder x reps, with acceptance scoring, measuring per tier: unguarded violation rate
(C0/A), enforcement delta (B vs A and B vs B0), first-pass violation + self-correction, and cost/time. The
"worth writing" bar, fixed now: a **clear, monotone capability gradient in unguarded violation** AND a
**measurable enforcement delta that grows as capability drops**. Absent that, we report what we found and stop.

## Integrity commitments (non-negotiable)

- Report the ENTIRE result table, including every null and every model that showed no effect. No cherry-picking.
- Any Stage-1 signal is HYPOTHESIS-GENERATING; Stage 2 is the confirmation, on a frozen design.
- No invented effect sizes; the benchmark produces the number, we report it verbatim (incl. a null).
- If the honest finding is "not novel / no effect," we do NOT publish a forced result. Banking the corpus
  inference work as the contribution, or stopping, are both acceptable.
