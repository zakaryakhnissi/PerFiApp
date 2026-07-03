# FinOS Platform — Contract Map (Provider → Consumers)

**Status:** Generated cross-module consistency audit
**Scope:** All 16 modules (Module 0 Spine + Modules 1–15), `specs/002`–`specs/017`
**Method:** Authoritative `$id` read from every `specs/*/contracts/provided/*.schema.json` (55 provider schemas) cross-referenced against every `specs/*/contracts/consumed/README.md` and per-module consumed-contract declaration.

> **Headline:** One **CRITICAL** orphan class and one **CRITICAL** namespace split. Module 3 (Cash Safety) publishes its contracts under the namespace **`finos:cashsafety/`** (no hyphen), but **six** consumer modules pin the **hyphenated** form **`finos:cash-safety/`**, which **no provider emits**. Every consumer-side Pact test pinning the hyphenated `$id` will fail to resolve a provider. This must be reconciled to a single canonical namespace before any consumer contract test can pass against a real Cash Safety provider.

---

## 1. Ground-Truth Provider Set (55 contracts)

Every contract below was confirmed by reading the literal `$id` field of its provided schema file.

| Namespace | Provider module | Provided `$id`s |
|-----------|-----------------|-----------------|
| `finos:spine/*` | Module 0 — Spine (`specs/003`) | AccountState, TransactionStream, MerchantGraph, BudgetState, CashFlowForecast, CreditState, GoalState, ConnectionConsent — all `/1.0.0` |
| `finos:common/*` | Module 0 — Spine (`specs/003`) | FreshnessStamp, Reasoning, MoneyCents — all `/1.0.0` (platform-canonical value objects) |
| `finos:rewards/*` | Module 1 — Rewards (`specs/002`) | CardLineup, PointsValuation, TransferIntelligence, BestCardRecommendation, OfferCatalog, StatusState — all `/1.0.0` |
| `finos:credit/*` | Module 2 — Credit (`specs/004`) | CreditFactors, CreditCoachingPlan, CreditBuilderPlaybook, RefinanceSignals — all `/1.0.0` |
| `finos:cashsafety/*` | Module 3 — Cash Safety (`specs/005`) | RunwayForecast, SafeToActSignal, RoundupProposal — all `/1.0.0` **(NOTE: no hyphen)** |
| `finos:bills/*` | Module 4 — Bills (`specs/006`) | SubscriptionInventory, BillCalendar, RecurringObligations, FreeTrialExpiry — all `/1.0.0` |
| `finos:pay/*` | Module 5 — Pay (`specs/007`) | CheckoutRecommendation, PaymentSchedule — all `/1.0.0` |
| `finos:shopping/*` | Module 6 — Shopping (`specs/008`) | WatchedItems, PurchasePlan, RealizedSavings, CouponRecommendation — all `/1.0.0` |
| `finos:tasks/*` | Module 7 — Tasks (`specs/009`) | TaskState, TaskCompletionEvent — all `/1.0.0` |
| `finos:habits/*` | Module 8 — Habits (`specs/010`) | StreakState, HabitProgress — all `/1.0.0` |
| `finos:focus/*` | Module 9 — Focus (`specs/011`) | WellbeingAction — `/1.0.0` |
| `finos:inbox/*` | Module 10 — Inbox (`specs/012`) | ModuleAlertEvent, NotificationDigest, UnsubscribeAction, NotificationPreference — all `/1.0.0` |
| `finos:travel/*` | Module 11 — Travel (`specs/013`) | TripBudget, TravelSpend — all `/1.0.0` |
| `finos:lifeadmin/*` | Module 12 — Life Admin (`specs/014`) | DocumentVault, ReceiptLinks, WarrantyReminders — all `/1.0.0` |
| `finos:workspace/*` | Module 13 — Workspace (`specs/015`) | Playbooks, NotebookReferences — all `/1.0.0` |
| `finos:household/*` | Module 14 — Household (`specs/016`) | HouseholdRoles, MemberScopes, KidGoals — all `/1.0.0` |
| `finos:social/*` | Module 15 — Social (`specs/017`) | CircleProgress, AccountabilitySignals — all `/1.0.0` |

There is **no provider anywhere** under the namespace `finos:cash-safety/` (hyphenated). The only Cash Safety provider is `finos:cashsafety/` (un-hyphenated), Module 3.

---

## 2. Provider → Consumers Matrix

Consumer modules are listed by the `$id` form they actually pin. A ✅ means the pinned consumer `$id` resolves to a real provider `$id`; a ❌ means it does not (orphan).

### Module 0 — Spine (`finos:spine/*`, `finos:common/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:spine/AccountState/1.0.0` | M2 Credit, M3 Cash Safety, M5 Pay, M14 Household ✅ |
| `finos:spine/TransactionStream/1.0.0` | M3 Cash Safety, M4 Bills, M6 Shopping, M10 Inbox, M11 Travel, M12 Life Admin ✅ |
| `finos:spine/MerchantGraph/1.0.0` | M1 Rewards, M3 Cash Safety, M4 Bills, M5 Pay, M6 Shopping, M10 Inbox, M11 Travel, M12 Life Admin, M14 Household ✅ |
| `finos:spine/BudgetState/1.0.0` | M1 Rewards, M3 Cash Safety, M4 Bills, M5 Pay, M6 Shopping, M11 Travel, M13 Workspace ✅ |
| `finos:spine/CashFlowForecast/1.0.0` | M1 Rewards, M2 Credit, M3 Cash Safety, M4 Bills, M5 Pay, M6 Shopping, M7 Tasks ✅ |
| `finos:spine/CreditState/1.0.0` | M1 Rewards, M2 Credit, M3 Cash Safety, M5 Pay, M9 Focus, M13 Workspace ✅ |
| `finos:spine/GoalState/1.0.0` | M1 Rewards, M2 Credit, M3 Cash Safety, M4 Bills, M5 Pay, M6 Shopping, M7 Tasks, M9 Focus, M11 Travel, M13 Workspace, M14 Household, M15 Social ✅ |
| `finos:spine/ConnectionConsent/1.0.0` | M10 Inbox, M14 Household ✅ |
| `finos:common/FreshnessStamp/1.0.0` | M7 Tasks, M8 Habits, M9 Focus, M10 Inbox, M12 Life Admin, M14 Household, M15 Social ✅ |
| `finos:common/Reasoning/1.0.0` | M7 Tasks, M8 Habits, M9 Focus, M10 Inbox, M12 Life Admin ✅ |
| `finos:common/MoneyCents/1.0.0` | M7 Tasks, M8 Habits, M9 Focus, M10 Inbox, M12 Life Admin, M14 Household, M15 Social ✅ |

### Module 1 — Rewards (`finos:rewards/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:rewards/CardLineup/1.0.0` | M2 Credit, M5 Pay, M11 Travel, M14 Household ✅ |
| `finos:rewards/PointsValuation/1.0.0` | M5 Pay ✅ |
| `finos:rewards/BestCardRecommendation/1.0.0` | M5 Pay ✅ |
| `finos:rewards/OfferCatalog/1.0.0` | M6 Shopping ✅ |
| `finos:rewards/StatusState/1.0.0` | M11 Travel, M14 Household ✅ |
| `finos:rewards/TransferIntelligence/1.0.0` | *(none — informational, see §4)* |

### Module 2 — Credit (`finos:credit/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:credit/CreditFactors/1.0.0` | *(none — see §4)* |
| `finos:credit/CreditCoachingPlan/1.0.0` | *(none — see §4)* |
| `finos:credit/CreditBuilderPlaybook/1.0.0` | *(none — see §4)* |
| `finos:credit/RefinanceSignals/1.0.0` | *(none — see §4)* |

### Module 3 — Cash Safety (`finos:cashsafety/*` — un-hyphenated, as provided)

| Provided contract | Consumed by (matching namespace ✅) | Consumed by (mismatched `finos:cash-safety/` ❌ — ORPHAN) |
|-------------------|--------------------------------------|------------------------------------------------------------|
| `finos:cashsafety/RunwayForecast/1.0.0` | M9 Focus ✅ | M13 Workspace ❌ |
| `finos:cashsafety/SafeToActSignal/1.0.0` | M2 Credit ✅, M9 Focus ✅ | M4 Bills ❌, M5 Pay ❌, M6 Shopping ❌, M7 Tasks ❌, M11 Travel ❌ |
| `finos:cashsafety/RoundupProposal/1.0.0` | M8 Habits (pinned by bare name `RoundupProposals`) | — |

### Module 4 — Bills (`finos:bills/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:bills/BillCalendar/1.0.0` | M3 Cash Safety, M5 Pay, M7 Tasks, M9 Focus ✅ (M8 Habits & M13 Workspace pin by bare name) |
| `finos:bills/SubscriptionInventory/1.0.0` | *(none — see §4)* |
| `finos:bills/RecurringObligations/1.0.0` | *(none — see §4)* |
| `finos:bills/FreeTrialExpiry/1.0.0` | *(none — see §4)* |

### Module 5 — Pay (`finos:pay/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:pay/CheckoutRecommendation/1.0.0` | M6 Shopping ✅ |
| `finos:pay/PaymentSchedule/1.0.0` | M7 Tasks ✅ (M13 Workspace pins by bare name) |

### Module 6 — Shopping (`finos:shopping/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:shopping/WatchedItems/1.0.0` | *(none — see §4)* |
| `finos:shopping/PurchasePlan/1.0.0` | *(none — see §4)* |
| `finos:shopping/RealizedSavings/1.0.0` | *(none — see §4)* |
| `finos:shopping/CouponRecommendation/1.0.0` | *(none — see §4)* |

### Module 7 — Tasks (`finos:tasks/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:tasks/TaskState/1.0.0` | M13 Workspace (pinned by bare name `TaskState`) |
| `finos:tasks/TaskCompletionEvent/1.0.0` | M8 Habits (bare name `TaskCompletionEvents`), M13 Workspace (bare name) |

### Module 8 — Habits (`finos:habits/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:habits/StreakState/1.0.0` | M15 Social (pinned by bare name, provider not-yet-published note) |
| `finos:habits/HabitProgress/1.0.0` | M14 Household (bare name), M15 Social (bare name) |

### Module 9 — Focus (`finos:focus/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:focus/WellbeingAction/1.0.0` | *(none — see §4)* |

### Module 10 — Inbox (`finos:inbox/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:inbox/ModuleAlertEvent/1.0.0` | M10 Inbox (self-consumed envelope validator — intentional) |
| `finos:inbox/NotificationDigest/1.0.0` | M8 Habits (bare name `NotificationDigest`) |
| `finos:inbox/UnsubscribeAction/1.0.0` | *(none — see §4)* |
| `finos:inbox/NotificationPreference/1.0.0` | *(none — see §4)* |

### Module 11 — Travel (`finos:travel/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:travel/TripBudget/1.0.0` | M13 Workspace (pinned by bare name `TripBudget`) |
| `finos:travel/TravelSpend/1.0.0` | *(none — see §4)* |

### Module 12 — Life Admin (`finos:lifeadmin/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:lifeadmin/DocumentVault/1.0.0` | M13 Workspace (pinned by bare name `DocumentVault`) |
| `finos:lifeadmin/ReceiptLinks/1.0.0` | *(none — see §4)* |
| `finos:lifeadmin/WarrantyReminders/1.0.0` | *(none — see §4)* |

### Module 13 — Workspace (`finos:workspace/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:workspace/Playbooks/1.0.0` | *(none — leaf/UI surface, see §4)* |
| `finos:workspace/NotebookReferences/1.0.0` | *(none — leaf/UI surface)* |

### Module 14 — Household (`finos:household/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:household/HouseholdRoles/1.0.0` | *(consumed cross-cuttingly as MemberScope authZ; no `$id` consumer pin)* |
| `finos:household/MemberScopes/1.0.0` | M15 Social (pinned by bare name `MemberScope`, provider-not-yet-published note) |
| `finos:household/KidGoals/1.0.0` | *(none — leaf, see §4)* |

### Module 15 — Social (`finos:social/*`)

| Provided contract | Consumed by |
|-------------------|-------------|
| `finos:social/CircleProgress/1.0.0` | *(none — leaf/UI surface)* |
| `finos:social/AccountabilitySignals/1.0.0` | *(none — leaf/UI surface)* |

---

## 3. Orphans & Mismatches

### 3a. CRITICAL — Orphan consumed contracts (no provider emits the pinned `$id`)

| Pinned consumed `$id` | Pinned by | Real provider `$id` | Root cause |
|-----------------------|-----------|---------------------|------------|
| `finos:cash-safety/SafeToActSignal/1.0.0` | M4 Bills (`specs/006`), M5 Pay (`specs/007`), M6 Shopping (`specs/008`), M7 Tasks (`specs/009`), M11 Travel (`specs/013`) | `finos:cashsafety/SafeToActSignal/1.0.0` (Module 3) | **Namespace hyphenation split** — provider has no hyphen, these consumers pin a hyphen |
| `finos:cash-safety/RunwayForecast/1.0.0` | M13 Workspace (`specs/015`) | `finos:cashsafety/RunwayForecast/1.0.0` (Module 3) | Same namespace split |

**Impact:** These are not "provider not yet shipped" caveats — Module 3 **is** authored and **does** publish these contracts. The consumer pins simply point at a namespace string (`finos:cash-safety/…`) that **literally does not exist anywhere in the provider set**. Under Principle VII every one of these consumer contract tests (e.g. Bills T040/T081, Pay consumer pact, Shopping consumer pact, Tasks T014/T060, Travel consumer pact, Workspace) would fail to bind to a provider even after Cash Safety ships. The release-gate claims (`SC-*-008/010`: "100% of consumed contracts have passing consumer tests") **cannot** be satisfied by these six modules until the namespace is reconciled.

**Contaminated example strings (propagating the wrong form):** Module 13's *provided* schemas hard-code the hyphenated example in field descriptions — `playbooks.schema.json:91` and `notebook-references.schema.json:34` both cite `'finos:cash-safety/RunwayForecast/1.0.0'` as the canonical upstream `$id`, and Module 6's `contracts/README.md:29` lists the hyphenated form. These will mislead implementers toward the orphan namespace.

**Split tally:**
- **Un-hyphenated `finos:cashsafety/` (matches provider) ✅:** Module 2 Credit, Module 9 Focus.
- **Hyphenated `finos:cash-safety/` (orphan) ❌:** Modules 4, 5, 6, 7, 11, 13.

### 3b. Version mismatches (consumer min-version vs provider version)

**None.** Every provider is at `1.0.0` and every fully-qualified or bare-name consumer pin is at min `1.0.0`. No consumer requires a version higher than the published `1.0.0`, and no provider has advanced past a consumer's pin. (The only blocker is the namespace string in §3a, not the semver.)

### 3c. Resolution recommendation (for architect / tech-lead — NOT decided here)

Pick **one** canonical namespace and make it consistent in provider `$id`, all consumer pins, all `contracts/README.md` tables, and the two Module 13 schema description examples:

- **Option A (recommended default):** Keep the provider as-is (`finos:cashsafety/`, un-hyphenated, the form Module 3 actually ships and that Modules 2 & 9 already match). Fix the 6 hyphenated consumers + the 3 contaminated example strings. Lowest churn: provider `$id`s and 2 of 8 consumers are already correct.
- **Option B:** Standardize on hyphenated `finos:cash-safety/` to match the directory name `005-module-3-cash-safety` and the human-readable "Cash Safety" product name. Higher churn: requires re-issuing all 3 Module 3 provider `$id`s plus fixing Modules 2 & 9.

This is a contract-identity decision with downstream Pact-wiring consequences — flagged for the architect to ratify, not resolved unilaterally in this map.

---

## 4. Provided-but-unconsumed contracts (informational only)

These have no in-repo consumer. This is **expected** for leaf / UI-surface / terminal-output modules and is **not** a defect — it simply means no other module reads them today. Listed for completeness and future-coupling awareness.

| Unconsumed provided contract | Provider | Note |
|------------------------------|----------|------|
| `finos:rewards/TransferIntelligence/1.0.0` | M1 Rewards | Rewards-internal sweet-spot output; UI-facing |
| `finos:credit/CreditFactors/1.0.0` | M2 Credit | Credit read-model; UI-facing |
| `finos:credit/CreditCoachingPlan/1.0.0` | M2 Credit | UI-facing coaching surface |
| `finos:credit/CreditBuilderPlaybook/1.0.0` | M2 Credit | UI-facing playbook |
| `finos:credit/RefinanceSignals/1.0.0` | M2 Credit | UI-facing signal |
| `finos:bills/SubscriptionInventory/1.0.0` | M4 Bills | UI-facing inventory |
| `finos:bills/RecurringObligations/1.0.0` | M4 Bills | UI-facing |
| `finos:bills/FreeTrialExpiry/1.0.0` | M4 Bills | UI-facing |
| `finos:shopping/WatchedItems/1.0.0` | M6 Shopping | UI-facing |
| `finos:shopping/PurchasePlan/1.0.0` | M6 Shopping | UI-facing |
| `finos:shopping/RealizedSavings/1.0.0` | M6 Shopping | UI-facing |
| `finos:shopping/CouponRecommendation/1.0.0` | M6 Shopping | UI-facing |
| `finos:focus/WellbeingAction/1.0.0` | M9 Focus | UI-facing |
| `finos:inbox/UnsubscribeAction/1.0.0` | M10 Inbox | UI/action-facing |
| `finos:inbox/NotificationPreference/1.0.0` | M10 Inbox | UI/settings-facing |
| `finos:travel/TravelSpend/1.0.0` | M11 Travel | UI-facing |
| `finos:lifeadmin/ReceiptLinks/1.0.0` | M12 Life Admin | UI-facing |
| `finos:lifeadmin/WarrantyReminders/1.0.0` | M12 Life Admin | UI-facing |
| `finos:workspace/Playbooks/1.0.0` | M13 Workspace | Leaf/UI surface |
| `finos:workspace/NotebookReferences/1.0.0` | M13 Workspace | Leaf/UI surface |
| `finos:household/KidGoals/1.0.0` | M14 Household | UI-facing |
| `finos:social/CircleProgress/1.0.0` | M15 Social | Leaf/UI surface |
| `finos:social/AccountabilitySignals/1.0.0` | M15 Social | Leaf/UI surface |
| `finos:rewards/StatusState/1.0.0` | M1 Rewards | **Consumed by M11 & M14**, but separately flagged in the Rewards module audit as an *orphan provided contract relative to FR-REW-\** (no backing functional requirement in Rewards itself). Not an unconsumed-orphan; noted for the requirements-coverage gap. |

---

## 5. Shared value-object reuse check (Principle VII — no reinvented `finos:common/*`)

Every module that carries money, freshness, or reasoning either `$ref`s the Module 0 canonical value objects or passes them through unchanged. **No module reinvents `MoneyCents`, `FreshnessStamp`, or `Reasoning`.** Confirmed positives across the per-module audits (integer-cents `MoneyCents`, decimal-string rates, `FreshnessStamp` on externally-sourced objects).

**One cosmetic exception (not a reinvention):** Module 9 Focus lists `finos:common/MoneyCents/1.0.0` in its `contracts/README.md` but does not `$ref` it — it holds pass-through cents in an inline `money_figure_cents: integer` field instead. This is the *opposite* of reinvention (it avoids a float, stays integer-cents) but creates a declared-but-unexercised dependency; either `$ref` `MoneyCents` or drop the README line. Tracked as LOW in the Module 9 audit, repeated here for the platform view.

---

## 6. Summary Counts

- **Provider contracts (ground truth):** 55 across 17 namespaces / 16 modules.
- **CRITICAL orphan `$id`s:** 2 distinct (`finos:cash-safety/SafeToActSignal/1.0.0`, `finos:cash-safety/RunwayForecast/1.0.0`), pinned by **6 modules** (4, 5, 6, 7, 11, 13). Root cause = single namespace hyphenation split against Module 3's `finos:cashsafety/`.
- **Version mismatches:** 0.
- **Provided-but-unconsumed (informational):** 23 (all leaf/UI-surface or terminal-output; expected).
- **Reinvented shared value objects:** 0 (one cosmetic mis-declaration in Module 9).
