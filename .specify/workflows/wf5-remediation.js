export const meta = {
  name: 'finos-remediation',
  description: 'Apply analyze findings (H-1 + MEDIUMs) across affected modules + verify (Workflow 5)',
  phases: [
    { title: 'Remediate', detail: 'apply per-module findings' },
    { title: 'Verify', detail: 're-check each module resolved + Constitution still PASS' },
  ],
}

const BASE = [
  'You are remediating a FinOS module to apply specific cross-module-analysis findings. This is a per-module Spec Kit feature with full artifacts (spec.md, plan.md, tasks.md, data-model.md, contracts/{provided,consumed}, research.md, quickstart.md).',
  'Authoritative references (read as needed): .specify/memory/constitution.md (v2.2.0), specs/_platform/platform-decisions.md, specs/_platform/ux-foundations.md, specs/002-module-1-rewards/ (exemplar).',
  'When a finding says to declare/pin a CONSUMED contract, use the provider\'s REAL canonical $id — find it by reading the provider module\'s contracts/provided/*.schema.json $id (e.g. Cash Safety = specs/005-module-3-cash-safety provides finos:cashsafety/{SafeToActSignal,RunwayForecast,RoundupProposal}/1.0.0; Module 0 spine = finos:spine/*; Bills = finos:bills/*, etc.). Never invent a namespace.',
  'Apply MINIMAL, consistent edits. Keep the plan Constitution Check honest. Keep data-model, contracts, spec, plan, and tasks mutually consistent (e.g. if you add a consumed contract, update the consumed README, the spec Key Entities/consumed list, the plan consumed count, AND add a consumer contract-test task). Do not weaken any constitution principle.',
].join('\n')

const AFFECTED = [
  {
    num: 1, name: 'Rewards & Loyalty', dir: 'specs/002-module-1-rewards',
    findings: 'M-5 (MEDIUM): FR-REW-010 introduces user-supplied write paths (user-override redemption rates + manual balance entry) that feed Travel/Pay downstream, but they are NOT represented as a tampering/data-poisoning surface in the Security & Privacy Threat Model table. Add an explicit threat-model row (e.g. "User-override/manual-entry value poisoning -> downstream mis-valuation") with a mitigation (bounds/sanity checks on overrides, clear user-sourced provenance tag so downstream consumers know the value is self-reported, audit of overrides), and note it as server-side validated. Keep the v2.2.0 documented-default note visible (M-4 is informational — no change needed beyond leaving it visible).',
  },
  {
    num: 8, name: 'Habits & Routines', dir: 'specs/010-module-8-habits',
    findings: 'H-1 (HIGH): Habits relies on Cash Safety SafeToActSignal (spec Edge Cases, UX conflict-banner, data-model RitualItem "conflict" state, task T034) but it is NOT declared as a consumed contract anywhere. Declare SafeToActSignal as a consumed contract pinned to the REAL provider $id finos:cashsafety/SafeToActSignal/1.0.0 in contracts/consumed/README.md, the spec consumed/Key-Entities list, and the plan consumed-count; ADD a consumer contract-test task in tasks.md; re-confirm the Principle VI/VII gates in plan.md. ALSO M-6 (MEDIUM): the consumed contracts pinned by bare name (e.g. RoundupProposals, BillCalendar, NotificationDigest, TaskCompletionEvents, GoalState) must be given their real canonical finos:... $ids by reading each provider module\'s contracts/provided.',
  },
  {
    num: 11, name: 'Travel & Trips', dir: 'specs/013-module-11-travel',
    findings: 'M-1 (MEDIUM, money-correctness — NON-NEGOTIABLE Principle IV): spec.md prose around line 135 states an FX fixture result of "CAD 1 695,43" but the authoritative fixture in tasks.md (T021) correctly computes 123456 cents x 1.3725 = 169443.36 -> half-up -> 169443 cents = CAD 1 694,43. Correct the spec prose to CAD 1 694,43 so the spec matches its own test. Scan the whole spec for any other instance of the wrong figure and fix consistently.',
  },
  {
    num: 13, name: 'Workspace & Playbooks', dir: 'specs/015-module-13-workspace',
    findings: 'M-3 (MEDIUM): SC-W-009 claims 100% of consumed contracts have passing consumer tests, but CreditState and DocumentVault (both declared consumed) have NO consumer contract-test task (existing T016/T031/T045 cover others only). Add consumer contract-test tasks for CreditState (finos:spine/CreditState/1.0.0) and DocumentVault (real $id from specs/014-module-12-life-admin/contracts/provided), or reconcile SC-W-009. ALSO M-6 (MEDIUM): give any bare-name consumed $ids their real canonical finos:... namespace (read provider modules).',
  },
  {
    num: 14, name: 'Household & Family', dir: 'specs/016-module-14-household',
    findings: 'M-2 (MEDIUM): SafeToActSignal is treated as consumed everywhere (spec Key Entities, data-model, plan, client task T017, conflict test T054) but is ABSENT from contracts/consumed/README.md version tables, so it is unpinned with no paired consumer test. Add it to the consumed README pinned to the real $id finos:cashsafety/SafeToActSignal/1.0.0 and ensure a consumer contract-test task exists. ALSO M-6 (MEDIUM): canonical-namespace any bare-name consumed $ids.',
  },
  {
    num: 15, name: 'Social & Accountability', dir: 'specs/017-module-15-social',
    findings: 'M-6 (MEDIUM): consumed contracts pinned by bare name must be given their real canonical finos:... $ids (read each provider module\'s contracts/provided; e.g. GoalState=finos:spine/GoalState/1.0.0, HabitProgress from Module 8, MemberScopes from Module 14). Keep the consumer pins consistent with real providers.',
  },
]

phase('Remediate')
const results = await pipeline(
  AFFECTED,
  (m) => agent(
    BASE + '\n\n=== MODULE: ' + m.name + ' (' + m.dir + ') ===\nApply these findings now by editing the files in ' + m.dir + ':\n' + m.findings + '\n\nReturn a concise list of the exact edits you made (file:change) and confirm the module\'s artifacts remain mutually consistent and Constitution Check still PASS.',
    { agentType: 'spec-lead', effort: 'high', label: 'fix:m' + m.num, phase: 'Remediate' }
  ),
  (fixResult, m) => agent(
    'Read-only RE-VERIFY of FinOS Module ' + m.num + ' (' + m.name + ') at ' + m.dir + ' after remediation. Confirm: (1) the findings just applied are actually resolved; (2) any newly-declared/repinned consumed contract uses a REAL provider $id that exists in that provider module\'s contracts/provided; (3) consumed counts are consistent across consumed README, spec, plan, and tasks; (4) the plan Constitution Check is still honest and PASS; (5) no money figure in the spec contradicts its tasks fixtures. Report PASS or a short list of anything still wrong (with file:line). Do NOT edit.',
    { agentType: 'spec-lead-reviewer', effort: 'medium', label: 'verify:m' + m.num, phase: 'Verify' }
  ),
)

const done = results.filter(Boolean)
return { remediated: done.length, ofTotal: AFFECTED.length, verifications: done }
