# Implementation Plan: Card Knowledgebase & Best Card Recommender

**Branch**: `001-card-knowledgebase` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-card-knowledgebase/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Ship the first vertical slice of the Rewards & Loyalty module: a curated, bilingual
knowledgebase of Canadian credit cards served by the API as reference data, an on-device
wallet, and a deterministic best-card recommender computed **on the device** from the
cached knowledgebase — so no user data ever leaves the phone. Money math lives in shared
packages (`packages/money`, `packages/recommender`) built test-first in exact integer
cents.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true` everywhere), Node.js 22 LTS

**Primary Dependencies**: React Native + Expo (SDK current at implementation), NestJS 11,
i18next + react-i18next + expo-localization, zod (schema validation), fast-check
(property tests)

**Storage**: PostgreSQL 16 (knowledgebase reference data, API side); AsyncStorage with a
zod-validated, versioned schema (on-device wallet + cached knowledgebase)

**Testing**: Jest (NestJS API and packages), jest-expo (mobile), fast-check for
determinism/rounding property tests; TDD mandatory for `packages/money` and
`packages/recommender` (Constitution Principle V)

**Target Platform**: iOS + Android via Expo; API on Linux container

**Project Type**: mobile app + API (pnpm monorepo)

**Performance Goals**: recommendation computed on-device in <50 ms for a 10-card wallet
(supports SC-001's 10-second end-to-end goal); knowledgebase list screen usable offline
from cache

**Constraints**: offline-capable recommendation once the knowledgebase is cached; no
authentication or server-side user data in this feature; all money values integer cents
CAD; earn rates in basis points (integers)

**Scale/Scope**: ≥30 cards / 5 issuers at launch (SC-004); 10 fixed spend categories;
single-user, single-device

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Canada-First, Bilingual | All KB text fields are `{ enCA, frCA }` pairs validated non-empty at ingest; UI strings via i18next with complete `en-CA` + `fr-CA` resources; currency/number formatting via `Intl` per locale | ✅ PASS |
| II. Money Is Exact | `packages/money` is the only money math entry point: integer cents + `'CAD'` literal, earn rates as integer basis points, point valuations as integer hundredths-of-a-cent per point; explicit half-even rounding at defined boundaries; floats rejected by types and lint rule | ✅ PASS |
| III. Privacy & Security | No accounts, no auth, wallet and recommendations never leave the device; API serves public reference data only; API changes still get the security-reviewer pass at merge | ✅ PASS |
| IV. Spec-Driven | This plan derives from the clarified, checklist-passing spec | ✅ PASS |
| V. Test-First Financial Logic | `packages/money` and `packages/recommender` are TDD: failing tests precede implementation; determinism + rounding property tests required | ✅ PASS |

**Post-design re-check (after Phase 1)**: no violations introduced — the on-device
recommender strengthens Principle III (no user data server-side), and the shared-package
split keeps all Principle II/V surface in two small, test-first packages. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-card-knowledgebase/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── knowledgebase-api.md
│   └── recommender.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
├── mobile/                  # Expo app (TypeScript strict)
│   └── src/
│       ├── screens/         # KB browse/detail, wallet, recommendation
│       ├── store/           # on-device wallet + KB cache (AsyncStorage, zod-versioned)
│       └── i18n/            # i18next init; resources from packages/i18n
└── api/                     # NestJS knowledgebase service
    └── src/
        ├── cards/           # /v1/cards endpoints
        ├── programs/        # /v1/reward-programs endpoints
        ├── categories/      # /v1/spend-categories endpoint
        └── seed/            # curated KB data ingest + validation

packages/
├── money/                   # Money type, rounding, basis-point math (TDD)
├── recommender/             # pure deterministic ranking engine (TDD)
├── kb-schema/               # zod schemas + TS types for KB entities (shared app/api)
└── i18n/                    # en-CA + fr-CA resource files + key types

data/
└── knowledgebase/           # curated card/program source files (validated by kb-schema)
```

**Structure Decision**: pnpm workspace monorepo per the constitution. The recommender is
a **pure package** consumed by the mobile app (not an API endpoint): the wallet is
on-device, so ranking on-device keeps user data local (Principle III) and works offline.
The API's only job in this feature is serving and versioning the curated knowledgebase.
`packages/kb-schema` is shared by the API (ingest/serve validation) and the app (cache
validation) so the two can never drift.

## Complexity Tracking

> No Constitution Check violations — table intentionally empty.
