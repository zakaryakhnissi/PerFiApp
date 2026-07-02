export const meta = {
  name: 'finos-module0-spine',
  description: 'Author Module 0 (Financial Core & Data Spine) full Spec Kit artifacts + adversarial review (Workflow 2 of 4)',
  phases: [
    { title: 'Spec', detail: 'spec.md + data-model.md + contracts/ + research.md' },
    { title: 'Plan', detail: 'plan.md + quickstart.md + tasks.md' },
    { title: 'Review', detail: 'security + spec adversarial review' },
    { title: 'Fix', detail: 'apply critical findings' },
  ],
}

const DIR = 'specs/003-module-0-spine'

const CONTEXT = [
  'You are authoring Spec Kit artifacts for FinOS Module 0 — Financial Core & Data Spine (Priority P1). This is the foundation EVERY other module reads from: a single source of truth for accounts, balances, transactions, merchant graph, budget, cash-flow forecast, credit state, and goals.',
  '',
  'READ FIRST (authoritative, in this repo):',
  '- .specify/memory/constitution.md (v2.2.0 — NON-NEGOTIABLE)',
  '- specs/_platform/platform-decisions.md (ratified stack/architecture — inherit it; do not re-decide platform choices)',
  '- specs/_platform/ux-foundations.md (cross-cutting UX — reference for any UI/UX content, esp. the connection/consent flow)',
  '- specs/001-finos-platform/spec.md — read the "Module 0 — Financial Core & Data Spine" section, the Functional Requirements FR-CORE-001..007, the cross-cutting FR-X-001..020, Key Entities, and Success Criteria SC-*.',
  '- specs/002-module-1-rewards/ — the gold-standard EXEMPLAR. Match its structure and quality exactly: spec.md (user stories with priorities, edge cases, Money Correctness, Security & Privacy Threat Model, Clarifications), plan.md (Constitution Check gate table), data-model.md, contracts/ (provided + consumed JSON schemas), quickstart.md, tasks.md.',
  '',
  'Module 0 is the BROADEST credential/security surface in the product. Its threat model is mandatory and must enumerate (at minimum, per FR-CORE-007 + FR-X-017): aggregation-token exfiltration; account takeover / credential stuffing against the auth surface; IDOR / horizontal privilege escalation on household boundaries — each with mitigations. Token lifecycle: dedicated secrets store / KMS, rotation triggers, per-household-member independent consent grants + tokens, partial revocation. MFA required for issuing/re-authorizing aggregation tokens, modifying household roles, and data export/deletion.',
  '',
  'Honor every constitution principle, especially IV (Money Is Exact — integer cents + arbitrary-precision decimal, never float; explicit rounding; recommend-only), V (Security), VI (Explainable & Auditable), VII (versioned schema contracts), II (Canada-first/bilingual/residency), VIII (Fresh or Flagged), III (Test-First), IX (Simplicity). Where you must resolve an ambiguity, decide and DOCUMENT it in a Clarifications section (do not block).',
].join('\n')

phase('Spec')
const specRes = await agent(
  CONTEXT + '\n\nAUTHOR the following files for Module 0 (create the ' + DIR + ' directory and ' + DIR + '/contracts/{provided,consumed}):\n' +
  '1. ' + DIR + '/spec.md — prioritized user stories for the spine submodules (Account Aggregation & Connection/Consent; Transaction Normalization, Categorization & Dedup; Merchant Graph; Budget & Cash-Flow Forecast; Credit State; Goals & Time-to-Goal; Contract/Freshness layer). Include: Why-this-priority, Independent Test, Acceptance Scenarios, a thorough Edge Cases section (partial connectivity, stale/missing feeds, duplicate transactions, multi-currency, institution unavailable -> manual/statement-import fallback, token revocation, household partial revocation), a mandatory Money Correctness section, a mandatory Security & Privacy Threat Model section (token lifecycle + auth/MFA + IDOR), a Clarifications section recording any decisions you made, and UI/UX notes for the connection/consent + first-run flow referencing ux-foundations.md.\n' +
  '2. ' + DIR + '/contracts/provided/*.schema.json — JSON Schemas (draft 2020-12) for the 7 spine contracts: AccountState, TransactionStream, MerchantGraph, BudgetState, CashFlowForecast, CreditState (include the canonical utilization bands <10/<30/30-50/>50 and freshness), GoalState — PLUS a ConnectionConsent/AggregationLink contract. Money fields are integer cents; rates are decimal strings; every externally-sourced object carries a FreshnessStamp. These are consumed by ALL other modules, so be precise and complete. Add ' + DIR + '/contracts/README.md indexing them with versions + consumers.\n' +
  '3. ' + DIR + '/data-model.md — entities, fields, relationships, validation, state transitions; money-typing convention; freshness semantics.\n' +
  '4. ' + DIR + '/research.md — Phase 0 decisions: aggregation provider mapping (Plaid Canada products -> contracts, kept swappable), transaction normalization/dedup approach, categorization, budgeting + cash-flow forecast method, credit-bureau data source, staleness windows, token storage/rotation. Decision/Rationale/Alternatives format.\n' +
  'Return a concise list of the files you wrote and the exact contract $id/version of each provided contract.',
  { agentType: 'spec-lead', effort: 'high', label: 'm0:spec+data+contracts', phase: 'Spec' }
)

phase('Plan')
const planRes = await agent(
  CONTEXT + '\n\nThe spec, data-model, contracts, and research for Module 0 already exist in ' + DIR + ' (read them, plus specs/_platform/platform-decisions.md). Now AUTHOR:\n' +
  '1. ' + DIR + '/plan.md — follow the Module 1 plan.md structure EXACTLY, including the full Constitution Check gate table (all 9 principles + Quality Standards, marked PASS/FAIL/N/A with one-line justifications, referencing constitution v2.2.0), Summary, Technical Context (inherit the ratified stack from platform-decisions.md — do NOT re-open platform choices; mark only genuinely Module-0-specific unknowns), Project Structure (intra-module layout under the ratified backend), and Complexity Tracking.\n' +
  '2. ' + DIR + '/quickstart.md — validation-by-user-story guide + mandatory money fixtures + consumer/provider contract-test checks.\n' +
  '3. ' + DIR + '/tasks.md — follow the Module 1 tasks.md format (strict checklist: [ ] T### [P?] [US?] description with file path), organized by user story in priority order, tests MANDATORY (Principle III), and include the constitution-mandated categories (consumer+provider contract tests for every provided contract, money fixtures, idempotency, audit trail, redaction, freshness, threat-model mitigations incl. token isolation/rotation + MFA + IDOR, locale/bilingual).\n' +
  'Return a concise summary: total task count, task count per user story, and the Constitution Check result.',
  { agentType: 'spec-lead', effort: 'high', label: 'm0:plan+tasks+quickstart', phase: 'Plan' }
)

phase('Review')
const reviewsRaw = await parallel([
  () => agent(
    'Adversarially SECURITY-review the Module 0 spec + contracts in ' + DIR + ' against constitution v2.2.0 (.specify/memory/constitution.md) and FR-CORE-006/007 + FR-X-009/010/013/017/019/020. Focus: is the aggregation-token lifecycle fully specified (dedicated secrets store, rotation triggers, per-member independent tokens, partial revocation)? Does the threat model enumerate token exfiltration, account takeover/credential stuffing, and IDOR with concrete mitigations? Is server-side authZ mandated on every cross-user boundary? MFA on high-risk actions? PIPEDA/Law 25 deletion cascade + dormant retention + Canadian residency? Report findings as a prioritized list (CRITICAL/HIGH/MEDIUM/LOW) with the exact file + fix. Read-only — do not edit.',
    { agentType: 'security-reviewer', label: 'm0:security-review', phase: 'Review' }
  ),
  () => agent(
    'Adversarially review the Module 0 artifacts in ' + DIR + ' for spec/constitution drift and contract consistency. Check: every provided contract (AccountState, TransactionStream, MerchantGraph, BudgetState, CashFlowForecast, CreditState, GoalState, ConnectionConsent) is well-formed and matches the data-model; money fields are integer cents / decimal strings (no float); the Constitution Check gate table is honest; user stories are independently testable; tasks cover every FR-CORE requirement and provided contract. Report a prioritized findings list (CRITICAL/HIGH/MEDIUM/LOW) with exact file + fix. Read-only — do not edit.',
    { agentType: 'spec-lead-reviewer', label: 'm0:spec-review', phase: 'Review' }
  ),
])
const reviews = reviewsRaw.filter(Boolean)

phase('Fix')
const fix = await agent(
  CONTEXT + '\n\nTwo adversarial reviews of Module 0 follow. APPLY the CRITICAL and HIGH findings by editing the files in ' + DIR + ' (and constitution-template alignment if needed). For MEDIUM/LOW, apply if quick; otherwise record them in the spec Clarifications/Notes. Do not weaken any constitution principle. Keep contracts and data-model consistent.\n\nSECURITY REVIEW:\n' + (reviews[0] || 'n/a') + '\n\nSPEC REVIEW:\n' + (reviews[1] || 'n/a') + '\n\nReturn a concise summary of what you changed and any findings deliberately deferred (with rationale).',
  { agentType: 'spec-lead', effort: 'high', label: 'm0:apply-fixes', phase: 'Fix' }
)

return { spec: specRes, plan: planRes, security: reviews[0], specReview: reviews[1], fixes: fix }
