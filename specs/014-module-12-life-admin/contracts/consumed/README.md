# Consumed Contracts (referenced — owned by other modules)

Life Admin & Docs accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII; platform-decisions §3). Schemas live in the owning module's spec; they are listed here so Module 12's **consumer** contract tests pin the exact versions it depends on.

| Contract | Owner | $id (min version) | Why Module 12 needs it |
|----------|-------|-------------------|------------------------|
| `TransactionStream` | Module 0 (Spine) | `finos:spine/TransactionStream/1.0.0` | Match an uploaded receipt to its canonical transaction (FR-DOC-001). Uses `transaction_id`, `cad_amount` (integer cents, compared by exact integer equality — never float tolerance), `booked_at`, `merchant_id`, `status` (pending excluded until posted), and `dedup_state` (merged_duplicate / suspected_duplicate rows are excluded from match candidates). |
| `MerchantGraph` | Module 0 (Spine) | `finos:spine/MerchantGraph/1.0.0` | Resolve the merchant on a receipt/warranty for linking and for disambiguating same-amount/same-day candidates (umbrella AS-4). Uses `merchant_id`, `canonical_name`, `display_name_en/fr` (bilingual), and `aliases`. |

**Shared value objects** (published by Module 0, reused, not redefined): `finos:common/FreshnessStamp/1.0.0`, `finos:common/MoneyCents/1.0.0`, `finos:common/Reasoning/1.0.0`.

**Read-only / no write-back**: Module 12 never writes to `TransactionStream` or `MerchantGraph`. A `ReceiptLink` is an assertion that references a `transaction_id`; it never edits the transaction, its amount, or its category. The spine remains the single canonical source (platform-decisions §3).

**Version-skew behavior** (umbrella edge case, SC-012): a breaking change in a consumed contract without a consumer migration fails the consumer contract test in CI and **disables auto-linking** (the dependent capability) rather than matching on a mismatched schema. Manual document storage — which has no spine dependency — keeps working.

**Freshness on consumed data** (FR-X-008): the receipt-matching run reads `TransactionStream.freshness`. A stale transaction feed flags the resulting `ReceiptLink` (it does not assert a confident match against a multi-day-old transaction set) and surfaces a "Refresh transactions" affordance. Matching never invents a transaction; if no candidate exists, the link state is `unmatched`, not a guess.
