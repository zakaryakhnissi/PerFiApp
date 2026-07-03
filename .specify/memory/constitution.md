<!--
Sync Impact Report
==================
Version change: (template, unversioned) → 1.0.0 (initial ratification)
Modified principles: n/a — all five principles newly defined from template placeholders
Added sections:
  - Core Principles (I–V)
  - Technical Stack & Constraints
  - Development Workflow & Git Practices
  - Governance
Removed sections: none (template placeholder slots filled)
Templates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate is constitution-driven; no edit needed
  - ✅ .specify/templates/spec-template.md — prioritized, independently-testable stories align with Principles IV & V; no edit needed
  - ✅ .specify/templates/tasks-template.md — updated: tests are NOT optional for financial logic (Principle V)
  - ✅ .specify/templates/checklist-template.md — generic; no edit needed
Follow-up TODOs: none
-->

# PerFiApp Constitution

## Core Principles

### I. Canada-First, Bilingual by Design

Every feature MUST ship in English and Canadian French (FR-CA) together. User-facing
strings MUST use i18n keys from the first commit — hardcoded user-facing text is a merge
blocker. Canadian programs, banks, regulations, and formats (CAD currency, `en-CA` and
`fr-CA` locales, Canadian date/number formatting) are the default target; support for
global programs is an extension of the Canadian baseline, never the other way around.

**Rationale**: Canada-first + bilingual is PerFiApp's core market differentiation. Retrofitting
i18n or Canadian rules after the fact is consistently more expensive than building them in.

### II. Money Is Exact (NON-NEGOTIABLE)

All monetary amounts MUST be stored and computed as integer minor units (cents) with an
explicit currency code. Floating-point types are forbidden in any money computation,
storage, or transport format. Rounding rules MUST be explicit at every division or
percentage step and MUST be covered by tests. Every change that touches money math MUST
include tests covering rounding and edge cases (zero, negative, minimum/maximum, and
cross-currency where applicable).

**Rationale**: PerFiApp's entire value proposition is trustworthy financial recommendations;
a single float-rounding bug destroys that trust and can cause real financial harm.

### III. Privacy & Security First

Financial data MUST be handled to a PIPEDA-grade standard: least-privilege access,
data minimization, and explicit purpose for every piece of personal data collected. No
secrets, tokens, or credentials in the repository — ever. No real financial or personal
data in tests, fixtures, or documentation. Changes touching authentication, data storage,
APIs, or financial data flows MUST receive a security-reviewer pass before merge.

**Rationale**: PerFiApp aggregates the most sensitive data a person has. Privacy failures
are unrecoverable reputationally and carry regulatory consequences in Canada.

### IV. Spec-Driven Development

Features MUST flow through the Spec Kit pipeline: constitution → `/speckit-specify` →
`/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`. No
implementation work begins before an approved spec and plan exist. The artifacts under
`.specify/` and `specs/` are the source of truth for what is being built and why;
disagreements are resolved by amending the spec, not by diverging code.

**Rationale**: A 16-module product vision built by an AI-agent team needs a single
authoritative pipeline to prevent scope drift and keep humans in control of intent.

### V. Test-First for Financial Logic

Money math, credit calculations, and recommendation logic MUST be developed
test-first: tests are written and observed failing before implementation (Red-Green-Refactor).
UI and glue code MUST have meaningful coverage of behavior but are not held to strict TDD.
Test tasks for financial logic are mandatory in every `/speckit-tasks` output that touches it.

**Rationale**: Financial correctness is the product. TDD on the financial core gives
executable proof of correctness where it matters most, without slowing down UI iteration.

## Technical Stack & Constraints

The approved stack for the mobile-first MVP:

- **Mobile app**: React Native + Expo, TypeScript with `strict` mode enabled.
- **Backend**: Node.js + TypeScript, NestJS, PostgreSQL.
- **Monorepo**: pnpm workspaces — `apps/mobile`, `apps/api`, and `packages/*` for shared
  code, including the money primitives (integer minor units) and i18n primitives shared
  across app and API.
- **i18n**: i18next (react-i18next + expo-localization). Both `en` and `fr-CA` resource
  files MUST be complete for a feature to merge.

Changing this stack (language, framework, database, or monorepo layout) REQUIRES a
constitution amendment. Per-feature technical detail (libraries, schemas, API shapes) is
decided in that feature's `/speckit-plan` and does not require an amendment.

## Development Workflow & Git Practices

- **Branch naming**: Spec Kit feature branches use `NNN-feature-name` (created by
  `/speckit-specify`). All other work uses `type/short-description` with these types:
  `feature/`, `fix/`, `docs/`, `ci/`, `security/`, `research/`, `improve/`.
- **Commits**: Conventional Commits are required (`feat:`, `fix:`, `docs:`, `ci:`,
  `security:`, `refactor:`, `test:`, `chore:`), written in the imperative mood and scoped
  where useful (e.g., `feat(rewards): …`), consistent with existing repository history.
- **No direct pushes to `main`**: all changes land via pull request.
- **PR review**: the automated review (`code-reviewer` + `security-reviewer` via
  `.github/workflows/pr-review.yml`) is advisory, but every finding MUST be either
  addressed or explicitly dismissed with a reason in the PR thread.
- **PR scope**: PRs SHOULD be small and single-purpose. A PR that changes the
  constitution, specs, or plans under `.specify/` also receives the `spec-lead-reviewer`
  pass.

## Governance

This constitution supersedes all other practices in this repository. Where a document,
agent instruction, or habit conflicts with it, the constitution wins until amended.

- **Amendments**: made via pull request modifying `.specify/memory/constitution.md`,
  including a rationale, and reviewed like any other change (including the
  `spec-lead-reviewer` pass).
- **Versioning**: the constitution follows semantic versioning — MAJOR for principle
  removals or redefinitions, MINOR for new principles or materially expanded sections,
  PATCH for wording and clarifications.
- **Compliance**: adherence is checked at the `/speckit-plan` Constitution Check gate and
  during `/speckit-analyze`; violations must be justified in the plan's Complexity
  Tracking table or resolved before implementation.
- **Runtime guidance**: `CLAUDE.md` provides day-to-day operating guidance for agents and
  MUST stay consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-07-03 | **Last Amended**: 2026-07-03
