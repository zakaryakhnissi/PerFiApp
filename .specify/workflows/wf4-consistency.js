export const meta = {
  name: 'finos-consistency-roadmap',
  description: 'Cross-module analyze + contract provider/consumer consistency + delivery roadmap + master index (Workflow 4 of 4)',
  phases: [
    { title: 'Analyze', detail: 'per-module spec/plan/tasks + constitution analyze (fan-out)' },
    { title: 'Consistency', detail: 'contract provider/consumer matching across all modules' },
    { title: 'Synthesize', detail: 'write PLATFORM-INDEX.md + ROADMAP.md + ANALYSIS-REPORT.md' },
  ],
}

const MODULES = [
  { num: 0, name: 'Financial Core & Data Spine', dir: 'specs/003-module-0-spine', priority: 'P1' },
  { num: 1, name: 'Rewards & Loyalty', dir: 'specs/002-module-1-rewards', priority: 'P1' },
  { num: 2, name: 'Credit & Coaching', dir: 'specs/004-module-2-credit', priority: 'P1' },
  { num: 3, name: 'Cash Safety & Autopilot', dir: 'specs/005-module-3-cash-safety', priority: 'P1' },
  { num: 4, name: 'Bills & Subscriptions', dir: 'specs/006-module-4-bills', priority: 'P2' },
  { num: 5, name: 'Pay & Payment Optimization', dir: 'specs/007-module-5-pay', priority: 'P2' },
  { num: 6, name: 'Shopping & Deals', dir: 'specs/008-module-6-shopping', priority: 'P2' },
  { num: 7, name: 'Tasks & To-Dos', dir: 'specs/009-module-7-tasks', priority: 'P3' },
  { num: 8, name: 'Habits & Routines', dir: 'specs/010-module-8-habits', priority: 'P3' },
  { num: 9, name: 'Focus & Mental Health', dir: 'specs/011-module-9-focus', priority: 'P3' },
  { num: 10, name: 'Inbox & Notifications', dir: 'specs/012-module-10-inbox', priority: 'P2' },
  { num: 11, name: 'Travel & Trips', dir: 'specs/013-module-11-travel', priority: 'P3' },
  { num: 12, name: 'Life Admin & Docs', dir: 'specs/014-module-12-life-admin', priority: 'P3' },
  { num: 13, name: 'Workspace & Playbooks', dir: 'specs/015-module-13-workspace', priority: 'P3' },
  { num: 14, name: 'Household & Family', dir: 'specs/016-module-14-household', priority: 'P3' },
  { num: 15, name: 'Social & Accountability', dir: 'specs/017-module-15-social', priority: 'P4' },
]

const ANALYZE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['module', 'dir', 'constitutionStatus', 'providedContracts', 'consumedContracts', 'taskCount', 'coverageGaps', 'findings'],
  properties: {
    module: { type: 'string' },
    dir: { type: 'string' },
    constitutionStatus: { type: 'string', enum: ['PASS', 'CONCERNS', 'FAIL'] },
    providedContracts: { type: 'array', items: { type: 'string' }, description: 'exact $id of each provided contract' },
    consumedContracts: { type: 'array', items: { type: 'string' }, description: 'exact $id of each consumed contract reference' },
    taskCount: { type: 'integer' },
    coverageGaps: { type: 'array', items: { type: 'string' }, description: 'requirements with no task, or tasks with no requirement' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['severity', 'summary', 'location'],
        properties: {
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          summary: { type: 'string' },
          location: { type: 'string' },
        },
      },
    },
  },
}

phase('Analyze')
const analysesRaw = await pipeline(
  MODULES,
  (m) => agent(
    'Read-only ANALYZE of FinOS Module ' + m.num + ' — ' + m.name + ' at ' + m.dir + '. Read its spec.md, plan.md, tasks.md, data-model.md, and contracts/ (provided + consumed READMEs), plus .specify/memory/constitution.md (v2.2.0). Assess: (1) is the plan Constitution Check honest and is the module actually compliant (money exactness, threat model where it touches credentials/tokens/another person’s data, freshness, bilingual, contracts)? (2) spec<->tasks coverage — does every functional requirement map to at least one task, and any orphan tasks? (3) list the EXACT $id of every contract this module PROVIDES and every contract it CONSUMES (read the schema $id fields / consumed README). Return the structured object. Do NOT edit any file.',
    { agentType: 'spec-lead-reviewer', schema: ANALYZE_SCHEMA, label: 'analyze:m' + m.num, phase: 'Analyze', effort: 'medium' }
  ),
)
const analyses = analysesRaw.filter(Boolean)

phase('Consistency')
const consistency = await agent(
  'You are checking cross-module CONTRACT CONSISTENCY across the whole FinOS platform. Per-module analyses (with each module’s provided + consumed contract $ids) follow as JSON:\n\n' + JSON.stringify(analyses, null, 2) + '\n\nAlso authoritatively read every specs/*/contracts/provided/*.schema.json $id in the repo (Module 0 = specs/003-module-0-spine, Module 1 = specs/002-module-1-rewards, Modules 2-15 = specs/004..017) to build the ground-truth provider set. Then determine: (a) every CONSUMED contract $id that has NO provider anywhere (orphan — CRITICAL); (b) version mismatches between consumer and provider; (c) provided contracts that no one consumes (informational); (d) any module that reinvents a shared value object instead of $ref-ing finos:common/* from Module 0. WRITE specs/_platform/contract-map.md: a full provider→consumers matrix table, plus an Orphans/Mismatches section. Return a concise summary listing every orphan and mismatch (or "none").',
  { agentType: 'spec-lead', effort: 'high', label: 'contract-consistency', phase: 'Consistency' }
)

phase('Synthesize')
const synthesis = await agent(
  'You are producing the FinOS platform-level planning deliverables from the per-module analyses and the contract-consistency report.\n\nPER-MODULE ANALYSES (JSON):\n' + JSON.stringify(analyses, null, 2) + '\n\nCONTRACT CONSISTENCY SUMMARY:\n' + consistency + '\n\nRead specs/_platform/platform-decisions.md and specs/_platform/contract-map.md for grounding. Then WRITE three files:\n' +
  '1. specs/_platform/PLATFORM-INDEX.md — master index: a table of all 16 modules (number, name, priority, directory link, task count, Constitution status, # provided / # consumed contracts), a short "how the pieces fit" intro, and links to platform-decisions.md, ux-foundations.md, contract-map.md, the constitution, and the umbrella spec.\n' +
  '2. specs/_platform/ROADMAP.md — the delivery roadmap: phase the modules P1 -> P2 -> P3 -> P4 honoring dependencies (Module 0 spine first; then P1 Rewards/Credit/Cash-Safety; then P2 Bills/Pay/Shopping/Inbox; then P3; then P4 Social). Show the critical path, the contract dependency order, what can be built in parallel, and the gating items (e.g. spine contracts before consumers; the v2.2.0 documented-default; vendor/PIA open items). Include a per-phase "exit criteria".\n' +
  '3. specs/_platform/ANALYSIS-REPORT.md — consolidated cross-module analysis: a severity-sorted findings table (CRITICAL/HIGH/MEDIUM/LOW) aggregating every module’s findings + the contract orphans/mismatches, then a per-module one-line status, then a "ready for implementation?" verdict with the top blockers to resolve first.\n' +
  'Be concrete and accurate — derive everything from the provided data, do not invent. Return a concise executive summary: total modules planned, total tasks across the platform, # CRITICAL/HIGH findings, # contract orphans, and the single most important next step before implementation.',
  { agentType: 'spec-lead', effort: 'high', label: 'platform-synthesis', phase: 'Synthesize' }
)

return { analyses: analyses.length, consistency, synthesis }
