export const meta = {
  name: 'finos-platform-foundation',
  description: 'Ratify FinOS platform architecture + author cross-cutting UX foundations (Workflow 1 of 4)',
  phases: [
    { title: 'Architecture', detail: '3 architect proposals from distinct angles' },
    { title: 'Synthesis', detail: 'judge + write specs/_platform/platform-decisions.md' },
    { title: 'UX', detail: 'author specs/_platform/ux-foundations.md' },
  ],
}

const CONTEXT = [
  'You are designing the technical/UX foundation for FinOS (PerFiApp), a Canadian, bilingual (EN/FR), mobile-first personal-finance "operating system".',
  '',
  'READ FIRST (authoritative inputs in this repo):',
  '- .specify/memory/constitution.md (v2.2.0 — NON-NEGOTIABLE)',
  '- specs/001-finos-platform/spec.md (umbrella platform spec: 16 modules, FR-X-* cross-cutting reqs, SC-* success criteria, assumptions)',
  '- specs/002-module-1-rewards/ (the gold-standard module already built: spec.md, plan.md, data-model.md, contracts/, quickstart.md, tasks.md) — match this quality bar and structure.',
  '',
  'Honor EVERY constitution principle, especially: IV Money Is Exact (integer minor units/cents + arbitrary-precision decimal, NEVER binary float; explicit half-up rounding; recommend-only, no money movement); V Security & Least Privilege (encryption, token isolation/rotation, server-side authZ, threat models); VI Explainable & Auditable (inputs+reasoning on every recommendation; append-only audit trail; withhold-and-ask, with the v2.2.0 documented-default exception for a single missing secondary guardrail input); VII Module Boundaries via versioned schema contracts (NOT microservices unless justified); II Canada-first, bilingual EN/FR, locale-correct formatting (fr-CA "1 234,56 $"), Canadian data residency; VIII Fresh or Flagged; III Test-First; IX Simplicity/YAGNI.',
].join('\n')

const ARCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'mobile', 'backend', 'datastore', 'money', 'auth', 'aggregation', 'residency', 'moduleBoundaries', 'audit', 'testing', 'rationale', 'tradeoffs', 'risks'],
  properties: {
    name: { type: 'string' },
    mobile: { type: 'string', description: 'mobile framework + language' },
    backend: { type: 'string', description: 'backend runtime/framework + language' },
    datastore: { type: 'string', description: 'database + region strategy' },
    money: { type: 'string', description: 'monetary representation + rounding library' },
    auth: { type: 'string', description: 'auth + MFA for high-risk actions' },
    aggregation: { type: 'string', description: 'bank aggregation approach (Plaid Canada, swappable behind Module 0 contracts)' },
    residency: { type: 'string', description: 'Canadian-region residency + cross-border handling' },
    moduleBoundaries: { type: 'string', description: 'how module boundaries + versioned contracts are enforced' },
    audit: { type: 'string', description: 'audit trail + observability + redaction' },
    testing: { type: 'string', description: 'testing + CI gates' },
    rationale: { type: 'string' },
    tradeoffs: { type: 'string' },
    risks: { type: 'string' },
  },
}

const ANGLES = [
  { key: 'ts-unified', brief: 'Optimize for type-sharing and velocity: TypeScript everywhere — React Native/Expo mobile + a NestJS modular-monolith backend with one bounded context per module and versioned internal contract packages; decimal.js + integer cents; PostgreSQL in a Canadian region.' },
  { key: 'correctness-first', brief: 'Optimize for money-correctness, reliability, and auditability: consider a JVM (Kotlin) or Go backend with strong money types and an event-sourced append-only audit trail; mobile React Native or Flutter; rigorous contract tests. Justify any added polyglot complexity against Principle IX (Simplicity).' },
  { key: 'pragmatic-mvp', brief: 'Optimize for the fastest path to a compliant Canadian MVP that hits 10-minutes-to-first-value onboarding: managed Postgres (e.g. Supabase) in a Canadian region, React Native/Expo, minimal ops/devops — but never compromising money-exactness, Canadian residency, bilingual, or security requirements.' },
]

phase('Architecture')
const proposalsRaw = await parallel(ANGLES.map((a) => () =>
  agent(
    CONTEXT + '\n\nPropose a COMPLETE platform architecture for FinOS from this angle: "' + a.key + '". ' + a.brief + '\n\nThink hard and be specific + Canada-aware. Cover every schema field. Put deeper reasoning, trade-offs, and the top risks in the rationale/tradeoffs/risks fields. Ground choices in the constitution and the umbrella spec cross-cutting requirements (FR-X-001..020).',
    { agentType: 'architect', schema: ARCH_SCHEMA, label: 'arch:' + a.key, phase: 'Architecture', effort: 'high' }
  )
))
const proposals = proposalsRaw.filter(Boolean)

phase('Synthesis')
const decision = await agent(
  CONTEXT + '\n\nThree platform-architecture proposals follow as JSON. Critically compare them against the constitution and the umbrella spec, then SYNTHESIZE a single ratified architecture — you MAY graft the best ideas from each; do not merely pick one.\n\nPROPOSALS:\n' + JSON.stringify(proposals, null, 2) + '\n\nThen WRITE the file specs/_platform/platform-decisions.md (create the directory) containing:\n1. One-paragraph executive summary.\n2. Ratified stack table: mobile, backend, datastore+region, money representation, auth/MFA, aggregation, secrets/KMS, audit, i18n/locale, hosting.\n3. Architecture: modular monolith with one bounded context per module; versioned contract packages; how cross-module data flows through schema contracts (never shared mutable state); how Module 0 / the spine is isolated and the aggregation provider (Plaid Canada) is swappable.\n4. Data conventions: integer cents (bigint) + decimal.js arbitrary-precision rates; UTC storage + locale formatting; freshness stamps on all external-sourced values.\n5. Security & residency: token isolation/rotation (FR-CORE-007), server-side authZ on every cross-user boundary, MFA gates (FR-X-017), Canadian-region residency + cross-border disclosure (FR-X-020), PIPEDA + Quebec Law 25.\n6. Testing & CI gates: TDD (Principle III), Pact consumer+provider contract tests (Principle VII), mandatory money fixtures, bilingual/locale checks, 300ms cold-start/module-switch budget, WCAG 2.1 AA.\n7. Decisions log: each decision with rationale + rejected alternatives; flag any NEEDS-RATIFICATION items but DO NOT block — document them.\nThis doc is referenced by every module plan, so make it concrete and unambiguous. Return a concise summary of the ratified stack and any open items.',
  { agentType: 'architect', label: 'platform-decisions', phase: 'Synthesis', effort: 'high' }
)

phase('UX')
const ux = await agent(
  CONTEXT + '\n\nAuthor the cross-cutting UX/UI foundation that EVERY FinOS module will follow. Also read specs/_platform/platform-decisions.md if present. WRITE the file specs/_platform/ux-foundations.md covering:\n- Design principles that operationalize the constitution: Explainable (every recommendation renders as a "recommendation card" = the action + an expandable "why" showing its inputs/reasoning + a freshness chip + a confidence/withheld state); Recommend-never-execute (every money action routes through an explicit "Review & confirm" sheet; the UI NEVER auto-executes); Fresh-or-Flagged (freshness chips; greyed/stale states + refresh CTA; an explicit withhold-and-ask UI when inputs are missing/stale); Canada-first & bilingual (EN/FR throughout; locale-correct money/number/date formatting incl. fr-CA "1 234,56 $").\n- A STATES MATRIX every data view must define: empty (e.g. no accounts connected), loading (skeletons), partial (only some accounts connected, mark incomplete), stale (flagged), error/degraded (feed down, degrade gracefully, never wrong money advice), withheld (missing inputs, ask).\n- Component specs (with ASCII wireframes): Recommendation Card; Confirm-Action sheet; Freshness chip; Conflict banner (when modules disagree, e.g. Rewards wants the high-points card but Cash Safety flags overdraft risk, show the conflict and that Cash Safety SafeToActSignal takes precedence).\n- Information architecture / navigation (tab-per-module, P1 tabs first), onboarding (connect-first, 10-minutes-to-first-value per SC-014), notification restraint (at most 2 money notifications/day, digest pattern owned by the Inbox module), accessibility (WCAG 2.1 AA, bilingual screen-reader labels, dynamic type, large tap targets, reduced-motion), and the money/number/date display rules.\nThink hard about real edge cases (no connection, partial connection, stale data, conflicting advice, multi-profile/household privacy, first-run empty states, fr-CA formatting). Return a concise summary of the key patterns you defined.',
  { agentType: 'ui-designer', label: 'ux-foundations', phase: 'UX', effort: 'high' }
)

return { ratifiedStack: decision, uxFoundation: ux, proposalCount: proposals.length }
