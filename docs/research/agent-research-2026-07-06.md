# PerFiApp Agent Research — 2026-07-06

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: Fable 5 restoration and performance caveats, Claude Sonnet 5 as a new mid-tier model, 12 Claude Code versions shipped in 12 days, Spec Kit and APM progression, MCP RC 22 days out, CDBA enacted and RTR By-law imminent, NestJS v12 preview on npm.

---

## Executive Summary

Three items demand decisions this week:

1. **Fable 5 is restored (July 1) but its cybersecurity classifier is over-aggressive — do not rush adoption for coding agents.** BridgeMind benchmarks show debugging scores dropped 70% (86.2 to 25.9) because the classifier reroutes benign TypeScript and debugging tasks to Opus 4.8 before Fable 5 can respond. Only 3 of 12 TypeScript tasks in BridgeMind testing reached Fable 5 at all. For PerFiApp's implementer agent, Opus 4.8 is still the safer default until Anthropic refines the classifier. For reasoning-heavy agents (spec-lead, architect) the risk is lower.

2. **Claude Sonnet 5 (June 30): near-Opus 4.8 capability at $2/$10 per Mtok introductory pricing.** That is 60% cheaper on input than Opus 4.8 ($5/$25) for comparable agentic performance. The introductory price applies through August 31, 2026, after which the rate rises to $3/$15 (same as current Sonnet 4.6). This is the highest-value cost optimization opportunity in the report: routing spec-lead and architect to Sonnet 5 instead of Opus 4.8 during the promotion window could halve agent costs through August.

3. **Claude Code v2.1.200 (July 3) changed the default permission mode to "Manual"** — any CI script or background agent workflow that relied on auto-continue dialogs is now broken. The weekly research CI workflow and the automated PR-review workflow must be verified before the next scheduled run.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Fable 5 restored with over-aggressive cybersecurity classifier** | Model | implementer, spec-lead, architect | **Act — keep Opus 4.8 for implementer; trial Fable 5 for reasoning agents only** |
| **Claude Sonnet 5: near-Opus 4.8 capability, $2/$10/Mtok through Aug 31** | Model / Cost | spec-lead, architect, implementer | **Adopt — route these agents to Sonnet 5 before Aug 31 introductory window closes** |
| **Extended thinking removed from Sonnet 5 and Opus 4.8** | Cost | All agents using extended thinking | **Act — revise caching strategy; adaptive thinking does not replicate extended thinking cache behavior** |
| **Claude Code v2.1.200: default mode changed to "Manual"** | Toolchain | CI, automated workflows | **Act — verify research and PR-review CI workflows still run correctly** |
| **Claude Code v2.1.198: background agents auto-commit, push, draft PRs** | Toolchain | implementer, architect | **Adopt with governance — enable in worktrees; verify no auto-push to main branch** |
| **MCP RC final spec publishes July 28 (22 days)** | Agent tooling | architect | **Act — architecture for any custom MCP server must be finalized before July 28** |
| **DeepEval TypeScript released July 1** | Agent quality | test-engineer | **Adopt — enables native TS evals for NestJS backend logic** |
| **Spec Kit v0.12.4 (from v0.11.6) — v0.12.0 makes agent-context extension opt-in** | Toolchain | spec-lead | **Adopt — v0.12.0 opt-in change is breaking if extension was auto-enabled** |
| **APM v0.24.0: Executable Trust Governance v1, lifecycle hooks framework** | Toolchain | All developers | **Adopt — Executable Trust Governance v1 closes MCP install security gap** |
| **NestJS v12 preview on npm — ESM, Vitest, Standard Schema** | Toolchain | implementer, architect | **Watch — stable Q3 2026; architect should assess migration path now** |
| **pnpm v11.10: _auth for CI, self-update to v12 Rust port** | Toolchain | CI, all developers | **Adopt — _auth resolves common CI registry auth pain** |
| **claude-opus-4-1-20250805 retires August 5 — 30 days away** | Model | Any agent using this ID | **Act — 30-day deadline now; confirm no usage via Console export** |
| **RTR By-law comes into force August 24, 2026** | Compliance | architect, spec-lead | **Act — Phase 2 payment initiation design timeline now anchored** |
| **CDBA Phase 1 enacted (Bill C-15) — Bank of Canada is lead regulator** | Compliance | architect, spec-lead | **Monitor — law exists; accreditation criteria still not published** |
| **OSFI fast-track bank licensing launched June 25** | Competitive | spec-lead | **Monitor — KOHO licensing timeline now 12–15 months; intensifies 2027 competition** |
| **Monarch Money Goals 3.0 + mobile reports** | Competitive | spec-lead | **Monitor — closes gap on PerFiApp's financial planning modules** |
| **Wealthsimple Household Banking + Business Chequing** | Competitive | spec-lead | **Monitor — Wealthsimple expanding breadth rapidly** |
| **Unit 42 MCP sampling attack vectors (3 PoC classes, Dec 2025)** | Security | architect, code-reviewer | **Act — add sampling-specific checks to MCP vetting checklist** |
| **Agent SDK billing split: still paused, no July re-announcement found** | Cost | All developers | **Monitor — no change; token tracking remains prudent** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS RESOLVED: Fable 5 restored July 1 — with a performance-critical caveat

**Status changed from "Suspended (export control)" to "Restored with classifier over-trigger risk."**

The US Commerce Department lifted the export control directive on June 30, 2026. Fable 5 and Mythos 5 became accessible globally on July 1. As of this report date (July 6), both are available on the Claude API, Claude Code, AWS Bedrock, Google Cloud Vertex, and Microsoft Foundry.

**Condition of restoration:** Anthropic trained a new cybersecurity safety classifier that blocks the Amazon-researcher jailbreak technique in over 99% of cases. The tradeoff is documented by Anthropic itself: the classifier will also block more benign coding and debugging requests than the previous version.

**The classifier problem is severe enough to affect PerFiApp's agent use case.** BridgeMind evaluated Fable 5 on TypeScript coding tasks after the July 1 redeployment:
- Overall debugging score: 86.2 (pre-suspension) → 25.9 (post-restoration, −70%)
- Refactoring score: 73.6 → 38.4 (−48%)
- Hallucination resistance: 75.9 → 61.7 (−19%)
- Root cause: 9 of 12 TypeScript tasks were rerouted to Opus 4.8 before Fable 5 responded at all; those 9 tasks scored zero on the Fable 5 column

When Fable 5 does answer, Arena.ai reports outputs comparable to the pre-restriction version. The problem is routing, not model capability. Anthropic has committed to refining the classifier but has not provided a timeline or target false-positive rate.

**API behavior:** When the classifier triggers, the request is transparently served by Opus 4.8 with a notification to the user. The calling code does not need to change. However, cost math changes: requests routed to Opus 4.8 are billed at Opus 4.8 rates ($5/$25/Mtok), not Fable 5 rates ($10/$50/Mtok).

**Usage credit change:** From July 8 onward, Fable 5 access on Pro and Max plans requires usage credits. It is no longer included in the flat subscription allowance.

**For PerFiApp agent recommendations:**
- **implementer agent:** Keep Opus 4.8 as primary. TypeScript, NestJS, and payment-integration code is most likely to trigger the cybersecurity classifier. Fable 5 offers no reliable coding performance advantage until Anthropic stabilizes the false-positive rate.
- **spec-lead, architect:** Cautious trial is appropriate. Reasoning-heavy tasks (spec writing, architecture review) are far less likely to trigger a security classifier than code execution or debugging prompts.
- **Do not update agent files to hard-code `claude-fable-5` as primary** until BridgeMind or equivalent benchmarks show the classifier false-positive rate has dropped meaningfully on routine TypeScript/NestJS tasks.

Sources: [CNBC — Fable 5 export controls lifted](https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html) / [Anthropic redeployment announcement](https://www.anthropic.com/news/redeploying-fable-5) / [MarkTechPost — cybersecurity classifier](https://www.marktechpost.com/2026/07/01/anthropic-redeploys-claude-fable-5-on-july-1-after-us-export-controls-lift-adds-new-cybersecurity-classifier/) / [TechTimes — debugging score drop](https://www.techtimes.com/articles/319576/20260702/claude-fable-5-debugging-scores-drop-70-safety-classifier-reroutes-tasks-weaker-fallback-model.htm) / [Decrypt — classifier analysis](https://decrypt.co/372750/claude-fable-5-not-nerfed-router-paranoid)

### 1.2 NEW MODEL: Claude Sonnet 5 (June 30, 2026)

**Model ID:** `claude-sonnet-5` (pinned: `claude-sonnet-5-20260630`)
**Context window:** 1M tokens (128K max output)
**Introductory pricing:** $2/$10 per Mtok input/output (through August 31, 2026), then $3/$15

Claude Sonnet 5 is the first Sonnet-tier model with native 1M-token context and near-Opus 4.8 performance on agentic coding and planning. Key facts verified from the official models page:

- **Adaptive thinking:** Yes (controllable via the `effort` parameter, defaulting to `high` on the API and Claude Code)
- **Extended thinking:** No — Sonnet 5 uses adaptive thinking only (see Track 2.2 for the cost impact)
- **Batch API extended output (300k tokens):** Supported with the `output-300k-2026-03-24` beta header

**For PerFiApp's agent model assignments:**

| Agent | Current recommended model | Sonnet 5 upgrade case |
|---|---|---|
| spec-lead | claude-opus-4-8 | Strong — reasoning-heavy, benefits from agentic planning; $5→$2 input saving |
| architect | claude-opus-4-8 | Strong — same reasoning profile; $5→$2 input saving |
| implementer | claude-opus-4-8 | Moderate — coding performance reportedly near-Opus, but trial first |
| code-reviewer | claude-sonnet-4-6 | Strong — replaces current Sonnet-tier model with same price ($3→$2 intro) |
| test-engineer | claude-sonnet-4-6 | Strong — same |
| security-reviewer | claude-opus-4-8 | Cautious — security analysis benefits from highest reasoning; keep Opus 4.8 |

**Cost math (illustrative):** If spec-lead and architect each use 500K input tokens per week, switching from Opus 4.8 ($5/Mtok) to Sonnet 5 ($2/Mtok intro) saves $3/Mtok × 1M = $3 per week for those two agents combined. The introductory window closes August 31, after which Sonnet 5 is still 40% cheaper than Opus 4.8 at $3/$15 vs $5/$25 on input.

Sources: [Anthropic Sonnet 5 announcement](https://www.anthropic.com/news/claude-sonnet-5) / [TechCrunch](https://techcrunch.com/2026/06/30/anthropic-launches-claude-sonnet-5-as-a-cheaper-way-to-run-agents/) / [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) / [Claude Sonnet 5 API guide](https://apito.ai/en/blog/news/claude-sonnet-5-api-guide/)

### 1.3 Breaking: Extended thinking removed from Sonnet 5 and Opus 4.8

This is a quiet but important architecture shift. The current models page confirms:

| Model | Extended thinking | Adaptive thinking |
|---|---|---|
| claude-fable-5 | No | Yes (always on) |
| claude-opus-4-8 | No | Yes |
| claude-sonnet-5 | No | Yes |
| claude-haiku-4-5 | Yes | No |
| claude-opus-4-6 (legacy) | Yes | Yes |
| claude-sonnet-4-6 (current base) | Yes | Yes |

The prior report (Track 2.2) recommended using extended thinking's cache-hit behavior on tool results as a free optimization. That optimization applies only to models with extended thinking support — which excludes Opus 4.8 and Sonnet 5. **If agents are migrated to Sonnet 5 or Opus 4.8, the extended thinking caching optimization from the prior report no longer applies.** Adaptive thinking does not produce the same incremental cache-hit behavior across tool results. The 5-minute TTL system prompt cache remains valid and is unaffected.

The `effort` parameter (low/medium/high) controls adaptive thinking depth. Default is `high` for Opus 4.8 (all surfaces) and Sonnet 5 (API + Claude Code). Setting `effort: "medium"` or `"low"` on Sonnet 5 reduces cost if high reasoning depth is not needed for a given agent.

Source: [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)

### 1.4 STATUS: claude-opus-4-1-20250805 — 30 days to retirement

**No status change; deadline now closer.** Retirement date is August 5, 2026, 30 days from this report. The recommended replacement remains `claude-opus-4-8`. If no usage was found in the June 24 audit, no further action needed. If the audit has not been run, use the Claude Console Usage Export (Usage > Export > CSV) and filter for `claude-opus-4-1`.

### 1.5 STATUS: temperature / top_p / top_k restrictions on Opus 4.7+

**No change from prior report.** Anthropic's official documentation continues to show these parameters as unsupported on Opus 4.7+. Avoid setting these on Opus 4.8 or Sonnet 5 calls. The `effort` parameter is the supported alternative for controlling reasoning depth on adaptive-thinking models.

### 1.6 Updated model table (July 6, 2026)

| Model | Status | Pricing (in/out Mtok) | Context | Retirement |
|---|---|---|---|---|
| `claude-fable-5` | Active (restored July 1; classifier caveats) | $10 / $50 | 1M | Not announced |
| `claude-opus-4-8` | Active | $5 / $25 | 1M | Not before May 28, 2027 |
| `claude-sonnet-5` | Active (launched June 30) | $2/$10 intro to Aug 31; $3/$15 after | 1M | Not announced |
| `claude-haiku-4-5` | Active | $1 / $5 | 200K | Not before Oct 15, 2026 |
| `claude-opus-4-7` | Legacy (active) | $5 / $25 | 1M | Not before Apr 16, 2027 |
| `claude-opus-4-6` | Legacy (active) | $5 / $25 | 1M | Not before Feb 5, 2027 |
| `claude-sonnet-4-6` | Legacy (active) | $3 / $15 | 1M | Not before Feb 17, 2027 |
| `claude-opus-4-1-20250805` | **Deprecated** | $15 / $75 | 200K | **August 5, 2026** |

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Sonnet 5 introductory pricing — the primary cost lever until September

At $2/$10 per Mtok through August 31, Sonnet 5 is 60% cheaper on input and 60% cheaper on output than Opus 4.8 ($5/$25), for reportedly comparable agentic performance. After the promotion window closes, Sonnet 5 at $3/$15 is still 40% cheaper on input and 40% cheaper on output than Opus 4.8. Even at standard pricing, Sonnet 5 is the same price per token as Sonnet 4.6 but significantly more capable.

For a project at the pre-code stage like PerFiApp, where agents are doing specification, architecture, and toolchain work rather than high-volume production inference, the per-agent savings are modest in absolute dollar terms but establish the correct cost baseline as workloads scale.

Concrete actions: Update the model setting in spec-lead and architect agent files to `claude-sonnet-5` before August 31. Keep the fallback chain pointing at `claude-opus-4-8` as the upgrade, not the other way around.

### 2.2 Extended thinking caching optimization — no longer applies to Sonnet 5 or Opus 4.8

Covered in Track 1.3 above. The prior report's "free optimization" (Track 2.2, June 24) was predicated on extended thinking being available. It is not available on Sonnet 5 or Opus 4.8. The system prompt cache (5-minute TTL) is still valid for all models and should remain configured.

### 2.3 Agent SDK billing split — still paused, no July re-announcement confirmed

The pause announced June 15, 2026, remains in effect as of this research date. No credible evidence of a July 2026 re-announcement was found. Anthropic has committed to advance notice before any future change. The weekly CI research runs and automated PR-review workflow continue to draw from subscription quotas unchanged. Continue monitoring token consumption via Console export to model impact when the split eventually takes effect.

### 2.4 Fable 5 now requires usage credits after July 7

For Pro and Max subscribers, Fable 5 is no longer included in the flat plan allowance starting July 8. It now requires purchasing usage credits. This affects any agent workflow that was trialing Fable 5 under the free weekly limit. Given the classifier performance caveats (Track 1.1), this is not a practical change for PerFiApp — avoid adopting Fable 5 until the false-positive rate stabilizes regardless of billing.

Source: [Digital Trends — Fable 5 usage credits](https://www.digitaltrends.com/computing/youll-be-able-to-use-claude-fable-5-again-starting-july-1/)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 Claude Code v2.1.190 through v2.1.201 — 12 versions in 12 days

The prior report covered through v2.1.187 (June 23). Twelve versions have shipped since June 24. Only the items with direct PerFiApp impact are detailed below:

**v2.1.200 (July 3) — Default permission mode changed to "Manual" [BREAKING]**
The default mode across the CLI, VS Code, and JetBrains is now "Manual" rather than the previous default that allowed automatic continuation of `AskUserQuestion` dialogs. Any CI script or GitHub Actions workflow that relied on dialogs auto-completing after a timeout will now hang. The research workflow and PR-review workflow must be tested against this change before the next scheduled run. Opt back into idle timeout via `/config` if needed. This is a deliberate safety improvement — the default now requires explicit human confirmation for ambiguous permission requests.

**v2.1.198 (July 1) — Subagents run in background by default; auto-commit + push + draft PR**
Background agents in git worktrees now automatically commit, push, and open a GitHub draft PR when they complete code work, without prompting. The draft flag is Anthropic's safety boundary: no reviewers are notified, no merge button is active, and CI runs before any human looks at the diff. The auto-PR behavior is on by default and must be explicitly disabled if unwanted. For PerFiApp: this is a productivity accelerator for the implementer agent but requires a governance decision — ensure the implementer is only ever run in a non-`main` worktree, and that the repo's branch protection rules prevent accidental merge of auto-created draft PRs. Also in v2.1.198: the Explore subagent now inherits the main session model (capped at Opus 4.8); subagents and context compaction inherit extended thinking configuration from the session.

**v2.1.199 (July 2) — Stacked slash-skill invocations**
Up to 5 leading slash-skills can be invoked together: `/skill-a /skill-b /skill-c do XYZ`. For PerFiApp, this means commands like `/speckit-specify /speckit-plan add transaction enrichment module` could chain two Spec Kit skills in sequence. Verify behavior against PerFiApp's installed Spec Kit skill set. SSL certificate errors now fail immediately with guidance instead of burning retries — useful for CI agents behind corporate proxies.

**v2.1.197 (June 30) — Claude Sonnet 5 available in Claude Code**
Sonnet 5 became available as a model choice in Claude Code on the same day as the API release. All developers on Pro/Max plans have access at introductory pricing through August 31.

**v2.1.196 (June 29) — Improved MCP server trust model + org default models**
Anthropic updated the MCP server trust evaluation logic (details not fully public). Organization administrators can now set default models that apply across all sessions. For PerFiApp: if using an organization account, set `claude-sonnet-5` as the org default rather than per-agent configuration — it will apply uniformly and override stale per-file settings.

**v2.1.193 (June 25) — OpenTelemetry logging + autoMode.classifyAllShell**
`claude_code.assistant_response` is now a formal OpenTelemetry log event. For PerFiApp's monitoring strategy, this enables structured tracing of agent responses through any OTel-compatible backend. The `autoMode.classifyAllShell` setting adds shell command classification to auto mode (beyond the specific destructive commands already blocked in v2.1.183) — relevant for the implementer running database migrations or API scripts.

Sources: [Claude Code changelog](https://code.claude.com/docs/en/changelog) / [Releasebot Claude Code July 2026](https://releasebot.io/updates/anthropic/claude-code)

### 3.2 MCP RC July 28 — 22 days out, new MCP Apps feature confirmed

The release candidate specification publishes July 28 as planned. Since the prior report, the specification has been finalized with one additional feature: **MCP Apps (SEP-1865)**. Servers can now ship interactive HTML interfaces that Claude Code and other hosts render in a sandboxed iframe. The UI communicates back via the same JSON-RPC protocol as tool calls, so every UI-initiated action goes through the same audit and consent path. Tools must declare their UI templates ahead of time, enabling prefetch and security review before first use.

**Implications for PerFiApp's custom MCP server design (e.g., a Flinks adapter):**

1. **Stateless design is now mandatory.** Sessions and `Mcp-Session-Id` are gone from the protocol. Any session state must live in the client or in an external store, not in the MCP server process. Design stateless from the start or face a migration immediately after July 28.

2. **`cacheScope` handling is a privacy requirement.** The `ttlMs` + `cacheScope` fields on list/resource results determine what gets cached and for how long. A misconfigured `cacheScope` on balance or transaction data could share one user's financial data with another user's cache slot. Make `cacheScope: "private"` (or equivalent) the explicit default for all financial data results.

3. **MCP Apps is a watch item.** It could enable a Flinks adapter to present an OAuth consent UI or account-selection widget directly in the agent session — meaningful for the open-banking consent flow required under CDBA Phase 1. Evaluate after the spec publishes July 28.

Sources: [MCP 2026-07-28 RC announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [MCP.Directory RC explained](https://mcp.directory/blog/mcp-2026-07-28-release-candidate) / [WorkOS on agent authentication in the new spec](https://workos.com/blog/mcp-2026-spec-agent-authentication)

### 3.3 No official Flinks MCP server found

A targeted search for an official Flinks MCP server returned no results. The prior report's recommendation to contact Flinks directly about their MCP roadmap stands. With CDBA Phase 1 now enacted as law (Track 7.1), an inquiry to Flinks about a standards-compliant MCP adapter becomes more timely.

---

## Track 4 — Agent Quality & Evaluation

### 4.1 STATUS UPDATE: DeepEval TypeScript support released July 1, 2026

**Status changed from "TypeScript support added in v4.0" to "TypeScript local evals now available via npm."**

The June 24 report noted DeepEval's TypeScript support alongside v4.0. The July 1 release delivers the full TypeScript feature set: local evals, tracing, synthetic data generation, and simulation. Benchmarks are deliberately excluded. The package is `deepeval-ts` on npm; its release schedule is decoupled from the Python package.

**For PerFiApp:** The backend is TypeScript/NestJS. Local evals in TypeScript mean the test-engineer agent can now write and run DeepEval test suites natively without Python interop. This closes a gap that existed even after v4.0. The `deepeval generate` CLI command (from v4.0) synthesizes datasets from codebase context; with TypeScript support, this will work against PerFiApp's NestJS services directly when implementation begins. Priority use case: eval harnesses for money math, credit calculation, and recommendation logic — the TDD-first modules mandated by PerFiApp's constitution.

Sources: [DeepEval TypeScript in monorepo](https://deepeval.com/blog/typescript-in-deepeval-monorepo) / [deepeval-ts on npm](https://www.npmjs.com/package/deepeval-ts) / [DeepEval repo](https://github.com/confident-ai/deepeval)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v0.12.4 — nine releases since June 23

Latest: **v0.12.4 (July 2, 2026)** (from v0.11.6 at June 23).

Key changes since the prior report:

**v0.12.0 (June 29) — Agent-context extension made full opt-in [POTENTIALLY BREAKING]**
The agent-context extension is no longer auto-enabled. Projects that relied on automatic agent context updates must now explicitly opt in via `speckit-agent-context-update`. Check PerFiApp's `.specify/` configuration — if the extension was active without an explicit opt-in, this change may have silently disabled it.

**v0.12.2 (June 30) — Bounded thread pool for fan-out + Windsurf integration removed**
Fan-out steps now respect `max_concurrency` via a bounded thread pool — relevant if spec-lead uses fan-out to generate parallel module specs. Windsurf integration removed (Windsurf IDE shut down).

**v0.12.3 (July 1) — Roo Code integration retired + Zed added to discovery catalog**
Roo Code is gone. Zed editor appears in the Spec Kit discovery catalog. Skills default rollout now shows a warning before applying.

**v0.12.4 (July 2) — Python script type + sha256 catalog verification**
Add `py` as a script type in Spec Kit steps. Template interpolation fixed. Archive sha256 verification added before install (previously only in v0.11.7 for catalog downloads; now generalized).

**Earlier changes:**
- v0.11.7 (June 24): Catalog archive sha256 verification before install — supply-chain improvement
- v0.11.8 (June 24): Community catalog extensions, preset README requirements

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.12.4`

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases)

### 5.2 APM v0.22.0 through v0.24.0 — four releases since v0.21.0

**v0.22.0 — Executable Trust Governance v1**
Introduces "deny-wins" resolver semantics for executable trust: if any governance policy denies an executable, the install is blocked regardless of other policies. Configurable default install targets. This supersedes the `allowExecutables` gate from v0.21.0 with a more formal governance model.

**v0.23.0 — General-purpose lifecycle hooks framework**
APM packs can now declare hooks that fire at install, update, uninstall, and audit events. Registry routing improved for multi-registry environments.

**v0.23.1 — Additive `--skill` deployment**
`apm install --skill` is now additive rather than replacing existing skills. Content hash line-ending invariance for audit files (cross-platform fix).

**v0.24.0 — Archive checksum verification before extraction + Copilot hook event rename**
Checksum verification moved before extraction (previously was post-extraction, allowing a malicious archive to run code before the check). Copilot hook events renamed to camelCase during merge. This is a security hardening step relevant to any MCP server installed via APM.

Install: see [APM releases](https://github.com/microsoft/apm/releases)

### 5.3 Expo SDK 56 — current stable; SDK 57 beta expected August

**Status:** SDK 56 released May 21, 2026 (stable). SDK 57 beta expected late August 2026.

SDK 56 highlights relevant to PerFiApp's `apps/mobile`:
- React Native 0.85 + React 19.2
- Expo UI (Jetpack Compose / SwiftUI APIs) now stable — can be used in production
- Android cold start 40% faster; iOS builds 50%+ faster (XCFramework prebundling)
- Expo UI added to `create-expo-app` default template

No urgent action: SDK 57 is not yet in beta. Continue on SDK 56 for MVP planning. React Native 0.86 shipped in June; 0.87 targets August; SDK 57 will likely adopt 0.87. Architect should include an SDK 57 evaluation gate in the mobile milestone plan.

Sources: [Expo SDK 56](https://expo.dev/changelog/sdk-56) / [SDK 57 preview](https://www.buildmvpfast.com/blog/expo-sdk-57-what-to-expect-how-to-prepare-2026)

### 5.4 NestJS v12 preview on npm — ESM, Vitest, Standard Schema

**Stable ETA: Q3 2026** (early Q3 per GitHub PR #16391).

NestJS v12 preview packages are on npm. This is a breaking-change release that affects PerFiApp's `apps/api` stack:

- **CommonJS → ESM:** All official NestJS packages move to ESM. Existing CJS-only dependencies must be evaluated. Node.js `require(esm)` support makes this viable without a full rewrite, but any package in PerFiApp's dependency graph that is CJS-only will need a compatibility shim or replacement.
- **Jest → Vitest (ESM projects):** New ESM projects default to Vitest with OXC for TypeScript decorator support. Jest continues for CJS projects. PerFiApp's test-engineer should evaluate whether PerFiApp's backend test suite would migrate to Vitest.
- **ESLint → oxlint:** The code-reviewer agent's linting assumptions change.
- **Webpack → Rspack:** Faster build times; drop-in replacement.
- **Standard Schema validation:** Zod, Valibot, ArkType usable natively in route decorators — eliminates the need for `class-validator` and `class-transformer`.

**For PerFiApp:** The stack is not yet started, making this an ideal time to plan for NestJS v12 natively. The architect should flag this in the technical design: target v12 (ESM + Vitest + Zod via Standard Schema) from the first commit rather than migrating later. The `strict` TypeScript mode requirement in CLAUDE.md is compatible with v12's validation approach.

Sources: [InfoQ NestJS v12 roadmap](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/) / [NestJS v12 PR #16391](https://github.com/nestjs/nest/pull/16391) / [Byteiota v12 preview](https://byteiota.com/nestjs-v12-preview-esm-vitest-and-the-end-of-class-validator/)

### 5.5 pnpm v11.10 (July 5, 2026)

Since the prior report, pnpm v11.7, v11.8, and v11.10 have shipped.

**Most relevant for PerFiApp:**

- **v11.10: `_auth` setting for CI-friendly registry authentication.** Enables per-registry auth tokens in `.npmrc` without interactive login. This resolves the common CI pain where pnpm install fails on private package registries (e.g., a PerFiApp internal packages registry or authenticated npm mirror). Directly useful for the CI research workflow.
- **v11.10: `pnpm self-update` can install pnpm v12** (the Rust-port rewrite). No need to migrate now, but the path is available. Rust port is faster for large monorepos.
- **v11.8: Install dry-run previews, SBOM output.** `pnpm install --dry-run` previews changes before committing. SBOM output aligns with APM's SBOM export for supply-chain compliance.
- **v11.7: `frozenStore` setting** blocks installs against a read-only store — useful for reproducible CI.

Sources: [pnpm 11.10](https://pnpm.io/blog/releases/11.10) / [pnpm 11.8](https://pnpm.io/blog/releases/11.8) / [pnpm 11.7](https://pnpm.io/blog/releases/11.7)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 Unit 42: Three MCP sampling attack vectors (formal publication)

Palo Alto Networks Unit 42 published a formal analysis of MCP sampling feature attack vectors (December 2025; widely referenced in new July 2026 security discussions). Three PoC classes identified, none with CVEs assigned:

1. **Resource theft:** Hidden sampling prompts drain token quotas. Malicious servers append instructions that force background LLM generation the user never sees.
2. **Conversation hijacking:** Persistent instructions injected into LLM responses alter behavior across multiple turns, enabling data exfiltration without the user's awareness.
3. **Covert tool invocation:** Sampling requests trigger unauthorized file system operations disguised as legitimate tool calls.

**Mitigation additions for PerFiApp's MCP vetting checklist** (supplement prior report's list):
- Does this server use the sampling feature? If yes, is sampling output sanitized before use in subsequent tool calls?
- Does the server declare an explicit `sampling` capability scope, or does it request broad sampling access?
- Is sampling request frequency rate-limited? (Flag servers that make high-frequency sampling calls from a single user session.)

Source: [Unit 42 MCP attack vectors](https://unit42.paloaltonetworks.com/model-context-protocol-attack-vectors/)

### 6.2 Claude Code v2.1.200 — Manual mode default is a security improvement

The change from auto-continue to "Manual" default (Track 3.1) is also a security improvement: a compromised subagent or malicious MCP server can no longer silently pass `AskUserQuestion` dialogs by waiting for an auto-continue timeout. Every permission dialog now requires explicit human confirmation. The implementer running in autonomous mode will require explicit `--permission-mode auto` to bypass this.

### 6.3 Claude Code v2.1.196 — Improved MCP server trust model

The details of this change are not fully documented in public release notes. The effect is that MCP servers undergo stricter trust evaluation before being granted tool execution privileges. This is relevant when the implementer agent connects to a new MCP server (e.g., a Plaid MCP or GitHub MCP). Treat this as a positive narrowing of the attack surface.

### 6.4 APM v0.24.0 — Archive checksum before extraction

Prior to v0.24.0, APM verified checksums after extracting archive contents. A malicious archive could potentially run code during extraction before the check fired. v0.24.0 moves verification to before extraction, closing this race. Given that MCP server installation is the primary use case for APM in PerFiApp's toolchain, this is a meaningful hardening for the supply chain.

### 6.5 RTR By-law comes into force August 24, 2026

The Payments Canada Real-Time Rail By-law and Rules have received all necessary approvals and come into force **August 24, 2026**. This is a legal/compliance deadline that also anchors the Phase 2 payment initiation timeline. See Track 7.2 for compliance implications.

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS CHANGE: CDBA Phase 1 enacted — Bank of Canada is the lead regulator

**Status changed from "framework enacted (Bill C-15 Royal Assent March 26); FCAC anticipated as lead" to "Bank of Canada designated as lead regulator."**

The Consumer-Driven Banking Act (CDBA) is now law. Phase 1 enables consumer-directed read-only data sharing with accredited entities. The new development since the prior report: regulatory oversight has been delegated to the **Bank of Canada**, not FCAC as earlier frameworks suggested. This changes where PerFiApp should monitor for accreditation guidance — the Bank of Canada's regulatory publications, not FCAC.

Outstanding items that remain undefined (not resolved since prior report):
- Technical standards body not yet designated
- Accreditation criteria for data recipients not published
- Required participating banks not listed
- Consent and authorization requirements still being defined

**For PerFiApp architecture:** The right design decisions (OAuth-based, data-minimization, explicit consent flows) are unchanged. The Bank of Canada designation means accreditation applications, once available, will be processed through the Bank rather than FCAC. Monitor the Bank of Canada's [consumer-driven banking page](https://www.bankofcanada.ca/regulatory-oversight/consumer-driven-banking/) for accreditation announcements.

Sources: [McCarthy Tétrault — blueprint to law](https://www.mccarthy.ca/en/insights/blogs/techlex/open-banking-in-canada-moves-from-blueprint-to-law) / [DLA Piper CDBA explainer](https://www.dlapiper.com/en-us/insights/publications/2026/04/the-new-consumer-driven-banking-act-explained) / [Bank of Canada consumer-driven banking](https://www.bankofcanada.ca/regulatory-oversight/consumer-driven-banking/)

### 7.2 STATUS UPDATE: Canada RTR — By-law in force August 24; Q4 2026 phased launch confirmed

**Status changed from "moving to Q4 2026" to "confirmed Q4 2026 with a hard legal anchor date of August 24."**

The RTR By-law and Rules come into force **August 24, 2026**, establishing the legal framework ahead of the Q4 2026 system launch. Payments Canada plans a three-phase access rollout starting Q4 2026, with universal access expected through 2027.

**Requirements confirmed:**
- Participating institutions must be able to **receive** RTR payments from day one
- Sending capability and customer-facing services remain optional in early phases
- Universal access (including smaller fintechs not ready at launch) expected 2027

Wealthsimple is confirmed as an early adopter. KOHO and Neo Financial, as Payments Canada members, are expected Phase 1 participants.

**For PerFiApp Phase 2 planning:** The By-law's August 24, 2026 effective date gives PerFiApp a clear timeline. Phase 2 of open banking (write access / payment initiation, requiring RTR) is targeted for mid-2027. The architect's Phase 2 design should explicitly note the RTR dependency and plan accordingly.

Sources: [Fathom4sight RTR Q4 2026](https://www.fathom4sight.ai/blog-articles/canadas-real-time-rail-set-for-phased-launch-in-q4-2026) / [The Logic — phased rollout](https://thelogic.co/news/exclusive/payments-canada-rtr-phased-rollout/) / [Payments Canada RTR](https://www.payments.ca/systems-services/payment-systems/real-time-rail-payment-system)

### 7.3 OSFI Fast-Track Bank Licensing — launched June 25, 2026

OSFI launched its Targeted Fast-Track Framework for bank license applications on June 25, 2026. Key terms:
- 4 weeks: initial feedback from OSFI
- 12 months: OSFI completes risk-based review and sends recommendation to Minister of Finance
- 3 months: Minister makes final decision
- Public-facing dashboard proposed (with applicant consent)

KOHO, which entered the final phase of the licensing process in 2024 and raised $130M in June 2026, is the most likely beneficiary. Under the fast-track timeline, KOHO could receive approval as early as Q3 2027.

**For PerFiApp:** PerFiApp is a personal finance aggregation and coaching app, not a deposit-taking institution — direct OSFI licensing is not a near-term requirement. However, KOHO gaining a banking license by mid-2027 would materially change the competitive landscape. A fully licensed KOHO could offer products PerFiApp's design currently assumes are off-limits to neobanks (GIC-backed savings, CDIC coverage, full lending suite). The spec-lead should note this in the 2027 competitive landscape section of the PDR.

Sources: [Torys — OSFI fast-track](https://www.torys.com/our-latest-thinking/publications/2026/02/osfi-to-fast-track-new-entry-regime-for-fintechs-and-credit-unions) / [Mondaq — OSFI fast-track approvals](https://www.mondaq.com/canada/fintech/1750030/osfis-fast-track-approvals-pilot-making-way-for-innovative-fintechs-to-scale-as-financial-institutions-in-canada) / [Fasken regulatory updates](https://www.fasken.com/en/knowledge/2026/06/federal-financial-services-regulatory-updates-streamlined-bank-applications-and-summer-consultations)

### 7.4 FINTRAC — no new guidance since prior report

The April 2026 PCMLTFA amendments (Royal Assent March 26) remain the latest substantive guidance. FINTRAC indicated it will update published guidance to reflect the new "reasonably designed, risk-based, effective" standard and stablecoin MSB registration requirements. No new publications as of July 6, 2026. Continue monitoring [FINTRAC changes for reporting entities](https://fintrac-canafe.canada.ca/businesses-entreprises/changes-changements-eng).

---

## Track 8 — Competitive & Product Intel

### 8.1 Monarch Money June 2026 — Goals 3.0 and two-tier pricing close more gaps

Since the prior report's finding (Monarch added AI assistant + credit score tracking), Monarch shipped additional features in June 2026:

- **Goals 3.0:** Completely reimagined goal system. Transactions can be linked directly to goals via automation rules. Investment growth rates now factor into goal projections (relevant for PerFiApp's savings and investment planning modules). Debt paydown goals redesigned for simplicity.
- **Mobile reports:** Sankey cash flow view, spending breakdowns, and income summaries now available on mobile — closing a gap that previously required desktop.
- **Receipt scanning on web:** Direct upload from the Transactions tab, with bulk upload.
- **Two-tier pricing (Monarch Core / Monarch Plus):** Monarch Plus targets "power users" who want full financial modeling or small business finance. This moves Monarch closer to a comprehensive financial OS positioning — directly competing with PerFiApp's stated differentiation.

**For PerFiApp:** Goals 3.0's investment growth integration and transaction-to-goal linking are direct competition for PerFiApp's Due-Date Coach and Cash Safety modules as conceived. The two-tier pricing strategy also mirrors PerFiApp's potential freemium/premium structure. The spec-lead should assess whether Goals 3.0's feature set raises the minimum viable feature bar for PerFiApp's initial release.

Sources: [Monarch June product update](https://www.monarch.com/blog/june-product-update) / [Goals 3.0 announcement](https://help.monarch.com/hc/en-us/articles/44373110771860-Introducing-Goals-3-0)

### 8.2 Wealthsimple — Household Banking and RTR early adopter

Since the prior report, Wealthsimple has confirmed:
- **Household Banking:** Multi-account view across chequing, investments, mortgages, group RRSPs, and external accounts. Launches a shared household financial view directly competing with PerFiApp's planned household features.
- **Business Chequing:** Available now for entrepreneurs and small business owners.
- **Kids and Teens accounts:** Expected Fall 2026 — a segment PerFiApp has not addressed in the PDR.
- **RTR early adopter:** Wealthsimple confirmed it will be among the first Canadian fintechs to offer real-time payment sends/receives via the RTR.

**For PerFiApp:** Wealthsimple is expanding rapidly into territory that overlaps with PerFiApp's roadmap. The household and multi-account view is particularly notable — it is a feature PerFiApp's aggregation-first approach should natively support and could differentiate on by covering third-party accounts outside Wealthsimple's own ecosystem. Wealthsimple's RTR early adopter status also means it will have first-mover experience with instant payment UX that PerFiApp can study and learn from.

Sources: [Wealthsimple Household Banking](https://www.fintech.ca/2026/05/21/wealthsimple-expands-into-family-and-business-banking/) / [Wealthsimple RTR early adopter](https://www.electronicpaymentsinternational.com/features/canada-finally-to-get-real-time-payments-open-banking/)

### 8.3 Neo Financial — Interac payment rails

Neo Financial joined Interac's payment rails as an official participant in April 2026 — the second Canadian fintech (after Wealthsimple) to achieve this. Neo's 1.3M+ users now have a closer-to-bank-account experience for e-transfers. This further validates that direct payment rail access (rather than bank aggregation alone) is becoming table stakes for Canadian neobanks.

Source: [BetaKit — Neo Financial Interac](https://betakit.com/neo-financial-becomes-second-fintech-to-join-interac-payment-system/)

---

## Recommended Next Steps

### Immediate (this week — before next CI run)

1. **Verify CI workflows against Claude Code v2.1.200 "Manual" mode default.** Both the weekly research workflow and the automated PR-review workflow may now hang on `AskUserQuestion` dialogs that previously auto-continued. Test both workflows with a dry run immediately.

2. **Update spec-lead and architect agent files to use `claude-sonnet-5`.** Introductory pricing ($2/$10) closes August 31 — nearly eight weeks remain. Capture the savings now. Set `claude-opus-4-8` as the fallback, not `claude-fable-5`. Ensure no agent file hard-codes Fable 5 as primary for coding tasks.

3. **Confirm zero usage of `claude-opus-4-1-20250805`** via Claude Console Usage Export. Retirement is August 5, 2026 — 30 days. If found, migrate to `claude-opus-4-8`.

4. **Do not update implementer agent to use Fable 5 yet.** Classifier false-positive rate is too high for TypeScript/NestJS coding tasks. Keep `claude-opus-4-8` as implementer primary. Revisit when Anthropic publishes a classifier improvement update.

5. **Verify Spec Kit v0.12.0 opt-in change for agent-context extension.** The extension is no longer auto-enabled. If PerFiApp's `.specify/` was relying on automatic context updates, explicitly re-enable the extension or the `CLAUDE.md` context note will go stale when specs begin.

### Short-term (this sprint)

6. **Upgrade Spec Kit to v0.12.4.** Nine releases since the prior recommendation of v0.11.6. The v0.12.0 opt-in change is the most actionable; v0.12.4's sha256 verification and template fixes are useful for advanced spec workflows.

7. **Upgrade APM to v0.24.0.** The Executable Trust Governance v1 (deny-wins resolver) and pre-extraction checksum verification are the two most relevant security improvements. Both directly affect MCP server installation safety.

8. **Add Unit 42 sampling attack mitigations to the MCP vetting checklist.** Three additions: (a) Does the server use the sampling feature? (b) Is sampling output sanitized before downstream tool calls? (c) Is sampling frequency rate-limited? These supplement the prior report's authentication and RCE checks.

9. **Plan for stateless MCP server design before July 28.** If any custom MCP server (Flinks adapter, Plaid wrapper) is being scoped, finalize the stateless architecture before the RC publishes. The architect should complete this design before the MCP RC date to avoid mid-spec-revision.

10. **Evaluate DeepEval TypeScript (`deepeval-ts`) for the test-engineer agent.** With TypeScript local evals available, the test-engineer can now build eval harnesses natively for NestJS financial logic before any code is written — establishing a baseline for money math, credit calculations, and i18n correctness from the first commit.

### Medium-term (next 4–6 weeks)

11. **Target NestJS v12 as the backend baseline.** The stable release is expected Q3 2026 — before PerFiApp is likely to write significant backend code. The architect should plan the `apps/api` scaffolding to use v12 natively: ESM, Vitest, Zod via Standard Schema, oxlint, Rspack. Migrating from v11 to v12 later costs more than targeting v12 from the start.

12. **Track Expo SDK 57 beta (expected late August).** SDK 56 is the current stable choice for `apps/mobile`. SDK 57 (React Native 0.87) will likely ship before PerFiApp writes its first mobile screen. Monitor the beta when it drops in late August.

13. **Monitor Fable 5 classifier refinement.** Anthropic has committed to reducing false positives but has given no timeline. Re-evaluate Fable 5 for the implementer agent when — and only when — BridgeMind or equivalent benchmarks show TypeScript debugging scores recovering toward pre-suspension levels (86.2 on debugging). Do not re-adopt based on Anthropic's statements alone.

14. **Monitor CDBA accreditation criteria** from the Bank of Canada (now confirmed as lead regulator, not FCAC). When accreditation criteria publish, the architect and spec-lead will need to assess PerFiApp's eligibility and data-flow obligations. Set a Bank of Canada publication alert.

15. **Assess competitive positioning for Goals 3.0 and Wealthsimple Household Banking.** The spec-lead should review the PDR's differentiation claims in light of Monarch Goals 3.0's transaction-to-goal linking and Wealthsimple's household multi-account view. Both are now live in competitor apps.

16. **Set an Anthropic classifier update alert for Fable 5.** The performance regression from the cybersecurity classifier is the single most important unresolved Anthropic issue for this report cycle. Subscribe to Anthropic's status page and blog for any announcement of classifier improvements.

---

*Report generated 2026-07-06. All findings verified against primary sources. Delta report vs 2026-06-24 — prior findings not repeated unless status changed. Sources cited inline per finding.*

**Source index (key links):**
- [Fable 5 restoration — CNBC](https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html)
- [Fable 5 redeployment — Anthropic](https://www.anthropic.com/news/redeploying-fable-5)
- [Fable 5 debugging regression — TechTimes](https://www.techtimes.com/articles/319576/20260702/claude-fable-5-debugging-scores-drop-70-safety-classifier-reroutes-tasks-weaker-fallback-model.htm)
- [Claude Sonnet 5 — Anthropic](https://www.anthropic.com/news/claude-sonnet-5)
- [Models overview — Anthropic docs](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Claude Code changelog](https://code.claude.com/docs/en/changelog)
- [MCP RC 2026-07-28](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [DeepEval TypeScript](https://deepeval.com/blog/typescript-in-deepeval-monorepo)
- [Spec Kit releases](https://github.com/github/spec-kit/releases)
- [APM releases](https://github.com/microsoft/apm/releases)
- [Expo SDK 56](https://expo.dev/changelog/sdk-56)
- [NestJS v12 roadmap — InfoQ](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/)
- [pnpm 11.10](https://pnpm.io/blog/releases/11.10)
- [Unit 42 MCP sampling attack vectors](https://unit42.paloaltonetworks.com/model-context-protocol-attack-vectors/)
- [CDBA — McCarthy Tétrault](https://www.mccarthy.ca/en/insights/blogs/techlex/open-banking-in-canada-moves-from-blueprint-to-law)
- [RTR phased launch — Fathom4sight](https://www.fathom4sight.ai/blog-articles/canadas-real-time-rail-set-for-phased-launch-in-q4-2026)
- [OSFI fast-track — Torys](https://www.torys.com/our-latest-thinking/publications/2026/02/osfi-to-fast-track-new-entry-regime-for-fintechs-and-credit-unions)
- [Monarch June product update](https://www.monarch.com/blog/june-product-update)
- [Wealthsimple household banking](https://www.fintech.ca/2026/05/21/wealthsimple-expands-into-family-and-business-banking/)
