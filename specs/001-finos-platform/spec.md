# Feature Specification: PerFiApp — FinOS Personal-Finance Operating System

**Feature Branch**: `feat/finos-constitution`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "read all the files in this project to understand then write the spec file. organize it by module, and optimize after each module written. don't ignore the link between the modules"

---

## Overview

PerFiApp is a **Canada-first, bilingual (EN/FR) personal-finance operating system ("FinOS")**. It replaces the dozens of single-purpose money tools people juggle — rewards trackers, credit coaches, subscription cancellers, deal finders, budgeting apps — with one platform where **every recommendation is grounded in the user's real, current financial state** and expressed in **CAD + time-to-goal** terms.

The product is delivered as **module tabs**, each owning a focused domain. The defining property of FinOS is **integration**: a best-card suggestion checks budget *and* utilization *and* rewards together; a deal is only shown if it fits the budget and goals; a bill reminder knows the safe day to pay based on cash-flow runway. Modules are not silos — they read from and write to a shared financial picture through explicit, versioned contracts.

This specification describes the **whole product, organized by module**. It is the umbrella spec from which individual feature specs (one per submodule) are derived. The 40 submodules across 15 product modules are listed in [context/backlog.md](../../context/backlog.md); the competitive rationale for each is in [docs/PDR_PerFiApp.md](../../docs/PDR_PerFiApp.md).

### How this spec is organized

- **Module 0 — Financial Core & Data Spine** is the shared backbone every other module depends on. It is specified first because it *is* the "link between the modules."
- **Modules 1–15** are the product tabs, each as an independently testable user-journey group with a priority (P1 = ship first).
- Every module section ends with a **Cross-Module Links** block stating what it **consumes** from and **provides** to other modules. These blocks, taken together, are the integration map and must be read as part of each module's requirements.
- Priorities map to the delivery phases in [context/product-brief.md](../../context/product-brief.md): Phase 1 → P1, Phase 2 → P2, Phase 3 → P3, Phase 4 → P4.

### Governing principles (from the Constitution)

All modules inherit the non-negotiable rules in [.specify/memory/constitution.md](../../.specify/memory/constitution.md). The cross-cutting requirements that apply to **every** module are consolidated once in [Cross-Cutting Requirements](#cross-cutting-requirements-apply-to-every-module) rather than repeated per module:

- **Integration-First** (no module works in isolation)
- **Canada-First & Bilingual** (CAD + time-to-goal; full EN/FR)
- **Money Is Exact** (integer minor units / decimal; FinOS recommends, never moves money)
- **Security & Least Privilege** (encryption, no plaintext secrets, threat models)
- **Explainable & Auditable** (every recommendation carries its reasoning; immutable audit trail)
- **Fresh or Flagged** (stale external data is flagged or withheld)
- **Module Boundaries, Contracts & Versioning** (schema-defined, semver'd, contract-tested)

---

## Clarifications

### Session 2026-06-20

- Q: How does "Cash Advance Lite" reconcile with the Constitution's "FinOS never moves money"? → A: Drop Cash Advance Lite entirely — Cash Safety stays purely predictive (runway + micro-actions), no advance feature.
- Q: What is the canonical "healthy utilization threshold" default? → A: Four bands — < 10% optimal (credit-boosting), < 30% healthy, 30–50% warn, > 50% hard-avoid.
- Q: What is the balance staleness window for runway/cash-safety advice? → A: Deferred to planning (intentionally) — concrete staleness windows are set in the plan; the spec keeps the Fresh-or-Flagged rule without fixing numeric windows.
- Q: What is the data-deletion SLA (PIPEDA / Law 25)? → A: Within 7 days of a verified deletion request (cascade across spine + all modules + Plaid token revocation).
- Q: What is the primary user authentication method + MFA stance? → A: Deferred to planning — primary auth factor and MFA policy are decided in the plan; the spec retains the Security & Least Privilege requirements (FR-X-009/010) without fixing the mechanism.

---

## User Scenarios & Testing *(mandatory)*

Each module below is an independently testable slice. A module is "done" when its acceptance scenarios pass *and* its declared cross-module contracts have passing consumer/provider contract tests.

---

### Module 0 — Financial Core & Data Spine (Priority: P1)

The shared state that makes integration possible: connected accounts, normalized transactions, the merchant graph, budget, cash-flow forecast, credit state, and goals — each value carrying a **freshness timestamp** and exposed to other modules only through versioned contracts. No product module can satisfy Integration-First without it, so it ships first.

**Why this priority**: Every P1 product module reads from this spine. Without a single source of truth for balances, budget, cash-flow, credit state, and goals, "decisions grounded in real state" is impossible and recommendations would silently diverge between tabs.

**Independent Test**: Connect one Canadian financial institution, confirm balances and transactions appear normalized into the spine with freshness timestamps, define a budget and one goal, and confirm a downstream module (e.g., Cash Safety) can read the resulting cash-flow forecast and goal progress through the published contract.

**Submodules / capabilities**:
- Secure connection layer — users link Canadian banks and cards through a connection/consent flow; the aggregation provider sits **behind the Module 0 contracts and is swappable**, so the rest of FinOS never depends on a specific vendor. Connection credentials/tokens are managed under the Security principle (encrypted, never logged, rotatable).
- Account aggregation (Canadian banks + cards via the connection layer; consumer-driven-banking / open-banking aligned)
- Transaction normalization, categorization, and de-duplication
- Merchant graph (canonical merchant identities powering rewards, subscriptions, tax tagging, shopping)
- Budget and cash-flow forecast engine
- Credit state intake
- Goals registry with time-to-goal computation
- Freshness/staleness tracking and graceful-degradation signals

**Acceptance Scenarios**:

1. **Given** a user connects a supported Canadian institution, **When** aggregation completes, **Then** accounts, balances, and transactions appear in the spine, each tagged with a source and a freshness timestamp.
2. **Given** two transactions from different feeds describing the same charge, **When** normalization runs, **Then** they are de-duplicated into one canonical transaction linked to one merchant-graph node.
3. **Given** a user sets a savings goal of a target amount and date, **When** the goal is saved, **Then** the spine exposes time-to-goal and required-monthly-contribution to other modules.
4. **Given** a balance feed is older than its freshness threshold, **When** any module requests it, **Then** the value is returned marked **stale** so consumers can flag or withhold advice.
5. **Given** an external feed times out, **When** aggregation runs, **Then** the prior known value is retained, marked stale, and the failure is logged without corrupting the spine.

**Cross-Module Links**:
- **Provides to all modules**: `AccountState`, `TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `CreditState`, `GoalState`, each with freshness metadata.
- **Consumes**: external aggregation, credit-bureau, and FX feeds only. The spine never reads product-module state, preventing circular dependencies.

---

### Module 1 — Rewards & Loyalty (Priority: P1)

Aggregate every loyalty balance and card perk in one place, translate it to CAD + time-to-goal, and recommend the best card for a moment **after checking budget and utilization** — not points in a vacuum.

**Why this priority**: The flagship differentiator versus CardPointers/Mint and the most-requested daily decision ("which card do I use here?"). Delivers value as soon as the spine exists.

**Independent Test**: With accounts connected, view all points balances valued in CAD, open a merchant, and receive a best-card recommendation whose reasoning cites earn rate, budget headroom, and utilization impact.

**Submodules**: Points Wallet · Card Knowledgebase & Perks Vault · Best Card Recommender · Offer Auto-Activation & Sync · Welcome Bonus & Min-Spend Tracker · Statement Credit & Perks Coach · Merchant Insights & Reward Mapping · Deal Radar · Status Tracker · Multi-Profile Rewards Manager.

**Acceptance Scenarios**:

1. **Given** connected loyalty programs, **When** the user opens the Points Wallet, **Then** each balance shows an estimated CAD value and contribution to time-to-goal.
2. **Given** a merchant and the user's card lineup, **When** a best-card recommendation is requested, **Then** the result names one card and shows why (earn rate **and** budget headroom **and** utilization effect).
3. **Given** spending on the higher-points card would push utilization above 50% (hard-avoid), **When** the recommendation runs, **Then** that card is **not** recommended and a safer card is suggested with an explanation; if it would land in the 30–50% band, the card may be recommended but **with a utilization warning**.
4. **Given** a card with an unused statement credit nearing reset, **When** the user opens the perks coach, **Then** a concrete usage plan and a downgrade/cancel flag (if chronically unused) are shown.
5. **Given** a welcome-bonus minimum spend, **When** meeting it would exceed healthy budget, **Then** the tracker warns and offers an alternate path.

**Cross-Module Links**:
- **Consumes**: `BudgetState`, `CashFlowForecast`, `CreditState` (utilization), `MerchantGraph`, `GoalState` from the Spine.
- **Provides**: `CardLineup`, `PointsValuation`, `BestCardRecommendation`, `OfferCatalog` to Pay & Payment Optimization, Shopping & Deals, Travel, and Household.

---

### Module 2 — Credit & Coaching (Priority: P1)

Canadian credit monitoring and coaching that lives in the same place as rewards and spending, so credit advice is never divorced from how the user actually pays and earns.

**Why this priority**: Credit state (utilization, due dates) is an input to Rewards, Cash Safety, and Pay. It must exist early for those P1 recommendations to be safe.

**Independent Test**: View a Canadian credit score and key factors, and receive a due-date/utilization nudge that references real card balances from the spine.

**Submodules**: Credit Monitor · Due-Date & Utilization Coaching · Credit Builder Actions · Refinance & Card Lineup Optimization.

**Acceptance Scenarios**:

1. **Given** credit data is available, **When** the user opens Credit Monitor, **Then** the score and top factors are shown with a freshness timestamp.
2. **Given** a card statement date approaches with high utilization, **When** coaching runs, **Then** the user is advised to pay early by a specific amount to drop below the threshold, and spend is suggested to be re-routed.
3. **Given** a keep/downgrade/cancel decision on a card, **When** the optimizer runs, **Then** it shows the long-term impact on both rewards value and credit score.
4. **Given** credit data is stale beyond its threshold, **When** coaching is requested, **Then** the recommendation is withheld and the user is asked to refresh.

**Cross-Module Links**:
- **Consumes**: `AccountState`, `CardLineup` (Rewards), `CashFlowForecast` from the Spine/Rewards.
- **Provides**: `CreditState` enrichment (utilization, due-date risk), `RefinanceSignals` to Rewards, Cash Safety, Pay, and Bills.

---

### Module 3 — Cash Safety & Autopilot (Priority: P1)

A forward-looking runway that predicts low balances **before** they cause missed payments or fees and proposes concrete micro-actions to close a predicted shortfall — plus rules-based sweeps/roundups routed to the user's actual plan. Cash Safety is purely predictive and advisory: it does not originate or broker cash advances or any other form of credit (see Out of Scope).

**Why this priority**: Cash safety is the floor under every other recommendation; no module should advise an action that risks an overdraft. The runway is a shared input.

**Independent Test**: With accounts and upcoming bills known, view a runway chart that flags a predicted shortfall and proposes a concrete micro-action to resolve it.

**Submodules**: Low-Balance & Fee Guard · Rules-Based Sweeps & Roundups.

**Acceptance Scenarios**:

1. **Given** scheduled bills and projected inflows, **When** the runway is computed, **Then** the chart shows the lowest projected balance and the date, and flags any predicted shortfall.
2. **Given** a predicted shortfall, **When** the guard responds, **Then** it proposes micro-actions (move a bill, pause a roundup, re-sequence payments) to close the gap, and never offers or brokers a cash advance.
3. **Given** a roundup rule and a qualifying purchase, **When** the rule runs, **Then** the rounded amount is **proposed** for routing to debt/TFSA/savings per plan and recorded idempotently once the user confirms.
4. **Given** the balance feeding the runway is stale, **When** the runway is requested, **Then** the runway is withheld or flagged rather than computed on old data.

**Cross-Module Links**:
- **Consumes**: `AccountState`, `CashFlowForecast`, `GoalState`, plus `BillCalendar` (Bills) and `PaymentSchedule` (Pay) when present.
- **Provides**: `RunwayForecast`, `SafeToActSignal` consumed by Pay, Bills, Shopping, Tasks, and Rewards (every module that proposes spending checks `SafeToActSignal`).

---

### Module 4 — Bills & Subscriptions (Priority: P2)

Surface every recurring charge, categorize it by necessity and budget impact, guard free trials as first-class objects, and put all due dates on a calendar annotated with safe-to-pay dates.

**Why this priority**: Builds directly on the P1 spine and runway; high savings impact but not required for the core OS to function.

**Independent Test**: Detect recurring charges from the transaction stream, see them on a bill calendar with predicted safe-to-pay dates, and receive a free-trial expiry countdown with one-tap keep/cancel.

**Submodules**: Subscription Radar · One-Tap Cancellation & Negotiation · Free-Trial Guard · Bill Calendar & Alerts.

**Acceptance Scenarios**:

1. **Given** recurring charges in the transaction stream, **When** the radar runs, **Then** subscriptions are listed and categorized essential / negotiable / nice-to-have with their budget impact.
2. **Given** a free trial detected, **When** it nears auto-conversion, **Then** a countdown with one-tap keep/cancel is surfaced before the charge date.
3. **Given** a bill due date, **When** the calendar renders, **Then** it shows the due date **and** a predicted safe-to-pay date derived from the runway.
4. **Given** a cancellation/negotiation, **When** the user initiates it, **Then** projected savings and the downstream effect on goals are shown, and the action is recorded for audit.

**Cross-Module Links**:
- **Consumes**: `TransactionStream`, `MerchantGraph`, `RunwayForecast`, `BudgetState`, `GoalState`.
- **Provides**: `BillCalendar`, `SubscriptionInventory`, `RecurringObligations` to Cash Safety, Pay, Tasks, Shopping, and Inbox.

---

### Module 5 — Pay & Payment Optimization (Priority: P2)

At the moment of payment, recommend the best card/account that is also **financially safe**, and sequence payments across the month to avoid overdrafts while maximizing goal progress — keeping the bill calendar in sync.

**Why this priority**: Ties Rewards, Credit, Cash Safety, and Bills together at the decision point; depends on all four.

**Independent Test**: At a simulated checkout, receive a card/account recommendation that respects budget, runway, and utilization; then generate a month-long payment sequence and see the bill calendar update.

**Submodules**: Best Card / Account to Use · Payment Sequencer.

**Acceptance Scenarios**:

1. **Given** a checkout context, **When** a recommendation is requested, **Then** it returns one card/account justified by rewards **and** runway safety **and** utilization.
2. **Given** the highest-reward card would breach the runway, **When** the recommendation runs, **Then** a safer account is recommended with the trade-off shown.
3. **Given** the month's obligations and inflows, **When** the sequencer runs, **Then** it proposes a payment order avoiding overdrafts and maximizing goal progress.
4. **Given** an accepted sequence, **When** the user confirms, **Then** the bill calendar updates and each scheduled item is recorded idempotently (no money is moved by FinOS).

**Cross-Module Links**:
- **Consumes**: `BestCardRecommendation`/`CardLineup` (Rewards), `CreditState` (Credit), `RunwayForecast`/`SafeToActSignal` (Cash Safety), `BillCalendar` (Bills), `GoalState`.
- **Provides**: `PaymentSchedule`, `CheckoutRecommendation` to Bills, Cash Safety, Shopping, and Tasks.

---

### Module 6 — Shopping & Deals (Priority: P2)

Auto-apply coupons, watch prices, and answer the question competitors ignore — *should you buy at all, and when?* — by blending price intel with budget state and upcoming obligations.

**Why this priority**: High consumer value, but only trustworthy once budget, runway, and goals (P1) exist to ground the buy/wait score.

**Independent Test**: Watch an item, and receive a buy-now-vs-wait score with a recommended best date that cites price trend, budget headroom, and goal impact.

**Submodules**: Auto-Coupons & Codes · Price Watch & Droplist · Buy Now vs Wait Score.

**Acceptance Scenarios**:

1. **Given** a checkout, **When** coupons are available, **Then** the best valid code is applied and the realized saving is recorded.
2. **Given** a watched item, **When** its price drops, **Then** the user is alerted with the saving framed against the linked budget and goal.
3. **Given** a purchase consideration, **When** the buy/wait score is computed, **Then** it returns a score, a recommended best date, and the impact on goals, accounting for `SafeToActSignal`.
4. **Given** the budget has no headroom, **When** the score runs, **Then** "wait" is favored and the reason references the budget/goal state.

**Cross-Module Links**:
- **Consumes**: `BudgetState`, `GoalState`, `RunwayForecast`/`SafeToActSignal`, `MerchantGraph`, `OfferCatalog` (Rewards), `CheckoutRecommendation` (Pay).
- **Provides**: `WatchedItems`, `PurchasePlan`, `RealizedSavings` to Tasks, Pay, and Inbox.

---

### Module 7 — Tasks & To-Dos (Priority: P3)

Turn financial concerns into tasks linked to the data behind them — a bill, merchant, budget, or goal — and schedule them around paydays and due dates so completion actually updates financial status.

**Why this priority**: A connective convenience layer; valuable but not foundational. Depends on most domain modules to link against.

**Independent Test**: Create a task linked to a specific bill, and confirm completing it updates that bill's status and that the task was scheduled around the next payday.

**Submodules**: Money-Aware Tasks · Smart Scheduling.

**Acceptance Scenarios**:

1. **Given** a bill or goal, **When** a task is created from it, **Then** the task carries a live link to that entity.
2. **Given** a money-aware task is completed, **When** it is checked off, **Then** the linked entity's status updates (e.g., bill marked handled).
3. **Given** several tasks and known paydays/due dates, **When** scheduling runs, **Then** tasks are distributed to suitable days factoring paydays and bill dates.

**Cross-Module Links**:
- **Consumes**: `BillCalendar`, `GoalState`, `MerchantGraph`, `CashFlowForecast`, `PaymentSchedule`.
- **Provides**: `TaskState`, `TaskCompletionEvents` to Habits, Inbox, Workspace, and the originating modules.

---

### Module 8 — Habits & Routines (Priority: P3)

An opt-in game layer where streaks and XP are earned for **real** financial progress, plus a daily cross-module ritual that bundles micro-actions (review bills, approve roundups, clear notifications).

**Why this priority**: Engagement layer that sits on top of completed actions from other modules.

**Independent Test**: Complete a real financial action (e.g., approve a roundup) and confirm the linked habit's streak/XP advances; run the daily ritual and confirm it pulls live items from Bills, Cash Safety, and Inbox.

**Submodules**: Gamified Habits & Dailies · Cross-Module Rituals.

**Acceptance Scenarios**:

1. **Given** the game layer is enabled, **When** a real financial action is completed, **Then** the tied habit's streak and XP advance (and do not advance for non-real actions).
2. **Given** the daily ritual, **When** the user starts it, **Then** it presents live bills to review, roundups to approve, and notifications to clear.
3. **Given** the game layer is disabled, **When** actions complete, **Then** functionality is unaffected and no game UI appears.

**Cross-Module Links**:
- **Consumes**: `TaskCompletionEvents` (Tasks), `RoundupProposals` (Cash Safety), `BillCalendar` (Bills), `NotificationDigest` (Inbox), `GoalState`.
- **Provides**: `HabitProgress`, `StreakState` to Social and Inbox.

---

### Module 9 — Focus & Mental Health (Priority: P3)

Short, structured sessions for money stress that pair emotional support with concrete actions, and evening sequences that convert worries into tasks/goals before a guided wind-down.

**Why this priority**: Differentiated well-being layer; depends on Tasks/Goals to convert worries into action.

**Independent Test**: Start a money-stress pack about an overdue bill and confirm it both offers support and creates an actionable task/goal linked to that bill.

**Submodules**: Money Stress Packs · Sleep & Wind-Down.

**Acceptance Scenarios**:

1. **Given** a stressor (e.g., a debt or bill), **When** a stress pack runs, **Then** it provides a short session **and** generates a concrete linked action.
2. **Given** the evening wind-down, **When** it runs, **Then** outstanding money worries are converted into tasks/goals before the guided wind-down begins.

**Cross-Module Links**:
- **Consumes**: `BillCalendar`, `GoalState`, `RunwayForecast`, `CreditState` (to identify stressors).
- **Provides**: `WellbeingActions` (tasks/goals) to Tasks and Workspace.

---

### Module 10 — Inbox & Notifications (Priority: P2)

Detect promotional email (prioritizing senders that trigger impulse spending) for mass-unsubscribe/roll-up, and consolidate all money alerts into a single actionable FR/EN digest — at most one or two per day.

**Why this priority**: The notification surface every module pushes into; standardizing it early prevents alert sprawl as P2/P3 modules add events.

**Independent Test**: Connect an email source, confirm impulse-spend senders are prioritized for unsubscribe, and confirm all module alerts arrive as one bilingual, actionable digest rather than scattered notifications.

**Submodules**: Email Subscription Clean-Up · Unified Money Digest.

**Acceptance Scenarios**:

1. **Given** a connected inbox, **When** clean-up runs, **Then** promotional senders are listed with unsubscribe/roll-up/keep options, ordered with impulse-spend triggers first.
2. **Given** alerts from multiple modules, **When** the digest is assembled, **Then** the user receives one (or at most two) daily digests where every section is actionable, in their chosen language.
3. **Given** a critical, time-sensitive alert (e.g., predicted overdraft today), **When** it arrives, **Then** it is allowed to break through the digest cadence.

**Cross-Module Links**:
- **Consumes**: alert/event streams from every module (`RunwayForecast`, `BillCalendar`, `FreeTrialExpiry`, `DealRadar`, `CreditState`, `TaskState`, …) plus an external email source.
- **Provides**: `NotificationDigest`, `UnsubscribeActions` to Habits (ritual), Shopping (impulse signals), and Tasks.

---

### Module 11 — Travel & Trips (Priority: P3)

Auto-build itineraries from confirmation emails that are aware of travel budget, FX, and insurance, and show lifetime travel spend, cost-per-trip/day, and optional carbon.

**Why this priority**: A Life-OS expansion; valuable for travelers, dependent on budget/FX and the merchant/rewards graph.

**Independent Test**: Forward a booking confirmation, confirm an itinerary is built and checked against the travel budget and FX, and view trip cost stats.

**Submodules**: Automatic Itinerary Builder · Travel Stats & Carbon.

**Acceptance Scenarios**:

1. **Given** a forwarded confirmation, **When** parsing runs, **Then** an itinerary (flights/hotels/cars) is built and linked to the travel budget with FX-converted CAD costs.
2. **Given** a trip, **When** stats are viewed, **Then** lifetime travel spend and cost-per-trip/day are shown, with optional carbon estimates.
3. **Given** a trip lacks insurance coverage, **When** the itinerary is built, **Then** the gap is flagged with the relevant card perk from the Rewards perks vault.

**Cross-Module Links**:
- **Consumes**: `BudgetState`, `GoalState`, FX from Spine, `CardLineup`/perks (Rewards), `StatusState` (Rewards Status Tracker), email source.
- **Provides**: `TripBudget`, `TravelSpend` to Rewards (status), Bills (trip bills), and Workspace.

---

### Module 12 — Life Admin & Docs (Priority: P3)

A vault for receipts and warranties auto-linked to transactions and big-ticket items, and a structured wallet for important financial documents with expiry reminders and export/sharing controls.

**Why this priority**: Foundational for returns/claims and Workspace playbooks; not needed for core money decisions.

**Independent Test**: Upload a receipt, confirm it auto-links to the matching transaction and (for a big-ticket item) to a warranty with an expiry reminder.

**Submodules**: Receipt & Warranty Vault · Important Document Wallet.

**Acceptance Scenarios**:

1. **Given** an uploaded receipt, **When** matching runs, **Then** it links to the corresponding transaction in the spine.
2. **Given** a big-ticket purchase, **When** a warranty is stored, **Then** an expiry reminder is created and surfaced via Tasks/Inbox.
3. **Given** a stored document, **When** the user exports or shares it, **Then** access respects the configured sharing controls and the action is audited.

**Cross-Module Links**:
- **Consumes**: `TransactionStream`, `MerchantGraph`.
- **Provides**: `DocumentVault`, `WarrantyReminders`, `ReceiptLinks` to Tasks, Inbox, Workspace, and Travel.

---

### Module 13 — Workspace & Playbooks (Priority: P3)

Pre-built, Canada-specific playbooks for life events (move, job change, new baby, immigration) wired to real data, and a Notion-style notebook that auto-references live FinOS numbers instead of copy-paste.

**Why this priority**: Aggregates many modules into guided workflows; needs those modules to exist first.

**Independent Test**: Start a "moving" playbook and confirm its checklist references live FinOS data (e.g., current runway and relevant bills) rather than static text.

**Submodules**: Life Event Playbooks · Personal Finance Notebook.

**Acceptance Scenarios**:

1. **Given** a life event, **When** a playbook starts, **Then** a Canada-specific checklist is generated and individual steps pull live FinOS data.
2. **Given** a notebook page, **When** it references a FinOS figure, **Then** the figure stays current automatically (no manual copy-paste) and carries a freshness timestamp.

**Cross-Module Links**:
- **Consumes**: broad read access to `BudgetState`, `GoalState`, `RunwayForecast`, `BillCalendar`, `DocumentVault`, `TripBudget`, `CreditState`.
- **Provides**: `Playbooks`, `NotebookReferences` (generating tasks and goals) to Tasks, Goals (Spine), and Focus.

---

### Module 14 — Household & Family (Priority: P3)

A household view with fine-grained, per-module roles and permissions and bilingual labels, plus kid money/allowances with chore-based allowances and kid-friendly goals.

**Why this priority**: Multiplies value across modules but introduces the most sensitive authorization surface; it depends on stable single-user modules first and requires a threat model.

**Independent Test**: Add a second household member with read-only access to one module and confirm they can see exactly that module and nothing else; set up a chore-based allowance and confirm completion advances a kid's goal.

**Submodules**: Family Dashboard & Roles · Kid Money & Allowances.

**Acceptance Scenarios**:

1. **Given** a household with multiple members, **When** roles are assigned, **Then** each member's visibility is enforced per module (least privilege) and authorization is checked on every cross-user request.
2. **Given** a member without permission, **When** they request another member's financial data, **Then** access is denied and the attempt is audited.
3. **Given** a chore-based allowance, **When** a child completes a chore, **Then** the allowance/goal updates on the kid-friendly tracker.

**Cross-Module Links**:
- **Consumes**: all module states, **gated by** the household authorization layer; `MerchantGraph`, `GoalState`, `CardLineup` (Multi-Profile Rewards).
- **Provides**: `HouseholdRoles`, `MemberScopes` enforced by every module; `KidGoals` to Goals (Spine) and Habits.

---

### Module 15 — Social & Accountability (Priority: P4)

Small groups that share progress on specific financial challenges, tied to real budget and goal data, with bilingual, privacy-controlled sharing.

**Why this priority**: The final intelligence/social layer; depends on goals, habits, and the household authorization model, and carries cross-user privacy risk.

**Independent Test**: Create an accountability circle around a savings goal, confirm only the explicitly shared progress metric is visible to members, and confirm real goal progress updates the shared view.

**Submodules**: Accountability Circles.

**Acceptance Scenarios**:

1. **Given** a circle around a goal, **When** members view it, **Then** only the explicitly shared metric is visible and nothing else from each member's finances.
2. **Given** real progress on the underlying goal, **When** it changes, **Then** the shared circle view updates from real data (not manual entry).
3. **Given** a member revokes sharing, **When** they do so, **Then** their data disappears from the circle and the change is audited.

**Cross-Module Links**:
- **Consumes**: `GoalState`, `HabitProgress` (Habits), `MemberScopes`/privacy controls (Household).
- **Provides**: `CircleProgress`, `AccountabilitySignals` to Habits and Inbox.

---

### Edge Cases (cross-module)

- **Stale or missing inputs**: When any consumed contract is stale or absent, the consuming module flags or withholds the recommendation and asks the user — it never guesses (Fresh or Flagged; Explainable & Auditable).
- **Conflicting recommendations**: When two modules would advise opposing actions (e.g., Rewards wants the high-points card, Cash Safety flags overdraft risk), Cash Safety's `SafeToActSignal` takes precedence and the conflict and resolution are shown to the user.
- **Contract version skew**: When a provider ships a breaking contract change without a consumer migration, contract tests fail in CI and the dependent recommendation is disabled rather than served on a mismatched schema.
- **Partial connectivity**: When only some accounts are connected, modules compute on the known subset and clearly mark the picture as incomplete.
- **Multi-currency / FX**: Foreign-currency values are converted to CAD using a timestamped FX rate; if the rate is stale, the converted figure is flagged.
- **Money never moved by FinOS**: Any flow that looks like execution (sweeps, roundups, payments) only ever *proposes*; the user executes each action explicitly, and proposals are idempotent and safe to retry.
- **Bilingual integrity**: A recommendation, alert, or label missing an EN or FR translation is treated as a defect, not silently shown in one language.
- **Cross-user boundaries**: Any request crossing a household/circle boundary without authorization is denied and audited.

---

## Requirements *(mandatory)*

### Cross-Cutting Requirements (apply to every module)

- **FR-X-001 (Integration)**: Every recommendation MUST be computed against current spine state (budget, cash-flow, credit, goals); a recommendation that ignores a relevant available input is a defect.
- **FR-X-002 (Money exactness)**: All monetary values MUST be stored and computed in integer minor units or arbitrary-precision decimal — never binary floating point — with explicit, unit-tested rounding.
- **FR-X-003 (Recommend, never move)**: FinOS MUST NOT move money; every money action is surfaced for explicit, per-action user execution, and any state FinOS writes on the user's behalf MUST be idempotent and safe to retry.
- **FR-X-004 (CAD + time-to-goal)**: Every monetary value shown to the user MUST be expressed in CAD with time-to-goal context where a goal applies.
- **FR-X-005 (Bilingual)**: All user-facing text, notifications, and content MUST be available in both EN and FR; missing translations MUST fail validation.
- **FR-X-006 (Explainability)**: Every recommendation MUST carry the inputs and reasoning that produced it, displayable to the user and reproducible in debugging.
- **FR-X-007 (Audit trail)**: Every user-confirmed action and every change to financial state MUST be recorded in an immutable, append-only audit trail kept separate from debug logs.
- **FR-X-008 (Freshness)**: Every value sourced from an external feed MUST carry a freshness timestamp; recommendations on stale data MUST be flagged or withheld.
- **FR-X-009 (Security)**: Financial data and PII MUST be encrypted in transit and at rest; aggregation tokens/secrets MUST never be stored in plaintext, committed, or logged, and MUST be rotatable.
- **FR-X-010 (Least privilege & threat model)**: Access defaults to least privilege; any feature touching credentials, aggregation tokens, or another person's financial data MUST ship with a threat model and enforce authZ on every cross-user boundary.
- **FR-X-011 (Contracts & versioning)**: All cross-module data exchange MUST flow through schema-defined contracts (no shared mutable state); contracts MUST be semantically versioned and covered by consumer and provider contract tests in CI.
- **FR-X-012 (Graceful degradation)**: External-source failures (timeouts, rate limits) MUST degrade gracefully with retries and MUST NOT produce incorrect money advice.
- **FR-X-013 (Privacy & compliance)**: Canadian financial data MUST be handled under PIPEDA and Quebec Law 25, with data export and deletion available and retention limited to each feature's genuine need. A verified deletion request MUST be honored within 7 days, cascading across the spine, all module data, and revocation of the user's Plaid connection/tokens. FinOS presents informational decision support only and MUST NOT be presented as regulated financial advice.
- **FR-X-014 (Observability)**: Data ingestion, sync, and recommendation paths MUST emit structured logs that redact PII and monetary values.
- **FR-X-015 (Performance)**: Cold-start and module switches MUST complete under 300 ms on mid-range Canadian devices.
- **FR-X-016 (Accessibility)**: The UI MUST meet WCAG 2.1 AA with bilingual screen-reader labels.

### Functional Requirements by Module

**Module 0 — Financial Core & Data Spine**
- **FR-CORE-001**: System MUST aggregate accounts, balances, and transactions from supported Canadian institutions and tag each with source and freshness.
- **FR-CORE-002**: System MUST normalize, categorize, and de-duplicate transactions into canonical records linked to merchant-graph nodes.
- **FR-CORE-003**: System MUST maintain a budget and a cash-flow forecast derived from inflows/outflows.
- **FR-CORE-004**: System MUST let users define goals and MUST compute time-to-goal and required contributions.
- **FR-CORE-005**: System MUST expose `AccountState`, `TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `CreditState`, and `GoalState` as versioned, freshness-stamped contracts.
- **FR-CORE-006**: System MUST provide a secure connection/consent flow for linking Canadian banks and cards, isolate the aggregation provider behind the Module 0 contracts (so it is swappable without changing consumers), and manage connection credentials/tokens per FR-X-009 (encrypted, never logged, rotatable).

**Module 1 — Rewards & Loyalty**
- **FR-REW-001**: System MUST aggregate loyalty/points balances across Canadian and global programs and value each in CAD.
- **FR-REW-002**: System MUST maintain a Canada-first, bilingual card knowledgebase (earn rates, categories, credits, perks, insurance).
- **FR-REW-003**: System MUST recommend a best card for a merchant/moment using earn rate, budget headroom, and utilization; it MUST warn when a card's use would push per-card or aggregate utilization into the 30–50% band and MUST NOT recommend a card whose use would push utilization above 50% (hard-avoid). See canonical utilization bands under CreditState.
- **FR-REW-004**: System MUST track welcome-bonus minimum spends and warn when meeting one would exceed healthy budget.
- **FR-REW-005**: System MUST track statement credits/perks with reset dates and flag chronically unused perks as downgrade/cancel candidates.
- **FR-REW-006**: System MUST surface card-linked offers normalized from Canadian banks and tie them to budget categories.

**Module 2 — Credit & Coaching**
- **FR-CRD-001**: System MUST display Canadian credit score and key factors with freshness.
- **FR-CRD-002**: System MUST advise specific early-payment amounts and spend re-routing to keep utilization in the healthy band (< 30%) before statement dates, and MAY target the optimal band (< 10%) when the user's goal is credit-boosting. See canonical utilization bands under CreditState.
- **FR-CRD-003**: System MUST provide a dynamic, Canada-specific credit-builder playbook.
- **FR-CRD-004**: System MUST show the long-term rewards and credit-score impact of keep/downgrade/cancel/refinance decisions.

**Module 3 — Cash Safety & Autopilot**
- **FR-CASH-001**: System MUST compute a forward-looking runway and flag predicted shortfalls before fees/missed payments.
- **FR-CASH-002**: System MUST propose concrete micro-actions to close a predicted shortfall and MUST NOT offer, originate, or broker cash advances or any other form of credit.
- **FR-CASH-003**: System MUST support rules-based sweeps/roundups that propose routing to debt/TFSA/savings per the user's plan, recorded idempotently on confirmation.
- **FR-CASH-004**: System MUST expose a `SafeToActSignal` consumed by any module proposing spending.

**Module 4 — Bills & Subscriptions**
- **FR-BILL-001**: System MUST detect recurring charges and categorize them essential/negotiable/nice-to-have with budget impact.
- **FR-BILL-002**: System MUST treat free trials as first-class objects with countdowns and one-tap keep/cancel before conversion.
- **FR-BILL-003**: System MUST present a bill calendar annotated with predicted safe-to-pay dates from the runway.
- **FR-BILL-004**: System MUST show projected savings and goal impact for cancellations/negotiations and audit the action.

**Module 5 — Pay & Payment Optimization**
- **FR-PAY-001**: System MUST recommend a checkout card/account justified by rewards, runway safety, and utilization together.
- **FR-PAY-002**: System MUST generate a monthly payment sequence that avoids overdrafts and maximizes goal progress.
- **FR-PAY-003**: System MUST sync accepted sequences to the bill calendar and record scheduled items idempotently without moving money.

**Module 6 — Shopping & Deals**
- **FR-SHOP-001**: System MUST auto-apply the best valid coupon at checkout and record realized savings.
- **FR-SHOP-002**: System MUST track watched-item prices and alert on drops framed against the linked budget/goal.
- **FR-SHOP-003**: System MUST compute a buy-now-vs-wait score with a recommended best date, honoring `SafeToActSignal` and goal impact.

**Module 7 — Tasks & To-Dos**
- **FR-TASK-001**: System MUST allow tasks linked to a bill, merchant, budget, or goal, with live links.
- **FR-TASK-002**: System MUST update the linked entity's status when a money-aware task is completed.
- **FR-TASK-003**: System MUST schedule tasks factoring paydays and bill dates.

**Module 8 — Habits & Routines**
- **FR-HAB-001**: System MUST advance streaks/XP only for real financial actions, and MUST function fully with the game layer disabled.
- **FR-HAB-002**: System MUST provide a daily cross-module ritual pulling live items from Bills, Cash Safety, and Inbox.

**Module 9 — Focus & Mental Health**
- **FR-FOC-001**: System MUST pair each money-stress session with a concrete action linked to the underlying entity.
- **FR-FOC-002**: System MUST convert outstanding money worries into tasks/goals before a guided wind-down.

**Module 10 — Inbox & Notifications**
- **FR-INB-001**: System MUST detect promotional senders and offer unsubscribe/roll-up/keep, prioritizing impulse-spend triggers.
- **FR-INB-002**: System MUST consolidate module alerts into at most one or two daily bilingual, actionable digests, while allowing critical alerts to break through.

**Module 11 — Travel & Trips**
- **FR-TRV-001**: System MUST build itineraries from forwarded confirmations, linked to the travel budget with FX-converted CAD costs.
- **FR-TRV-002**: System MUST show lifetime travel spend and cost-per-trip/day, with optional carbon, and flag insurance gaps against card perks.

**Module 12 — Life Admin & Docs**
- **FR-DOC-001**: System MUST auto-link uploaded receipts to matching transactions and warranties to big-ticket items with expiry reminders.
- **FR-DOC-002**: System MUST store important documents with structured categories, export/sharing controls, and audited access.

**Module 13 — Workspace & Playbooks**
- **FR-WS-001**: System MUST generate Canada-specific life-event playbooks whose steps pull live FinOS data.
- **FR-WS-002**: System MUST provide a notebook whose references to FinOS figures stay current automatically with freshness.

**Module 14 — Household & Family**
- **FR-HH-001**: System MUST enforce fine-grained, per-module roles/permissions with authZ checked on every cross-user request, denying and auditing unauthorized access.
- **FR-HH-002**: System MUST support chore-based allowances and kid-friendly goal trackers.

**Module 15 — Social & Accountability**
- **FR-SOC-001**: System MUST share only the explicitly chosen progress metric within a circle, exposing nothing else from a member's finances.
- **FR-SOC-002**: System MUST update shared circle views from real goal/habit data and MUST remove a member's data from the circle on revocation, audited.

### Key Entities

- **Account**: A connected financial account (chequing, savings, card) with balance, institution, and freshness.
- **Transaction**: A normalized, de-duplicated money movement linked to a Merchant and category.
- **Merchant (Merchant Graph node)**: Canonical merchant identity tying together rewards, subscriptions, tax tagging, and shopping.
- **Card / CardLineup**: A user's cards with earn rates, perks, credits, fees, and utilization.
- **PointsBalance / PointsValuation**: A loyalty balance with CAD value and time-to-goal contribution.
- **Offer**: A normalized card-linked offer tied to budget categories.
- **Budget / BudgetState**: Category budgets and current headroom.
- **CashFlowForecast / RunwayForecast**: Projected balances over time, lowest point, and shortfall flags.
- **CreditState**: Score, factors, utilization, and due-date risk with freshness. Canonical utilization bands (per-card and aggregate): **< 10% optimal** (credit-boosting), **< 30% healthy**, **30–50% warn**, **> 50% hard-avoid**. Bands are user-adjustable; these are the defaults all modules reason against.
- **Goal / GoalState**: A target amount and date with computed time-to-goal and required contribution.
- **Bill / BillCalendar**: Recurring obligations with due dates and predicted safe-to-pay dates.
- **Subscription / FreeTrial**: A recurring charge categorized by necessity; trials with countdowns.
- **PaymentSchedule**: A proposed ordering of payments (never executed by FinOS).
- **Recommendation**: Any advice carrying its inputs, reasoning, and freshness.
- **AuditEvent**: An immutable, append-only record of a confirmed action or state change.
- **FreshnessStamp**: Source + timestamp + staleness threshold attached to external-sourced values.
- **Household / Member / MemberScope**: A family unit, its people, and their per-module access scopes.
- **Circle / CircleProgress**: An accountability group and the single shared metric it exposes.
- **Document / Receipt / Warranty**: Vault items linked to transactions and big-ticket purchases.
- **Trip / Itinerary / TripBudget**: A travel plan with FX-aware CAD costs and insurance status.
- **Task**: A money-aware to-do linked to a Bill/Merchant/Budget/Goal.
- **Habit / StreakState**: An opt-in habit advanced only by real financial progress.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Integration is real)**: 100% of money-spending recommendations across all modules reflect current budget, cash-flow, and (where relevant) credit state — verifiable by inspecting each recommendation's attached reasoning.
- **SC-002 (Best-card value)**: For a representative basket of Canadian purchases, the recommended card equals or beats single-card "always use one card" net value in at least 90% of cases while never recommending a card that would push utilization above the 50% hard-avoid band.
- **SC-003 (Avoided overdrafts)**: Among users who follow runway micro-actions, predicted-and-confirmed shortfalls are resolved without an overdraft fee in at least 85% of flagged cases.
- **SC-004 (Subscription savings)**: Users who act on Subscription Radar reduce tracked recurring spend by a median of at least 10% within 60 days.
- **SC-005 (Trust via explainability)**: 100% of recommendations can display "why" with their inputs; in usability testing at least 80% of users say they understand why a recommendation was made.
- **SC-006 (Freshness safety)**: 0 recommendations are served on data past its staleness threshold without a visible stale flag.
- **SC-007 (No money moved)**: 0 instances of FinOS moving money on a user's behalf; 100% of money actions require explicit per-action user execution.
- **SC-008 (Bilingual parity)**: 100% of user-facing strings, alerts, and content are present in both EN and FR; 0 single-language leaks in shipped builds.
- **SC-009 (Notification restraint)**: Median money-related notifications per user per day ≤ 2, with critical alerts still delivered the same day.
- **SC-010 (Performance)**: 95th-percentile cold-start and module-switch times are under 300 ms on mid-range Canadian devices.
- **SC-011 (Accessibility)**: The product passes WCAG 2.1 AA audits with bilingual screen-reader labels on all interactive elements.
- **SC-012 (Contract reliability)**: 100% of cross-module contracts have passing consumer and provider tests in CI before release; 0 breaking contract changes ship without a migration plan and deprecation window.
- **SC-013 (Privacy rights)**: 100% of users can export and delete their data; verified deletion requests complete within 7 days, including Plaid connection/token revocation.
- **SC-014 (Onboarding)**: A new user can connect a first institution and see a populated Points Wallet, runway, and one recommendation within 10 minutes.
- **SC-015 (Household safety)**: 0 cross-user data exposures in authorization testing; every denied cross-user access is audited.

---

## Assumptions

- **Account-aggregation provider**: Canadian bank/card connections are provided by **Plaid** (Canada region), covering major institutions (RBC, Scotiabank, TD, BMO, CIBC, Tangerine, Amex, and others) via Plaid Link on web and mobile. The spine maps Plaid products to its contracts: Auth + Balance → `AccountState`, Transactions → `TransactionStream`, Liabilities → `CreditState`, Identity → member verification. Where an institution is unavailable through Plaid, manual entry or statement import is the fallback. Plaid is treated as a swappable provider behind the Module 0 contracts so the rest of FinOS stays provider-agnostic.
- **Credit data source**: A Canadian credit-bureau feed is available for the Credit module; until then, the module degrades to manual entry.
- **Scope of "execution"**: FinOS is advisory. Even "autopilot" features (sweeps, roundups, payment sequencing) only propose; the user executes. This is a constitutional constraint, not a v1 limitation.
- **Platform**: Primary delivery is a mobile-first app for Canadian users; exact platforms (iOS/Android/web) are an implementation choice for planning.
- **Phasing**: Delivery follows the brief's phases — P1 modules (Spine, Rewards, Credit, Cash Safety) first, then P2 (Bills, Pay, Shopping, Inbox), then P3 (Tasks, Habits, Focus, Travel, Docs, Workspace, Household), then P4 (Social).
- **Email access**: Inbox, Travel, and Free-Trial features assume the user opts into connecting an email source; all are usable (with reduced automation) without it.
- **FX and deal feeds**: Timestamped FX rates and a deals/offers feed are available external sources subject to the Fresh-or-Flagged rule.
- **Single canonical spine**: All modules read a single financial picture; there is no per-module private copy of balances, budget, or goals.
- **Default thresholds**: Utilization bands are fixed (< 10% optimal, < 30% healthy, 30–50% warn, > 50% hard-avoid; see CreditState). Staleness windows and runway buffers ship with sensible Canada-oriented defaults, are user-adjustable, and their exact default values are set during planning.
- **Not regulated advice**: FinOS provides informational decision support and is not a registered financial advisor; this framing is surfaced to users.

## Dependencies

- **Plaid (Canada region)** for account/card aggregation — Auth, Balance, Transactions, Identity, and Liabilities products (Module 0, and therefore all modules). Plaid access/link tokens are credentials and fall under FR-X-009 (never stored in plaintext, committed, or logged; rotatable) and require a threat model under FR-X-010.
- Canadian credit-bureau data (Module 2) — complements Plaid Liabilities with score/report factors.
- Timestamped FX rate source (Modules 0, 6, 11).
- Card knowledgebase data and card-linked offer feeds (Module 1).
- Optional user email connection (Modules 4, 10, 11).
- The shared contract layer and CI contract-test harness (all modules; Constitution Principle VII).

## Out of Scope

- **Executing money movement** (transfers, payments, trades) on the user's behalf — FinOS only recommends.
- **Consumer lending and cash advances** — FinOS does not originate, broker, or refer cash advances or any other credit product (Cash Advance Lite is removed; Cash Safety is purely predictive).
- **Investment/brokerage trading and portfolio management** beyond aggregation/valuation context.
- **Tax filing/preparation** (tax *tagging* via the merchant graph is in scope; filing is not).
- **Acting as a registered financial advisor** or providing regulated financial advice.
- **Non-Canadian-first launch markets** for v1 (global programs are aggregated, but rules/compliance are Canada-first).
