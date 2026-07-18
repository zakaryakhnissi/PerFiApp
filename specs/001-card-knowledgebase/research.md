# Phase 0 Research: Card Knowledgebase & Best Card Recommender

All Technical Context unknowns resolved. Format per plan template: Decision / Rationale /
Alternatives considered.

## R1. Where the recommendation is computed

- **Decision**: On-device, in a pure shared package (`packages/recommender`); the API
  never sees the wallet.
- **Rationale**: The wallet is on-device only (Clarifications). Sending wallet contents
  to a recommend endpoint would create server-side user data this feature explicitly
  avoids (Principle III), add a network dependency to the flagship flow, and complicate
  determinism testing. A pure function over (wallet, category, amount, KB snapshot) is
  trivially property-testable.
- **Alternatives considered**: API `/recommendations` endpoint — rejected (user data
  leaves device, needs sessions); on-device but embedded in the mobile app code —
  rejected (financial logic must live in a TDD shared package per Principle V, and the
  API may later reuse it for keep/cancel analysis).

## R2. Money & rate representation

- **Decision**: `packages/money` exposes a `Money` type — `{ amountCents: number
  (integer), currency: 'CAD' }` — plus integer **basis points** (1/100 of a percent) for
  earn rates and integer **milli-cents per point** for valuations (0.5¢/pt = 500).
  Rounding: banker's (half-even) at the single defined boundary — after multiplying
  cents × rate — implemented once and property-tested. A lint rule bans `parseFloat`,
  float literals, and `/` on money values outside the package.
- **Rationale**: Principle II. Integer sub-units for rates/valuations remove all
  fractional intermediate values except the one multiplication, which gets the explicit
  rounding rule. Half-even avoids systematic bias in reward estimates.
- **Alternatives considered**: dinero.js v2 — good library, but the needed surface is
  tiny and a dependency-free package keeps the TDD core fully ours; decimal.js —
  arbitrary precision is overkill and reintroduces non-integer thinking.

## R3. On-device storage for wallet + KB cache

- **Decision**: AsyncStorage via a thin storage module with zod-validated, versioned
  payloads (`schemaVersion` field + migration map).
- **Rationale**: The wallet is a small list of card IDs and the KB cache is a few
  hundred KB of JSON — well within AsyncStorage's comfort zone. zod validation on read
  protects against corrupt/stale schema after app updates. No sensitive data is stored
  (card *products*, not card *numbers*), so encrypted storage is not required by
  Principle III for this feature.
- **Alternatives considered**: expo-sqlite — right choice once transactions arrive
  (Phase 2 modules), premature now; react-native-mmkv — fast but adds a native
  dependency Expo Go can't run, hurting DX for a v1.

## R4. Knowledgebase data pipeline

- **Decision**: Curated source files in `data/knowledgebase/` (one JSON file per card,
  one per reward program), validated by `packages/kb-schema` in CI and at API startup,
  loaded into PostgreSQL by a seed step, served read-only with a monotonically
  increasing `kbVersion` + per-card `dataAsOf` dates. The app caches the full KB with
  its `kbVersion` and refreshes when the API reports a newer one.
- **Rationale**: Curated-data assumption from the spec; files in git give review
  history for card-term changes (and the bilingual completeness check becomes a CI
  gate per FR-003); a version number makes cache refresh and "stale terms" detection
  (FR-014) trivial.
- **Alternatives considered**: Admin CRUD UI — heavier than needed for a team-curated
  v1; shipping the KB inside the app bundle — rejected because card terms change more
  often than app releases (though the seed data doubles as the app's first-run cache
  fixture in tests).

## R5. API shape & caching

- **Decision**: Read-only REST: `GET /v1/cards`, `GET /v1/cards/:id`,
  `GET /v1/reward-programs`, `GET /v1/spend-categories`, `GET /v1/kb-version`. Both
  languages returned in every response (`{ enCA, frCA }` text fields); ETag +
  `If-None-Match` on the list endpoints.
- **Rationale**: Reference data with no auth = plain cacheable GETs. Returning both
  languages avoids per-locale cache duplication and lets the app switch language
  offline instantly (spec US1 scenario 4).
- **Alternatives considered**: GraphQL — no query flexibility needed for 5 endpoints;
  per-locale responses (`Accept-Language`) — breaks offline language switching.

## R6. i18n architecture

- **Decision**: `packages/i18n` holds `en-CA` and `fr-CA` JSON resources plus a
  generated key type; app initializes i18next with expo-localization detection;
  currency/number formatting exclusively via `Intl.NumberFormat(locale, { style:
  'currency', currency: 'CAD' })` fed from `Money` values. A CI check fails if the two
  resource files have divergent key sets (FR-013 / SC-003 gate).
- **Rationale**: Principle I; typed keys catch missing-translation bugs at compile
  time; Intl gives correct fr-CA formatting (`123,45 $`) for free.
- **Alternatives considered**: FormatJS/react-intl — fine, but i18next is mandated by
  the constitution's stack section.

## R7. Determinism & test strategy for the recommender

- **Decision**: `rankCards()` is pure and synchronous; ties broken by (1) lower annual
  fee, (2) card ID lexicographic. fast-check property tests assert: permutation
  invariance of wallet order, reproducibility, tie-break totality, and cent-exact
  reconciliation against a hand-computed oracle set. TDD: the oracle test file lands
  and fails before the engine exists.
- **Rationale**: FR-011 (determinism) and SC-005 stated as executable properties;
  Principle V demands the failing-test-first sequence.
- **Alternatives considered**: snapshot tests only — catch regressions but not the
  determinism property itself.
