export const meta = {
  name: 'finos-modules-2-15',
  description: 'Author full Spec Kit artifacts for FinOS modules 2-15 (fan-out: spec -> plan) (Workflow 3 of 4)',
  phases: [
    { title: 'Spec', detail: 'per-module spec + data-model + contracts + research' },
    { title: 'Plan', detail: 'per-module plan + quickstart + tasks' },
  ],
}

const MODULES = [
  { num: 2, name: 'Credit & Coaching', slug: 'module-2-credit', dir: 'specs/004-module-2-credit', priority: 'P1', fr: 'FR-CRD' },
  { num: 3, name: 'Cash Safety & Autopilot', slug: 'module-3-cash-safety', dir: 'specs/005-module-3-cash-safety', priority: 'P1', fr: 'FR-CASH' },
  { num: 4, name: 'Bills & Subscriptions', slug: 'module-4-bills', dir: 'specs/006-module-4-bills', priority: 'P2', fr: 'FR-BILL' },
  { num: 5, name: 'Pay & Payment Optimization', slug: 'module-5-pay', dir: 'specs/007-module-5-pay', priority: 'P2', fr: 'FR-PAY' },
  { num: 6, name: 'Shopping & Deals', slug: 'module-6-shopping', dir: 'specs/008-module-6-shopping', priority: 'P2', fr: 'FR-SHOP' },
  { num: 7, name: 'Tasks & To-Dos', slug: 'module-7-tasks', dir: 'specs/009-module-7-tasks', priority: 'P3', fr: 'FR-TASK' },
  { num: 8, name: 'Habits & Routines', slug: 'module-8-habits', dir: 'specs/010-module-8-habits', priority: 'P3', fr: 'FR-HAB' },
  { num: 9, name: 'Focus & Mental Health', slug: 'module-9-focus', dir: 'specs/011-module-9-focus', priority: 'P3', fr: 'FR-FOC' },
  { num: 10, name: 'Inbox & Notifications', slug: 'module-10-inbox', dir: 'specs/012-module-10-inbox', priority: 'P2', fr: 'FR-INB' },
  { num: 11, name: 'Travel & Trips', slug: 'module-11-travel', dir: 'specs/013-module-11-travel', priority: 'P3', fr: 'FR-TRV' },
  { num: 12, name: 'Life Admin & Docs', slug: 'module-12-life-admin', dir: 'specs/014-module-12-life-admin', priority: 'P3', fr: 'FR-DOC' },
  { num: 13, name: 'Workspace & Playbooks', slug: 'module-13-workspace', dir: 'specs/015-module-13-workspace', priority: 'P3', fr: 'FR-WS' },
  { num: 14, name: 'Household & Family', slug: 'module-14-household', dir: 'specs/016-module-14-household', priority: 'P3', fr: 'FR-HH' },
  { num: 15, name: 'Social & Accountability', slug: 'module-15-social', dir: 'specs/017-module-15-social', priority: 'P4', fr: 'FR-SOC' },
]

const BASE = [
  'You are authoring Spec Kit artifacts for ONE FinOS module of a Canadian, bilingual (EN/FR), mobile-first personal-finance OS.',
  '',
  'READ FIRST (authoritative, in this repo):',
  '- .specify/memory/constitution.md (v2.2.0 — NON-NEGOTIABLE; note the v2.2.0 documented-default exception to Principle VI).',
  '- specs/_platform/platform-decisions.md — the ratified stack/architecture. INHERIT it; never re-decide platform choices. Mark only genuinely module-specific unknowns.',
  '- specs/_platform/ux-foundations.md — the cross-cutting UX. Reference its components (Recommendation Card, Confirm-Action sheet, Freshness chip, Conflict banner), the six-state matrix, and locale/a11y rules in your UI/UX content.',
  '- specs/001-finos-platform/spec.md — read THIS module section, its functional requirements, the cross-cutting FR-X-001..020, the module Cross-Module Links (Consumes/Provides), Key Entities, and Success Criteria.',
  '- specs/003-module-0-spine/contracts/ — the spine contracts this module CONSUMES (AccountState, TransactionStream, MerchantGraph, BudgetState, CashFlowForecast, CreditState, GoalState, ConnectionConsent). Reference the real contract $id/version; never invent a contract that has no provider.',
  '- specs/002-module-1-rewards/ — the gold-standard EXEMPLAR. Match its structure and quality EXACTLY (spec.md, plan.md, data-model.md, contracts/{provided,consumed}, quickstart.md, tasks.md).',
  '',
  'Constitution must-haves: IV Money Is Exact (integer cents + arbitrary-precision decimal, never float; explicit half-up; recommend-only — NO money movement); V Security (server-side authZ; a Security & Privacy Threat Model is MANDATORY if the module touches credentials, aggregation tokens, or another person’s financial data, e.g. Household/Social/Inbox-email); VI Explainable & Auditable (inputs+reasoning + append-only audit; withhold-and-ask); VII versioned schema contracts (consumer + provider contract tests); II Canada-first/bilingual/locale/residency; VIII Fresh or Flagged; III Test-First; IX Simplicity (P3/P4 modules stay MVP-scoped — thorough analysis, lean feature set). Resolve any ambiguity yourself and DOCUMENT it in a Clarifications section; never block.',
].join('\n')

function specPrompt(m) {
  return BASE +
    '\n\n=== YOUR MODULE: Module ' + m.num + ' — ' + m.name + ' (Priority ' + m.priority + ', requirements ' + m.fr + '-*) ===\n' +
    'Create the directory ' + m.dir + ' (and ' + m.dir + '/contracts/{provided,consumed}). AUTHOR:\n' +
    '1. ' + m.dir + '/spec.md — prioritized, independently-testable user stories (Why-this-priority, Independent Test, Acceptance Scenarios) derived from the umbrella module section + ' + m.fr + '-* requirements; a thorough Edge Cases section (think hard: empty/partial connectivity, stale/missing inputs, conflicting advice with Cash Safety precedence, multi-currency, idempotency/retries, cross-user boundaries); a Money Correctness section IF the module touches monetary values; a Security & Privacy Threat Model section IF it touches credentials/tokens/another person’s data; a Clarifications section recording decisions you make; explicit UI/UX notes referencing ux-foundations.md (which states apply, which components, key screens).\n' +
    '2. ' + m.dir + '/contracts/provided/*.schema.json — JSON Schema (2020-12) for every contract this module PROVIDES to others (per the umbrella Provides list); money = integer cents, rates = decimal strings, external objects carry a FreshnessStamp. Add ' + m.dir + '/contracts/README.md (provided table with version+consumers) and ' + m.dir + '/contracts/consumed/README.md listing the Module 0 / other-module contracts it consumes with min versions.\n' +
    '3. ' + m.dir + '/data-model.md — owned entities, fields, validation, relationships, state transitions; money-typing convention; freshness.\n' +
    '4. ' + m.dir + '/research.md — Phase 0 decisions (Decision/Rationale/Alternatives), inheriting platform-decisions.md and flagging any module-specific vendor/source as a documented open item (non-blocking).\n' +
    'Return a concise list of files written and the $id/version of each PROVIDED contract.'
}

function planPrompt(m) {
  return BASE +
    '\n\n=== YOUR MODULE: Module ' + m.num + ' — ' + m.name + ' (Priority ' + m.priority + ') ===\n' +
    'The spec, data-model, contracts, and research already exist in ' + m.dir + ' (read them, plus specs/_platform/platform-decisions.md and specs/_platform/ux-foundations.md). AUTHOR:\n' +
    '1. ' + m.dir + '/plan.md — follow the Module 1 plan.md structure EXACTLY: full Constitution Check gate table (all 9 principles + Quality Standards, PASS/FAIL/N/A with one-line justifications, referencing constitution v2.2.0), Summary, Technical Context (INHERIT the ratified stack; mark only module-specific unknowns), Project Structure (intra-module layout under the ratified NestJS backend + React Native mobile), Complexity Tracking.\n' +
    '2. ' + m.dir + '/quickstart.md — validation-by-user-story + mandatory money fixtures (if monetary) + consumer/provider contract-test checks.\n' +
    '3. ' + m.dir + '/tasks.md — Module 1 tasks.md format (strict checklist: [ ] T### [P?] [US?] description with file path), grouped by user story in priority order; tests MANDATORY (Principle III); include the constitution-mandated categories (consumer+provider contract tests for each contract, money fixtures where monetary, idempotency, audit trail, redaction, freshness, threat-model mitigations where applicable, locale/bilingual + WCAG).\n' +
    'Before returning, do a quick self-check against the constitution and fix any obvious gaps. Return a concise summary: total task count, tasks per user story, and the Constitution Check result.'
}

phase('Spec')
const results = await pipeline(
  MODULES,
  (m) => agent(specPrompt(m), { agentType: 'spec-lead', effort: 'high', label: 'spec:' + m.slug, phase: 'Spec' }),
  (specResult, m) => agent(planPrompt(m), { agentType: 'spec-lead', effort: 'high', label: 'plan:' + m.slug, phase: 'Plan' }),
)

const done = results.filter(Boolean)
return { modulesPlanned: done.length, ofTotal: MODULES.length, summaries: done }
