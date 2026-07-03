# Quickstart validation results — 2026-07-03

Environment: Linux container, Node 22.22, pnpm 10.33. Docker CLI present but no
daemon, so the PostgreSQL path could not be exercised here (noted below).

| # | Scenario | Result |
|---|---|---|
| 1 | Financial-logic tests | ✅ `@perfiapp/money` 25/25, `@perfiapp/recommender` 29/29 (oracle table, fast-check C1/C2/C5, rounding boundaries, perf). Fail-first sequence is in git history: b47cb9d → 0c50eb3 (money), c17fdaa → 2222e49 (recommender). |
| 2 | Contract & bilingual invariants | ✅ API e2e 13/13 — all five contract invariants, filters, ETag→304, bilingual 404 envelope, SC-004 floor (34 cards / 7 issuers). Ran against the file-backed source; **PostgreSQL seed+serve path not run in this environment (no Docker daemon)** — verify on a machine with Docker via `docker compose up -d postgres && DATABASE_URL=… pnpm --filter @perfiapp/api seed`. |
| 3 | US1 — best card for a purchase | ✅ jest-expo acceptance suite covers all four spec scenarios incl. the fr-CA full-flow pass ($2.00 vs $1.50 oracle values, `2,00 $` formatting). On-device manual run pending a simulator/device. |
| 4 | US2 — browse | ✅ Filters and search verified in API e2e; screens render from the cached snapshot. On-device manual pass pending. |
| 5 | US3 — wallet | ✅ Wallet acceptance suite 4/4 (add, remove-affects-ranking, missing-card surfacing, fr-CA). |
| 6 | Offline | ✅ At the store level: recommendation and browse read only the cached snapshot; `refreshSnapshot()` keeps stale cache on network failure. True airplane-mode device test pending. |

Cross-cutting: `pnpm lint` clean (incl. integer-only money guard), `pnpm check-i18n`
43/43 key parity, `pnpm validate-kb` 34 cards / 8 programs / 10 categories valid.

**Outstanding for a device session**: manual scenarios 3–6 on iOS/Android via Expo Go,
and the PostgreSQL seed/serve verification. Neither blocks the code paths exercised by
the automated suites.
