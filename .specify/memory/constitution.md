# FinOS Constitution

## Core Principles

### I. Integration-First
Every feature must connect to the user's real financial picture. No module works in isolation — every recommendation (use this card, cancel this sub, wait to buy) is evaluated against actual budget, cash-flow, credit state, and goals. A perks suggestion that ignores utilization, or a deal that triggers overspending, is a failure.

### II. Canada-First & Bilingual
FinOS is built for Canadian programs, banks, cards, and rules by default. All monetary values are displayed in CAD with time-to-goal context. The UI, notifications, and content are bilingual (EN/FR) throughout — not as an afterthought.

### III. Test-First (NON-NEGOTIABLE)
TDD mandatory: tests written → user approved → tests fail → implement. Red-Green-Refactor strictly enforced. No feature ships without tests covering the happy path and the key edge cases specific to Canadian banking rules, bilingual content, and multi-module data dependencies.

### IV. Module Boundaries with Cross-Module Data
Each module tab (Rewards, Credit, Cash Safety, Bills, etc.) owns its domain and exposes a clean API to other modules. Cross-module intelligence (e.g. a best-card recommendation that checks budget AND credit utilization) is implemented through explicit data contracts, not shared mutable state.

### V. Simplicity & YAGNI
Start simple. Every piece of complexity must be justified by a real user need. No pre-emptive abstractions. Three similar cases before extracting a helper. Features ship at MVP scope; no gold-plating.

## Quality Standards

- **Observability**: Structured logging required on all data ingestion, sync, and recommendation paths. Text I/O ensures debuggability.
- **Privacy by default**: No financial data leaves the device or service boundary without explicit user consent. Canadian financial data handled under PIPEDA.
- **Performance**: Cold-start and module-switch under 300 ms on mid-range Canadian devices.
- **Accessibility**: WCAG 2.1 AA minimum; bilingual screen-reader labels required.

## Development Workflow

- Specs written in `.specify/` before any implementation begins.
- All PRs verified against this constitution before merge.
- Breaking changes to cross-module data contracts require a migration plan in the PR.
- Complexity must be justified in the PR description. Unexplained complexity is grounds for rejection.

## Governance

This constitution supersedes all other practices. Amendments require a written rationale, approval from the product owner, and a migration plan for existing code.

All PRs and reviews must verify compliance with these principles. Use [CLAUDE.md](../../CLAUDE.md) for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-10 | **Last Amended**: 2026-06-10
