# Contract: Knowledgebase API (read-only reference data)

Base: `/v1`. No authentication (public reference data — no user data exists server-side
in this feature). All list endpoints support `ETag` / `If-None-Match` → `304`. Every
text field is returned in both languages (`{ "enCA": ..., "frCA": ... }`); money as
`{ "amountCents": int, "currency": "CAD" }`. Shapes are normative in
`packages/kb-schema`; this document fixes the endpoint surface.

## GET /v1/kb-version

`200 { "kbVersion": 12 }` — monotonically increasing; the app refreshes its cache when
this exceeds the cached value.

## GET /v1/cards

`200 { "kbVersion": 12, "cards": Card[] }`

Query params (all optional, combinable): `noAnnualFee=true`,
`bonusCategory=<SpendCategoryId>`, `q=<search over name/issuer, both languages>`
(FR-004). Server-side filtering exists for parity/testing; the app normally filters its
cache.

## GET /v1/cards/:id

`200 Card` | `404 { "error": { "code": "CARD_NOT_FOUND" } }`

## GET /v1/reward-programs

`200 { "kbVersion": 12, "programs": RewardProgram[] }`

## GET /v1/spend-categories

`200 { "kbVersion": 12, "categories": [{ "id": "groceries", "label": {…} }, …] }` —
always exactly the 10 fixed categories.

## Error envelope

Non-2xx: `{ "error": { "code": UPPER_SNAKE, "message": { "enCA": ..., "frCA": ... } } }`
— messages localized because they can surface in-app.

## Invariants (contract tests)

1. Every `BilingualText` in every response has non-empty `enCA` and `frCA`.
2. Every `Card.rewardCurrency.programId` resolves within the same payload version.
3. `kbVersion` is identical across the three list endpoints for a given deploy.
4. No float appears anywhere in any payload (integers only for money/rates).
5. Every `Card.dataAsOf` parses as an ISO date.
