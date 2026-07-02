# Consumed Contracts (referenced — owned by other modules)

Focus accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII). Schemas live in the owning module's spec; listed here so Focus' **consumer** contract tests pin the exact versions it depends on. All are used to **identify stressors**; Focus computes no new money figure from them — it displays provider-owned figures as-provided with their freshness.

| Contract | `$id` | Owner | Min version | Why Focus needs it |
|----------|-------|-------|-------------|--------------------|
| `BillCalendar` | `finos:bills/BillCalendar/1.0.0` | Module 4 (Bills) | 1.0.0 | Identify overdue / soon-due bills as stressors; link the proposed reminder/task to the specific bill (`bill:{bill_id}`). |
| `RunwayForecast` | `finos:cashsafety/RunwayForecast/1.0.0` | Module 3 (Cash Safety) | 1.0.0 | Identify overdraft / tight-runway risk as the **highest-precedence** stressor; provide spend-precedence for any spend-implying action. |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | Identify behind-pace goals as stressors; supply time-to-goal context (FR-X-004); receive confirmed `create_goal` actions. |
| `CreditState` | `finos:spine/CreditState/1.0.0` | Module 0 (Spine) | 1.0.0 | Identify cards in (or approaching) the hard-avoid utilization band as stressors, using the canonical bands the spine owns. |

> **Version pinning note**: `BillCalendar` and `RunwayForecast` `$id`s above mirror the platform naming convention (`finos:<module>/<Name>/<semver>`, e.g. the ratified `finos:spine/GoalState/1.0.0`). Their authoritative schemas are owned by Modules 4 and 3 respectively; if those modules finalize a different namespace casing, Focus' consumer tests pin whatever the provider publishes. Focus depends only on the documented fields it reads (due date + amount + status for bills; runway_days + shortfall_flag + freshness for runway), so a non-breaking provider change does not affect Focus.

**Optional, when present**: `SafeToActSignal` (`finos:cashsafety/SafeToActSignal/1.0.0`, Module 3) — consulted for overdraft precedence on any spend-implying `WellbeingAction`; wired behind a feature check until Cash Safety ships (most Focus actions are reminders/captures, not spends).

**Version-skew behavior** (umbrella edge case): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and that **stressor source is disabled**, not computed on a mismatched schema. The rest of Focus degrades gracefully (other stressor sources continue).

## External datasets/feeds (not cross-module contracts, but versioned/bilingual)

- **Crisis-resource signpost** (curated, versioned, bilingual static dataset) — Canadian national/provincial help-line resources shown in the non-clinical crisis signpost. Focus never provides counselling; it signposts only. Exact content/source is a planning/legal item (non-blocking).
- **Stress-pack / wind-down content** (curated, versioned, bilingual static dataset) — the short support-session scripts. EN/FR parity is a CI gate (FR-X-005); no single-language leak.

Focus owns **no** external money/credential feed — it consults no aggregator and holds no tokens; all money figures come from the consumed contracts above.
