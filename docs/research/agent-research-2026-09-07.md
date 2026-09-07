# PerFiApp Agent Research — 2026-09-07

**Third run. Delta report vs 2026-06-24. Prior findings not repeated unless status has changed. Rotation emphasis this run: model lineup overhaul (three new models in 10 weeks), Fable 5 restoration confirmation, MCP stateless spec shipping, OSFI agentic AI bulletin, and the Agent SDK billing split cancellation.**

---

## Executive Summary

Three items demand action in the next few days:

1. **The model lineup has been completely refreshed since June 24.** Claude Sonnet 5 ($2/$10 per million tokens), Opus 5 ($5/$25), and Fable 5.1 ($10/$50, 75% cheaper cache reads) have all launched since the last report. Fable 5 is fully restored globally as of July 1. Agent files and CI configurations still pointing at Opus 4.x models are now suboptimal on cost and capability. The default model in Claude Code itself switched to Fable 5.1 on September 1.

2. **The MCP stateless specification shipped July 28.** This is no longer a watch item — it is final. Any custom MCP server PerFiApp builds (a Flinks adapter is the most likely candidate) must be designed for stateless operation from day one. The spec now also formally requires OAuth 2.1 compliance, with enterprise-managed authorization support.

3. **OSFI published a binding bulletin on Generative and Agentic AI on July 13, 2026.** While PerFiApp is not yet a federally regulated institution, the bulletin sets out the governance norms that any partner bank or payment processor PerFiApp connects to must follow. More directly: if PerFiApp ever applies for a banking license under the new OSFI fast-track framework, this bulletin describes what PerFiApp's own AI agent team must be able to demonstrate.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Fable 5 restored + Fable 5.1 released** | Model | spec-lead, architect | **STATUS CHANGED: suspended → active. Adopt Fable 5.1 for spec-lead/architect.** |
| **Sonnet 5 released ($2/$10/M)** | Model / Cost | implementer, code-reviewer | **Adopt — replaces Sonnet 4.6 as mid-tier with major cost improvement** |
| **Opus 5 released ($5/$25/M)** | Model | spec-lead, architect, security-reviewer | **Adopt — replaces Opus 4.8 at lower cost** |
| **claude-opus-4-1 retired August 5** | Model | Any agent using this ID | **STATUS CHANGED: deprecated → retired. Confirm no traffic hits this ID.** |
| **Agent SDK billing split cancelled** | Cost | All developers | **STATUS CHANGED: paused → cancelled. Update monitoring plans.** |
| **Fable 5.1 cache reads 75% cheaper** | Cost | spec-lead, architect (multi-step sessions) | **Adopt — prioritize prompt caching on Fable 5.1 agent calls** |
| **Claude Code v2.1.261 — 74 versions since June 23** | Toolchain | All agents | **Adopt — update immediately; key: --restricted mode, PreModelSwitch hooks, cacheTtl in frontmatter** |
| **MCP stateless spec shipped July 28** | Tooling | architect | **STATUS CHANGED: watch → Act. Design any custom MCP server for stateless operation now.** |
| **CVE-2026-33032 — MCP supply chain, CVSS 9.8** | Security | architect, code-reviewer | **Act — add MCP lockfile verification to vetting checklist** |
| **OpenClaw ClawHavoc campaign — 1,184 skill packages compromised** | Security | All agents | **Act — never install APM/MCP skills without SHA-pinned lockfiles** |
| **OSFI Bulletin July 13, 2026 — Agentic AI** | Compliance | spec-lead, architect | **Act — human-approval gates and non-human identities required for financial agent actions** |
| **Canada RTR by-law in force August 24, 2026** | Compliance | architect | **STATUS CHANGED: Q4 target → by-law active. Architecture for payment initiation can now be finalized.** |
| **CDBA draft regulations — comment period closed Aug 26** | Compliance | spec-lead, architect | **Monitor — final regs expected, no Phase 1 date yet** |
| **KOHO: OSFI fast-track framework live** | Competitive | spec-lead | **Monitor — KOHO banking license approval could come before end of 2026** |
| **Wealthsimple: "financial OS" product expansion** | Competitive | spec-lead | **Act — positioning overlap with PerFiApp now direct; PDR differentiation review needed** |
| **Spec Kit v0.13.0 (from v0.11.6)** | Toolchain | spec-lead | **Adopt — assess idea pipeline, Autonomous Run Governance v0.2.2** |
| **APM v0.28.0 (from v0.21.0)** | Toolchain | All developers | **Adopt — OS trust store, archive checksums, .kiro/agents/ deployment** |
| **DeepEval v4.2.1 (from v4.0)** | Agent quality | test-engineer | **Adopt — Decision Graph Logic and further eval improvements** |
| **Quebec Law 25 2026 amendments — penalties up to 4% global turnover** | Compliance | spec-lead, security-reviewer | **Act — verify CAI notification flows and breach response procedures** |
| **NestJS v12 — ESM migration, Vitest, oxlint** | Toolchain | implementer | **Watch — Q3 2026 target; verify against pnpm monorepo before adopting** |
| **Expo SDK 56 / React Native 0.85** | Toolchain | implementer | **Adopt — New Architecture now stable default; Expo UI stable** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGED: Fable 5 restored July 1, 2026

Export controls were lifted June 30, 2026, and access was restored July 1 globally for Claude API, Claude.ai, Claude Code, and Claude Cowork. The 19-day suspension is over. No nationality-based access controls are in effect for standard commercial access. The earlier third-party claim of "nationality controls" from the June 24 report was incorrect — Anthropic's official statement confirms universal restoration.

**For PerFiApp:** The fallback chain from the June 24 report (`claude-opus-4-8 → claude-sonnet-4-6 → claude-haiku-4-5`) is still good practice, but the primary blocker is gone. However, Fable 5 has been superseded by Fable 5.1 (see 1.2) — there is no strong reason to stay on Fable 5.

Sources: [Anthropic — Redeploying Fable 5](https://www.anthropic.com/news/redeploying-fable-5) / [CNBC reporting](https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html) / [VentureBeat](https://venturebeat.com/technology/anthropic-is-bringing-back-claude-fable-5-globally-after-us-lifts-export-control-order-where-can-enterprises-access-it)

---

### 1.2 New model: Claude Fable 5.1 — September 1, 2026

Fable 5.1 launched September 1, 2026, now the default model in Claude Code (as of v2.1.257). It is the highest-capability generally-available model. Key parameters:

- **Price:** $10/$50 per million input/output tokens — same list price as Fable 5.
- **Cache reads:** $0.25 per million tokens — 75% cheaper than Fable 5 ($1/M). This is the most significant cost improvement: Anthropic estimates 25% cost reduction for typical workloads and up to 45% for highly agentic workloads.
- **Context:** 1M token context window, 128K max output.
- **Thinking:** Always-on adaptive thinking.
- **Knowledge cutoff:** June 2026.
- **Benchmarks:** Leads Opus 5 on all seven published benchmarks including SWE-bench Verified (95.0%) and SWE-bench Pro (80.0%).

**For PerFiApp:** Fable 5.1 should be the primary model for the spec-lead and architect agents — both roles generate long, complex outputs where the 75% cache read discount on repeated context pays off directly. The knowledge cutoff of June 2026 is also a meaningful upgrade over Opus 4.8 for financial domain awareness.

Sources: [Anthropic — Claude Fable](https://www.anthropic.com/claude/fable) / [VentureBeat — Fable 5.1 pricing](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads) / [llm-stats.com](https://llm-stats.com/models/claude-fable-5-1)

---

### 1.3 New models: Claude Sonnet 5 (June 30) and Opus 5 (July 24)

Two full generational upgrades shipped between the reports.

**Claude Sonnet 5** ($2/$10 per million tokens, launched June 30, 2026): Positioned as the default for most agentic work. Anthropic says Sonnet 5 handles tasks that previously demanded Opus. 63.2% on the agentic coding benchmark (vs Opus 4.8's 69.2%) — still below Opus 4.8 on code, but meaningfully cheaper. The implementer and test-engineer agents, which previously used Sonnet 4.6, should migrate here.

**Claude Opus 5** ($5/$25 per million tokens, launched July 24, 2026): 89.1% on Terminal-Bench 2.1. Replaces Opus 4.8 for deep reasoning, complex code, and long-horizon agentic work. The security-reviewer and any calls requiring extended thinking should migrate to Opus 5.

**For PerFiApp — suggested agent tier mapping:**

| Agent | Prior model | Recommended model | Rationale |
|---|---|---|---|
| spec-lead | claude-opus-4-8 | claude-fable-5-1 | Highest-capability for complex spec work |
| architect | claude-opus-4-8 | claude-fable-5-1 | Same; long context window valuable for large specs |
| implementer | claude-sonnet-4-6 | claude-sonnet-5 | Major capability upgrade at same-class price |
| test-engineer | claude-sonnet-4-6 | claude-sonnet-5 | Same |
| code-reviewer | claude-sonnet-4-6 | claude-sonnet-5 | Same |
| security-reviewer | claude-opus-4-8 | claude-opus-5 | Deep reasoning for security analysis; Opus 5 at lower cost |
| debugger | claude-sonnet-4-6 | claude-sonnet-5 | Same |
| researcher | claude-sonnet-4-6 | claude-sonnet-5 | Same |

Note: Haiku 4.5 remains valid for high-volume, low-complexity routing or classification tasks if any are added to the pipeline.

Sources: [Anthropic — Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5) / [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) / [Second Talent model comparison](https://www.secondtalent.com/resources/every-claude-ai-model-explained-compared/)

---

### 1.4 STATUS CHANGED: claude-opus-4-1 retired August 5, 2026 (confirmed)

Retirement happened as announced. As of August 5, 2026, `claude-opus-4-1-20250805` returns API errors. Any agent configuration or CI script still referencing this model ID is currently broken. Use Claude Console Usage Export to confirm no live traffic.

Sources: [Blurbrahlab Medium — August 5](https://blurbrahlab.medium.com/claude-opus-4-1-is-gone-today-top-10-ai-flutter-news-august-5-2026-b1c8ca9545e3) / [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 STATUS CHANGED: Agent SDK billing split — cancelled, not merely paused

The June 24 report described this as "paused." It is now cancelled. On June 15, 2026, Anthropic confirmed in its Help Center that the planned move of Agent SDK, `claude -p`, Claude Code GitHub Actions, and third-party app usage to a separate monthly credit pool is **"no longer happening."** Anthropic committed to advance notice before any future change.

**For PerFiApp:** The CI research workflow and automated PR review continue to draw from the maintainer's subscription quota with no separate billing. The monitoring plan recommended in the June 24 report (tracking Agent SDK token consumption) is still useful for cost visibility, but the billing split trigger is gone. No budget modeling action needed.

Sources: [The New Stack — pause](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/) / [Codersera — billing cancelled](https://codersera.com/blog/anthropic-june-2026-billing-change-claude-code/)

---

### 2.2 Fable 5.1 cache reads: 75% cost reduction for multi-step agent sessions

Verified: Fable 5.1 cache read tokens cost $0.25/M (down from $1/M on Fable 5 and Opus 4.8). For the spec-lead and architect agents — both of which receive the same constitution + active spec as system-prompt context on every call — this is a direct 75% reduction on cache hit tokens. Prompt caching was already recommended for a 5-minute TTL; that recommendation holds and is now significantly more valuable.

**Concrete estimate:** If a spec-lead session consumes 50K cached tokens per call at 10 calls/session, the session cache cost drops from $0.50 to $0.125 on Fable 5.1. For multi-day spec work that can be 100+ calls, the savings compound.

Source: [VentureBeat — Fable 5.1 pricing](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 Claude Code v2.1.261 — 74 releases since v2.1.187 (June 23)

The most actionable changes for PerFiApp, grouped by impact:

**Security — `--restricted` mode (v2.1.248, August 27)**
A new `--restricted` flag removes all built-in tools that run commands or code (Bash, Execute) and WebFetch. This is directly relevant for the code-reviewer and security-reviewer agents, which should never be running shell commands. Adding `--restricted` to these agents' invocations in `settings.json` enforces the read-only constraint at the tool level rather than relying on the system prompt.

**Cost — `experimental.cacheTtl` in agent frontmatter (v2.1.248)**
Agent files (`.claude/agents/*.md`) now accept an `experimental.cacheTtl` field in YAML frontmatter, overriding the default prompt cache TTL per agent. This allows the spec-lead and architect agents (whose system prompts change infrequently) to use a longer TTL, reducing cache misses on the constitution context.

**Model lifecycle — PreModelSwitch and PostModelSwitch hooks (v2.1.251, August 28)**
New hook events fire before and after Claude Code switches the active model. These can be used to enforce governance rules (e.g., log when any agent switches to Fable 5.1 or Opus 5) or to notify monitoring systems. Relevant for the `enforceAvailableModels` workflow from the June 24 report.

**Workflow — Custom Subagents via /agents (July 2026 releases)**
The July release series added explicit Custom Subagent definitions through `/agents`, model selection per custom agent, and direct `@mentions` for spawning named subagents. This formalizes what was previously implicit in the agent team structure — PerFiApp's `.claude/agents/` files are now first-class citizens in this system.

**UI — Side-by-side diff panel (v2.1.260, September 3)**
The implementer's uncommitted changes are now visible in a side-by-side diff panel in real time. Useful for the code-reviewer agent's human reviewers watching a session.

**sandbox.credentials documentation (partial, v2.1.221/224)**
The underdocumented `sandbox.credentials` setting from the June 24 report is now partially documented through community guides and the expanded implementation in v2.1.221/v2.1.224. The feature now uses a proxy-based approach: a placeholder value is substituted in sandboxed commands, and the real secret is injected only on requests to trusted hosts. Official docs still incomplete — the GitHub issue #70440 remains open.

Sources: [Claude Code changelog](https://code.claude.com/docs/en/changelog) / [Havoptic — v2.1.261 summary](https://www.havoptic.com/tools/claude-code) / [Gradually.ai changelog](https://www.gradually.ai/en/changelogs/claude-code/)

---

### 3.2 STATUS CHANGED: MCP stateless specification — shipped July 28, 2026

The RC that was scheduled for July 28 shipped on that date as the final specification. Key changes confirmed in the final version:

**Session handshake removed:** The `initialize`/`initialized` handshake and `Mcp-Session-Id` header are gone. Protocol version, client identity, and negotiated capabilities now travel in `_meta` on every JSON-RPC request. Clients needing capability discovery call a new stateless `server/discover` method.

**OAuth 2.1 hardening:** MCP servers are now formally OAuth 2.1 resource servers. The spec adds issuer validation (RFC 9207 `iss` parameter), binds client credentials to their authorization server, and begins deprecating Dynamic Client Registration in favor of Client ID Metadata Documents. Six SEPs align the protocol with mainstream OpenID Connect deployments.

**Enterprise-Managed Authorization:** Organizations can now manage MCP access through an existing identity provider (Okta, Microsoft Entra ID). An administrator defines which MCP servers employees may reach — relevant if PerFiApp runs inside an enterprise environment.

**For PerFiApp:** The architecture advice from June 24 is now actionable rather than precautionary. Any Flinks adapter or custom MCP server must be designed stateless from the start — there is no migration path from session-based to stateless that doesn't break clients. The OAuth 2.1 alignment is good news for Plaid integration: Plaid already uses OAuth 2.0, and aligning the MCP layer to the same standard simplifies the auth stack.

Sources: [MCP blog — 2026-07-28 RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [WorkOS — authentication changes](https://workos.com/blog/mcp-2026-spec-agent-authentication) / [4sysops — deep dive](https://4sysops.com/archives/2026-07-28-model-context-protocol-mcp-stateless-multi-round-trip-routable-headers-authorization-hardening/)

---

### 3.3 Flinks MCP server — still no official announcement

No official Flinks MCP server has been announced as of September 7, 2026. The CDBA draft regulations (comment period closed August 26) do not appear to have triggered any Flinks developer tooling announcement. Flinks continues to position around the open banking OAuth API directly. **Verdict remains: Watch.** A direct inquiry to Flinks developer relations is still the recommended path.

Sources: [Flinks blog](https://www.flinks.com/blog/open-banking-canada-2026-launch-fintech-institutions) / [Open Banking Tracker](https://www.openbankingtracker.com/country/canada)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval v4.2.1 (September 3, 2026) — notable additions since v4.0

Since the June 24 "Adopt" recommendation on v4.0, two minor version cycles have shipped:

**v4.1.x series** (July–August 2026): Added Decision Graph Logic for granular simulation control over conversational evaluation flows. For PerFiApp's bilingual test cases, Decision Graph Logic allows branching evaluation paths (e.g., if the EN response passes the currency format check, take the FR branch next). Also added complete agentic eval harness that traces multi-step tool-call sequences end-to-end.

**v4.2.x series** (August–September 2026): v4.2.1 released September 3. Specific changes are in the changelog at `deepeval.com/changelog/changelog-2026` — the most cited addition is improved model support and component-level evals.

**For PerFiApp:** The test-engineer agent should now be running DeepEval v4.2.1, not v4.0. The Decision Graph Logic addition is directly useful for testing the bilingual session behavior: EN → FR language switch mid-conversation is a real edge case that DeepEval's graph logic can now model as a branching eval.

Sources: [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026) / [DeepEval 4.0 blog](https://deepeval.com/blog/introducing-deepeval-4) / [PyPI](https://pypi.org/project/deepeval/)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v0.13.0 (July 17, 2026) — latest from v0.11.6

Spec Kit moved through v0.12.0–v0.12.18 (June 29 – July 16) and reached v0.13.0 on July 17. The most significant changes:

**v0.12.0 (June 29):** Started the v0.12 series with warn-before-skills-default-rollout — Spec Kit now warns before automatically rolling out skills to all developers, giving the team a chance to review. Relevant for PerFiApp's APM-managed skill distribution.

**v0.13.0 (July 17):** Added the **Assess idea assessment pipeline** — a new extension that automatically sorts and filters ideas before they enter the spec pipeline. This is the extension described in the June 24 report's "watch" for `/speckit.converge`-adjacent functionality. Also integrated the **OKF Knowledge Bundle Generator** extension into the community catalog, and upgraded the **Autonomous Run Governance** preset to v0.2.2.

The Autonomous Run Governance preset (now v0.2.2) is directly relevant to PerFiApp: it defines governance checkpoints for autonomous agent runs — including the kinds of approval gates OSFI's July 2026 bulletin now recommends for financial institutions.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.13.0`

Sources: [Spec Kit v0.13.0 release](https://github.com/github/spec-kit/releases/tag/v0.13.0) / [Spec Kit releases](https://github.com/github/spec-kit/releases)

---

### 5.2 APM v0.28.0 (August 6, 2026) — latest from v0.21.0

Seven releases since the June 19 v0.21.0 finding. Key additions across v0.22–v0.28:

**v0.24.0:** Archive checksum verification before extraction (prevents tampered archives), hardened plugin `bin/` deployment to user-only permissions (prevents other processes reading installed plugin executables).

**v0.26.0:** OS trust store verification by default (MCP servers must now pass system certificate validation), canonical owner gates enforced (APM verifies the package publisher matches the expected owner before installation).

**v0.27.0:** MCP target determinism — lockfiles are now generated for MCP-only projects, enabling SHA-pinned reproducible installs. This is the most security-critical addition: combined with the June 24 `allowExecutables` gate, APM now provides a full MCP supply-chain verification chain (checksum → owner gate → executable approval → lockfile pin).

**v0.28.0:** Agent deployment to `.kiro/agents/` (AWS Kiro's agent target), plugin collection versioning, nested HTTPS source path support.

**For PerFiApp:** Upgrade from v0.21.0 to v0.28.0. The MCP lockfile (v0.27.0) is the most important addition given the supply-chain attacks in Track 6. Every MCP server PerFiApp installs should be in an `apm.lock` file with pinned SHAs.

Sources: [APM releases](https://github.com/microsoft/apm/releases)

---

### 5.3 React Native 0.85 + Expo SDK 56 — New Architecture now stable

**React Native 0.85 (April 7, 2026):** The New Architecture (JSI, Fabric, TurboModules) is now assumed stable and on by default. The bridge bottleneck is eliminated for new projects. The Shared Animation Backend (with Software Mansion) unifies Animated and Reanimated under one engine, enabling native-driver animation of Flexbox and layout props.

**Expo SDK 56 (May 21, 2026):** Expo UI reached stability — SwiftUI and Jetpack Compose widgets are now accessible from a single JavaScript API without native modules. Multiple simultaneous CDP connections allow React Native DevTools, VS Code, and AI agents to instrument the same session concurrently.

**For PerFiApp:** Since the app hasn't been started yet, it will launch directly on the New Architecture with no migration debt. The Expo UI stability milestone means PerFiApp can use native OS primitives (SwiftUI sheets, Compose bottom sheets) for the financial flow UX without custom native modules. The multi-CDP support means the implementer agent and the test-engineer agent can instrument the same running app session simultaneously — useful for agentic integration tests.

Sources: [DEV — React Native 2026](https://dev.to/davekurian/react-native-ecosystem-advances-with-expo-sdk-56-and-react-192-updates-in-2026-3df5) / [Medium — mid-2026 ecosystem](https://medium.com/@dinesh.kachhot/the-react-native-ecosystem-in-mid-2026-expo-sdk-56-react-native-0-85-and-react-19-2-59919e4d76c5)

---

### 5.4 NestJS v12 — Watch, not yet confirmed shipped

NestJS published a draft PR (#16391) targeting Q3 2026 with a full ESM migration, native Standard Schema validation in route decorators, Vitest replacing Jest, oxlint replacing ESLint, and Rspack replacing Webpack. The PR requires Node.js v20.19+ or v22.12+.

**For PerFiApp:** The implementer and test-engineer agents should watch the NestJS v12 release before committing to test tooling choices. If v12 ships before PerFiApp's API code begins, adopt Vitest from the start (it is meaningfully faster than Jest and the migration penalty is zero for a new project). If v12 is still in RC, stay on NestJS v11 with Jest and plan a v12 upgrade in the first major refactor cycle. As of September 7 the final release is unconfirmed — verify at [NestJS releases](https://github.com/nestjs/nest/releases) before the first implementer sprint.

Sources: [InfoQ — NestJS v12 roadmap](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/) / [Trilon — v12 coming](https://trilon.io/blog/nestjs-12-is-coming)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CRITICAL: CVE-2026-33032 — MCP supply-chain, CVSS 9.8, actively exploited

Disclosed in the MCP Security Q3 2026 analysis: CVE-2026-33032 is a supply-chain attack that exploited the MCP package ecosystem to silently BCC outbound emails from 437,000+ affected environments. CVSS 9.8. Actively exploited at the time of disclosure. The attack vector is a malicious MCP server that appears legitimate but exfiltrates data through a side-channel embedded in the tool call response.

**For PerFiApp:** This attack pattern is precisely why the APM lockfile (v0.27.0) and canonical owner gate (v0.26.0) matter. Any MCP server that processes financial data (Plaid, Flinks, Equifax) must be SHA-pinned in `apm.lock` and reviewed before each update. Add to the MCP vetting checklist: "Does this server make any outbound network calls other than to its documented target?" The security-reviewer agent's checklist should now include a review of MCP server egress behavior.

Sources: [The Agent Report — Q3 MCP security](https://the-agent-report.com/2026/07/mcp-security-landscape-2026-vulnerabilities-mitigations/) / [Practical DevSecOps](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/)

---

### 6.2 OpenClaw ClawHavoc campaign — AI agent skill supply chain attack

The ClawHavoc campaign (disclosed January 2026, active through May 2026) targeted the ClawHub marketplace for OpenClaw agent skills. 1,184 skills — approximately one in five packages — were compromised. Payloads included Atomic macOS Stealer and Windows infostealers harvesting LLM API keys, SSH private keys, browser-stored credentials, and cryptocurrency wallet data.

This is not directly a PerFiApp threat (PerFiApp does not use OpenClaw), but it is the highest-profile confirmation of the supply-chain attack pattern for agent skill ecosystems — the same pattern that APM's `allowExecutables` gate and lockfiles are designed to prevent.

**For PerFiApp:** The principle extracts directly to APM-managed skills and any future Claude Code skill marketplace integration. Never install a skill that: (a) is not SHA-pinned, (b) has not passed the `allowExecutables` approval gate, or (c) requires network access beyond its documented purpose. The implementer agent's environment is the most exposed — it runs bash commands and has broader tool access than the reviewer agents.

Sources: [IBM X-Force — OpenClaw](https://www.ibm.com/think/x-force/what-openclaw-reveals-about-agentic-ai-security-risks) / [Unit 42 — supply chain risk](https://unit42.paloaltonetworks.com/openclaw-ai-supply-chain-risk/) / [Dark Reading](https://www.darkreading.com/cyber-risk/malicious-openclaw-skills-clawhub-threaten-ai-supply-chain)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 OSFI Bulletin — Generative and Agentic AI (July 13, 2026)

OSFI published "Generative and Agentic Artificial Intelligence: Implications for Technology, Cyber Security, and Operational Resilience" on July 13, 2026. While addressed to federally regulated financial institutions, this bulletin describes the governance expectations any partner bank, processor, or potential acquirer will apply to PerFiApp's AI agent team.

Key requirements relevant to PerFiApp:

1. **Human approval for material financial actions.** Agents should advise; humans decide on lending decisions, disputes, fraud holds, and member communications. For PerFiApp, this means the AI coaching and Cash Advance Lite modules cannot take autonomous financial actions — they must surface recommendations for explicit user confirmation.

2. **Non-human identities, least-privilege, just-in-time credentials.** OSFI expects unique non-human identities for AI agents with scoped permissions and short-lived credentials. This aligns with Claude Code's sandbox.credentials approach and should inform how PerFiApp's API agents authenticate to financial data providers.

3. **Third-party concentration risk.** OSFI flags concentration in a single AI provider as an operational resilience risk. PerFiApp's dependency on Anthropic is the obvious case — the fallback model chain is the right mitigation, but the architect should ensure no critical financial data flow has a single-provider chokepoint.

4. **Validation of AI-generated code before deployment.** The bulletin explicitly names autonomous code deployment as a risk. PerFiApp's existing spec-driven workflow (spec → plan → human review before implement) already satisfies this requirement, but it should be documented explicitly in the architecture decision record.

The bulletin aligns with OSFI Guideline E-23 (Final — takes effect May 1, 2027) and Guidelines B-13, E-21, B-10. Guideline E-23 is the primary model risk management obligation for AI use.

Sources: [OSFI — official bulletin](https://www.osfi-bsif.gc.ca/en/risks/technology-cyber-risk-management/technology-risk-bulletin/generative-agentic-artificial-intelligence-implications-technology-cyber-security-operational) / [McCarthy Tétrault analysis](https://www.mccarthy.ca/en/insights/blogs/techlex/managing-the-ai-risks-in-the-financial-sector-osfi-s-bulletin-on-generative-and-agentic-artificial-intelligence) / [FundMore blog](https://blog.fundmore.ai/osfi-agentic-ai-bulletin-a-checklist-disguised-as-guidance)

---

### 7.2 STATUS CHANGED: Canada RTR — by-law in force August 24, 2026

The Real-Time Rail by-law and rules received final approval from Finance Minister Champagne and came into force **August 24, 2026**. The Q4 2026 phased launch is on track. Banks are required to *receive* RTR payments once the system goes live; sending capabilities remain optional in the early stages, with universal participation expected in 2027.

**For PerFiApp:** This is a meaningful status change. The RTR is no longer speculative — the legal framework is active. The Q4 2026 phased launch means some banks will be live with RTR before the end of the year. PerFiApp's Phase 2 payment initiation architecture (Due-Date Coach automatic payments, Cash Advance Lite repayments) can now be designed with confirmed technical parameters. The architect should now produce a concrete RTR integration plan rather than a placeholder.

Sources: [Payments Canada — by-law](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [BetaKit — launch year](https://betakit.com/canadas-real-time-rail-system-will-launch-this-year-after-achieving-critical-milestone/) / [FundMore — lender implications](https://blog.fundmore.ai/canada-real-time-rail-comes-into-force-lender-batch-assumptions-just-got-a-deadline)

---

### 7.3 CDBA Phase 1 — draft regulations closed August 26, final regs pending

The Consumer-Driven Banking Act received Royal Assent March 26, 2026. Draft regulations were published and remained open for public comment until **August 26, 2026**. Final regulations are pending; no operational Phase 1 launch date has been set by the Bank of Canada.

The Bank of Canada has not changed its position from March ("premature to commit to a Phase 1 date"). The 2026 Phase 1 launch is still widely seen as at risk. However, the comment period closing is a procedural milestone — final regulations could follow within months, potentially enabling a 2027 launch for Phase 1 even if 2026 slips.

**For PerFiApp:** Design advice unchanged — build for OAuth-only data access. But the architect should add the final regulation publication to the watch list. Once final regs publish, accreditation timelines become deterministic.

Sources: [Open Banking Tracker](https://www.openbankingtracker.com/country/canada) / [McMillan — Budget 2025 key updates](https://mcmillan.ca/insights/publications/canadas-open-banking-framework-key-updates-from-budget-2025/)

---

### 7.4 Quebec Law 25 — 2026 amendments expand CAI enforcement powers

Quebec Law 25's 2026 amendments (in force) significantly strengthen enforcement:

- Maximum administrative monetary penalties: 4% of worldwide turnover, or CAD 25 million (whichever is higher) for severe violations; CAD 100,000 cap for individuals.
- Commission d'accès à l'information (CAI) now has power to compel document production under timelines as short as five business days for confirmed breach investigations.

**For PerFiApp:** Any Quebec resident whose data is processed by PerFiApp falls under Law 25. The 4% worldwide turnover penalty is consistent with GDPR-level exposure. Key obligations: (a) breach notification to CAI must be timely (72 hours for serious confidentiality incidents); (b) privacy impact assessments (PIAs) for any AI-driven profiling or credit analysis of Quebec residents; (c) the CAI can now compel production of internal AI risk assessments. The security-reviewer agent's checklist should include a PIA trigger for any new module that uses AI to analyze user financial data.

Sources: [Augure — Law 25 AI compliance guide](https://augureai.ca/blog/law-25-ai-compliance-guide-quebec) / [Sherlock Forensics — 2026 amendments](https://www.sherlockforensics.com/blog/quebec-law-25-2026-amendments-canadian-organizations.html)

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO — OSFI fast-track framework launched, license possible before year-end

OSFI launched a Targeted Fast-Track Framework for new fintech bank applicants in June 2026: initial feedback within 4 weeks, risk-based review within 12 months, then up to 3 months for the Minister of Finance. KOHO has been in the OSFI process since 2021 and entered Phase 2 in 2024. With the fast-track framework now active and the $130M raise complete, CEO Eberhard has called approval "imminent."

**Status:** No Schedule 1 bank license has been granted yet as of this report. But the combination of the fast-track framework and KOHO's advanced process position means a grant before year-end is plausible, not just aspirational.

**For PerFiApp:** A licensed KOHO would be able to hold CDIC-insured deposits directly, removing its current reliance on Peoples Trust. This would make KOHO a more credible home for emergency funds and savings features that PerFiApp currently plans to reference-link to partner banks. PerFiApp's differentiation must be on AI depth, bilingual design, and cross-institution aggregation — features a banking license does not give KOHO.

Sources: [Globe and Mail — KOHO raise](https://www.theglobeandmail.com/business/article-koho-raises-130-million-banking-licence/) / [Canadian Fintech newsletter](https://canadianfintech.substack.com/i/141144380/product)

---

### 8.2 Wealthsimple — "household financial OS" positioning now direct competitive overlap

On May 21, 2026, Wealthsimple announced a sweeping product expansion at its third "Wealthsimple Presents" event: Portfolio Line of Credit (instant access to cash against investments at 3.95%), USD Chequing Account (US + Canadian rails, up to 3.25% interest, launching Fall 2026), Kids and Teens Accounts (parental controls, spend card), and Business Banking (chequing, lending, spending analysis).

CEO Michael Katchen is explicitly positioning Wealthsimple as "the default financial operating system for Canadian households, families, and small businesses." Wealthsimple serves 4M+ Canadians and holds $125B+ in assets under administration.

**For PerFiApp:** This is the most significant competitive development since the prior report. Wealthsimple has adopted the same "financial OS" positioning that PerFiApp uses internally. The key differentiators that remain:

- **Bilingual depth (EN/FR-CA):** Wealthsimple's French experience is functional but not a core identity. PerFiApp's bilingual-by-design commitment is a meaningful differentiator in Quebec.
- **AI coaching as the primary interface:** Wealthsimple's AI tools are secondary to its brokerage core. PerFiApp's architecture puts AI coaching first.
- **Cross-institution aggregation:** Wealthsimple primarily manages money held at Wealthsimple. PerFiApp aggregates across institutions.
- **Credit intelligence:** Wealthsimple does not have a credit monitoring or coaching product (Monarch Money does; Wealthsimple does not yet).

The spec-lead should review the PDR's competitive positioning section and assess whether PerFiApp's differentiation narrative needs explicit updating to address the Wealthsimple "financial OS" claim.

Sources: [Globe and Mail — Wealthsimple expansion](https://www.theglobeandmail.com/investing/markets/markets-news/NewsFile/2070271/wealthsimple-launches-new-products-for-families-and-businesses/) / [Wealth Professional](https://www.wealthprofessional.ca/news/industry-news/wealthsimple-expands-into-everyday-banking-with-sweeping-product-launch/392500)

---

## Recommended Next Steps

### Immediate (this week)

1. **Update all agent model assignments.** Migrate: spec-lead and architect to `claude-fable-5-1`, implementer/test-engineer/code-reviewer to `claude-sonnet-5`, security-reviewer to `claude-opus-5`. Remove any references to `claude-opus-4-1-20250805` (now returning API errors). Verify via Claude Console Usage Export that no live traffic hits retired model IDs.

2. **Add `--restricted` flag to code-reviewer and security-reviewer agent invocations.** These agents should never run bash or make web requests. The v2.1.248 `--restricted` mode enforces this at the tool level rather than relying on the system prompt.

3. **Add `experimental.cacheTtl` to spec-lead and architect agent YAML frontmatter.** With Fable 5.1's 75% cheaper cache reads, maximizing cache hit rate on the constitution prompt is now even more valuable. Set a TTL appropriate for the constitutional update cadence.

4. **Confirm Agent SDK billing split is cancelled in team documentation.** Update any internal notes that say the split is "paused." Anthropic has confirmed it is not happening.

5. **Review OSFI's July 2026 AI bulletin against PerFiApp's agent architecture.** Specifically: (a) identify every agent action that constitutes a "material financial action" and ensure it requires explicit user confirmation; (b) document that the spec-driven review workflow satisfies the "validate AI-generated code before deployment" requirement.

### Short-term (this sprint)

6. **Upgrade Spec Kit to v0.13.0** (from v0.11.6). Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.13.0`. Priority: enable Autonomous Run Governance preset v0.2.2 — it implements governance checkpoints that now align with OSFI's explicit recommendations.

7. **Upgrade APM to v0.28.0** (from v0.21.0). Priority additions: MCP lockfile generation (v0.27.0) and archive checksum verification (v0.24.0). Generate an `apm.lock` file for every MCP server dependency PerFiApp uses and commit it to the repo.

8. **Add CVE-2026-33032 mitigation to MCP vetting checklist:** "Does this MCP server make any outbound network calls other than to its documented target? Review server egress behavior before installation." Apply to all existing MCP server evaluations.

9. **Design any custom MCP server (Flinks adapter) for the 2026-07-28 stateless spec.** No `Mcp-Session-Id`. Client identity travels in `_meta`. OAuth 2.1 resource server compliance. The June 24 advice to design stateless is now mandatory, not optional.

10. **Upgrade DeepEval to v4.2.1.** Wire Decision Graph Logic into the bilingual session test suite — specifically model the EN→FR language switch as a branching evaluation path.

### Medium-term (next 4–6 weeks)

11. **Produce an RTR integration architecture document.** The by-law is in force (August 24). The Q4 2026 phased launch is real. The architect should now produce a concrete Phase 2 payment initiation design rather than a placeholder. Target completion before Phase 1 CDBA implementation work begins.

12. **Verify NestJS v12 release status before first API sprint begins.** If v12 is GA, adopt Vitest as the test runner from day one (no migration cost for a new project). If v12 is still RC, start on v11 with a documented upgrade path.

13. **Spec-lead to revise PDR competitive section.** Wealthsimple's "financial OS" positioning is now direct. The PDR's differentiation narrative should explicitly address: bilingual depth, AI-as-primary-interface (not secondary), cross-institution aggregation, and credit intelligence as PerFiApp's four durable advantages.

14. **Assess Quebec Law 25 PIA requirement for AI modules.** Any module that profiles Quebec residents using AI (Credit Monitor, AI coaching recommendations, Due-Date Coach scoring) likely triggers a PIA obligation under the 2026 amendments. The security-reviewer agent's checklist should flag PIA requirement when reviewing specs for these modules.

15. **Continue Flinks MCP server watch.** The CDBA comment period has closed and final regulations are forthcoming. This is the trigger window for Flinks to announce developer tooling. Re-check in the October research run.

---

*Report generated 2026-09-07. All findings verified against primary sources where accessible. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
