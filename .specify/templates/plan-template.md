# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.1.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Does every recommendation read from real budget / cash-flow / credit / goals state rather than isolated data? | ☐ |
| II | Canada-First & Bilingual | CAD + time-to-goal context; EN/FR throughout; **locale-correct** formatting (fr-CA `1 234,56 $`, not `$1,234.56`)? | ☐ |
| III | Test-First (NON-NEGOTIABLE) | Tests written → approved → failing before implementation, covering happy path + Canadian-banking / bilingual / cross-module edge cases? | ☐ |
| IV | Money Is Exact (NON-NEGOTIABLE) | Integer minor units or arbitrary-precision decimal (never float); explicit unit-tested rounding; pure deterministic math vs known fixtures; idempotent retry-safe state writes; recommend-only (no money movement)? | ☐ |
| V | Security & Least Privilege | TLS + at-rest encryption; secrets/tokens never plaintext/logged/committed and rotatable; authZ on every cross-user boundary; least privilege; **threat model present** if feature touches credentials, aggregation tokens, or another person's data? | ☐ |
| VI | Explainable & Auditable | Recommendations carry inputs + reasoning; confirmed actions + state changes written to an immutable append-only audit trail; withhold-and-ask on missing / stale / conflicting inputs (or a **named, spec-documented default** for a single missing *secondary guardrail* input per the v2.2.0 exception — money inputs still withhold)? | ☐ |
| VII | Module Boundaries, Contracts & Versioning | Cross-module data flows through schema-defined contracts (no shared mutable state); consumer + provider contract tests run in CI; contracts/APIs semver'd with migration + deprecation window for breaking changes? | ☐ |
| VIII | Fresh or Flagged | Every external-feed value carries a freshness timestamp; stale-data recommendations flagged/withheld; timeouts / retries / rate-limit handling on all ingestion paths? | ☐ |
| IX | Simplicity & YAGNI | Complexity justified by real user need; no pre-emptive abstractions; MVP scope? | ☐ |
| QS | Quality Standards | Structured logging with PII/money **redaction** (audit trail kept separate from debug logs); PIPEDA + Quebec Law 25 + Consumer-Driven Banking; export/delete + dormant-account retention bound; **Canadian-region data residency** + cross-border-transfer disclosure; ≤300 ms cold-start / module-switch; WCAG 2.1 AA + bilingual screen-reader labels; not-a-registered-advisor framing? | ☐ |

**Threat model (Principle V)** — REQUIRED when this feature touches credentials, aggregation tokens, or another person's financial data. Link to the spec's threat-model section: [link]. If genuinely out of scope, justify: ___

**Initial Constitution Check** (before Phase 0): [PASS / FAIL — one-line summary]

**Post-Design Constitution Check** (after Phase 1): [PASS / FAIL — one-line summary]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
