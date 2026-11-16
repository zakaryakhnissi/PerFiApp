# PerFiApp Agent Research — 2026-11-16

**Fourth run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: (1) Model landscape changes — Fable 5 status + all new Anthropic models in 5-month gap, (2) Canadian open banking progress — CDBA Phase 1 and RTR launch, (3) MCP protocol maturity — stateless spec shipped July 28.

---

## Executive Summary

- **claude-haiku-4-5-20251001 floor date has passed (October 15, 2026) and claude-opus-4-5-20251101 floor date is 8 days away (November 24).** Neither has a confirmed retirement date, but both are eligible for deprecation announcement now. If PerFiApp's agent files or workflows reference either model ID, begin migration planning to Haiku 5.5 and the latest Opus tier immediately.

- **claude-sonnet-4-5-20250929 retires November 30, 2026 — 14 days away.** If anything in the codebase or CI still references `claude-sonnet-4-5`, it will return API errors in two weeks.

- **Canada's Real-Time Rail launched November 9, 2026 with eight initial participants.** The Big Six banks are absent from day-one participation. RTR enables the Phase 2 write-access open banking (payment initiation) that PerFiApp's Cash Safety and Pay modules depend on. The architecture timeline is now concrete: build for RTR-based payment initiation in 2027.

- **Anthropic API version 2026-10-21 removes `temperature`, `top_p`, and `top_k` across ALL models** — not just Opus 4.7+ as the June report noted. This is a formal breaking change in the new API version. The TypeScript SDK v1.0.0 (`@anthropic-ai/sdk`) and Python SDK v2.0.0 both default to this version. Any agent YAML that sets these parameters and uses the new SDK versions will break immediately on upgrade.

- **Five new Claude model generations shipped since June 24.** The agent roster's approved models are now two full tiers behind the state of the art. Claude Opus 5.5 ($4/$20 per 1M tokens) outperforms Opus 4.8 at 40% lower cost than Opus 5. Claude Sonnet 5.5 and Haiku 5.5 are the new everyday and lightweight tiers. Recommend upgrading the roster model config in a single PR.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| Fable 5 / Mythos 5 export controls lifted July 1 | Model | spec-lead, architect | **Adopt (re-evaluate)** — restored; now trial Fable 5.2 for spec-lead |
| claude-sonnet-4-5 retires November 30 | Model | Any agent using this ID | **Act — 14 days** |
| claude-haiku-4-5 floor date passed; opus-4-5 floor in 8 days | Model | Any agent using these IDs | **Act — begin migration planning** |
| Opus 5.5 / Sonnet 5.5 / Haiku 5.5 — new tier | Model / Cost | All agents | **Adopt — full roster refresh in one PR** |
| API version 2026-10-21: temp/top_p/top_k removed all models | Model / Cost | All agents, CI | **Act — audit SDK version + agent YAML** |
| RTR launched November 9 (8 participants, not Big Six) | Compliance | architect, spec-lead | **Act — RTR-based payment initiation now has a concrete timeline** |
| CDBA draft regulations closed comment August 26 | Compliance | architect, spec-lead | **Monitor — final rules expected Q1–Q2 2027** |
| MCP 2026-07-28 spec shipped (stateless) | Agent tooling | architect | **Act — Claude Code already negotiates it; audit any MCP servers built or planned** |
| MCP tasks support in Claude Code v2.1.319 | Agent tooling | implementer | **Adopt — long Flinks/Plaid calls now run as background tasks** |
| Claude Code plugins official directory | Agent tooling | all agents | **Watch — vet finance-relevant plugins; apply same MCP vetting checklist** |
| permissions.blockWritesOutsideWorkingDirectories (v2.1.314) | Security | implementer | **Adopt — enable in project settings immediately** |
| CVE-2026-75130 Context7 MCP prompt injection (CVSS 9.0) | Security | architect, code-reviewer | **Act — add to MCP vetting checklist** |
| NSA MCP security guidance + OWASP MCP Top 10 (beta) | Security | architect, security-reviewer | **Act — incorporate OWASP MCP Top 10 categories in vetting checklist** |
| MCP OAuth: no refresh token to redirected host (v2.1.3xx) | Security | implementer, architect | **Adopt — financial app relevance; verify any Plaid/Flinks OAuth flows** |
| Sandbox escape (worktree) + Bash env-prefix bypass patches | Security | All developers | **Act — verify Claude Code is v2.1.326 or newer** |
| NestJS v12 (Full ESM, Standard Schema, @nestjs/observe) | Toolchain | implementer, architect | **Watch — plan migration; not urgent but breaking changes on upgrade** |
| Expo SDK 56 (RN 0.85, Expo UI stable, widgets) | Toolchain | implementer | **Adopt — SDK 55's New Architecture mandate already in place** |
| pnpm v11 (ESM, Node 22+, SQLite store) | Toolchain | implementer | **Watch — breaking change on upgrade; v10 LTS winding down** |
| Spec Kit v1.0.6 (from v0.11.6 in last report) | Toolchain | spec-lead | **Adopt — verify 1.x breaking changes before upgrading** |
| DeepEval v4.2.6: voice simulation, JevEval | Agent quality | test-engineer | **Watch — voice evals not relevant yet; JevEval worth reviewing for fintech metrics** |
| Quebec Law 25 enforcement active (CAI issuing MAPs) | Compliance | security-reviewer, architect | **Monitor — PerFiApp will process Quebec residents' data; designate privacy officer now** |
| Wealthsimple "Penny" AI assistant launched + Claude integration plans | Competitive | spec-lead | **Monitor — direct competitor for PerFiApp's AI coaching differentiation** |
| Flinks no confirmed MCP server (agentic readiness score 0/12) | Agent tooling | architect | **Monitor — Flinks MCP inquiry still warranted; no progress since June** |
| KOHO banking license still pending (OSFI fast-track announced) | Competitive | spec-lead | **Monitor — fast-track may accelerate; check monthly** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS RESOLVED: Fable 5 / Mythos 5 export controls lifted June 30, 2026

**Status changed from "suspended" (June 24 report) to "fully restored."**

The US Department of Commerce lifted the export-control directive on June 30, 2026, effective July 1. Restoration was global — no nationality-based access controls were imposed. Anthropic committed to "proactively detect and address security risks" as a condition of restoration. `claude-fable-5` and `claude-mythos-5` are both active, with floor dates of June 9, 2027.

The more relevant news: `claude-fable-5-2` and `claude-mythos-5-2` shipped November 9, 2026 (see section 1.2). Fable 5.2 is now the current top-tier model, superseding the originally suspended Fable 5.

For PerFiApp: the June 24 fallback chain (`claude-opus-4-8` → `claude-sonnet-4-6` → `claude-haiku-4-5`) can be relaxed. See section 1.2 for the new recommended roster.

Sources: [CNBC](https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html) / [Al Jazeera](https://www.aljazeera.com/economy/2026/7/1/us-lifts-restrictions-on-powerful-ai-models-fable-mythos-anthropic-says) / [Anthropic blog](https://en.ain.ua/2026/07/01/anthropic-restores-access-to-claude-fable-5-and-mythos-5/)

### 1.2 Five new Claude model generations since June 24

Verified against Anthropic's official deprecations page (fetched November 16, 2026):

| Model | Released | Notes |
|---|---|---|
| claude-sonnet-5 | June 30, 2026 | Replaced by Sonnet 5.5 |
| claude-opus-5 | July 24, 2026 | $5/$25 per 1M. Floor July 24, 2027 |
| claude-fable-5-1 / claude-mythos-5-1 | September 1, 2026 | Floor September 1, 2027 |
| claude-opus-5-5 | September 22, 2026 | $4/$20 per 1M. 40% cheaper than Opus 5. Floor September 22, 2027 |
| claude-sonnet-5-5 | September 28, 2026 | Recommended replacement for Sonnet 4.5+. Floor September 28, 2027 |
| claude-haiku-5-5 | October 7, 2026 | Built for classification, extraction, summarization. Floor October 7, 2027 |
| claude-fable-5-2 / claude-mythos-5-2 | November 9, 2026 | Current top-tier. Floor November 9, 2027 |

**Recommended roster update for PerFiApp** (requires a constitution amendment to change approved models):

| Agent | Current | Recommended | Rationale |
|---|---|---|---|
| spec-lead, architect | claude-opus-4-8 | claude-opus-5-5 | Meaningfully better reasoning; $4/$20 is cheaper than anticipated |
| implementer, test-engineer | claude-sonnet-4-6 | claude-sonnet-5-5 | Everyday workhorse; Sonnet 4.5 retiring Nov 30 is a forcing function |
| code-reviewer, debugger, security-reviewer | claude-sonnet-4-6 | claude-sonnet-5-5 | Same tier upgrade |
| researcher (this agent) | claude-sonnet-4-6 | claude-sonnet-5-5 | Same tier upgrade |
| lightweight classification/routing | claude-haiku-4-5 | claude-haiku-5-5 | Haiku 4.5 floor already passed |

Fable 5.2 / Mythos 5.2 at the apex tier ($10/$50 per 1M estimated) is not recommended for the standard roster — appropriate only for a one-time cost-justified spec review or constitution analysis, not routine agent use.

Sources: [Anthropic model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations) / [Axios Opus 5](https://www.axios.com/2026/07/24/anthropic-releases-new-model-opus-5) / [Claude Mythos Wikipedia](https://en.wikipedia.org/wiki/Claude_Mythos) / [Opus 5.5 pricing](https://www.finout.io/blog/claude-opus-5.5-pricing-2026-what-anthropics-new-flagship-actually-costs)

### 1.3 URGENT: claude-sonnet-4-5 retires November 30, 2026

Deprecated September 30, 2026. Replacement: `claude-sonnet-5-5`. 14 days remain. Any reference to `claude-sonnet-4-5-20250929` in agent YAML, CI scripts, or test fixtures must be migrated.

Source: [Anthropic model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.4 URGENT: claude-haiku-4-5 and claude-opus-4-5 near/past retirement floor

`claude-haiku-4-5-20251001` has a tentative retirement floor of October 15, 2026 — that date has passed. `claude-opus-4-5-20251101` has a floor of November 24, 2026 — 8 days away. Neither has an official deprecation announcement yet, but both are eligible for 60-day notices that would put their retirement in January–February 2027. If PerFiApp uses either model ID, migrate proactively.

Source: [Anthropic model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.5 Updated model deprecation table (November 16, 2026)

| Model ID | Status | Notes |
|---|---|---|
| claude-fable-5-2 / claude-mythos-5-2 | Active | Floor November 9, 2027 |
| claude-opus-5-5 | Active | Floor September 22, 2027 — **recommended primary** |
| claude-sonnet-5-5 | Active | Floor September 28, 2027 — **recommended everyday** |
| claude-haiku-5-5 | Active | Floor October 7, 2027 — **recommended lightweight** |
| claude-opus-4-8 | Active | Floor May 28, 2027 |
| claude-sonnet-4-6 | Active | Floor February 17, 2027 |
| claude-haiku-4-5-20251001 | Active | Floor PASSED (Oct 15) — migrate soon |
| claude-opus-4-5-20251101 | Active | Floor in 8 days (Nov 24) — migrate soon |
| claude-sonnet-4-5-20250929 | Deprecated | Retires November 30, 2026 — urgent |
| claude-opus-4-1-20250805 | Retired | August 5, 2026 |

---

## Track 2 — AI Cost & Token Optimization

### 2.1 BREAKING: API version 2026-10-21 removes sampling parameters from ALL models

**Status changed from "400 on Opus 4.7+ only" (June 24 report) to "removed across ALL models on the new API version."**

The new API version `2026-10-21` (released October 21, 2026) makes three changes relevant to PerFiApp:

1. **`temperature`, `top_p`, `top_k` removed from ALL models.** Under `2026-10-21`, sending any of these returns a 400 immediately — including on models like Sonnet 4.6 that previously accepted non-default values. The fix remains the same (omit the parameters), but it now applies universally.

2. **Document blocks in assistant messages return 400.** If any agent prompt sends document blocks in the assistant role, it must be restructured to send documents only in user messages.

3. **Citations in user messages return 400.** A narrower change, but affects any tool that sends `citations` on `text` blocks in user messages.

**SDK impact:** The TypeScript SDK `@anthropic-ai/sdk` v1.0.0 and Python SDK `anthropic` v2.0.0 both default to `2026-10-21`. Upgrading either SDK is a breaking change for any codebase that sets sampling parameters. The old API version `2023-06-01` remains available indefinitely for calls that require non-default sampling values.

**For PerFiApp:** Audit all agent YAML frontmatter for `temperature`, `top_p`, `top_k` fields. Remove them. When upgrading SDKs to 1.x (TypeScript) or 2.x (Python), do it in a dedicated PR with that audit. Confirm on the Claude Console Usage Export that no live traffic hits deprecated model IDs.

Sources: [Anthropic migration guide 2026-10-21](https://platform.claude.com/docs/en/api/migration-2026-10-21) / [Developer breakdown](https://developersdigest.tech/blog/claude-api-version-2026-10-21-sdk-migration)

### 2.2 Opus 5.5 is now the cost-optimal top tier

Claude Opus 5.5, released September 22, is Anthropic's recommended flagship. At $4 input / $20 output per 1M tokens, it is 20% cheaper on input and output than the original Opus 5 ($5/$25) while performing comparably on most tasks. Cache reads drop to $0.20 per 1M from $0.50. Batch processing enables the extended 300K-token output limit (vs standard 128K).

For PerFiApp: spec-lead and architect running extended constitution reviews, spec generation, and plan production benefit directly from the cost reduction on extended-thinking cache hits.

Sources: [Opus 5.5 pricing analysis](https://www.finout.io/blog/claude-opus-5.5-pricing-2026-what-anthropics-new-flagship-actually-costs) / [Benchlm API pricing](https://benchlm.ai/anthropic/api-pricing)

### 2.3 Agent SDK billing split — status still unclear, monitor ongoing

As of the last confirmed coverage (June 2026), the June 15 billing split was paused. No confirmed update from November 2026 found. The Claude.com pricing page now shows a "Max" plan at $100/month with $100 in API credits and an "Ultra" plan at $200/month with $200 in API credits — this language suggests some form of credit separation may have been quietly implemented in plan tiers. However, no authoritative source confirms the CI research run billing model has changed.

**Action:** Check Claude Console billing under whatever account holds the `CLAUDE_CODE_OAUTH_TOKEN` secret. If a separate credit pool appears, model the cost impact of the weekly research runs.

Source: [Claude pricing page](https://claude.com/pricing)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 STATUS UPDATE: MCP 2026-07-28 specification shipped as final

**Status changed from "planned" (June 24 report) to "shipped and active."**

The MCP 2026-07-28 specification was locked for release candidate on May 21, 2026, and shipped as the final specification on July 28, 2026. Claude Code v2.1.299+ negotiates protocol version 2026-07-28 by default. Set `MCP_PROTOCOL_NEGOTIATION=legacy` to opt out.

Key changes confirmed from primary sources:

- **Sessions removed at the protocol layer.** The `initialize`/`initialized` handshake is removed (SEP-2575). `Mcp-Session-Id` header is gone (SEP-2567). Protocol version, client info, and capabilities now travel on `_meta` in every request. Transport code that managed sessions must be rewritten.
- **New required headers.** Streamable HTTP requests require `Mcp-Method` and `Mcp-Name` headers (SEP-2243) for load-balancer routing.
- **MCP Tasks extension.** Long-running tool calls can now be dispatched as background tasks — Claude Code v2.1.319 implements this. Relevant for Flinks account connections or Plaid multi-account syncs that may time out in a synchronous tool call.
- **Six OAuth/OIDC hardening SEPs.** Token management, scope validation, and redirect URI enforcement are now part of the spec. These address the class of vulnerabilities represented by CVE-2026-75130 and the OX Security advisory from June.
- **Breaking compatibility.** The initialize handshake removal is a protocol-layer break. Any custom MCP server PerFiApp builds (e.g., a Flinks adapter) must be stateless from the initial design.

Also from Claude Code v2.1.299: `mcp__a` no longer matches a server named `a__b` — write full tool names in permission rules. HTTP redirects on claude.ai connector proxy and Anthropic-hosted MCP servers are no longer followed (security hardening).

Sources: [MCP 2026-07-28 blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [Migration guide](https://aaif.io/blog/mcp-2026-07-28-whats-changing-and-how-to-migrate) / [Stateless security analysis](https://equixly.com/blog/2026/08/05/stateless-mcp/) / [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 3.2 Claude Code plugins official directory launched

Anthropic launched `anthropics/claude-plugins-official` on GitHub — a curated directory of first-party and vetted third-party Claude Code plugins. The repository has ~33.9k stars and is accessible via the in-session `/plugin` command (`/plugin install <name>@claude-plugins-official`).

Key plugin mechanics (from v2.1.323 changelog):
- `plugin.json` `engines["claude-code"]` field: sets the Claude Code version range a plugin supports. Plugins outside the range are not installed, updated, or loaded.
- `claude plugin validate`: type-checks a plugin's TypeScript hooks module.
- Plugin auto-updates now install new dependencies added by the updated version.

**Security warning from Anthropic (explicitly noted):** Even listed plugins may pull in unverified third-party software. Apply the same MCP vetting checklist (authentication check, no unsanitized `exec()` calls, network boundary check) to any plugin before installation.

**For PerFiApp:** Browse the directory for finance-relevant plugins (transaction enrichment, i18n tooling, NestJS generators). Do not install without vetting. The `plugin-authoring` built-in skill (v2.1.317) can help the team build PerFiApp-specific plugins for the Flinks adapter or the bilingual i18n workflow.

Sources: [claude-plugins-official repo](https://github.com/anthropics/claude-plugins-official) / [Shopifreaks safety warning](https://www.shopifreaks.com/anthropic-launches-official-claude-code-plugin-directory-on-github-warns-even-listed-plugins-may-load-unverified-software/)

### 3.3 Key Claude Code releases since June 24 (v2.1.188 to v2.1.326)

**v2.1.299 (October 14) — MCP protocol 2026-07-28 negotiated by default; stricter MCP allow rules**
See 3.1 for details. The stricter `mcp__<server>__*` matching change may break existing permission rules if they relied on partial name matching.

**v2.1.314 (October 30) — `permissions.blockWritesOutsideWorkingDirectories`**
Write, Edit, and NotebookEdit refuse paths outside the working directories in every permission mode. For a financial app where agents must never write outside the project tree, this is the most important recent security addition after `sandbox.credentials`. Add it to the project `settings.json`:
```json
{ "permissions": { "blockWritesOutsideWorkingDirectories": true } }
```

**v2.1.316 (October 31) — Layered gateway policies; pooled group budgets; `CLAUDE_CODE_SUBAGENT_EFFORT`**
Gateway policies can now layer (organization → project → session). Pooled group budgets allow the team to share a collective token budget across the CI research run and PR review workflows. `CLAUDE_CODE_SUBAGENT_EFFORT` sets the effort level for all subagents by default — lower effort is cheaper for the code-reviewer and debugger agents.

**v2.1.317 (November 3) — Account email check before network calls**
Claude Code asks before any web or shell call sends your email address over the network. Directly relevant to a financial app: the implementer or any MCP-triggered tool call that would phone home with the developer's email now surfaces a prompt.

**v2.1.319 (November 6) — MCP tasks; `permissions.denyInsteadOfPrompting`**
MCP tasks: when an MCP server runs a tool call as a task, Claude Code moves it to background and reports the result when it finishes. For long Flinks or Plaid API calls, this prevents timeout errors. `CLAUDE_CODE_DISABLE_MCP_TASKS=1` to opt out. `permissions.denyInsteadOfPrompting` denies rather than blocks on a permission prompt — useful for unattended CI runs.

**v2.1.321 (November 9) — Claude Fable 5.2 added as default Fable model**
No action required unless PerFiApp has explicitly pinned Fable 5.1.

**v2.1.323 (November 12) — Code Mode (experimental); `plugin.json` version range**
Code Mode: Claude writes JavaScript to call its tools rather than running raw tool calls. Experimental opt-in. Not recommended for production agent workflows until it stabilizes. Sandboxed Bash commands now follow the normal permission flow by default — a behavior change that may affect automated CI runs. To preserve prior behavior: `{ "sandbox": { "autoAllowBashIfSandboxed": true } }`.

Sources: [Claude Code changelog](https://code.claude.com/docs/en/changelog) / [Gradually.ai changelog summary](https://www.gradually.ai/en/changelogs/claude-code/)

### 3.4 Flinks: still no official MCP server

No confirmed Flinks MCP server as of November 2026. An API directory (apis.io) scores Flinks' "Agentic Access" at 0 of 12. The July 2026 Flinks changelog shows only product changes (20MB upload limit, dark theme for Flinks Connect). Flinks has published an `llms.txt` file and maintains a documentation changelog, but no MCP server entry appears in either.

The prior report's recommendation stands: direct inquiry to Flinks about their MCP roadmap is warranted. Wealthsimple and Questrade are both moving toward Claude API access to their own account data — the aggregation layer (Flinks) is conspicuously behind.

Sources: [Flinks changelog](https://docs.flinks.com/changelog) / [apis.io Flinks profile](https://apis.io/providers/flinks/)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval now at v4.2.6; JevEval and voice simulation added

**Status updated from "Adopt v4.0" (June 24 report) to "current stable v4.2.6."**

Since the June 24 report's adoption recommendation, two additional minor versions shipped:

**v4.1.x — Voice conversation simulation:**
`ConversationSimulator` can now run voice conversations. A TTS model speaks the simulated user; an STT model transcribes the agent's replies. Each conversation produces a standard test case with per-turn audio. Defaults to OpenAI TTS/STT; custom speech models configurable. For PerFiApp: not immediately relevant (mobile app UI, not voice), but signals that the eval framework is tracking multimodal agent behavior.

**v4.2.x — JevEval (Jev-as-a-Judge):**
A new judge approach announced as the headline feature of the 4.2.x line. Full feature details not confirmed from primary sources. Worth monitoring for fintech-specific evaluation metrics (accuracy of budget calculations, bilingual response quality scoring).

**For PerFiApp's test-engineer:** The adoption recommended in June stands. The 4.2.6 upgrade from 4.0 should be non-breaking. Run `deepeval generate` against the existing specs to get a baseline evaluation dataset before any application code is written.

Sources: [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026) / [Voice simulation docs](https://deepeval.com/docs/conversation-simulator-voice-mode) / [PyPI listing](https://simple-repository.app.cern.ch/project/deepeval)

### 4.2 OWASP MCP Top 10 (Phase 3 Beta) — adopt as eval checklist

The OWASP MCP Top 10 project (Phase 3: Beta Release and Pilot Testing, led by Vandana Verma Sehgal) defines ten MCP-specific security risk categories: MCP01 through MCP10, covering token mismanagement, privilege escalation, tool poisoning, supply chain attacks, and command injection.

The NSA AI Security Center has reportedly endorsed the OWASP MCP Top 10 as the canonical risk taxonomy in its May 2026 guidance document. Because the list is still beta, it should not be a contractual requirement, but it is a solid checklist for the security-reviewer agent's MCP vetting workflow.

**For PerFiApp:** Add an OWASP MCP Top 10 review step to the security-reviewer agent's checklist for any new MCP server evaluation. Specifically MCP05 (tool poisoning) and MCP08 (command injection) map to the CVEs found in June and August 2026.

Sources: [OWASP MCP Top 10 project](https://owasp.org/projects/mcp-top-10) / [NSA MCP guidance summary](https://www.securecodewarrior.com/blog/the-nsa-just-issued-its-first-mcp-security-guidance-heres-what-it-means-for-developer-capability) / [MCP Directory security overview](https://mcp.directory/blog/mcp-security-200000-exposed-servers-owasp-mcp-top-10-cves)

---

## Track 5 — Toolchain Releases

### 5.1 Expo SDK 55 (February 25) and SDK 56 (May 21, 2026)

Both shipped before the last report's June 24 date but were not covered in that report. Included here because they represent the current baseline for PerFiApp's React Native stack.

**Expo SDK 55 (React Native 0.83, React 19.2):**
- **Legacy Architecture dropped.** New Architecture is mandatory as of SDK 55. If any PerFiApp dependency was Legacy Architecture only, it must be replaced.
- Hermes v1 available as opt-in (requires building React Native from source — significantly longer build times; not recommended until it stabilizes further).
- Expo UI gained Jetpack Compose support.

**Expo SDK 56 (React Native 0.85, React 19.2):**
- Expo UI (SwiftUI + Jetpack Compose wrappers) is now **stable** — API mostly frozen.
- `expo-widgets` stable: iOS widgets and Live Activities now supported.
- Faster builds via prebuilt modules and experimental precompiled headers.
- SDK 56→55 migration involves breaking changes in Expo Router/React Navigation and raised OS minimums. Check the official upgrade guide before starting.

**For PerFiApp (not yet started):** Start the mobile app with Expo SDK 56 as the baseline (not 55). Lock the new project to New Architecture from day one. The widgets feature is relevant for the Due-Date Coach module's iOS home-screen bill reminders.

Sources: [Expo SDK 55 changelog](https://expo.dev/changelog/sdk-55) / [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56) / [Expo UI stable blog](https://expo.dev/blog/expo-ui-stable-sdk-56) / [iOS widgets blog](https://expo.dev/blog/ios-widgets-and-live-activities-in-expo)

### 5.2 NestJS v12 (August 2026, v12.2.0 as of October 19)

NestJS 12 is a breaking major version. Key changes:

- **Full ESM migration.** Every `@nestjs/*` package moves from CommonJS to ESM. Node.js minimum: 20.19+ (or 22.12+ for Node 22). CJS compatibility mode available for gradual migration.
- **Standard Schema validation.** A second official validation path alongside the existing DTO/class-validator approach. Zod integrates natively.
- **@nestjs/observe SDK.** Official observability SDK covering requests, background tasks, errors, and logs. Relevant for PerFiApp's financial data flow monitoring.
- **Vitest by default** for new projects (Jest for existing CJS schematics).
- Node.js 18 and 19 dropped.

**For PerFiApp (not yet started):** Start the API project with NestJS 12. Use the Standard Schema validation path with Zod (consistent with PerFiApp's existing TypeScript strict-mode stance). Configure `@nestjs/observe` from the first sprint to get baseline observability on payment and aggregation flows.

Sources: [InfoQ NestJS 12 overview](https://infoq.com/news/2026/04/nestjs-12-roadmap-esm) / [v12.2.0 release](https://newreleases.io/project/npm/@nestjs/core/release/12.2.0) / [InfoQ observability](https://infoq.com/news/2026/10/nestjs-12-observability)

### 5.3 pnpm v11 (April 28, 2026) — breaking change on upgrade

pnpm 11.0.0 stable shipped April 28. Key changes:

- Pure ESM distribution of pnpm itself.
- **Node.js 22+ required** (drops 18–21). Confirm CI runners are on Node 22 before upgrading.
- CJS → ESM: aligns with NestJS 12 and Expo SDK 56. The whole stack is moving to ESM.
- Five `allowBuilds` / `trustedDependencies` settings collapsed into one.
- SQLite-backed content-addressable store (replaces file-per-package approach).
- LTS for v10.x expected to wind down as v11.x stabilizes.

**For PerFiApp:** When setting up the monorepo, use pnpm 11 as the baseline to avoid a migration later. Lock the Node engine in `package.json` to `>=22.12.0` to match both pnpm 11 and NestJS 12 requirements.

Sources: [pnpm v11 blog](https://pnpm.io/ko/blog/releases/11.0) / [Release roundup](https://doolpa.com/news/pnpm-11-released-esm-node-22-supply-chain-defaults-april-28-2026)

### 5.4 Spec Kit v1.0.6 (September 10, 2026) — major version jump from v0.11.6

Spec Kit crossed 1.0 on August 21, 2026 (from v0.11.6 in the June 24 report). Current stable: v1.0.6 (September 10, 2026).

Key changes in the 1.x line confirmed from a third-party guide dated September 14, 2026 (not yet verified against the official GitHub releases page):
- Major version bump implies breaking changes in the CLI interface. Review the migration guide at `github.com/github/spec-kit` before upgrading from v0.11.6.
- Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.6`

**For PerFiApp:** Upgrading from v0.11.6 to v1.0.6 is a major version jump. Have the spec-lead review the changelog before upgrading in a sprint where active specs are in progress. The `/speckit.converge` command and security-governance preset from v0.11.x continue in 1.x.

(unconfirmed — primary GitHub releases source not verified; version date and number from one third-party blog)

Sources: [Spec Kit GitHub](https://github.com/github/spec-kit) / [Third-party install guide](https://easytool-me.pages.dev/blog/github-spec-kit-spec-driven-development-guide.html)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CVE-2026-75130: Context7 MCP prompt injection — CVSS 9.0

Published August 18, 2026. Injected content in Context7 MCP server output causes connected AI coding agents (including Claude Code) to execute malicious instructions. CVSS 3.1 base score: 9.0 (Critical). CVSS 4.0 base score: 6.4 (Medium). No public fix was documented at time of disclosure.

**Attack vector:** Context7 fetches documentation from external sources and returns it as tool results. If the fetched content contains injected instructions, Claude Code executes them in the current session context. For PerFiApp, this represents the class of risk where any MCP server fetching external content (financial news, regulatory updates, Flinks transaction metadata) could carry injected instructions.

**For PerFiApp:** Add to the MCP vetting checklist: "Does this server fetch content from external/untrusted URLs and pass it back unfiltered?" Context7 is a documentation server — PerFiApp would use it for fetching Expo/NestJS/Flinks API docs during development. If used, pin to a version confirmed patched and treat its outputs as untrusted within agent sessions.

Source: [CVE-2026-75130 write-up](https://www.digitalapplied.com/blog/context7-mcp-prompt-injection-cve-2026-75130)

### 6.2 NSA AI Security Center MCP guidance (May 20, 2026)

The NSA's Artificial Intelligence Security Center published its first formal MCP security guidance: "Model Context Protocol: Security Design Considerations for AI-Driven Automation." Key themes per secondary sources:
- Endorses the OWASP MCP Top 10 risk taxonomy.
- Covers access control, privilege management, and monitoring for MCP deployments.
- Specifically addresses agentic deployments where MCP servers execute actions with real-world consequences (financial operations).

**For PerFiApp:** Review against the architect's design for any Flinks or Plaid adapter. The guidance is freely available from the NSA's cybersecurity resource center.

Sources: [SecureCodeWarrior summary](https://www.securecodewarrior.com/blog/the-nsa-just-issued-its-first-mcp-security-guidance-heres-what-it-means-for-developer-capability)

### 6.3 Claude Code security patches (October–November 2026): three bypasses fixed

Three security fixes in the October–November Claude Code releases are noteworthy:

1. **Bash permission bypass via crafted environment prefixes.** A malicious script could inject environment variable names that tricked Claude Code's permission classifier. Patched in v2.1.3xx (exact version not identified in sources). Ensure Claude Code is on v2.1.326 (current as of November 16).

2. **Sandbox escape when creating a worktree.** The `git worktree add` operation could place files outside the sandbox boundary. Patched. Relevant to PerFiApp's `isolation: "worktree"` subagent mode.

3. **`sed` path bypass in accept-edits / auto mode.** A `sed`-constructed path could bypass the write-path check. Patched. Relevant to any implementer session in auto mode.

None of these are CVE-numbered in the sources consulted. All are patched in the current version (v2.1.326).

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 6.4 MCP OAuth: refresh tokens no longer sent to redirected hosts

A specific fix confirmed in the October–November changelog window: MCP OAuth flows no longer send refresh tokens to a host that the original server redirects to. For a financial app where Plaid or Flinks OAuth flows involve redirects, this prevents a compromised redirect target from receiving long-lived refresh tokens. No action needed beyond updating to v2.1.326+.

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 6.5 New security permission: `permissions.blockWritesOutsideWorkingDirectories`

Claude Code v2.1.314 added `permissions.blockWritesOutsideWorkingDirectories`. When set to `true`, Write, Edit, and NotebookEdit refuse any path outside the project's working directories in every permission mode (manual, auto, and sandboxed). This is a defense against a prompt-injected instruction trying to write outside the repo (e.g., to `~/.aws/credentials` or `/etc/`). Add to the project `settings.json`:

```json
{ "permissions": { "blockWritesOutsideWorkingDirectories": true } }
```

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS UPDATE: CDBA — draft regulations published; final rules expected 2027

**Status changed from "timeline slipping" (June 24 report) to "draft regulations in consultation, effective date 2027."**

On June 27, 2026, Finance Canada published the proposed Consumer-Driven Banking Regulations in the Canada Gazette (Part 1, Volume 160, Number 26). This is the first time the framework moved from legislative intent to specific, operational requirements. Key details:

- **New regulator.** Oversight moved from the Financial Consumer Agency of Canada to the Bank of Canada. The Bank will maintain the public registry of participating entities and evaluate accreditation applications.
- **Four accreditation pathways** tailored to entity type (banks, credit unions, fintechs, data aggregators).
- **60-day comment period** closed August 26, 2026. No final regulations confirmed as of this report.
- **Effective date.** Regulations come into force when section 44 of the CDBA comes into force — not yet. One analysis estimates 2027 at the earliest for final rules, with Phase 1 (read access) live for the broader market in mid-2027.
- **Legislative clarification.** Bill C-15 received Royal Assent March 26, 2026, replacing the 2024 CDBA with an updated version under the same name. This resolves the prior report's uncertainty about which legislative basis applies.

**For PerFiApp:** The architecture advice is unchanged (OAuth-only, no screen-scraping). Flinks' live OAuth programs with National Bank and EQ Bank remain the best available test of CDBA-aligned access. Build toward accreditation criteria using the draft regulations as a guide, knowing the final rules will follow the same framework.

Sources: [Canada Gazette CDBA Regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [McCarthy Tétrault analysis](https://www.mccarthy.ca/en/insights/blogs/techlex/canadas-consumer-driven-banking-framework-takes-shape-with-draft-regulations) / [Mondaq summary](https://www.mondaq.com/canada/financial-services/1814068/consumer-driven-banking-new-details-set-out-in-draft-regulations) / [Flinks CDBA update](https://www.flinks.com/blog/open-banking-canada-2026-launch-fintech-institutions)

### 7.2 MAJOR: Canada RTR launched November 9, 2026 — 8 initial participants, not Big Six

**Status changed from "Q4 2026 phased launch targeted" (June 24 report) to "launched November 9."**

Payments Canada launched the Real-Time Rail (RTR) on November 9, 2026 with eight initial participants. None are Big Six banks (TD, RBC, BMO, Scotiabank, CIBC, National Bank). The by-laws and rules came into force August 24, 2026 ahead of the launch.

Participation model at launch:
- All designated participants must **receive** RTR payments from day one.
- **Sending** RTR payments is optional initially; Big Six participation on the send side is expected in 2027.
- Universal participation (including consumer-facing send capability) targeted for 2027.

**Mandatory fraud services.** RTR is the first G7 real-time payment system to launch with centralized fraud detection as a mandatory service from day one — not an add-on.

**For PerFiApp:** This is the most architecturally important event in the past five months. The timeline for Phase 2 write-access (payment initiation) is now concrete:
- RTR with 8 participants: November 2026 (live now).
- RTR with Big Six send: 2027.
- CDBA Phase 2 (mandated payment initiation): mid-2027 target, contingent on RTR widespread use.

Design the Pay & Payment Optimization and Cash Safety modules to target RTR-based payment initiation in mid-2027. The mandatory fraud service also means PerFiApp's payment initiation flows must integrate with RTR's fraud detection layer — plan for this in the Phase 2 architecture.

Sources: [Tech Insider RTR launch](https://tech-insider.org/ca/canada-real-time-rail-launch-eight-participants-no-big-six-2026/) / [Payment Expert RTR rules](https://paymentexpert.com/2026/08/10/rtr-canada-payments-modernisation/) / [Betakit RTR critical milestone](https://betakit.com/canadas-real-time-rail-system-will-launch-this-year-after-achieving-critical-milestone/) / [Payments Canada Q3 update](https://www.payments.ca/canadas-real-time-rail-quarterly-update-jude-pinto-2026-q3)

### 7.3 Quebec Law 25 — CAI enforcement is active with monetary penalties

**Status changed from "fully in force" to "active enforcement with MAPs."**

Quebec's Law 25 has been fully in force since September 2024. The Commission d'accès à l'information is now actively enforcing it:
- Published decisions with monetary administrative penalties (MAPs) against non-compliant organizations.
- Publicly naming non-compliant organizations.
- Fines up to 4% of worldwide turnover or $25M CAD (verify against statute before relying on this figure).
- Privacy officer designation is mandatory by default from the organization's highest-ranking executive unless formally delegated.
- Transfers of personal information outside Quebec require documented justification even for intra-Canada transfers.

**For PerFiApp:** Given the bilingual (EN/FR) design and Montreal tech community, PerFiApp will process Quebec residents' data from the first user. Law 25 compliance is not aspirational — it is current and enforced. Designate a privacy officer before any data processing begins. The security-reviewer agent's checklist should include Law 25 data transfer assessments as a mandatory gate for any PR touching data storage or external APIs.

Sources: [Private AI Law 25 guide](https://www.private-ai.com/en/blog/pipeda-law25) / [Gamtech Law 25 2026 compliance](https://www.gamtech.ca/category/blog/quebec-law-25-loi-25-canadian-business-compliance-2026)

### 7.4 Federal PIPEDA: Bill C-27 dead; PIPEDA remains the law indefinitely

Federal Bill C-27 (Consumer Privacy Protection Act) died when Parliament prorogued on January 6, 2025. No federal privacy reform has been introduced as of November 2026. PIPEDA remains the federal standard, and no replacement timeline is known.

**For PerFiApp:** The architectural decision is unchanged — design for PIPEDA (federally) and Law 25 (Quebec). The absence of CPPA means there is no looming federal upgrade to plan for. The gap between PIPEDA and Law 25 continues to favor treating Law 25 as the floor for all Canadian users.

Sources: [mccarthy.ca PIPEDA status](https://mccarthy.ca/en/dbic-privacy-laws) / [Bennett Jones PPCDA comparison](https://www.bennettjones.com/Insights/Blogs/2026/07/A-Comparison-of-the-PPCDA-PIPEDA-Quebecs-Privacy-Act-and-PIPA/pdf)

---

## Track 8 — Competitive & Product Intel

### 8.1 Wealthsimple launched "Penny" AI assistant (November 5, 2026)

Wealthsimple launched its AI assistant, named "Penny," on November 5, 2026 — 11 days before this report. Penny can:
- Answer questions about the user's actual financial data.
- Help send money and place trades (with user confirmation required before execution).
- Plan finances and surface insights.

Additionally, Wealthsimple announced plans to allow customers to reach their Wealthsimple accounts through ChatGPT and Claude, targeting early 2027. Orders would require user review before execution. Data described as never leaving Wealthsimple's platform.

Competitive context: Canada's Big Six banks have committed to blocking AI agents from directly accessing customer online banking data. Wealthsimple is explicitly taking the opposite stance.

**For PerFiApp:** Wealthsimple's Penny directly competes with PerFiApp's AI coaching module and positions Wealthsimple as the most direct AI-driven competitor for financially engaged Canadians. The key differentiator PerFiApp must defend: aggregation across all institutions (not just Wealthsimple accounts), bilingual support, and the full module breadth (Credit Monitor, Rewards Radar, Due-Date Coach, Cash Advance Lite) that Penny does not cover.

Also worth noting: Wealthsimple's planned Claude API access to its accounts (early 2027) means PerFiApp could potentially integrate Wealthsimple investment data as a data source, before or alongside a full open banking connection.

Sources: [BNN Bloomberg Penny](https://www.bnnbloomberg.ca/business/artificial-intelligence/2026/11/05/wealthsimple-launches-ai-banking-assistant-that-can-help-move-money-place-trades/) / [MobileSyrup](https://mobilesyrup.com/2026/11/05/wealthsimple-ai-banking-features-switching-fees) / [Advisor.ca Claude/ChatGPT integration](https://www.advisor.ca/industry-news/wealthsimple-embraces-ai-with-new-chatbot-connections-to-chatgpt-and-claude/)

### 8.2 KOHO banking license still pending (OSFI fast-track announced June 2026)

No confirmation of OSFI or ministerial approval for KOHO's banking license as of November 2026 search results. Status remains "pending" from the June 24 report. OSFI introduced a Targeted Fast-Track Framework for new fintech banks in June 2026, which could accelerate KOHO's timeline, but no approval has been reported.

KOHO raised C$190M in May 2026 (later round than the C$130M reported in June 24 report) to fund the banking license capital requirement. 2.5M+ users, $200M+ revenue.

Sources: [Betakit KOHO close to licence](https://betakit.com/koho-on-the-verge-of-securing-a-banking-licence-and-months-from-launching-telco-product-ceo-says/) / [NCFA KOHO raise](https://ncfacanada.org/koho-raises-130m-as-bank-licence-push-gains-scale/) / [Logic OSFI fast-track](https://thelogic.co/news/osfi-fast-track-bank-licences/)

### 8.3 Questrade has beta Claude/Claude Code MCP support

Questrade launched a beta MCP server enabling Claude and Claude Code to access brokerage accounts. ChatGPT listed as "coming soon." This is relevant because: (a) it proves the technical pattern PerFiApp intends to build (AI + account data), and (b) Questrade may attract the same technically sophisticated Canadian user base PerFiApp targets.

Sources: [NCFA Questrade MCP](https://ncfacanada.org/questrade-mcp-ai-brokerage-accounts/)

### 8.4 Monarch Money: credit score tracking confirmed US-only

The June 24 report raised concern that Monarch's credit score tracking would compete with PerFiApp's Credit Monitor module. Confirmed update: Monarch's credit score feature is US-only. Canadian bank sync is also described as limited, with no TFSA/RRSP tracking and FX fees for Canadian users.

**For PerFiApp:** Monarch is not a direct competitive threat for the Credit Monitor module in Canada. The AI coaching module overlap remains (Monarch has an AI assistant that works on actual financial data), but Monarch's Canada limitations are a genuine differentiator advantage for PerFiApp.

Sources: [FinlyWealth Monarch Canada](https://www.finlywealth.com/money/monarch-money-alternative) / [Waypoint vs Monarch](https://waypointbudget.com/blog/waypoint-vs-monarch-money-couples-canada-2026)

---

## Recommended Next Steps

### Immediate (this week)

1. **Audit all agent YAML files for `claude-sonnet-4-5`, `claude-haiku-4-5`, and `claude-opus-4-5` model IDs.** Sonnet 4.5 retires November 30 (14 days). Haiku 4.5 is past its floor date. Opus 4.5 hits its floor in 8 days. Run a grep across `.claude/agents/` and `.github/workflows/` for these strings.

2. **Scan all agent YAML and API client code for `temperature`, `top_p`, `top_k` parameters.** The June 24 report said this was urgent for Opus 4.7+. It is now a formal breaking change in API version 2026-10-21. Remove these parameters from all files before the TypeScript SDK is upgraded to v1.0.0.

3. **Add `permissions.blockWritesOutsideWorkingDirectories: true` to the project `settings.json`.** One-line addition, blocks any agent or subagent from writing files outside the project tree in any permission mode.

4. **Update Claude Code to v2.1.326** (November 16 release). Picks up the Bash-env-prefix permission bypass fix, sandbox-escape-on-worktree fix, and the sed-path bypass fix.

5. **Confirm MCP permission rules use full tool names.** Claude Code v2.1.299+ tightened `mcp__<server>__*` matching. Any rule that relied on partial name matching (e.g., `mcp__a` matching a server named `a__b`) now fails silently. Review all `allowedTools` / `disallowedTools` entries in `settings.json`.

### Short-term (this sprint)

6. **Upgrade the agent roster model config to the 5.5 generation.** File a PR changing approved models to `claude-opus-5-5` (spec-lead, architect), `claude-sonnet-5-5` (implementer, test-engineer, code-reviewer, security-reviewer, debugger), `claude-haiku-5-5` (lightweight tasks). This requires a constitution amendment per the project's governance process. Have spec-lead run `/speckit-constitution` to initiate it.

7. **Plan the TypeScript SDK upgrade to `@anthropic-ai/sdk` v1.0.0 as a dedicated PR.** Do not bundle it with feature work. The upgrade removes temperature/top_p/top_k from the SDK types, adds the `2026-10-21` API version, and renames Admin API response fields. Test all agent workflows before merging.

8. **Incorporate OWASP MCP Top 10 categories into the security-reviewer agent's MCP vetting checklist.** Focus on MCP05 (tool poisoning), MCP08 (command injection), and MCP02 (insufficient access control — the CVE-2026-32211 root cause). Add context about CVE-2026-75130 (external URL fetch → prompt injection) as a new vetting question: "Does this server fetch content from external/untrusted URLs and pass it back unfiltered?"

9. **Review `anthropics/claude-plugins-official`** for finance-relevant plugins that could accelerate development (NestJS generators, i18n tooling, transaction categorization). Do not install any plugin without vetting against the MCP security checklist. Apply the same scrutiny to plugins as to MCP servers.

10. **Assess MCP tasks support (Claude Code v2.1.319)** for the Flinks adapter design. Long Flinks account-connection calls (which can take 10–30 seconds) are now natural candidates for MCP task dispatch rather than synchronous tool calls. Design the adapter interface accordingly.

### Medium-term (next 4–6 weeks)

11. **Re-plan Phase 2 architecture given RTR's November 9 launch.** The payment initiation architecture no longer targets a future rail — RTR is live. Convene the architect to draft the Phase 2 design for RTR-based payment initiation (targeting mid-2027 mandate). Key decisions: RTR fraud service integration requirements, Payments Canada membership path vs. sponsor-bank model, and account-to-account transfer flow for PerFiApp.

12. **Designate a Privacy Officer for Quebec Law 25 compliance.** Required before any personal data is processed. With the CAI actively issuing monetary administrative penalties, this is a legal obligation, not an aspiration. Document the designation formally.

13. **Monitor CDBA final regulations.** The 60-day comment period closed August 26. Final regulations are the next gate for CDBA Phase 1 architecture decisions. Set a calendar alert to check Canada.ca / Finance Canada for final regulation publication in Q1 2027.

14. **Plan the NestJS 12 and pnpm 11 stack baseline.** When the first API sprint begins, use NestJS 12 with Standard Schema/Zod validation, `@nestjs/observe` for financial data flow monitoring, and pnpm 11 workspaces with Node 22+. Aligns with Expo SDK 56 on the mobile side. Documents this stack baseline in the constitution or the architect's first technical design.

15. **Trial Spec Kit v1.0.6 upgrade from v0.11.6.** Major version — read the migration notes first. Test in a branch before applying to an active spec. The 1.x line is the production-ready Spec Kit; PerFiApp should not start its first real feature spec on a 0.x build.

---

*Report generated 2026-11-16. All findings verified against primary sources where possible; unconfirmed items marked explicitly. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
