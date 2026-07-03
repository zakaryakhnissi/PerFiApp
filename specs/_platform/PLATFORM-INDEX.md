# FinOS Platform — Master Index

**Status:** Planning baseline · **Date:** 2026-06-29
**Owner (upstream artifacts):** Spec Kit specialist · **Owner (technical):** Architect / Tech Lead
**Grounded against:** Constitution v2.2.0 · umbrella spec `specs/001-finos-platform/spec.md` · `platform-decisions.md` v1.0.0

---

## How the pieces fit

FinOS is a **Canada-first, bilingual (EN/FR) personal-finance FinOS** built as a **single-language (TypeScript) modular monolith** — a React Native (Expo) client and a NestJS backend deployed as one process, with **one bounded context per spec module (0–15)**.

The shape of the system is a **spine + products** pattern:

- **Module 0 (the spine)** is the single canonical source of balances, transactions, merchants, budget, cash-flow, credit, and goals. It owns the three platform-canonical value objects (`MoneyCents`, `FreshnessStamp`, `Reasoning`) and the swappable Plaid aggregation port. It **never reads product-module state** — there are no circular dependencies.
- **Product modules (1–15)** consume spine contracts (and, increasingly, each other's contracts) and publish their own derived read-models. Cross-module data flows **only** through semver'd JSON-Schema contracts (`finos:<module>/<Name>/<semver>`), never shared mutable state.
- Three non-negotiables thread through every module: **money is exact** (integer CAD cents + decimal-string rates, half-up once, never float), **freshness withholds money** (stale money inputs withhold; secondary guardrails may use the v2.2.0 documented-default), and **security on every cross-user boundary** (server-side authZ on validated session identity, KMS-isolated aggregation tokens, PIPEDA + Québec Law 25 residency).

Sixteen modules are specified, planned, and task-broken-down. The dependency direction flows outward from the spine; delivery is phased P1 → P4 (see `ROADMAP.md`).

---

## Module register (16 modules)

| # | Module | Priority | Spec dir | Tasks | Constitution | Provided | Consumed |
|---|--------|----------|----------|------:|--------------|---------:|---------:|
| 0 | Financial Core & Data Spine | P1 (foundation) | [`specs/003-module-0-spine`](../003-module-0-spine) | 115 | PASS | 11 | 0 |
| 1 | Rewards & Loyalty | P1 | [`specs/002-module-1-rewards`](../002-module-1-rewards) | 80 | CONCERNS | 6 | 6 |
| 2 | Credit & Coaching | P1 | [`specs/004-module-2-credit`](../004-module-2-credit) | 68 | PASS | 4 | 6 |
| 3 | Cash Safety & Autopilot | P1 | [`specs/005-module-3-cash-safety`](../005-module-3-cash-safety) | 66 | PASS | 3 | 7 |
| 4 | Bills & Subscriptions | P2 | [`specs/006-module-4-bills`](../006-module-4-bills) | 85 | PASS | 4 | 6 |
| 5 | Pay & Payment Optimization | P2 | [`specs/007-module-5-pay`](../007-module-5-pay) | 65 | PASS | 2 | 11 |
| 6 | Shopping & Deals | P2 | [`specs/008-module-6-shopping`](../008-module-6-shopping) | 75 | PASS | 4 | 8 |
| 7 | Tasks & To-Dos | P3 | [`specs/009-module-7-tasks`](../009-module-7-tasks) | 62 | PASS | 2 | 9 |
| 8 | Habits & Routines | P3 | [`specs/010-module-8-habits`](../010-module-8-habits) | 61 | CONCERNS | 2 | 8 |
| 9 | Focus & Mental Health | P3 | [`specs/011-module-9-focus`](../011-module-9-focus) | 54 | PASS | 1 | 8 |
| 10 | Inbox & Notifications | P2 | [`specs/012-module-10-inbox`](../012-module-10-inbox) | 81 | PASS | 4 | 7 |
| 11 | Travel & Trips | P3 | [`specs/013-module-11-travel`](../013-module-11-travel) | 70 | CONCERNS | 2 | 7 |
| 12 | Life Admin & Docs | P3 | [`specs/014-module-12-life-admin`](../014-module-12-life-admin) | 65 | PASS | 3 | 5 |
| 13 | Workspace & Playbooks | P3 | [`specs/015-module-13-workspace`](../015-module-13-workspace) | 67 | PASS | 2 | 9 |
| 14 | Household & Family | P3 | [`specs/016-module-14-household`](../016-module-14-household) | 68 | CONCERNS | 3 | 10 |
| 15 | Social & Accountability | P4 | [`specs/017-module-15-social`](../017-module-15-social) | 54 | PASS | 2 | 4 |

**Totals:** 16 modules · **1,124 tasks** · **55 provided contracts** · 11 PASS / 4 CONCERNS / 0 FAIL on the Constitution check.

> Priority bands are derived from the ROADMAP phasing (P1 = spine + first-value loop; P2 = money-action layer; P3 = life-organization layer; P4 = social). They reflect delivery sequencing, not the per-module `plan.md` "P1/P2/P3 user-story" labels, which are internal to each module.

---

## Platform documents

| Document | Purpose |
|----------|---------|
| [`platform-decisions.md`](./platform-decisions.md) | Ratified stack, architecture, data conventions, security/residency, CI gates, decisions log (D1–D10) and NEEDS-RATIFICATION items (NR-1…NR-7). |
| [`ROADMAP.md`](./ROADMAP.md) | Phased delivery plan (P1→P4), critical path, contract dependency order, parallelization, per-phase exit criteria. |
| [`contract-map.md`](./contract-map.md) | Provider→consumer matrix for all 55 contracts, orphan/mismatch audit, shared-value-object reuse check. |
| [`ANALYSIS-REPORT.md`](./ANALYSIS-REPORT.md) | Consolidated cross-module findings (severity-sorted), per-module status, readiness verdict and top blockers. |
| [`ux-foundations.md`](./ux-foundations.md) | Platform UX foundations (bilingual, locale formatting, accessibility, freshness surfacing). |
| [Constitution](../../.specify/memory/constitution.md) | v2.2.0 — the nine enduring principles and the v2.2.0 documented-default exception. |
| [Umbrella spec](../001-finos-platform/spec.md) | FinOS platform-level specification (cross-cutting FR-X-* requirements and SC-* success criteria). |

---

## Contract namespaces (provider ground truth)

`finos:spine/*` and `finos:common/*` (M0) · `finos:rewards/*` (M1) · `finos:credit/*` (M2) · `finos:cashsafety/*` (M3, **un-hyphenated**) · `finos:bills/*` (M4) · `finos:pay/*` (M5) · `finos:shopping/*` (M6) · `finos:tasks/*` (M7) · `finos:habits/*` (M8) · `finos:focus/*` (M9) · `finos:inbox/*` (M10) · `finos:travel/*` (M11) · `finos:lifeadmin/*` (M12) · `finos:workspace/*` (M13) · `finos:household/*` (M14) · `finos:social/*` (M15).

> **✅ RESOLVED (2026-06-30):** the CRITICAL `finos:cash-safety/*` hyphenation orphan (C-1) and all analyze findings (H-1, M-1…M-6) have been remediated and verified — **0 contract orphans**, 0 hyphenated refs, 0 invalid schemas across all 55 provided contracts. See [REMEDIATION-LOG.md](./REMEDIATION-LOG.md). The original findings in `contract-map.md` / `ANALYSIS-REPORT.md` are retained as the point-in-time analysis snapshot.
