# Remediation Log — Cross-Module Analysis Findings

**Date:** 2026-06-30 · **Source:** Workflow 4 analysis (`ANALYSIS-REPORT.md`, `contract-map.md`)

All findings from the platform-wide analyze pass have been remediated and verified. Final verification: **0 contract orphans** (33 consumed pins all resolve to real providers among 55 provided `$id`s), **0** hyphenated `finos:cash-safety/*` references outside the analysis docs, **0** invalid JSON schemas.

| ID | Severity | Module(s) | Finding | Resolution |
|----|----------|-----------|---------|------------|
| C-1 | CRITICAL | M4, M5, M6, M7, M11, M13 | Cash-Safety namespace hyphenation split: 6 consumers pinned the non-existent `finos:cash-safety/*` while M3 publishes `finos:cashsafety/*`. 2 orphan `$id`s + 3 contaminated example strings. | Standardized on the provider's un-hyphenated `finos:cashsafety/*` (lowest churn; M2/M9 already matched). Rewrote all consumer pins + the 2 M13 schema example strings + M6 README. |
| H-1 | HIGH | M8 Habits | `SafeToActSignal` relied upon (conflict banner, `RitualItem` conflict state, T034) but never declared as a consumed contract. | Declared `finos:cashsafety/SafeToActSignal/1.0.0` in the consumed README + bare-name consumed contracts given canonical namespaces; covered by consumer contract tests. |
| M-1 | MEDIUM (money) | M11 Travel | Spec prose FX fixture said `CAD 1 695,43`; the authoritative task fixture computes `CAD 1 694,43` (123456 × 1.3725 = 169443.36 → half-up → 169443¢). | Corrected spec prose to `CAD 1 694,43` to match its own test (Principle IV). |
| M-2 | MEDIUM | M14 Household | `SafeToActSignal` consumed everywhere except the consumed README (unpinned, no consumer test). | Added `finos:cashsafety/SafeToActSignal/1.0.0` to the consumed README + to the T050 consumer contract test. |
| M-3 | MEDIUM | M13 Workspace | SC-W-009 (100% consumed have consumer tests) unmet: `CreditState` + `DocumentVault` had no consumer test. | Added task T045a covering `CreditState`, `SafeToActSignal`, `DocumentVault`, `TripBudget` consumer contract tests (now 9/9). |
| M-5 | MEDIUM | M1 Rewards | User-override redemption rates + manual balance entry (FR-REW-010) absent from the threat model as a tampering/poisoning surface. | Added a threat-model row (server-side sanity-bounds validation, `valuation_source` provenance tag, audit) in spec + data-model + the `PointsValuation` schema description. |
| M-6 | MEDIUM | M8, M13, M14, M15 | Consumed `$id`s pinned by bare name without a canonical `finos:…` namespace. | All consumed pins rewritten to the owner's real canonical `$id`. |

**M-4** (informational): the v2.2.0 documented-default exception (absent `CreditState` → silent healthy-band default in M1 Rewards) is a deliberate, reviewer-visible relaxation — no change required; it remains visible in the constitution, spec, and plan.

## Verification commands (re-runnable)

```bash
# providers (ground truth)
grep -rhoE '"\$id":[[:space:]]*"finos:[^"]+"' specs/*/contracts/provided/*.json | grep -oE 'finos:[^"]+' | sort -u
# consumed pins
grep -rhoE 'finos:[a-z-]+/[A-Za-z]+/[0-9.]+' specs/*/contracts/consumed/README.md | sort -u
# orphans = consumed minus providers (expect empty)
comm -23 <consumed> <providers>
```
