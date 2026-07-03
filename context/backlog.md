# FinOS Feature Backlog

Features are organized by module. Each item is ready to be passed to `/speckit.specify`.

---

## Rewards & Loyalty

- [ ] **Points Wallet** — Central wallet aggregating all loyalty balances (cashback, airline, hotel, bank points) with CAD-value estimates and time-to-goal context across Canadian and global programs.
- [ ] **Card Knowledgebase & Perks Vault** — Canada-first database of every card's earn rates, bonus categories, statement credits, travel perks, and insurance benefits; bilingual; linked into budgeting, travel, and insurance workflows.
- [ ] **Best Card Recommender** — Recommends which card to use at a merchant or moment, incorporating budget, cash-flow, and utilization (not just max points).
- [ ] **Offer Auto-Activation & Sync** — Ingests and normalizes card-linked offers from Canadian banks and co-brands; auto-activates and ties offers to budget categories and shopping plans.
- [ ] **Welcome Bonus & Min-Spend Tracker** — Tracks every card's welcome bonus requirements and deadlines; warns when bonus-chasing would push beyond healthy spend.
- [ ] **Statement Credit & Perks Coach** — Tracks remaining statement credits and reset dates; suggests concrete usage plans; flags chronically unused perks as downgrade/cancel candidates.
- [ ] **Merchant Insights & Reward Mapping** — Merchant graph showing top spend, which rewards/loyalty programs apply, powers rewards, subscriptions, tax tagging, and shopping decisions.
- [ ] **Deal Radar** — Central feed of relevant sales, card-linked offers, and point promos; only shows deals that fit current budget and goals; calculates real savings vs extra spending.
- [ ] **Status Tracker** — Tracks airline, hotel, and elite card status progress; Canadian-traveler-friendly; tied to actual travel plans and budgets.
- [ ] **Multi-Profile Rewards Manager** — Coordinates card and rewards strategies across household members; each person sees which card to use and why.

---

## Credit & Coaching

- [ ] **Credit Monitor** — Free Canadian credit score and report monitoring in the same place as card and rewards coaching.
- [ ] **Due-Date & Utilization Coaching** — Smart reminders and tactical suggestions to maintain on-time payments and healthy utilization; suggests paying cards early to reduce utilization.
- [ ] **Credit Builder Actions** — Dynamic, Canada-specific playbook for secured cards, utilization tactics, and payment history improvement.
- [ ] **Refinance & Card Lineup Optimization** — Identifies when to refinance or adjust card lineup based on real usage and value; shows long-term impact on rewards and credit score for keep/downgrade/cancel decisions.

---

## Cash Safety & Autopilot

- [ ] **Low-Balance & Fee Guard** — Forward-looking cash-runway chart predicting when accounts will be too low to safely pay upcoming statements and fees; provides protective micro-actions (move money, delay a discretionary charge, reschedule a bill) to keep the runway safe.
- [ ] **Rules-Based Sweeps & Roundups** — Proposes micro-routing of small amounts (roundups, sweep conditions) to debt, TFSA, or savings based on the user's plan; the user confirms each action explicitly (FinOS never moves money).

---

## Bills & Subscriptions

- [ ] **Subscription Radar** — Surfaces all recurring charges; categorizes into essential, negotiable, and nice-to-have; shows shared-budget impact.
- [ ] **One-Tap Cancellation & Negotiation** — Cancels or renegotiates bills; shows downstream savings effect on goals.
- [ ] **Free-Trial Guard** — Tracks free trials as first-class objects with countdowns and one-tap keep/cancel before auto-conversion.
- [ ] **Bill Calendar & Alerts** — All due dates on a calendar; alerts before missed payments; shows predicted safe days to pay; enables move/renegotiate flows.

---

## Pay & Payment Optimization

- [ ] **Best Card / Account to Use** — Recommends which card/account to use at checkout incorporating budget, cash flow, and utilization so the recommendation is financially safe.
- [ ] **Payment Sequencer** — Suggests optimal payment schedule to avoid overdrafts and maximize goal progress; updates the bill calendar automatically.

---

## Shopping & Deals

- [ ] **Auto-Coupons & Codes** — Automatically applies coupon codes at checkout; integrates coupon logic with budgets and goals.
- [ ] **Price Watch & Droplist** — Tracks product prices; alerts when they drop; each watched item attached to target budgets and cash-flow calendars.
- [ ] **Buy Now vs Wait Score** — Blends price intel, budget state, and upcoming obligations into a purchase score; shows best date to buy and impact on goals.

---

## Tasks & To-Dos

- [ ] **Money-Aware Tasks** — Turns financial concerns into tasks linked to relevant data (bills, merchants, budgets, goals); task completion updates financial status.
- [ ] **Smart Scheduling** — Suggests best day/time to tackle life admin; factors in paydays and bill dates.

---

## Habits & Routines

- [ ] **Gamified Habits & Dailies** — Tracks small recurring actions; XP and streaks tied to real financial progress; optional game layer.
- [ ] **Cross-Module Rituals** — Daily check-in bundling micro-actions: review bills, approve roundups, clear notifications.

---

## Focus & Mental Health

- [ ] **Money Stress Packs** — Short structured sessions for bill/debt anxiety; money-specific packs with both emotional support and concrete actions.
- [ ] **Sleep & Wind-Down** — Evening sequences that convert money worries into tasks/goals, then guide wind-down meditation.

---

## Inbox & Notifications

- [ ] **Email Subscription Clean-Up** — Detects promotional/newsletter emails; prioritizes unsubscribes from senders that trigger impulse spending.
- [ ] **Unified Money Digest** — Single FR/EN daily digest where every section is actionable; one or two digests per day maximum.

---

## Travel & Trips

- [ ] **Automatic Itinerary Builder** — Auto-builds travel itineraries from confirmation emails; aware of travel budget, FX, and insurance.
- [ ] **Travel Stats & Carbon** — Lifetime travel spend, cost-per-trip/day, and optional carbon footprint estimates.

---

## Life Admin & Docs

- [ ] **Receipt & Warranty Vault** — Stores, tags, and searches receipts/warranties; auto-links receipts to transactions and warranties to big-ticket items.
- [ ] **Important Document Wallet** — Centralized financial vault with structured categories, expiry reminders, and export/sharing controls.

---

## Workspace & Playbooks

- [ ] **Life Event Playbooks** — Pre-built workspaces for moves, job changes, new baby, immigration, etc.; wired to actual FinOS data and Canada-specific checklists.
- [ ] **Personal Finance Notebook** — Notion-style notes + database area that auto-references live FinOS numbers without copy-paste.

---

## Household & Family

- [ ] **Family Dashboard & Roles** — Household-level view with fine-grained per-module visibility and bilingual labels.
- [ ] **Kid Money & Allowances** — Parent dashboards with chore-based allowances and kid-friendly goal trackers.

---

## Social & Accountability

- [ ] **Accountability Circles** — Small groups that share progress on specific financial challenges; tied to real budget and goal data.

---

_Total: 42 features across 15 modules. Run `/speckit.specify` on any item to generate a full spec._
