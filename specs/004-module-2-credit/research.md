# Phase 0 Research: Module 2 — Credit & Coaching

**Feature**: `004-module-2-credit` | **Date**: 2026-06-29

Resolves the Credit-specific technical decisions the design depends on. **Platform-stack choices** (language, datastore, mobile framework, money package, auth, residency, CI gates) are **inherited from** [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are **not** re-litigated here. Each decision below is Decision / Rationale / Alternatives. Genuinely open vendor/source items are listed as non-blocking `NR-CRD-*` at the end.

---

## 1. CreditState provider boundary (no duplicate provider)

**Decision**: The **Spine (Module 0)** remains the single canonical provider of `finos:spine/CreditState/1.0.0` (utilization, bands, due-date risk). Module 2 **feeds bureau-sourced score/factor enrichment into the spine's CreditState pipeline** and publishes its own `CreditFactors` monitor read-model + coaching/playbook/refinance contracts. It does **not** re-publish a competing `CreditState`.

**Rationale**: Principle VII forbids two providers of one contract and forbids shared mutable state. The umbrella's "Module 2 Provides: CreditState enrichment" is satisfied by enrichment-into-spine, keeping a single source of truth for utilization that Rewards (FR-REW-003) and Credit (FR-CRD-002) both reason against without divergence (Integration-First).

**Alternatives considered**: Module 2 owns `CreditState` and the spine consumes it — rejected (inverts the spine-is-canonical architecture; creates a circular dependency since the spine must not read product-module state). Two `CreditState` providers behind a merge — rejected (ambiguous source of truth, contract-test ambiguity).

---

## 2. Credit-bureau feed sourcing & freshness

**Decision**: Treat the Canadian credit-bureau feed (score 300–900 + report factors) as an **external, freshness-stamped feed** behind a `BureauProvider` interface, accessed only behind the spine/secrets boundary. Monitoring is **soft-pull only** (no score impact). Each score/factor carries a `FreshnessStamp` (default 24 h window). Concrete vendor selection (Equifax Canada / TransUnion Canada) is a procurement decision; the interface, soft-pull constraint, and freshness handling are fixed now.

**Rationale**: FR-CRD-001 + Fresh-or-Flagged (Principle VIII) + the umbrella "Canadian credit-bureau feed" assumption. Abstracting behind `BureauProvider` lets a curated/manual seed ship for MVP and a licensed bureau feed swap in without touching coaching logic. Soft-pull avoids harming the user's score (the very thing the module protects).

**Alternatives considered**: Hard-pull for richer data — rejected (harms score; violates the module's purpose). Model a proprietary score in-app — rejected (C6: display the bureau score, never fabricate one). Store the raw bureau report verbatim — rejected (data-minimization; keep only score + normalized factors).

---

## 3. Early-payment amount math & rounding

**Decision**: Compute the early-payment amount from real `AccountState` balance/limit and `CreditState` bands: the minimum payment (in cents) such that `(balance − payment) / limit` falls **below** the target band threshold. Compute in arbitrary-precision decimal; round the payment **half-up to the nearest cent**, then **round up to the next cent** in the boundary case where rounding down would leave utilization fractionally at/above the band. No binary float anywhere.

**Rationale**: Principle IV (NON-NEGOTIABLE) + FR-CRD-002. The boundary round-up rule guarantees the recommendation actually crosses the band (a half-up that lands exactly on the threshold would fail the user). Documented and unit-tested via the band-boundary fixture (spec Money Correctness fixture b).

**Alternatives considered**: Float arithmetic — rejected (constitutionally prohibited; cent drift cascades into the recommendation). Always round down — rejected (can leave utilization in the warn band, defeating the advice). Recompute utilization from raw balances instead of reading `CreditState` — rejected (duplicates Credit/Spine logic, risks divergence; read the canonical figure).

---

## 4. Withhold semantics for coaching/refinance (documented-default does NOT apply)

**Decision**: When a primary money input (`AccountState` balance/limit) or `CreditState` utilization is **stale or missing**, Credit **withholds** the coaching plan / refinance money delta (`status='withheld'`, named reason) and asks the user to refresh. The Constitution VI v2.2.0 documented-default exception (assumed-healthy band) is **NOT** used here.

**Rationale**: In Rewards, utilization is a *secondary guardrail* on a card recommendation, so an absent `CreditState` may use the healthy-band default. In Credit, the early-payment amount **is** the output and is a **money figure**, and utilization is the subject being acted on — substituting a default would manufacture a money figure on no data, which Principle VI/IV forbids (spec Clarification C4).

**Alternatives considered**: Reuse the Rewards healthy-band default for coaching — rejected (would emit a payment amount with no real balance/utilization basis). Show a greyed-out plan — rejected (ux-foundations §3 mandates the Withheld Card, not a faded fake).

---

## 5. Two-sided refinance trade-off (rewards value sourced from Rewards)

**Decision**: For keep/downgrade/cancel/refinance, consume the **rewards-value side** from Rewards `finos:rewards/CardLineup/1.0.0` (annual fee, earn rules, valuation) and compute only the **credit-score side** (utilization + average-age effects) in Credit. Surface `net_annual_value_delta` (money) **and** `estimated_credit_score_impact` (qualitative) on every signal. Score impact is qualitative/bounded, never a fabricated point figure.

**Rationale**: FR-CRD-004 + Integration-First + DRY. Re-valuing points in Credit would duplicate and diverge from Rewards' valuation. A one-sided signal (money only, or score only) is a defect (SC-C-004).

**Alternatives considered**: Credit re-values rewards — rejected (duplicate logic, divergence). Quantify a precise score-point delta — rejected (bureaus do not expose a deterministic model; C6 bounds it qualitatively).

---

## 6. Conflict resolution with Cash Safety

**Decision**: When `SafeToActSignal` (Module 3) flags that an early payment would create an overdraft risk, it **takes precedence** over Credit's early-payment recommendation; `safe_to_act_deferred=true` and the conflict + resolution are surfaced (Conflict Banner). Until Cash Safety ships, Credit also consults `CashFlowForecast` runway and still proceeds enforcing `CreditState` bands; the `SafeToActSignal` consumer is wired behind a feature check.

**Rationale**: Umbrella cross-module edge case + ux-foundations §10.4 precedence order (Cash Safety > Credit hard-avoid > budget > optimization). Phased delivery: Credit is independently shippable per its Independent Test.

**Alternatives considered**: Block all coaching until Cash Safety exists — rejected (Credit ships independently). Let Credit override Cash Safety — rejected (violates the documented precedence; risks recommending a payment that overdrafts the user).

---

## 7. Staleness-threshold defaults

**Decision**: Bureau score/factors default to a **24 h** staleness window (bureau data is slow-moving, not real-time); balances/limits inherit `AccountState` freshness (typically hours); refinance APR feeds **24 h**. User-adjustable; exact values confirmed in the Module 0 ops/PIA review (inherits platform NR-2). The mechanism (per-value `FreshnessStamp` + threshold) is fixed.

**Rationale**: FR-X-008 / SC-C-006. Provides concrete behavior for tests now while leaving final tuning to ops.

**Alternatives considered**: Real-time bureau polling — rejected (bureaus rate-limit; soft-pull cadence is daily-ish). Single global threshold — rejected (balances move far faster than a bureau score).

---

## 8. Retention & residency of bureau-derived data

**Decision**: Store only the score + normalized factors + derived plan/signal records — never the raw bureau report verbatim. Bureau-derived data inherits the platform deletion cascade (FR-X-013, 7-day verified deletion) and dormant-account anonymization (FR-X-019) via crypto-shred of per-subject keys (platform-decisions §5). The bureau subprocessor MUST be Canadian-region or covered by a disclosed PIPEDA cross-border accountability agreement (subprocessor register is a go-live gate).

**Rationale**: Constitution V + Quality Standards (PIPEDA/Law 25) + FR-X-020. Credit data is high-harm; minimization + bounded retention + residency are non-negotiable.

**Alternatives considered**: Retain full report history for trend analysis — rejected (data-minimization; keep only score history + factors). Out-of-region bureau processing without disclosure — rejected (blocks go-live; FR-X-020).

---

## 9. Contract testing approach

**Decision**: Consumer-driven contract tests for each consumed contract (`CreditState`, `AccountState`, `CashFlowForecast`, `GoalState`, `CardLineup`, `SafeToActSignal`) and provider contract tests for each provided contract (`CreditFactors`, `CreditCoachingPlan`, `CreditBuilderPlaybook`, `RefinanceSignals`), running in CI (Pact per platform-decisions §6); contracts semver'd with a deprecation window. Version skew disables the dependent coaching/refinance signal rather than serving on a mismatched schema.

**Rationale**: Principle VII + FR-X-011 + SC-C-008 + SC-012.

**Alternatives considered**: Integration tests against a live spine only — rejected (slow, doesn't pin the schema, no provider-side guarantee).

---

## Open items handed to planning/ops (not blocking design)

- **NR-CRD-1 (Credit-bureau vendor + residency)**: select Equifax Canada / TransUnion Canada (or a Canadian aggregator of bureau data); confirm Canadian-region processing or a disclosed PIPEDA cross-border agreement before go-live; enter into the subprocessor register (platform NR-4). Owner: Module 2 plan + PIA.
- **NR-CRD-2 (Refinance APR / product feed)**: source of candidate refinance rates (balance-transfer offers, line-of-credit rates); Canadian-region or disclosed; framed as informational, never commissioned (platform NR-4).
- **NR-CRD-3 (Credit-builder knowledgebase)**: curated, versioned, bilingual Canada-specific builder dataset (secured cards, credit-builder loans, on-time-payment guidance); accuracy/liability review.
- **NR-CRD-4 (Exact staleness windows & dormant retention)**: confirm the 24 h score window and dormant-account inactivity window in the Module 0 PIA (platform NR-2, NR-3).
- **NR-CRD-5 (Goal-detection for credit-boosting target band)**: how a "credit-boosting" goal is detected from `GoalState` to switch the coaching target to the optimal band — confirmed against the GoalState schema in the Module 2 plan.
