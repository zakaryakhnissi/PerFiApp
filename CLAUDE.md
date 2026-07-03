# PerFiApp — Agent Operating Guide

PerFiApp is a Canada-first, bilingual (EN/FR-CA) personal-finance operating system
("FinOS"). The project is **early stage**: product vision and process tooling are in
place, but application code has not been started yet.

The project constitution at [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
is the authoritative source of principles and constraints — read it before making
non-trivial changes. This file is the day-to-day summary.

## Repository map

- `docs/PDR_PerFiApp.md` — product definition: full module/submodule table and competitor analysis.
- `docs/AGENT_TEAM.md` — the AI agent roster in `.claude/agents/` and how it is used.
- `docs/research/` — dated reports from the weekly automated researcher.
- `.specify/` — Spec Kit assets (constitution, templates, extensions). Feature specs land in `specs/NNN-feature-name/`.
- `.github/workflows/` — automated PR review and weekly research workflows.

## Workflow: spec-driven development

Features flow through Spec Kit — never start implementation without an approved spec and
plan: constitution → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-implement`.

Always use the `speckit-*` slash commands (skills) to create or modify Spec Kit
artifacts; do not hand-edit files under `.specify/` or `specs/` outside those commands
(constitution changes go through `/speckit-constitution`).

## Technical stack (approved — changes require a constitution amendment)

- **Mobile app (MVP target)**: React Native + Expo, TypeScript (`strict` mode).
- **Backend**: Node.js + TypeScript, NestJS, PostgreSQL.
- **Monorepo**: pnpm workspaces — `apps/mobile`, `apps/api`, `packages/*` (shared money
  and i18n primitives live in packages, used by both app and API).
- **i18n**: i18next (react-i18next + expo-localization); `en` and `fr-CA` resources are
  both mandatory for merge.

## Non-negotiable conventions

- **Money is exact**: integer minor units (cents) + explicit currency everywhere; never
  floats in money math; rounding is explicit and tested.
- **Bilingual by design**: no hardcoded user-facing strings; i18n keys from the first
  commit; EN + FR-CA ship together.
- **Privacy & security**: no secrets in the repo; no real financial/personal data in
  tests or fixtures; changes touching auth, storage, APIs, or financial data flows get a
  `security-reviewer` pass.
- **Test-first for financial logic**: money math, credit calculations, and
  recommendation logic are TDD (failing test before implementation).

## Git practices

- **Branches**: Spec Kit feature branches use `NNN-feature-name` (created by
  `/speckit-specify`). Everything else uses `type/short-description` with types
  `feature/`, `fix/`, `docs/`, `ci/`, `security/`, `research/`, `improve/`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `ci:`, `security:`,
  `refactor:`, `test:`, `chore:`), imperative mood, scoped where useful
  (e.g., `feat(rewards): add points wallet schema`).
- **No direct pushes to `main`** — all changes go through a pull request.
- **PRs**: small and single-purpose. Automated PR review findings are advisory but must
  be addressed or explicitly dismissed with a reason. PRs touching `.specify/`
  constitution/spec/plan files also get the `spec-lead-reviewer` pass.

## Agent team

Specialized agents live in `.claude/agents/` (spec-lead, architect, implementer,
test-engineer, code-reviewer, security-reviewer, debugger, researcher). Delegate to them
per their descriptions — see `docs/AGENT_TEAM.md` for the full flow.

## Spec Kit managed context

The section below is maintained automatically by the agent-context extension
(`/speckit-agent-context-update`) — do not edit it by hand.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
(none yet — the first feature has not entered the Spec Kit pipeline).
<!-- SPECKIT END -->
