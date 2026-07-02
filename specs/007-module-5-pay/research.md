# Phase 0 Research: Module 5 — Pay & Payment Optimization

**Feature**: `007-module-5-pay` | **Date**: 2026-06-29

Resolves the design-shaping decisions Pay depends on. **Platform-stack choices (language, datastore, mobile framework, money representation, auth, residency, CI gates) are inherited verbatim from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are NOT re-litigated here.** Pay is a recommend-only consumer module: it owns no aggregation, no tokens, no FX feed, and re-derives no points valuation. Module-specific open items are flagged as **non-blocking** at the end.

---

## 1. Inherited platform decisions (referenced, not re-decided)

Pay adopts, without change: TypeScript modular monolith (NestJS module `PayModule` = bounded context); `@finos/money` (`bigint` cents + `decimal.js` string-encoded rates, half-up once); `@finos/format` (en-CA / fr-CA); PostgreSQL 16 `ca-central-1` with a `pay` schema + per-schema role + RLS; append-only `audit.event_log` as the audit source of truth; semver'd JSON-Schema contracts via `@finos/contract-*`; Pact consumer/provider contract tests; the Recommendation Card / Confirm-Action / Freshness chip / Conflict Banner UX components (ux-foundations). See platform-decisions §2–§6.

**Rationale**: Constitution IX (no re-deciding settled platform choices) + FR-X-011 (one contract layer). Re-deciding here would fork the platform.

---

## 2. Runway source: `CashFlowForecast` vs. a Cash-Safety `RunwayForecast`

**Decision**: Pay reads runway/projected-lowest-balance from the **spine** `finos:spine/CashFlowForecast/1.0.0` as the canonical money source, and consumes Cash Safety's `SafeToActSignal` only as the **precedence/override** signal. The umbrella name "RunwayForecast" is treated as an alias of `CashFlowForecast`.

**Rationale**: `CashFlowForecast` is already authored and is the spine's canonical runway output (`projected_lowest_balance`, `runway_days`, `shortfall_flag`), so Pay's core checkout-safety and sequencer-feasibility logic does not block on the not-yet-shipped Module 3. Cash Safety's distinct contribution — overdraft **precedence** when modules conflict — is `SafeToActSignal`, which Pay wires behind a feature check. This keeps the canonical-spine principle (one source of runway truth) intact (platform-decisions §3).

**Alternatives considered**: Depend on a Cash-Safety-owned `RunwayForecast` contract — rejected: that contract is not authored, would duplicate the spine forecast, and would block Pay's MVP on Module 3. Recompute runway in Pay from `AccountState` — rejected: violates the single-canonical-spine principle and duplicates forecast logic.

---

## 3. Checkout "runway-safe" definition

**Decision**: A method is **runway-safe for a checkout** iff, after applying `checkout_amount` as an outflow on the spine projection, `CashFlowForecast.projected_lowest_balance` over the horizon stays **at or above the user's safety buffer** (no new `shortfall_flag`). Pay reads this; it never recomputes the forecast. `SafeToActSignal`, when present and flagging risk, overrides regardless.

**Rationale**: Gives the checkout overlay a precise, testable safety predicate grounded in the spine's own buffer (FR-PAY-001; Constitution VIII "no runway calculation on a multi-day-old balance" — stale forecast withholds).

**Alternatives considered**: A Pay-local "balance minus amount > 0" check — rejected: ignores upcoming obligations the spine forecast already models, and would let a checkout pass that overdrafts days later.

---

## 4. Sequencer objective & algorithm (MVP)

**Decision**: A **deterministic, constraint-first greedy heuristic**: (1) satisfy the no-overdraft constraint — order obligations by due date / earliest binding constraint, funding each from the source account that keeps every intermediate projected balance ≥ buffer; (2) within remaining slack days, advance discretionary goal contributions as early as the buffer allows to maximize goal progress. If no overdraft-free ordering exists, emit `feasibility = infeasible` with the shortfall and criticality-ranked deferral recommendations (handed to Bills). No general ILP/optimizer at MVP.

**Rationale**: Constitution IX / YAGNI — a greedy, pure, deterministic heuristic is fixture-testable and sufficient for the MVP user need (avoid overdraft, then advance goals). It satisfies FR-PAY-002 without a constraint-solver dependency. Determinism is required for the money-correctness fixtures (SC-P-004/007).

**Alternatives considered**: ILP / general optimizer — deferred until a demonstrated need (premature complexity). Naive due-date-only ordering — rejected: ignores goal progress (FR-PAY-002 second objective) and can overdraft when due dates cluster before inflows.

---

## 5. Reward value: consume from Rewards, never re-derive

**Decision**: Pay consumes already-CAD-valued reward figures from Rewards (`BestCardRecommendation` carries the reward-optimal candidate; `PointsValuation`/`CardLineup` supply per-method reward potential). Pay performs **only integer-cents arithmetic** to combine reward with known costs (FX fee, etc.); it never re-runs points-to-CAD valuation.

**Rationale**: Boundary with Module 1 (spec scope note) + Constitution IV. Re-deriving valuation in Pay would duplicate Rewards logic and risk divergence; consuming the valued figure keeps one source of points-valuation truth.

**Alternatives considered**: Re-value points in Pay from raw balances/rates — rejected: duplicates Rewards, risks cent-level divergence, breaks the module boundary (Principle VII).

---

## 6. Near-tie resolution (`reward_tie_threshold_cents`)

**Decision**: Among safe methods, pick the highest net CAD reward; when two methods differ by less than a documented trivial-delta default **`reward_tie_threshold_cents` = 25¢** (user/ops-adjustable), prefer the lower-utilization / higher-liquidity method. This is a **secondary tiebreak guardrail**, never a money-originating input.

**Rationale**: Mirrors Rewards' tiebreak philosophy (highest absolute CAD reward, then lowest utilization impact) and avoids surfacing a card that nudges utilization up for a sub-cent-scale reward gain. Documented default ⇒ deterministic and fixture-testable.

**Alternatives considered**: Always pick the highest net reward regardless of margin — rejected: surfaces utilization-raising picks for negligible gain. A percentage threshold — rejected: a fixed-cents threshold is simpler and locale-neutral for MVP.

---

## 7. Idempotency & recommend-only enforcement

**Decision**: All state Pay writes on the user's behalf (accepted `ScheduledPayment` records, published `PaymentSchedule`, audit events) is keyed on `source_event_id` with a `UNIQUE` constraint and is safe to retry. No money-movement endpoint exists; every consequential action routes through the Confirm-Action sheet.

**Rationale**: Constitution IV (idempotent, recommend-only) + platform-decisions §4. "Schedule" = record a proposal + publish a contract, never execute. This is the load-bearing safety property of FR-PAY-003.

**Alternatives considered**: Best-effort dedup in application code — rejected: a `UNIQUE` DB constraint is the only replay-proof guarantee. Any money-movement integration — rejected: out of bounds (FR-X-003).

---

## 8. Degradation when Cash Safety / Bills are not yet shipped

**Decision**: Wire `SafeToActSignal` (Module 3) and `BillCalendar` (Module 4) behind feature checks. Without `SafeToActSignal`/forecast, runway-dependent checkout picks rely on `CashFlowForecast` and **withhold** when it is stale/missing rather than guessing. Without `BillCalendar`, the sequencer operates on a **user-entered obligation set** and publishes `PaymentSchedule` with no downstream calendar sync; obligation renegotiation is handed to Bills when it ships.

**Rationale**: Pay is independently shippable per its Independent Tests; phased delivery (umbrella). Degradation never produces unsafe money advice (Constitution VIII / FR-X-012).

**Alternatives considered**: Block Pay until Module 3 + Module 4 ship — rejected: Pay's core checkout overlay and sequencer are valuable on spine + Rewards alone.

---

## 9. Contract testing approach

**Decision**: Consumer-driven contract tests for each consumed contract (`BestCardRecommendation`, `CardLineup`, `PointsValuation`, `CreditState`, `CashFlowForecast`, `BudgetState`, `GoalState`, `AccountState`, `MerchantGraph`, and the pinned `SafeToActSignal` / `BillCalendar`) and provider contract tests for each provided contract (`CheckoutRecommendation`, `PaymentSchedule`), running in CI; contracts semver'd with a deprecation window.

**Rationale**: Principle VII + FR-X-011 + SC-P-010. Version skew disables the dependent recommendation (umbrella edge case) rather than serving on a mismatched schema.

**Alternatives considered**: Integration tests against live providers only — rejected: slow, doesn't pin the schema, no provider-side guarantee, and impossible for the not-yet-shipped providers.

---

## Open items handed to planning/ops (non-blocking)

- **OI-1 (FX vendor & residency, NR-4)**: concrete Canadian-region FX source for foreign-currency checkouts and its residency posture; selected in planning (shared with Rewards/Travel). Until then the FX path is freshness-gated and withholds on stale.
- **OI-2 (`SafeToActSignal` / `BillCalendar` contract shapes)**: exact schemas are owned by Modules 3 and 4; Pay pins the expected `$id`/version now (`finos:cashsafety/SafeToActSignal/1.0.0`, `finos:bills/BillCalendar/1.0.0`) so its consumer tests are ready when those providers publish. Any field-shape negotiation happens when those modules are authored.
- **OI-3 (`reward_tie_threshold_cents` default, safety buffer)**: the 25¢ near-tie default and the user-adjustable safety buffer are confirmed in the Module 0 ops review (NR-2); the mechanism (documented default + buffer read from spine) is fixed now.
- **OI-4 (sequencer optimizer upgrade)**: whether to replace the greedy heuristic with an optimizer is deferred until a demonstrated user need (Constitution IX); the heuristic interface isolates this so an upgrade is non-breaking.
- **OI-5 (obligation criticality ranking source)**: the criticality ordering used for deferral recommendations in the infeasible case (e.g. rent/utilities > discretionary) is a curated, bilingual ruleset finalized with Bills (Module 4); MVP ships a sensible Canada-first default.
