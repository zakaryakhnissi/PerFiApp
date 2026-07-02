<!--
SYNC IMPACT REPORT

Version change: 2.1.0 → 2.2.0
Bump rationale: MINOR — scoped refinement of Principle VI; no principle removed.
  - Principle VI (Explainable & Auditable): adds a narrow, documented exception
    permitting a module to substitute a *named, spec-documented default* for a
    single missing **secondary guardrail** input (one that can only constrain or
    warn, never originate a money figure) when the primary inputs are present.
    Missing/stale **money inputs** still MUST withhold. Motivated by Module 1
    Rewards: when CreditState (utilization guardrail) is absent, the best-card
    recommender assumes the healthy utilization band and proceeds, rather than
    withholding the flagship for every user without credit data.
  - Approved by product owner (smail882) on 2026-06-26 via /speckit-clarify on
    feature 002-module-1-rewards.
  - Migration plan: no implementation code exists yet; spec 002 (FR-REW-003) and
    its plan are updated in the same change, and plan-template.md's Principle VI
    gate is updated to recognize the documented-default exception.

Version change: 2.0.0 → 2.1.0
Bump rationale: MINOR — materially expanded guidance, no breaking changes.
  - Principle II (Canada-First & Bilingual): adds locale-correct formatting
    (fr-CA `1 234,56 $`) as part of bilingualism; aligns with spec FR-X-005 / SC-008.
  - Quality Standards → Privacy & Compliance: adds a maximum-retention bound for
    dormant accounts and a data-residency clause (Canadian-region storage +
    cross-border-transfer disclosure); aligns with spec FR-X-019 / FR-X-020.

Version change: 1.0.0 → 2.0.0
Bump rationale: MAJOR — adds new NON-NEGOTIABLE and governance-level principles
  (Money Is Exact; Security & Least Privilege; Explainable & Auditable; Fresh or
  Flagged) and redefines the module-boundaries principle to mandate contract tests
  and semantic versioning. These introduce new mandatory gates, so existing code
  and specs may now be non-compliant — a backward-incompatible governance change.

Modified principles:
  - IV. Module Boundaries with Cross-Module Data
      → VII. Module Boundaries, Contracts & Versioning
      (now mandates consumer/provider contract tests and semver of contracts/APIs)
  - V. Simplicity & YAGNI → IX. Simplicity & YAGNI (renumbered, text unchanged)

Added principles:
  - IV.  Money Is Exact (NON-NEGOTIABLE)
  - V.   Security & Least Privilege
  - VI.  Explainable & Auditable
  - VIII. Fresh or Flagged (External Data Integrity)

Added / expanded sections:
  - Quality Standards → Privacy & Compliance: expanded to PIPEDA + Quebec Law 25 +
    Consumer-Driven Banking, data retention/right-to-deletion/export, and a
    not-a-registered-advisor advice-liability stance.
  - Quality Standards → Observability: clarified PII/monetary-value redaction and
    separation of the audit trail from debug logs, for consistency with Principle V.

Removed sections: none.

Templates brought into compliance with v2.1.0 on 2026-06-26 (closes spec FR-X-018 / SC-016):
  - ✅ .specify/templates/plan-template.md — Constitution Check gate wired to all
       nine principles + Quality Standards, with NON-NEGOTIABLE markers and a
       required threat-model link.
  - ✅ .specify/templates/spec-template.md — mandatory Money Correctness and
       Security & Privacy Threat Model sections added.
  - ✅ .specify/templates/tasks-template.md — contract-test (consumer+provider),
       money-correctness, idempotency, audit-trail, redaction, freshness,
       threat-model-mitigation, and locale/bilingual task categories added;
       tests marked mandatory (Principle III).

Follow-up TODOs: none — template-compliance gate satisfied; P1 submodule specs
  may now be authored.
-->


# FinOS Constitution

## Core Principles

### I. Integration-First
Every feature must connect to the user's real financial picture. No module works in isolation — every recommendation (use this card, cancel this sub, wait to buy) is evaluated against actual budget, cash-flow, credit state, and goals. A perks suggestion that ignores utilization, or a deal that triggers overspending, is a failure.

### II. Canada-First & Bilingual
FinOS is built for Canadian programs, banks, cards, and rules by default. All monetary values are displayed in CAD with time-to-goal context. The UI, notifications, and content are bilingual (EN/FR) throughout — not as an afterthought. Bilingualism includes **locale-correct formatting**: monetary values, percentages, and dates MUST follow the active locale's conventions (e.g. fr-CA renders `1 234,56 $`, not `$1,234.56`); a value formatted with the wrong locale convention is a bilingual defect even when the surrounding labels are translated.

### III. Test-First (NON-NEGOTIABLE)
TDD mandatory: tests written → user approved → tests fail → implement. Red-Green-Refactor strictly enforced. No feature ships without tests covering the happy path and the key edge cases specific to Canadian banking rules, bilingual content, and multi-module data dependencies.

### IV. Money Is Exact (NON-NEGOTIABLE)
All monetary values MUST use integer minor units (cents) or arbitrary-precision decimal — never binary floating point. Rounding rules MUST be explicit, documented, and unit-tested. Every financial calculation MUST be pure, deterministic, and verified against known fixtures, including Canadian tax, fee, and interest edge cases. Any state FinOS writes on the user's behalf (roundup ledgers, scheduled reminders, goal progress) MUST be idempotent and safe to retry. FinOS recommends actions only — it MUST NOT execute money movement on the user's behalf; every money action is surfaced for explicit, per-action user execution. Rationale: floating-point money and non-deterministic math are the most common and most damaging fintech defects.

### V. Security & Least Privilege
Financial data and PII MUST be encrypted in transit (TLS) and at rest. Bank-aggregation tokens, OAuth credentials, and secrets MUST NEVER be stored in plaintext, committed to the repository, or written to logs, and MUST be rotatable. Authentication and authorization MUST be enforced on every cross-user boundary, including Household & Family roles and permissions. Any feature that touches credentials, aggregation tokens, or another person's financial data MUST include a threat model in its spec. Access defaults to least privilege. Rationale: an aggregator concentrates a user's entire financial life — a single leak is catastrophic.

### VI. Explainable & Auditable
Every recommendation MUST carry the inputs and reasoning that produced it ("why this card", "why wait to buy") so it can be shown to the user and reproduced during debugging. Every action the user confirms and every change to financial state MUST be recorded in an immutable, append-only audit trail. When inputs are missing, stale, or conflicting, the fail-safe default is to withhold the recommendation and ask — never guess. **Documented-default exception (v2.2.0):** a module MAY substitute a *named, spec-documented default* for a single missing **secondary guardrail** input — one that can only constrain or warn a recommendation, never originate a money figure — when the primary recommendation inputs are present and the default is recorded in the feature spec. This documented-default path is distinct from guessing a user-specific value and does not require a user-facing flag; missing or stale **money inputs** (balances, amounts, valuations, rates) MUST still withhold. Rationale: a finance assistant earns trust only when its advice is transparent and traceable; a named, auditable default for a non-money guardrail keeps a flagship usable without compromising money correctness.

### VII. Module Boundaries, Contracts & Versioning
Each module tab (Rewards, Credit, Cash Safety, Bills, etc.) owns its domain and exposes a clean API to other modules. Cross-module intelligence (e.g. a best-card recommendation that checks budget AND credit utilization) MUST flow through explicit, schema-defined data contracts — never shared mutable state. Every contract MUST have consumer and provider contract tests that run in CI. Contracts and public APIs MUST follow semantic versioning; breaking changes require a version bump, a migration plan, and a deprecation window. Rationale: cross-module recommendations are only as reliable as the contracts they depend on.

### VIII. Fresh or Flagged
Every value sourced from an external feed (bank balances, credit data, FX rates, deals) MUST carry a freshness timestamp. Recommendations computed on stale data MUST be flagged or withheld — e.g. no runway calculation on a multi-day-old balance. External-source failures MUST degrade gracefully and MUST NOT produce incorrect money advice; timeouts, retries, and rate-limit handling are mandatory on all ingestion paths. Rationale: confident advice from stale data is worse than no advice.

### IX. Simplicity & YAGNI
Start simple. Every piece of complexity must be justified by a real user need. No pre-emptive abstractions. Three similar cases before extracting a helper. Features ship at MVP scope; no gold-plating.

## Quality Standards

- **Observability**: Structured logging required on all data ingestion, sync, and recommendation paths. Logs MUST redact PII and monetary values; the immutable audit trail (Principle VI) is kept separate from debug logs. Text I/O ensures debuggability.
- **Privacy & Compliance**: No financial data leaves the device or service boundary without explicit user consent. Canadian financial data is handled under PIPEDA and Quebec's Law 25; data aggregation follows Canada's Consumer-Driven Banking (open banking) standards. Users have the right to export and delete their data, and retention is limited to what each feature genuinely needs — including a maximum retention bound for dormant accounts, not only deletion-on-request. **Data residency**: Canadian users' financial data and PII are stored and processed on Canadian-region infrastructure; any cross-border transfer or processing MUST be explicitly disclosed and covered by an accountability/transfer agreement (PIPEDA accountability for cross-border transfers), and all subprocessors MUST satisfy this constraint. FinOS provides informational decision support only and is not a registered financial advisor; recommendations are not regulated financial advice.
- **Performance**: Cold-start and module-switch under 300 ms on mid-range Canadian devices.
- **Accessibility**: WCAG 2.1 AA minimum; bilingual screen-reader labels required.

## Development Workflow

- Specs written in `.specify/` before any implementation begins.
- All PRs verified against this constitution before merge.
- Breaking changes to data contracts follow Principle VII (version bump + migration plan + deprecation window).
- Features touching credentials, aggregation tokens, or cross-user financial data include a threat model (Principle V).
- Complexity must be justified in the PR description. Unexplained complexity is grounds for rejection.

## Governance

This constitution supersedes all other practices. Amendments require a written rationale, approval from the product owner, and a migration plan for existing code.

Versioning of this constitution follows semantic versioning: MAJOR for backward-incompatible governance or principle removals/redefinitions, MINOR for new principles or materially expanded guidance, PATCH for clarifications and wording.

All PRs and reviews must verify compliance with these principles. Use [CLAUDE.md](../../CLAUDE.md) for runtime development guidance.

**Version**: 2.2.0 | **Ratified**: 2026-06-10 | **Last Amended**: 2026-06-26
**Approved by**: smail882 (product owner) — v2.0.0 on 2026-06-24, v2.1.0 on 2026-06-25, v2.2.0 on 2026-06-26
