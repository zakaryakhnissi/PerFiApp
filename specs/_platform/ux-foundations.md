# FinOS UX/UI Foundations

**Status**: Ratified · **Version**: 1.0.0 · **Date**: 2026-06-29
**Owner**: UI/UX Design · **Approved against**: Constitution v2.2.0, umbrella spec `specs/001-finos-platform/spec.md`, platform decisions `specs/_platform/platform-decisions.md`
**Audience**: every module plan and implementation; this document is the design authority referenced alongside `platform-decisions.md`.

---

## 1. Purpose and Scope

This document establishes the visual, interaction, and information-architecture foundations that every FinOS module MUST follow. It operationalizes the constitution's non-negotiable principles at the UI layer: every design decision here traces back to a specific principle or cross-cutting requirement. Modules that deviate from these patterns without a documented, approved rationale are non-compliant.

This document does NOT define module-specific screens. Each module spec owns its own screens. This document defines the shared design language, component contracts, states, and interaction rules those screens must be built from.

---

## 2. Design Principles (Constitution → UI)

### 2.1 Explainable: The Recommendation Card Pattern

**Constitution VI — Explainable & Auditable · FR-X-006 · SC-005**

Every recommendation FinOS surfaces MUST be rendered as a Recommendation Card. A recommendation is any piece of advice, suggestion, or ranking that a module produces from data (best card, runway action, cancel this subscription, safe to pay, wait to buy, etc.).

The card has three mandatory layers:

1. **Action layer** — what to do, stated plainly in the user's language. One sentence. No jargon. No hedging. (e.g. "Use your Cobalt card at this merchant.")
2. **Why layer** — an expandable section listing the exact inputs and the reasoning chain that produced the action. Must show: the data values used, their sources, and their freshness timestamps. Must be rendered before the user confirms any action. (e.g. "Earn rate: 5× MR on dining · Budget headroom: $247 remaining · Utilization now: 12% → after: 14% (healthy)")
3. **State layer** — a freshness chip and a confidence/withheld badge (see Section 4). These are always visible, never hidden inside the expandable.

A recommendation with no Why layer is a defect. A recommendation that shows stale data without a freshness chip is a defect (SC-006). A recommendation that auto-executes any money action is a defect (SC-007, Constitution IV).

### 2.2 Recommend-Never-Execute: The Confirm-Action Sheet

**Constitution IV — Money Is Exact (recommend-only clause) · FR-X-003 · SC-007**

Every money action — any action that would result in a real-world financial outcome if the user follows it — MUST route through a Confirm-Action sheet before the user can proceed. This includes: approving a roundup, confirming a payment sequence, scheduling a bill, initiating a cancellation/negotiation, activating an offer, or any other downstream-consequential step.

The sheet is a full-screen bottom sheet. It recaps the action, its direct financial impact in CAD (using exact cents math), and shows the Why layer for the recommendation that triggered it. The primary CTA is labeled precisely (never "OK" or "Confirm" — always "Approve roundup", "Schedule payment", etc.). A secondary dismiss action is always present and equally accessible.

FinOS NEVER has a button that silently executes. If a surface does not show a Confirm-Action sheet before a consequential action, it is non-compliant.

### 2.3 Fresh or Flagged: Freshness Chips and Withheld States

**Constitution VIII — Fresh or Flagged · FR-X-008 · SC-006**

Every value sourced from an external feed (balance, credit score, FX rate, points valuation, deal, offer) carries a freshness chip at all times. The chip is not optional, not inside the expandable, and not toggled off for "clean" UI.

Four freshness states:

| State | Visual | Meaning |
|---|---|---|
| Fresh | Green dot · "Updated {relative-time}" | Within staleness threshold |
| Aging | Amber dot · "Updated {relative-time}" | Within threshold but within the last 20% of the window |
| Stale | Amber chip with warning icon · "Data from {date} — refresh" | Past threshold; recommendation flagged or withheld |
| Unavailable | Grey chip · "No data" | Feed down or never connected |

Stale money inputs (balances, valuations, rates) MUST withhold the recommendation and show the Withheld State (see States Matrix, Section 3). Stale secondary guardrail inputs MAY flag the recommendation without withholding it (per Constitution VI v2.2.0 documented-default exception), but MUST still show a visible stale chip.

### 2.4 Canada-First and Bilingual

**Constitution II · FR-X-005 · SC-008**

All UI text, labels, notifications, and content are available in both English (en-CA) and French (fr-CA). The active locale is set at account creation and changeable at any time. Switching locale takes effect immediately across all visible screens without requiring a restart.

All monetary values, percentages, and dates are rendered through `@finos/format` for the active locale. The same `Cents` value produces:

- en-CA: `$1,234.56`
- fr-CA: `1 234,56 $`

A monetary value displayed with the wrong locale convention is a bilingual defect, even if surrounding labels are translated (FR-X-005, SC-008). This is enforced at the CI level (no raw `toLocaleString` calls in JSX; all money/number/date rendering goes through `@finos/format`).

Screen-reader labels MUST be localized. An accessible label present in only one language is a bilingual accessibility defect.

---

## 3. States Matrix

Every data view in every module MUST define behavior for all six states listed here. A module spec that shows screens without specifying all six states is incomplete.

| State | Trigger | Required UI behavior |
|---|---|---|
| **Empty** | No accounts connected; or a module has no data yet (e.g. no cards in Rewards at first launch) | First-run empty state illustration + primary CTA to connect or add. NEVER show zero-filled numbers. No "you have $0.00" — show "Connect an account to see your balance." Bilingual. |
| **Loading** | Data in-flight; fresh data being fetched | Skeleton screens matching the layout of the populated state. No spinners alone. Skeleton cells must match the real content's size/shape to prevent layout shift. Animate subtly (shimmer at 60 fps; reduced-motion: fade only). |
| **Partial** | Some accounts connected but not all; some programs connected but others missing | Show computed data for the connected subset. Display a persistent Partial Data Banner at the top of the view: "Showing {n} of your accounts — connect more for a complete picture." Every recommendation computed on a partial picture carries an "Incomplete data" chip alongside the freshness chip. |
| **Stale** | External feed past its staleness threshold | Show last-known value with a Stale freshness chip. For money inputs: withhold the dependent recommendation, show the Withheld State, show a "Refresh" CTA. For secondary inputs: show recommendation with a stale chip and a "May be outdated" note. Never show stale data without any indicator. |
| **Error / Degraded** | Feed down, timeout, aggregation failure, network error | Do NOT show the last-known value as if it were current. Show the Unavailable freshness chip. Show a non-alarming error state: "Unable to reach {source name} right now — we'll try again." Display the last-known timestamp if one exists. Never produce incorrect money advice in this state. |
| **Withheld** | Primary money input is missing or stale; conflicting signals that cannot be resolved | Replace the recommendation area with the Withheld Card (see Section 4.3). State clearly what is missing and what the user must do. Provide a direct CTA: "Refresh balance", "Connect credit account", etc. NEVER guess a money input. NEVER show a greyed-out version of the recommendation — show the Withheld Card. |

### 3.1 Conflict State (module disagreement)

A special sub-state of the Stale/Withheld states occurs when two modules produce conflicting recommendations for the same action. The canonical case from the spec: Rewards recommends a high-points card, but Cash Safety's `SafeToActSignal` flags overdraft risk.

Behavior: show the Conflict Banner (Section 4.4). Do NOT silently suppress one recommendation. The Conflict Banner names both signals, states the resolution rule (Cash Safety safety signals take precedence over Rewards optimization signals), and shows which recommendation is being surfaced and why the other is held.

---

## 4. Component Specifications

### 4.1 Recommendation Card

Used by: every module that surfaces a recommendation (Rewards best card, Cash Safety micro-action, Credit coaching nudge, Bills keep/cancel, Shopping buy/wait, Pay checkout, etc.)

```
┌──────────────────────────────────────────────────────────────┐
│  [Module icon]  MODULE NAME                   [Fresh chip]   │
│                                                              │
│  ACTION TITLE (en-CA / fr-CA)                               │
│  Short description — one sentence, plain language.          │
│                                                              │
│  [INCOMPLETE DATA chip — shown only in Partial state]       │
│  [WITHHELD chip — shown only in Withheld state]             │
│                                                              │
│  ▶ Why this recommendation          (tap to expand)         │
│  ────────────────────────────────────────────────────────── │
│  (expanded — hidden by default):                            │
│  · Input 1: {value} · Source: {feed name} · {fresh chip}   │
│  · Input 2: {value} · Source: {feed name} · {fresh chip}   │
│  · Input 3: {value} · Source: {feed name} · {fresh chip}   │
│  Reasoning: {one or two sentences of logic}                 │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  [Primary action CTA]           [Dismiss / Learn more]      │
└──────────────────────────────────────────────────────────────┘
```

**Mandatory fields**:
- Module icon and label (localized)
- Action title (localized EN/FR)
- Freshness chip (always visible, top-right)
- Why section (expandable, but present on every card — never omitted)
- At least one CTA

**Optional fields** (shown when applicable):
- Incomplete Data chip (Partial state)
- Withheld chip (Withheld state)
- Conflict Banner (Conflict state — see 4.4)
- CAD impact line: "Estimated value: $47.50 / 47,50 $" (shown when a monetary impact is calculable)
- Time-to-goal contribution: "+2 days toward {goal name}"

**Accessibility**:
- The card is a single focusable unit for VoiceOver/TalkBack
- The Why section toggle must have a localized accessible label: "Show reasoning" / "Afficher le raisonnement"
- The freshness chip must have a screen-reader label describing its state: "Data current as of 5 minutes ago" / "Données actualisées il y a 5 minutes"
- Minimum tap target for the Why toggle: 44 × 44 pt

**Money display rule**: All CAD values inside the card use `@finos/format` for the active locale. No raw number formatting. No `$` prefix on fr-CA. No binary float anywhere in the rendered path.

---

### 4.2 Confirm-Action Sheet

Used by: any flow where a user confirms a consequential action (roundup approval, payment scheduling, bill cancellation, offer activation, etc.)

```
╔══════════════════════════════════════════════════════════════╗
║  ────────────────────────────────────────────  (drag handle) ║
║                                                              ║
║  ACTION TITLE                                               ║
║  (matches the card's action title — full text, localized)   ║
║                                                              ║
║  Financial impact                                           ║
║  ┌──────────────────────────────────────────────────────┐   ║
║  │  Amount:          $47.50 / 47,50 $                  │   ║
║  │  From account:    Chequing ···1234                  │   ║
║  │  To / Purpose:    Travel goal                       │   ║
║  │  Effective date:  July 3, 2026 / 3 juillet 2026     │   ║
║  └──────────────────────────────────────────────────────┘   ║
║                                                              ║
║  ▶ Why this action   (expandable Why layer — same as card)  ║
║                                                              ║
║  [!] Not regulated financial advice.                        ║
║      FinOS helps you decide — you execute.                  ║
║      (localized, rendered on every sheet)                   ║
║                                                              ║
║  ┌──────────────────────────────────────────────────────┐   ║
║  │         [Primary CTA: verb + object]                │   ║
║  │         e.g. "Approve roundup" / "Approuver"        │   ║
║  └──────────────────────────────────────────────────────┘   ║
║                                                              ║
║            Cancel / Annuler                                 ║
╚══════════════════════════════════════════════════════════════╝
```

**Rules**:
- The sheet MUST show the Why layer. A Confirm-Action sheet without inputs and reasoning is non-compliant.
- The financial impact block MUST use exact cents (integer minor units) in the display. Never show an approximate figure (e.g. "about $47" is non-compliant).
- The disclaimer ("Not regulated financial advice") is mandatory on every sheet. Localized. Not hidden behind a scroll.
- The primary CTA label MUST be specific to the action. "Confirm", "OK", "Yes" are non-compliant labels.
- Cancel is always a text link below the primary button — never a destructive button competing visually with the primary CTA.
- The sheet does not auto-dismiss on swipe unless the user explicitly dismisses. A dismiss is not a confirmation.
- Minimum primary CTA height: 52 pt. Full-width. Localized label.
- Screen reader: the sheet is announced as a modal dialog with a localized title. The primary CTA, Why toggle, and Cancel are separately focusable. Reading order: title → impact block → Why toggle → disclaimer → primary CTA → cancel.

**Idempotency note**: The CTA is disabled (greyed, not hidden) while the confirmation request is in-flight to prevent double-submission. If the request fails, the sheet remains open with an error state; it does not close. Re-tapping re-submits. The server-side handler is keyed on `source_event_id` (platform-decisions.md §4).

---

### 4.3 Freshness Chip

Used by: every data value sourced from an external feed — everywhere, always.

```
Fresh:      ● Updated 3 min ago           (green dot, small caption)
Aging:      ● Updated 4h ago              (amber dot, small caption)
Stale:      ⚠ Data from Jun 28 — Refresh  (amber bg, icon, tappable)
Unavailable: — No data                    (grey, not tappable)
```

**Chip anatomy**:
- Icon (dot or warning triangle) + label text, rendered inline with the value it describes
- For stale and unavailable states: the chip is tappable and navigates to a "What this means" explainer bottom sheet
- The explainer sheet states: what data is affected, why it matters to the recommendation, and what the user can do (refresh, reconnect, wait)

**Placement rules**:
- On a Recommendation Card: top-right corner, always visible
- On an individual data value (e.g. a balance figure): inline, immediately after the value
- On a section heading (e.g. "Your accounts"): inline with the heading, right-aligned
- Never inside the Why expandable section exclusively — the chip must also appear outside it

**Localized accessible labels** (mandatory):
- Fresh: "Balance current as of {time}" / "Solde actualisé il y a {time}"
- Stale: "Balance data may be outdated. Tap to learn more." / "Les données du solde peuvent être obsolètes. Touchez pour en savoir plus."
- Unavailable: "Balance data unavailable." / "Données du solde non disponibles."

**Reduced-motion**: remove animation from the dot pulse; keep the color state change only.

---

### 4.4 Conflict Banner

Used by: any view where two modules produce conflicting signals for the same action — most commonly Rewards vs Cash Safety.

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠  Two signals disagree                                     │
│                                                              │
│  [Rewards] Cobalt card earns 5× here (+$2.38 value)        │
│  [Cash Safety] Overdraft risk in 6 days — spend caution     │
│                                                              │
│  Cash Safety takes priority. See the full picture.          │
│                                                              │
│  [View Cash Safety details]                    [Dismiss]    │
└──────────────────────────────────────────────────────────────┘
```

**Rules**:
- The banner MUST name both signals and their source modules.
- The banner MUST state the resolution rule and which signal is winning. The resolution rule is not negotiable: Cash Safety `SafeToActSignal` always takes precedence over Rewards optimization signals. Other conflict pairs (e.g. Bills vs Pay) use the same principle: safety signals take precedence over optimization signals.
- The banner sits above the Recommendation Card of the winning signal.
- The losing signal's Recommendation Card is still shown below the banner, but with a "Currently overridden" chip and its CTA disabled.
- "Dismiss" only hides the banner for this session; it does not suppress the underlying signal.
- The banner is never shown when there is no genuine conflict. Showing it pre-emptively or for stylistic emphasis is non-compliant.
- Localized in full (EN/FR). Both module names localized.
- Screen reader: the banner is announced as a status message; the two signal descriptions and the resolution statement are read in order.

---

## 5. Information Architecture and Navigation

### 5.1 Tab Bar Structure

FinOS uses a tab-per-module navigation model. The bottom tab bar contains the module tabs in priority order. P1 tabs ship first; P2/P3/P4 tabs are added in subsequent phases. A tab that is not yet shipped is not shown — empty placeholder tabs are non-compliant.

**P1 tab bar (launch)**:

```
[ Spine / Home ]  [ Rewards ]  [ Credit ]  [ Cash Safety ]
```

**P2 additions**:

```
[ Spine / Home ]  [ Rewards ]  [ Credit ]  [ Cash Safety ]  [ Bills ]
                  + overflow: [ Pay ]  [ Shopping ]  [ Inbox ]
```

Once more than five tabs are active, the rightmost tab becomes "More" — a secondary navigation list of remaining modules. Module order in "More" follows the priority sequence.

**Tab label rules**:
- Each tab has an icon + a short label, both localized
- Labels: Home / Accueil · Rewards / Récompenses · Credit / Crédit · Cash Safety / Liquidités · Bills / Factures · Pay / Paiement · Shopping · Inbox / Boîte de réception · Tasks / Tâches · Habits / Habitudes · Focus · Travel / Voyage · Docs · Workspace / Espace · Household / Famille · Social
- Active tab: filled icon, primary brand color, label bold
- Inactive tab: outline icon, muted color, label regular weight
- Badge: a red dot (no count) for any unread digest item; a number badge only for the Inbox tab (digest items)
- Minimum tap target: 44 × 44 pt per tab

**Accessibility**: the tab bar is a navigation landmark. Each tab is a button with a localized accessible label including its active state: "Rewards tab, selected" / "Onglet Récompenses, sélectionné".

### 5.2 Module Screen Anatomy

Every module's primary screen follows this layout:

```
┌─────────────────────────────────────────────────────────────┐
│  [Back / Profile avatar]   MODULE NAME   [Settings / More]  │  Navigation bar
├─────────────────────────────────────────────────────────────┤
│  [Partial Data Banner — shown only in Partial state]        │  Conditional
├─────────────────────────────────────────────────────────────┤
│  [Conflict Banner — shown only in Conflict state]           │  Conditional
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Primary data view (balances, chart, list)                  │  Scrollable
│  — Each value: amount + freshness chip                      │
│                                                             │
│  Recommendation Card(s)                                     │
│  — In priority order; at most 3 visible without scroll      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [ Tab Bar ]                                                │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Home / Spine Tab

The Home tab is the cross-module dashboard. It does not own recommendations — it surfaces the top recommendation from each active module, with a "Go to module" link. It shows the user's aggregate financial position: net balance, runway days, and active goals.

The Home tab is the first screen a user lands on after onboarding. It MUST show a useful state within the 10-minute onboarding window (SC-014). "Useful" means at minimum: one account balance, one runway indicator, and one recommendation card.

### 5.4 Onboarding Flow

**Goal: 10 minutes from install to first value (SC-014)**

```
Step 1: Welcome screen (EN/FR choice — first interaction)
Step 2: Account connection (Plaid Link — connect at least one institution)
Step 3: Loading screen (skeleton, "Building your financial picture…")
Step 4: First value screen:
         · Points Wallet populated (if card connected) → Rewards tab
         · Runway chart visible → Cash Safety tab
         · One recommendation card shown
Step 5: Optional: connect more accounts, set a goal (can be deferred)
```

**Rules**:
- Language selection is the first action — before any content is shown. The user's choice immediately applies to all subsequent screens.
- The Plaid Link flow is handled by the Plaid SDK. FinOS MUST show a "Why we need this" explainer before launching the link flow. The explainer is one screen, plain language, localized, with a "Not now" option that defers to step 5.
- The loading screen shows a skeleton of the Home tab — not a spinner. Progress feedback: "Connecting to {institution name}…" / "Connexion à {institution name}…"
- Onboarding completion writes an audit event.
- If the user skips connection, the Home tab shows the Empty state (not zero-filled numbers).
- No more than 5 screens between install and first value.
- The disclaimer "FinOS is informational decision support, not regulated financial advice" appears on the welcome screen and the first recommendation card.

### 5.5 Household and Multi-Profile Navigation

When a Household is configured, the Home tab navigation bar shows a profile switcher (avatar + name, localized label "Switch profile" / "Changer de profil"). Tapping it opens a bottom sheet listing household members the current user has visibility into (per `MemberScope`).

Switching to another member's view:
- Shows only the modules and data granted by that member's `MemberScope`
- Displays a persistent "Viewing {Name}'s finances" banner at the top of every screen — never ambiguous about whose data is shown
- The CTA label on any Confirm-Action sheet includes the profile name: "Approve roundup for {Name}" / "Approuver l'arrondi pour {Name}"
- Switching back to your own view is always one tap

Multi-profile data isolation is enforced server-side (platform-decisions.md §5). The UI NEVER shows a household member's data that their `MemberScope` does not grant. A member whose scope was revoked sees the Empty state for that module immediately — no cached data shown.

---

## 6. Notification Restraint

**SC-009 · FR-INB-002 · Constitution "inbox owns notification discipline"**

FinOS enforces a strict notification budget: at most 2 money-related notifications per user per day, owned by the Inbox module (Module 10). No other module may send standalone push notifications. All module alerts are submitted to the Inbox digest pipeline.

### 6.1 Notification Hierarchy

Three tiers:

| Tier | Examples | Delivery |
|---|---|---|
| **Critical** (time-sensitive, safety) | Predicted overdraft today; balance below safety threshold; aggregation token expiry | Immediate push, bypasses digest cadence. At most 1 per day. |
| **Important** (actionable within 24h) | Free-trial converting tonight; points expiring in 60 days (approaching window); bill due tomorrow | Digest push (bundled with other important alerts into one notification). |
| **Informational** | New offer available; weekly spend summary; habit streak reached | Digest only — no push notification; surfaced inside the Inbox tab. |

### 6.2 Digest Format

The digest push notification:
- One notification per digest batch (morning or evening, user-configurable)
- Title: "3 money updates" / "3 mises à jour financières"
- Body: the highest-priority item's short description
- Tapping opens the Inbox tab, not a specific module screen
- Each item inside the Inbox tab is actionable: has a verb CTA ("Review", "Dismiss", "Go to Bills")
- Items are sorted: Critical first, then Important, then Informational
- All text fully localized EN/FR

### 6.3 Rules for Module Teams

- A module MUST NOT call a push-notification API directly. It MUST emit an event to the Inbox pipeline.
- A module event MUST carry: `module_id`, `event_type`, `priority_tier`, `payload` (localized EN/FR short description + action URL), `expires_at` (for time-sensitive items).
- The Inbox pipeline deduplicates events (same `module_id` + `event_type` + same subject within 24h = one item).
- The Inbox pipeline respects the user's notification preferences (which tiers they allow for push).

---

## 7. Accessibility

**FR-X-016 · SC-011 · Constitution II (bilingual screen-reader labels)**

### 7.1 WCAG 2.1 AA Requirements

All interactive elements meet WCAG 2.1 AA. This is a CI gate (platform-decisions.md §6). Specifically:

| Requirement | Implementation |
|---|---|
| Contrast ratio ≥ 4.5:1 for normal text | Enforced in design tokens; verified in automated a11y tests |
| Contrast ratio ≥ 3:1 for large text and UI components | Same |
| Minimum tap target 44 × 44 pt | Enforced via shared component minimum sizing |
| No content conveyed by color alone | Freshness chips: icon + color + text; never color only |
| Focus visible and logical reading order | Tab order matches visual order; skip-nav for long lists |
| All images have alt text | Localized (EN/FR) |
| No keyboard trap | Confirmed for modals, sheets, and overlays |

### 7.2 Dynamic Type

All text scales with the system's Dynamic Type / font size settings. Layouts reflow rather than clip at large text sizes. Minimum tested size: iOS Default. Maximum tested size: iOS Accessibility XXL. No fixed-height containers for text content.

### 7.3 Reduced Motion

All animations respect the "Reduce Motion" system preference:
- Skeleton shimmer: replaced with a simple opacity fade
- Chart animations: disabled; charts render in final state
- Tab switch transitions: instant
- Sheet presentation: instant slide, no spring animation
- Loading spinners: retained (motion carries meaning here) but slowed to 50% speed

### 7.4 Screen-Reader Labels (Mandatory Bilingual)

Every interactive element and every data value MUST have a localized screen-reader label in both EN and FR. The label is set on the component using the active locale — not hardcoded in one language. This is validated in the mobile test suite (platform-decisions.md §6, React Native Testing Library a11y assertions).

Examples of required label patterns:

- Balance value: "Chequing account balance: $2,341.00, updated 5 minutes ago" / "Solde du compte chèques : 2 341,00 $, actualisé il y a 5 minutes"
- Recommendation card: "Recommendation: Use Cobalt card at this merchant. 5× earn rate. Updated 2 minutes ago. Double-tap to expand reasoning." / "Recommandation : utilisez la carte Cobalt chez ce commerçant. Taux de gain de 5×. Actualisé il y a 2 minutes. Touchez deux fois pour voir le raisonnement."
- Freshness chip stale: "Balance data may be outdated — last updated June 28. Tap to learn more." / "Les données du solde peuvent être obsolètes — dernière mise à jour le 28 juin. Touchez pour en savoir plus."
- Confirm-Action sheet primary CTA: "Approve roundup of $2.50 to Travel goal. Button." / "Approuver l'arrondi de 2,50 $ vers l'objectif Voyage. Bouton."

---

## 8. Money, Number, and Date Display Rules

**Constitution II · IV · FR-X-002 · FR-X-004 · FR-X-005 · SC-008**

All display rules are implemented in `@finos/format` (platform-decisions.md §2). No module renders a monetary value, percentage, or date directly. Every value goes through the format package.

### 8.1 Monetary Values

| Locale | Example output | Notes |
|---|---|---|
| en-CA | `$1,234.56` | Dollar sign prefix, comma thousands separator, period decimal |
| fr-CA | `1 234,56 $` | Trailing dollar symbol, non-breaking space thousands separator, comma decimal |

- Always 2 decimal places for CAD amounts (never `$5` for `$5.00`)
- Negative values: en-CA `-$47.50`; fr-CA `-47,50 $`
- Zero: en-CA `$0.00`; fr-CA `0,00 $` — NEVER shown without context (see Empty state)
- Large values: en-CA `$1,234,567.89`; fr-CA `1 234 567,89 $`
- Points-to-CAD conversions carry the computed value to 2 decimal places; intermediate computation uses arbitrary precision (decimal.js), rounded half-up at the final cent only

### 8.2 Percentages

| Locale | Example output |
|---|---|
| en-CA | `12.3%` |
| fr-CA | `12,3 %` (space before percent sign) |

### 8.3 Dates

| Context | en-CA | fr-CA |
|---|---|---|
| Full date | `June 28, 2026` | `28 juin 2026` |
| Short date | `Jun 28` | `28 juin` |
| Date + time | `June 28, 2026 at 9:41 AM` | `28 juin 2026 à 9 h 41` |
| Relative time (fresh chip) | `5 minutes ago` | `il y a 5 minutes` |
| Relative time (future) | `in 6 days` | `dans 6 jours` |

All timestamps are stored in UTC and converted to the user's timezone at the rendering layer via `@finos/format`. The user's timezone is inferred from the device at first launch and stored as a profile preference, changeable in settings.

### 8.4 Time-to-Goal Context

Every monetary value with a goal association MUST include a time-to-goal line, formatted:

- en-CA: `+{N} days toward {Goal name}` or `{Goal name}: on track / {N} days ahead / {N} days behind`
- fr-CA: `+{N} jours vers {Nom de l'objectif}` or `{Nom de l'objectif} : en bonne voie / {N} jours d'avance / {N} jours de retard`

If no goal is associated, the time-to-goal line is omitted (not shown as "No goal"). The user is offered a "Set a goal" CTA only on the Home tab and the module tab's settings — not inline on every data value.

### 8.5 "Not regulated financial advice" Disclaimer

This one-line disclaimer is mandatory on:
- The welcome/onboarding screen
- Every Confirm-Action sheet (above the primary CTA)
- The Help/About screen

It is NOT required inline on every Recommendation Card (the onboarding-screen placement establishes it; repeating it on every card creates noise that dilutes its meaning). However, the first Recommendation Card a first-time user sees MUST include it.

Localized:
- en-CA: "FinOS provides informational decision support only — not regulated financial advice."
- fr-CA: "FinOS fournit uniquement une aide à la décision à titre informatif — il ne s'agit pas de conseils financiers réglementés."

---

## 9. Design Tokens

Design tokens are the single source of truth for color, spacing, typography, and motion. They are defined once and consumed by both the React Native client and any future web surface. Tokens MUST be defined before a module's UI is implemented. Module-specific tokens extend the global set; they do not override it.

### 9.1 Color Roles (required token names)

| Token | Role |
|---|---|
| `color.brand.primary` | Primary interactive elements, active tab, primary CTAs |
| `color.brand.secondary` | Secondary accents, inactive elements |
| `color.semantic.success` | Fresh state, positive money signals |
| `color.semantic.warning` | Aging/stale state, utilization warn band, budget warnings |
| `color.semantic.error` | Error state, utilization hard-avoid, overdraft risk |
| `color.semantic.neutral` | Unavailable/no-data state, disabled elements |
| `color.surface.primary` | Main background |
| `color.surface.secondary` | Card backgrounds, bottom sheets |
| `color.surface.tertiary` | Skeleton shimmer base |
| `color.text.primary` | Body text, main values |
| `color.text.secondary` | Labels, captions, Why section text |
| `color.text.disabled` | Disabled state text |
| `color.border.default` | Card borders, dividers |
| `color.border.focus` | Focus ring (accessibility — must contrast ≥ 3:1 against `color.surface.primary`) |

Dark mode token variants are required for every color token above. Dark mode is a system-preference-driven setting, not a manual toggle in FinOS settings (user expectation: the app follows the device).

### 9.2 Spacing Scale

4 pt base unit. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Module UIs use only these values for padding and margins. No arbitrary pixel values.

### 9.3 Typography Scale

| Token | Style | Usage |
|---|---|---|
| `type.display` | 28 pt / semibold | Major numbers (balance totals) |
| `type.heading.1` | 22 pt / semibold | Screen titles |
| `type.heading.2` | 18 pt / semibold | Section headings, card titles |
| `type.body.1` | 16 pt / regular | Primary body text |
| `type.body.2` | 14 pt / regular | Secondary body, card descriptions |
| `type.caption` | 12 pt / regular | Freshness chips, labels, captions |
| `type.cta` | 16 pt / semibold | All CTA button labels |

All sizes are in scalable units (sp / pt), not fixed pixels. Dynamic Type support is automatic when using these tokens via the `@finos/design` package.

---

## 10. Edge Cases and Explicit Decisions

### 10.1 No Connection State

When a user has not connected any accounts:
- Home tab shows the Empty state: illustration + "Connect your first account" CTA
- All module tabs show the Empty state for their primary data view
- No module shows zero-filled numbers or grayed-out card shapes implying data exists
- The Plaid connection CTA is available from Home and from each module's empty state
- After a failed Plaid connection attempt, show the Error state with the specific reason from Plaid (e.g. institution temporarily unavailable) and a retry CTA

### 10.2 Partial Connection (some accounts, not all)

The Partial Data Banner is shown persistently at the top of any view where the missing accounts would affect the displayed data. The banner text names the gap specifically: "Your Visa card is not connected — rewards may be incomplete" / "Votre carte Visa n'est pas connectée — les récompenses pourraient être incomplètes."

Recommendation Cards computed on partial data carry the "Incomplete data" chip. The Why section lists the missing inputs explicitly: "Input missing: credit utilization for Visa card — assuming healthy band (documented default)".

### 10.3 Stale Data During Active Session

If a feed goes stale while the user is on a screen:
- The freshness chip updates to the Stale state in-place (no full screen refresh)
- If the stale value was a money input to an on-screen recommendation, the recommendation card transitions to the Withheld state in-place, with a non-disruptive animation (fade, respects reduced-motion)
- A toast notification is NOT shown (too disruptive for passive staleness)
- The Refresh CTA on the stale chip is always present

### 10.4 Conflicting Advice: Detailed Resolution Rules

Resolution precedence (highest to lowest):

1. Cash Safety `SafeToActSignal` (overdraft / safety risk) — always overrides
2. Credit hard-avoid band signal (>50% utilization would result) — overrides Rewards optimization
3. Budget headroom signal (no budget room) — overrides optimization
4. Rewards optimization signals
5. All other module-optimization signals

When a lower-priority signal is overridden, the Conflict Banner is shown. The overridden recommendation is shown below the banner in a "Currently overridden" state with its CTA disabled and a "Why this was overridden" link that opens the Why section of the overriding signal.

### 10.5 First-Run Empty States

First-run empty states are distinct from the error empty state:
- First-run: optimistic tone, explains what the module does and what the user will see once connected. Shows onboarding CTA.
- Error: neutral tone, explains what went wrong and what to do. Shows retry CTA.
- Never mix the two: an error that happens on first run shows the error empty state, not the first-run one.

### 10.6 Household / Multi-Profile Privacy

Switching to view a household member's finances:
- The "Viewing {Name}'s finances" banner is persistent across ALL screens until the user switches back
- The banner has a one-tap "Back to my finances" action always visible
- If the session expires while viewing another member's view, re-authentication returns the user to their own view — never another member's
- The profile switcher is not available to accounts with the "kid" household role (kid accounts see only their own goals and habits; no switcher is shown)
- In Social/Accountability Circles, the circle view only shows the server-computed projection (percentage complete, streak count) — never raw amounts, account names, or institution names. If a user is both a household member and a circle member, the circle projection is computed before transmission and does not expose any household-scoped data beyond what was explicitly granted to the circle (FR-SOC-001).

### 10.7 fr-CA Locale Edge Cases

- Apostrophes in fr-CA labels: "aujourd'hui", "d'avance" — use typographic apostrophe (U+2019), not ASCII single quote
- Ordinal dates: "1er juin" not "1 juin" for the first of the month
- Currency in fr-CA: the dollar sign always trails with a space: `1 234,56 $` — the space between the number and the symbol is a non-breaking space (U+00A0) to prevent line-break between value and symbol
- Negative amounts: `-47,50 $` not `(47,50 $)` — accounting parentheses are not used in fr-CA consumer contexts
- All these rules are enforced inside `@finos/format` and must not be reproduced ad hoc in module code

---

## 11. Compliance Checklist (for module specs and plan reviews)

Every module spec that includes a UI is reviewed against this checklist. A module UI that fails any item is non-compliant with this document.

- [ ] All six states (empty, loading, partial, stale, error, withheld) are defined for every data view
- [ ] Every recommendation is rendered as a Recommendation Card with a Why layer
- [ ] Every money action routes through a Confirm-Action sheet with the disclaimer
- [ ] Every externally-sourced value carries a freshness chip (always visible, not just in the Why section)
- [ ] Every monetary value uses `@finos/format` (no raw number formatting)
- [ ] All UI text has EN/FR translations (no single-language leaks)
- [ ] All screen-reader labels are localized (both EN and FR)
- [ ] The Conflict Banner is defined for any module that can conflict with Cash Safety or another module
- [ ] No recommendation auto-executes any money action
- [ ] Dynamic Type and reduced-motion behaviors are specified
- [ ] Dark mode token variants are included for all new color tokens
- [ ] Tap targets on all interactive elements are ≥ 44 × 44 pt
- [ ] Contrast ratios meet WCAG 2.1 AA (≥ 4.5:1 for normal text, ≥ 3:1 for large text/UI)
- [ ] The "not regulated financial advice" disclaimer appears on Confirm-Action sheets and the first card shown to a new user
- [ ] Household/multi-profile views show the persistent "Viewing {Name}'s finances" banner
