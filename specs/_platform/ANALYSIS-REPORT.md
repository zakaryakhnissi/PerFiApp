# FinOS Platform — Consolidated Cross-Module Analysis

**Status:** Planning-phase analysis · **Date:** 2026-06-29
**Scope:** 16 modules (M0–M15), 1,124 tasks, 55 provided contracts.
**Sources:** per-module plan/spec/contract audits + the cross-module `contract-map.md` consistency audit.
**Grounded against:** Constitution v2.2.0, `platform-decisions.md` v1.0.0.

---

## 1. Severity-sorted findings

### CRITICAL (1 issue class, 2 distinct orphan `$id`s, 6 modules affected)

| ID | Finding | Affected modules | Location | Resolution |
|----|---------|------------------|----------|------------|
| C-1 | **Cash-Safety namespace hyphenation split.** Module 3 publishes `finos:cashsafety/*` (no hyphen). Six consumers pin the non-existent hyphenated `finos:cash-safety/*`. The orphan `$id`s — `finos:cash-safety/SafeToActSignal/1.0.0` and `finos:cash-safety/RunwayForecast/1.0.0` — resolve to **no provider anywhere**, so every affected consumer Pact test will fail to bind even after M3 ships. Their `SC-*-008/010` "100% consumed contracts tested" gates cannot pass until reconciled. M2 Credit and M9 Focus already pin the correct un-hyphenated form, proving the provider side is right. Contamination also leaked into M13's two **provided** schemas (`playbooks.schema.json:91`, `notebook-references.schema.json:34`) and M6's `contracts/README.md:29`. | M4 Bills, M5 Pay, M6 Shopping, M7 Tasks, M11 Travel, M13 Workspace | `contract-map.md` §3a | Architect ratifies one canonical namespace (Option A: keep `finos:cashsafety/`, lowest churn — fix 6 consumers + 3 example strings). Then re-wire consumer Pact. |

> There are **no other CRITICAL findings** and **no FAIL Constitution checks** across any module.

### HIGH (1)

| ID | Finding | Module | Location | Resolution |
|----|---------|--------|----------|------------|
| H-1 | **Undeclared consumed contract: `SafeToActSignal` in Habits.** The spec, UX notes, data-model `RitualItem` 'conflict' state, and task T034 all require Habits to read Cash Safety's `SafeToActSignal` to enforce the Conflict Banner / precedence rule — but it is absent from `contracts/consumed/README.md`, the data-model consumed list, spec Key Entities, and the plan's "5 consumed contracts" count. Breaks Principle VII (a relied-upon dependency with no schema-defined contract or consumer test) and makes the consumed count inconsistent across artifacts. | M8 Habits | `specs/010-module-8-habits` (consumed README; spec Edge Cases; data-model `RitualItem`; tasks T034; plan Scale/Scope) | Declare `SafeToActSignal` as a 6th consumed contract, pin its canonical `$id` (`finos:cashsafety/SafeToActSignal/1.0.0`), and add a consumer contract test. Re-check the Principle VI gate once declared. |

### MEDIUM (6)

| ID | Finding | Module | Location |
|----|---------|--------|----------|
| M-1 | **Money fixture arithmetic wrong in spec prose.** `spec.md:135` states `USD 1 234,56 × 1.3725 = CAD 1 695,43`, but the authoritative fixture in `tasks.md:69` (T021) correctly gives `CAD 1 694,43` (123456 × 1.3725 = 169443.36 → half-up → 169443¢). The spec's canonical rounding-drift guard for a NON-NEGOTIABLE money principle is off by ~$1.00 and would fail its own test if taken literally. Spec prose must be corrected to match tasks. | M11 Travel | `spec.md:135` vs `tasks.md:69` |
| M-2 | **Consumed-contract inventory inconsistent (`SafeToActSignal` unpinned).** Treated as consumed everywhere (spec Key Entities, data-model, plan, client task T017, conflict test T054) but absent from `contracts/consumed/README.md`'s version tables. The conflict-precedence dependency is currently unpinned and has no paired consumer contract test (Principle VII / SC-H-008). | M14 Household | `contracts/consumed/README.md` vs spec/data-model/plan/tasks |
| M-3 | **SC-W-009 not satisfiable as tasked.** The module asserts 100% of consumed contracts have passing consumer tests, but `CreditState` and `DocumentVault` — both declared consumed — have no consumer contract test task (T016/T031/T045 cover others only). | M13 Workspace | `tasks.md` T016/T031/T045 vs `consumed/README.md:9,13` |
| M-4 | **Documented-default exception is a genuine relaxation; keep it reviewer-visible.** Principle VI PASS relies on the v2.2.0 carve-out for absent `CreditState` (silent, no-flag healthy-band default). Correctly scoped (utilization is a secondary guardrail; missing/stale money still withholds) and honest, but the silent path is a real relaxation of the original withhold-or-ask default and should stay visible. | M1 Rewards | `plan.md:50`; `spec.md:53,139,151`; `constitution.md:92` |
| M-5 | **User-override redemption rates / manual balance entry not in the threat model.** FR-REW-010 introduces user-supplied write paths (override valuations, manual balances) that feed Travel/Pay downstream, but they are not called out as a tampering/poisoning surface in the threat-model table. Recommend an explicit row. | M1 Rewards | `spec.md:193-207` (threat table); `spec.md:161` (FR-REW-010) |
| M-6 | **Consumed `$id`s referenced by bare name without a canonical namespace.** Multiple consumed deps (`RoundupProposals`, `BillCalendar`, `NotificationDigest`, `TaskCompletionEvents`, `GoalState`) are pinned by bare name @ min 1.0.0 with no `finos:…` namespace, so the Principle VII consumer-test pin is ambiguous. (Same bare-name pattern appears in M13, M14, M15 consumed READMEs.) | M8 Habits (+ M13/M14/M15) | `specs/010-module-8-habits/contracts/consumed/README.md` |

### LOW (selected — representative; full detail in each module audit)

These are documented trade-offs, schema-tightening opportunities, or positive confirmations. None blocks implementation. Recurring themes:

| Theme | Where it recurs | Essence |
|-------|-----------------|---------|
| **Schema doesn't fully self-enforce an invariant** (test carries the burden) | M0 (`credit-state` utilization range), M5 Pay (`utilization_source` not required; trade-off pairings lack `dependentRequired`), M7 Tasks (sync_status vs writeback_outcome enum asymmetry), M10 Inbox (digest budget fields defaulted not required), M14 (`KidGoals` field naming; `chore_name` `oneOf`), M15 Social (`metric` object allows empty; `display_name` free-text) | Provider could emit a technically-valid-but-wrong value caught only by a contract/fixture test; recommend tightening the JSON-Schema. |
| **Forward-referenced consumed contracts not yet authored** | M2, M4, M5, M7, M8, M13, M15, M11 (and the M3 namespace cases) | `SafeToActSignal`/`BillCalendar`/`PaymentSchedule`/etc. pinned before their provider ships; honestly disclosed + feature-checked, but `SC-*-008/010` "100% consumed tested" is conditionally satisfied until providers publish. |
| **Orphan provided contract with no backing FR** | M1 `StatusState` (no FR-REW-*; is consumed by M11/M14) | Add an FR or mark explicitly deferred/forward-looking. |
| **Untasked success-criterion / cross-cutting FR** | M1 (SC-014 10-min onboarding window), M11 (SC-T-001 95% fidelity corpus), M12 (FR-X-017 MFA-on-export dependency), M15 (FR-X-020 residency) | Criterion asserted but no dedicated verifying task; add one. |
| **Cosmetic declared-but-unexercised dependency** | M9 Focus (`MoneyCents` in README but inline cents used); M9 `source_contract` enum drops version segment | Drop the README line or `$ref` it; version-bear the enum. |
| **Constitution check is honest and well-substantiated** (positive) | M0, M2, M3, M4, M5, M6, M7, M10, M12, M13, M14, M15 | Money-exactness, threat models, freshness/withhold, bilingual, and contract gates verified against real spec/schema content — not aspirational PASS marks. |

**Provider→consumer consistency (from `contract-map.md`):** version mismatches **0**; reinvented shared value objects **0**; provided-but-unconsumed **23** (all leaf/UI-surface, expected, not defects).

---

## 2. Per-module one-line status

| # | Module | Constitution | One-line status |
|---|--------|--------------|-----------------|
| 0 | Spine | PASS | Foundation is solid; honest PASS on all nine principles; only LOW schema-tightening notes (utilization range, documented-default scoping). **Ready.** |
| 1 | Rewards | CONCERNS | Money/freshness strong; CONCERNS = documented-default relaxation visibility (M-4), missing threat-model row for user overrides (M-5), orphan `StatusState` FR. No blocker. |
| 2 | Credit | PASS | Exemplary documented-default reasoning (utilization-as-subject => withhold required); `SafeToActSignal` forward-ref is the only caveat. **Ready.** |
| 3 | Cash Safety | PASS | Clean; no-credit invariant enforced structurally; money/threat/freshness all test-backed. **Ready** — but is the provider whose namespace 6 consumers mis-pin (C-1). |
| 4 | Bills | PASS | Compliant; affected by C-1 (consumes the orphan `SafeToActSignal`); forward-ref disclosed + degraded. |
| 5 | Pay | PASS | Compliant; affected by C-1; LOW schema gaps on `utilization_source`/trade-off pairing observability. |
| 6 | Shopping | PASS | Compliant; affected by C-1 (consumer + a contaminated README example); safety-fallback correctly stricter than Rewards. |
| 7 | Tasks | PASS | Originates no money (correct); affected by C-1; minor enum asymmetry. |
| 8 | Habits | CONCERNS | **HIGH H-1** undeclared `SafeToActSignal` + MEDIUM bare-name pins; resolve before P3 exit. |
| 9 | Focus | PASS | Compliant; pins the **correct** un-hyphenated namespace; cosmetic `MoneyCents`/enum-version notes only. |
| 10 | Inbox | PASS | Strong contract-level enforcement (bilingual reject, anti-phishing URL); self-consumed envelope is intentional. **Ready.** |
| 11 | Travel | CONCERNS | **MEDIUM M-1** wrong money fixture in spec prose (must fix — NON-NEGOTIABLE principle); affected by C-1; SC-T-001 fidelity untasked. |
| 12 | Life Admin | PASS | Compliant; only LOW MFA-on-export dependency-surfacing gap. **Ready.** |
| 13 | Workspace | PASS | **MEDIUM M-3** SC-W-009 unmet (missing CreditState/DocumentVault consumer tests); affected by C-1 incl. 2 contaminated provided-schema examples. |
| 14 | Household | CONCERNS | **MEDIUM M-2** unpinned `SafeToActSignal` + schema field-naming/`oneOf` gaps; core principles substantively compliant. |
| 15 | Social | PASS | Compliant leak-proof projection; LOW schema-guard + untasked residency notes; consumed deps await upstream publish. |

---

## 3. Ready for implementation?

**Verdict: Ready to *start* — begin Phase P1 (Module 0 Spine) now — but NOT ready to wire any Cash-Safety consumer until C-1 is resolved.**

The platform is in strong shape: 11 of 16 modules PASS, 0 FAIL, money-exactness and security are genuinely test-backed (not aspirational), there are zero version mismatches and zero reinvented value objects. Module 0 has no upstream dependencies and no blocking findings, so spine implementation can begin immediately and unblocks everything else.

### Top blockers to resolve first (in order)

1. **C-1 — Ratify the Cash-Safety namespace and fix all 6 consumers + 3 contaminated example strings (CRITICAL).** This is the single most important pre-implementation action. Until it is resolved, M4/M5/M6/M7/M11/M13 cannot pass their consumer Pact gates against the real M3 provider, regardless of how much else is built. Decision belongs to the architect (Option A recommended: keep `finos:cashsafety/`).
2. **H-1 — Declare + pin + consumer-test Habits' `SafeToActSignal` dependency (HIGH).** Must land before M8 enters P3.
3. **M-1 — Correct the Travel money fixture in spec prose (MEDIUM, but touches a NON-NEGOTIABLE).** A one-line correction; high symbolic and correctness importance because it is the canonical drift guard.
4. **M-2 / M-3 — Close the consumed-contract inventory/test gaps in Household and Workspace** so their SC-*-008/009 gates are actually satisfiable.
5. **Confirm the blocking NEEDS-RATIFICATION items** before the relevant phase exit: NR-1 Plaid residency (P1 go-live gate), NR-6 email/LLM parser residency (P2), NR-3 dormant window + 7-day crypto-shred (P3), step-up MFA enforcement (P3).

All remaining items are LOW: schema-tightening, forward-reference re-pins when upstream providers publish, and untasked success criteria — none blocks starting implementation, and all are tracked in their owning module audits.
