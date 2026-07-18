# Quickstart: Card Knowledgebase & Best Card Recommender

Validation guide — proves the feature end-to-end. Prereqs: Node 22, pnpm 9, Docker (for
PostgreSQL), Expo Go on a device or simulator.

## Setup

```bash
pnpm install
docker compose up -d postgres          # local PostgreSQL 16
pnpm --filter api seed                 # validate data/knowledgebase/* and load into PG
pnpm --filter api start:dev            # NestJS on :3000
pnpm --filter mobile start             # Expo dev server
```

## Validation scenarios

1. **Financial-logic tests are the gate (run first)**

   ```bash
   pnpm --filter money --filter recommender test
   ```

   Expect: oracle table, fast-check determinism properties (C1/C2/C5), and rounding
   boundary suites green. These suites exist and fail before any implementation lands
   (Principle V).

2. **Contract & bilingual invariants**

   ```bash
   pnpm --filter api test:e2e
   ```

   Expect: knowledgebase-api.md invariants 1–5 pass (bilingual completeness, resolvable
   program refs, consistent kbVersion, integer-only money, valid dataAsOf), plus
   `curl localhost:3000/v1/cards | jq` shows ≥ 30 cards / 5 issuers (SC-004).

3. **US1 — best card for a purchase (P1)**: in the app: add two cards with different
   grocery rates to the wallet → Recommend → groceries, $100.00. Expect the spec's
   acceptance scenario values ($2.00 vs $1.50 for the seeded demo pair), transparent
   math, and — after toggling the device to fr-CA — the full flow localized with
   `123,45 $`-style formatting.

4. **US2 — browse (P2)**: knowledgebase list; filter "no annual fee" and
   bonus-category=groceries; open a detail view — all fields populated, `dataAsOf`
   visible, language toggle leaves no untranslated string (SC-003).

5. **US3 — wallet (P3)**: add/remove cards; empty-wallet recommendation shows the
   guided empty state; removing a card removes it from the next ranking.

6. **Offline**: with the app opened once (cache warm), enable airplane mode → US1 and
   US2 still work; recommendation is computed on-device.

## Expected outcomes

All six scenarios pass ⇒ FR-001…FR-014 exercised, SC-001…SC-005 measurable. Contracts:
[knowledgebase-api.md](contracts/knowledgebase-api.md),
[recommender.md](contracts/recommender.md); shapes: [data-model.md](data-model.md).
