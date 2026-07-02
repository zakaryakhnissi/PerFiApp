# Consumed Contracts (referenced — owned by other modules)

Inbox accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary and the no-shared-mutable-state rule, Principle VII). Schemas live in the owning module's spec; listed here so Inbox's **consumer** contract tests pin the exact versions it depends on.

| Contract | Owner | Min version | Why Inbox needs it |
|----------|-------|-------------|--------------------|
| `MoneyCents` | Module 0 (Spine — shared value object) | `finos:common/MoneyCents/1.0.0` | money typing for any `cad_amount` carried in an alert/item (integer minor units; never float). Inbox carries, never computes (Clarifications Q3). |
| `FreshnessStamp` | Module 0 (Spine — shared value object) | `finos:common/FreshnessStamp/1.0.0` | relayed verbatim on every item; a stale-money alert is flagged and not pushed (FR-INB-005, FR-X-008). |
| `Reasoning` | Module 0 (Spine — shared value object) | `finos:common/Reasoning/1.0.0` | bilingual "why this sender is impulse-first" / "why this is critical" explainability (FR-X-006). |
| `TransactionStream` | Module 0 (Spine) | `finos:spine/TransactionStream/1.0.0` | spend signals to rank promotional senders impulse-spend-trigger-first (FR-INB-001). |
| `MerchantGraph` | Module 0 (Spine) | `finos:spine/MerchantGraph/1.0.0` | map a promotional sender to a known merchant for ranking; participates in the email-sourced enrichment revocation cascade (FR-X-013). |
| `ConnectionConsent` | Module 0 (Spine) | `finos:spine/ConnectionConsent/1.0.0` | email/connection link status (active / reauth_required / revoked) and the revocation event that triggers the 7-day email-sourced deletion cascade. |
| `ModuleAlertEvent` (as emitted by every source module) | Bills, Cash Safety, Shopping, Credit, Rewards, Tasks, Habits, Travel, Docs, Social, … | `finos:inbox/ModuleAlertEvent/1.0.0` | the inbound alert envelope Inbox ingests, validates, prioritizes, deduplicates, budgets, assembles, and delivers. Defined by Inbox (this module's `provided/`); **consumed** here because every other module is the producer and Inbox is the validating consumer. |

**Version-skew behavior** (umbrella edge case): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent path is **disabled**, not served on a mismatched schema (SC-012). For `ModuleAlertEvent`, an emitter on a breaking new major is rejected at ingest (audited) rather than mis-assembled into a digest.

## External datasets/feeds (not cross-module contracts, but freshness-bound / residency-bound)

These power FR-INB-001/002 and obey Fresh-or-Flagged + Canadian residency; concrete vendors selected in planning (non-blocking — see research.md / platform NR-6):

- **Email source + parsing subprocessor** (`EmailParserPort`) — promotional-sender detection; retains **only sender identity + classification**, never raw bodies (FR-INB-001, FR-X-013); Canadian-region or disclosed + agreement-backed (FR-X-020).
- **Push-delivery subprocessor** (APNs/FCM via the managed/Expo pipeline) — residency posture enters the subprocessor register before go-live (FR-X-020).
