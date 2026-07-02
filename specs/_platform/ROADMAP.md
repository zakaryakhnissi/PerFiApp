# FinOS Platform — Delivery Roadmap

**Status:** Planning baseline · **Date:** 2026-06-29
**Grounded against:** Constitution v2.2.0 · `platform-decisions.md` v1.0.0 · `contract-map.md`
**Owner:** Architect / Tech Lead owns sequencing within phases; this roadmap sets the phase boundaries and gates.

---

## 1. Sequencing principle

Delivery follows the **contract dependency direction**, which flows outward from the spine:

1. **The spine must exist before anything consumes it.** Module 0 provides 11 contracts (8 `finos:spine/*` + 3 `finos:common/*` value objects) and consumes none. Every other module's provider/consumer Pact tests bind against spine schemas, so spine contracts are the hard prerequisite for all 1,009 downstream tasks.
2. **A module can be built once every contract it consumes is published** (real provider schema authored + provider Pact passing), or behind a documented feature-check with graceful degradation for a not-yet-shipped provider.
3. **Leaf/UI-surface modules can ship late** — 23 provided contracts have no in-repo consumer, so the modules that own them (much of P3/P4) do not block anything else.

The critical path is therefore: **Module 0 → the P1 product trio → the contracts P2 depends on → P3 → P4.**

---

## 2. Critical path (longest dependency chain)

```
Module 0 Spine (115 tasks)
  └─> Module 3 Cash Safety  (SafeToActSignal, RunwayForecast, RoundupProposal)
        └─> Module 5 Pay     (consumes SafeToActSignal + Rewards contracts)
              └─> Module 6 Shopping (consumes Pay CheckoutRecommendation + SafeToActSignal)
                    └─> Module 13 Workspace (consumes RunwayForecast, BillCalendar, DocumentVault, TripBudget, TaskState…)
```

Module 3's `SafeToActSignal` is the **most-depended-on product contract** (consumed by M2, M4, M5, M6, M7, M9, M11, M14 — directly or behind a feature check). Shipping Cash Safety early de-risks the largest number of downstream feature-checks and is why it sits in P1 even though its only hard upstream dependency is the spine.

---

## 3. Contract dependency order (who unblocks whom)

| When this ships… | …it unblocks (real provider Pact for) |
|------------------|----------------------------------------|
| **M0 Spine** (`finos:spine/*`, `finos:common/*`) | Every module — universal prerequisite |
| **M1 Rewards** (`CardLineup`, `PointsValuation`, `BestCardRecommendation`, `OfferCatalog`, `StatusState`) | M2 Credit, M5 Pay, M6 Shopping, M11 Travel, M14 Household |
| **M3 Cash Safety** (`SafeToActSignal`, `RunwayForecast`, `RoundupProposal`) | M2, M4, M5, M6, M7, M8, M9, M11, M13, M14 (mostly feature-checked) |
| **M4 Bills** (`BillCalendar`) | M3 Cash Safety (feature-gated), M5 Pay, M7 Tasks, M9 Focus, M8/M13 (bare-name) |
| **M5 Pay** (`CheckoutRecommendation`, `PaymentSchedule`) | M6 Shopping, M7 Tasks, M13 Workspace |
| **M7 Tasks** (`TaskState`, `TaskCompletionEvent`) | M8 Habits, M13 Workspace |
| **M12 Life Admin** (`DocumentVault`) | M13 Workspace |
| **M11 Travel** (`TripBudget`) | M13 Workspace |
| **M8 Habits** (`HabitProgress`, `StreakState`) | M14 Household, M15 Social |
| **M14 Household** (`MemberScopes`) | M15 Social (cross-cutting authZ consumed everywhere) |

> **Note the M3↔M4 soft cycle:** M3 consumes `BillCalendar` (M4) feature-gated, and M4 consumes `SafeToActSignal` (M3) feature-gated. Neither is a hard dependency — each degrades gracefully to a spine fallback (`CashFlowForecast.shortfall_flag`). They can be built in either order; full mutual integration lands when both ship.

---

## 4. Phases

### Phase P1 — Spine + first-value loop

**Modules:** M0 Spine, M1 Rewards, M2 Credit, M3 Cash Safety
**Tasks:** 115 + 80 + 68 + 66 = **329**
**Goal:** Deliver the umbrella's 10-minute onboarding payoff — connect an account → Points Wallet + runway + one recommendation.

- **M0 first, alone on the critical path.** Nothing else can pass a contract test until spine schemas exist. Build the aggregation port (Plaid), the three value objects, all 8 spine contracts, the append-only audit store, KMS token isolation, and the skeleton auth threat model.
- **Then M1 / M2 / M3 in parallel** once spine contracts are published. All three consume only spine contracts (plus M2→M1 `CardLineup` and M2/M3 cross-references that degrade gracefully). M1 is already partially built and provisionally validated this exact stack.
- **Resolve the Cash-Safety namespace before M3's consumers wire Pact** (see Gating Items).

**Exit criteria (P1):**
- M0 publishes all 11 contracts with passing provider Pact; consumer Pact stubs exist for the 3 external feeds (Plaid, bureau, FX) behind swappable ports.
- Money golden fixtures pass platform-wide (cent-slippage, half-up-once, FX); CI blocks any `float`/`double` money type.
- Onboarding e2e (SC-014): connect → Points Wallet + runway + one recommendation in ≤10 min, measured.
- Documented-default exception (v2.2.0) is exercised and observable on the wire exactly where the constitution permits (absent secondary `CreditState` → `utilization_source = assumed_healthy_default`; stale/missing **money** always withholds).
- NR-1 (Plaid Canadian residency) confirmed and entered in the subprocessor register, or go-live blocked.

---

### Phase P2 — Money-action layer

**Modules:** M4 Bills, M5 Pay, M6 Shopping, M10 Inbox
**Tasks:** 85 + 65 + 75 + 81 = **306**
**Goal:** Turn the spine + P1 signals into concrete money-saving actions and a single notification surface.

- **M5 Pay** depends on M1 Rewards (`BestCardRecommendation`, `CardLineup`, `PointsValuation`) + M3 `SafeToActSignal` — all P1, so Pay is unblocked the moment P1 lands and the namespace is fixed.
- **M6 Shopping** depends on M5 `CheckoutRecommendation` + M1 `OfferCatalog` + M3 `SafeToActSignal` — sequence Shopping after Pay.
- **M4 Bills** depends on spine + M3 (feature-gated); buildable in parallel with Pay.
- **M10 Inbox** is the fan-in surface: it publishes the `ModuleAlertEvent` envelope every source module conforms to, and self-validates it. Stand Inbox up early in P2 so P2/P3 modules emit alerts against a real envelope contract.

**Exit criteria (P2):**
- `finos:cash-safety/*` namespace orphan **fully resolved** — all 6 consumers re-pinned, Module 13's two contaminated schema example strings and Module 6's README corrected; M4/M5/M6/M7/M11/M13 consumer Pact for `SafeToActSignal`/`RunwayForecast` binds to the real M3 provider.
- M5 `CheckoutRecommendation` emits `utilization_source` and trade-off field pairings observably (close the optional-field provenance gaps flagged in the Pay audit).
- Inbox notification budget + bilingual-reject + stale-money-no-push tests pass; `action_url` anti-phishing `^finos://` lock enforced.
- NR-6 (email/LLM parsing subprocessor) selected and residency-cleared for Inbox.

---

### Phase P3 — Life-organization layer

**Modules:** M7 Tasks, M8 Habits, M9 Focus, M11 Travel, M12 Life Admin, M13 Workspace, M14 Household
**Tasks:** 62 + 61 + 54 + 70 + 65 + 67 + 68 = **447**
**Goal:** Organize the user's financial life — tasks, habits, focus, travel, documents, the workspace that aggregates them, and the household scoping that makes them multi-member.

- **M7 Tasks** and **M12 Life Admin** are buildable early in P3 (mostly spine + P2 contracts). They unblock **M13 Workspace**, which is the heaviest aggregator (consumes 9 contracts).
- **M11 Travel** depends on M1 (`CardLineup`, `StatusState`) + M3 — buildable after P1.
- **M8 Habits** depends on M3 (`RoundupProposal`), M4 (`BillCalendar`), M7 (`TaskCompletionEvent`), M10 (`NotificationDigest`) — sequence after those providers.
- **M14 Household** introduces the cross-member scoping (`MemberScopes`) that the platform's IDOR/authZ model assumes everywhere; its consumed inventory has a declared-but-unpinned `SafeToActSignal` gap to close.
- **M13 Workspace** lands last in P3 — it aggregates the most providers.

**Exit criteria (P3):**
- M8 Habits and M14 Household resolve their CONCERNS: declare + pin + consumer-test the undeclared `SafeToActSignal` dependency; canonicalize bare-name consumed `$id`s; fix M14 KidGoals/Allowance field-naming and bilingual `oneOf` schema gaps.
- M13 Workspace satisfies SC-W-009: add the missing `CreditState` and `DocumentVault` consumer contract tests.
- Household authZ proven at the API layer (IDOR, horizontal escalation, age-up transition, step-up MFA on invite/remove) with audited denials.
- NR-3 (dormant-account inactivity window) set in the PIA; crypto-shred deletion verified within the 7-day window across spine + module schemas.

---

### Phase P4 — Social

**Modules:** M15 Social
**Tasks:** **54**
**Goal:** Accountability circles built as leak-proof server-side projections.

- **M15 Social** depends on M0 `GoalState`, M8 `HabitProgress`/`StreakState`, M14 `MemberScopes` — all P1/P3, so Social is the natural last phase.
- It originates no money and exposes only server-computed projections (`CircleProgress` — never raw amounts/identifiers).

**Exit criteria (P4):**
- `CircleProgress` projection proven leak-proof at the API layer (no raw amount/identifier; `display_name` free-text guard tested).
- FR-X-020 residency has a dedicated verifying task (currently asserted but untasked).
- Consumed Habits/Household contracts re-pinned to real published `$id`s.

---

## 5. What can be built in parallel

| Phase | Serial prerequisite | Parallelizable once prerequisite lands |
|-------|---------------------|-----------------------------------------|
| P1 | M0 Spine (alone) | M1, M2, M3 (all consume only spine + graceful cross-refs) |
| P2 | M3 namespace fix; M1 published | M4 ∥ M10 immediately; M5 then M6 (M6 needs M5) |
| P3 | M5, M7, M12 published | M11 ∥ M9 early; M8 after M3/M4/M7/M10; M14 mid; M13 last |
| P4 | M8, M14 published | M15 |

---

## 6. Platform gating items (block phase exit regardless of module readiness)

| Gate | Phase it blocks | Source |
|------|----------------|--------|
| **G1 — Cash-Safety namespace reconciliation** (`finos:cashsafety/` vs orphan `finos:cash-safety/`) | Blocks P2 exit; partially blocks P3 (M13) | `contract-map.md` §3a — CRITICAL |
| **G2 — Spine contracts published before any consumer Pact** | Blocks all of P1 exit and everything after | Sequencing principle |
| **G3 — Money golden fixtures + no-float lint/DB gate green** | Blocks P1 exit | `platform-decisions.md` §6; Principle IV |
| **G4 — v2.2.0 documented-default observable only where permitted** | Blocks P1 exit | Constitution VI; Pay/Shopping audits |
| **G5 — NR-1 Plaid Canadian residency confirmed; subprocessor register populated** | Go-live gate (effectively P1) | `platform-decisions.md` NR-1; FR-X-020 / SC-017 |
| **G6 — NR-6 email/LLM parser residency cleared** | Blocks P2 (Inbox) and P3 (Travel/Free-Trial) | `platform-decisions.md` NR-6 |
| **G7 — NR-3 dormant-account window set in PIA; 7-day crypto-shred verified** | Blocks P3 exit | `platform-decisions.md` NR-3; FR-X-013/019 |
| **G8 — Step-up MFA enforced for the 3 high-risk action classes** | Blocks P3 exit (Household), surfaced in M12 | `platform-decisions.md` §5; FR-X-017 |

The remaining NEEDS-RATIFICATION items (NR-2 staleness windows, NR-4 bureau/FX/offer vendors, NR-5 ORM escape hatch, NR-7 real-device perf budget) are non-blocking inputs to be resolved inside the owning module plans and are tracked there.
