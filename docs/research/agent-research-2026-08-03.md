# PerFiApp Agent Research — 2026-08-03

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: model lineup overhaul (Opus 5 and Sonnet 5 shipped, Fable 5 restored), MCP stateless spec now live, RTR By-law coming into force August 24, and CDB Regulations consultation closing August 26.

---

## Executive Summary

Four findings demand attention before the end of this week:

1. **`claude-opus-4-1-20250805` retires in two days — August 5, 2026.** This was flagged in the June 24 report; the deadline is now imminent. Migrate any remaining references to `claude-opus-5` today.

2. **RTR By-law comes into force August 24, 2026.** The Canada Gazette published the Real-Time Rail By-law and Rules on July 1. Legal foundation for RTR launch in Q4 2026 activates in 21 days. Phase 2 write-access architecture planning can now proceed against confirmed timing.

3. **Consumer-Driven Banking Regulations are open for comment through August 26, 2026.** For the first time, concrete accreditation requirements are published — including an accreditation fee of C$2,500 and a risk-based streamlined pathway for RPAA-registered PSPs. PerFiApp's architect and spec-lead should read the proposed regulations while comments are still possible.

4. **Claude Sonnet 5 introductory pricing ($2/$10 MTok) ends August 31.** Standard pricing ($3/$15) takes effect September 1. Any cost modeling should account for the 50% input / 33% output price increase.

Everything else — Opus 5 launch, Fable 5 restoration, MCP stateless spec, NestJS v12, Spec Kit v0.15.x, TypeScript 5.9, pnpm workspace release management — is important but not two-day urgent.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **claude-opus-4-1 retires August 5, 2026 (2 days)** | Model | Any agent/CI using this ID | **Act — migrate today** |
| **RTR By-law in force August 24 (21 days)** | Compliance | architect, spec-lead | **Act — confirm Phase 2 design timeline** |
| **CDB Regulations consultation closes August 26** | Compliance | architect, spec-lead | **Act — read accreditation requirements now** |
| **Sonnet 5 introductory pricing ends August 31** | Cost | All agents on Sonnet tier | **Act — cost model before September 1** |
| **Claude Fable 5 restored July 1 (status resolved)** | Model | spec-lead, architect | **Adopt — trial now active again; new safety classifier deployed** |
| **Claude Opus 5 released July 24** | Model | spec-lead, architect, implementer | **Adopt — replace Opus 4.8 as default Opus-tier; same price, ~2x performance** |
| **Claude Sonnet 5 released June 30** | Model | implementer, test-engineer, code-reviewer | **Adopt — replace Sonnet 4.6; same list price, adaptive thinking, 1M context** |
| **New model agent routing — Sonnet 5 + Opus 5 default** | Cost | All agents | **Adopt — updated tiering table below** |
| **`effort` parameter replaces extended thinking API** | Model / cost | implementer multi-step workflows | **Adopt — use effort: low for cheap tasks, high for complex ones** |
| **MCP 2026-07-28 stateless spec now live** | Agent tooling | architect, implementer | **Act — any in-flight MCP server design must shed session state now** |
| **Claude Code in-app browser (v2.1.202)** | Agent tooling | researcher, code-reviewer | **Adopt — sandboxed browser inside Desktop; researcher agent benefits most** |
| **Claude Code /doctor now fixes issues (v2.1.205)** | Agent tooling | All agents | **Adopt — run /doctor; it will trim bloated CLAUDE.md** |
| **Microsoft MCP tool-poisoning playbook (June 30)** | Security | architect, code-reviewer, security-reviewer | **Act — add tool-description audit to MCP vetting checklist** |
| **MCP OAuth hardening in 2026-07-28 spec** | Security | architect | **Adopt — design any Flinks adapter with new OAuth SEPs** |
| **Spec Kit v0.15.1 (July 31)** | Toolchain | spec-lead | **Adopt — security hardening for symlink races, TOCTOU fixes** |
| **TypeScript 5.9** | Toolchain | implementer, test-engineer | **Adopt — --strictInference, import defer, 10-20% build speedup for monorepo** |
| **pnpm 11.11-11.19 native workspace release management** | Toolchain | architect, implementer | **Adopt — replaces changesets tooling natively** |
| **Expo SDK 57 (June 30)** | Toolchain | implementer (mobile) | **Adopt — non-breaking RN 0.86; expo prebuild now regenerates native dirs by default** |
| **NestJS v12 imminent (Q3 2026)** | Toolchain | implementer (API) | **Watch — ESM migration, Vitest, oxlint, Zod/Valibot native; plan migration now** |
| **OSFI Fast-Track Framework (June 2026)** | Compliance | spec-lead | **Monitor — KOHO now in Phase 2 review under this framework** |
| **PIPEDA / Bill C-27 still stalled** | Compliance | architect, spec-lead | **Monitor — no new privacy legislation expected in 2026; PIPEDA remains** |
| **Wealthsimple AI stock research tools launched** | Competitive | spec-lead | **Monitor — AI + finance data now table stakes in Canada** |

---

## Track 1 — Model & Capability Updates

### 1.1 RESOLVED: Claude Fable 5 restored July 1, 2026

**Status changed from "suspended" to "available globally."**

The US Department of Commerce lifted the export control restriction on June 30, 2026. Anthropic restored access on July 1 — 19 days after the suspension. Anthropic deployed an improved safety classifier specifically targeting the jailbreak technique discovered during Amazon's security testing; the company states the technique "is blocked in over 99% of cases." The restoration was global and covered all surfaces: Claude Platform, Claude.ai, Claude Code, and Claude Cowork.

Through July 7, Fable 5 was included in Pro and Max plans at up to 50% of weekly usage limits. After July 7, it reverted to usage-credit billing.

Access on AWS Bedrock, Google Cloud, and Microsoft Foundry was restored separately (check status on each platform individually).

**For PerFiApp:** The trial recommendation from the June 11 report reactivates. Spec-lead and architect agents are the primary targets. The prior report's guidance stands: trial on a representative feature spec and measure token cost (the new tokenizer produces ~30% more tokens per equivalent text).

**Recommendation: Adopt (trial active).**

Sources: [Anthropic redeployment announcement](https://www.anthropic.com/news/redeploying-fable-5) / [9to5Mac](https://9to5mac.com/2026/07/01/claude-fable-5-cleared-to-return-as-us-lifts-anthropics-export-control-restriction/) / [VentureBeat](https://venturebeat.com/technology/anthropic-is-bringing-back-claude-fable-5-globally-after-us-lifts-export-control-order-where-can-enterprises-access-it)

---

### 1.2 CRITICAL: claude-opus-4-1 retires August 5, 2026 — two days away

**Status: same deprecation, now urgent.**

This was flagged in the June 24 report with 42 days remaining. The retirement is now **48 hours away**. Any agent file, API wrapper, or CI script still referencing `claude-opus-4-1-20250805` or `claude-opus-4-1` will return API errors starting August 5. The recommended migration is now **claude-opus-5** (released July 24, same price, twice the benchmark performance).

Source: [Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

### 1.3 NEW: Claude Opus 5 released July 24, 2026

Anthropic released `claude-opus-5` on July 24, 2026. This is the new Opus-tier flagship, replacing Opus 4.8 as the recommended Opus-tier choice.

**Pricing:** $5 / $25 per MTok (input/output) — identical to Opus 4.8. Fast mode runs at $10/$50 with 2.5x throughput.

**Key benchmarks vs Opus 4.8:**
- Frontier-Bench v0.1: more than double Opus 4.8's score
- CursorBench 3.2: within 0.5% of Fable 5 at half the cost
- ARC-AGI 3: 3x the next-best model
- OSWorld 2.0: surpasses Fable 5 at roughly one-third the cost

**Capability changes:**
- Adaptive thinking on by default with a selectable `effort` parameter (low / medium / high / max / x-high). Default is `high` on the Claude API and Claude Code.
- `effort: low` is significantly cheaper for routine tasks.
- 1M context window, 128k max output, May 2026 training data cutoff.
- `extended thinking` with `thinking.type: "enabled"` is deprecated on older models; Opus 5 uses `effort` instead.

**For PerFiApp's agent team:** Spec-lead and architect should migrate from `claude-opus-4-8` to `claude-opus-5`. For complex specs and long-horizon design tasks, set `effort: high` (already the default). For quick routing decisions or inter-agent coordination messages, `effort: low` can reduce cost materially. The fallback chain in `settings.json` should be updated to reference `claude-opus-5` first.

**Recommendation: Adopt.**

Sources: [Axios — Opus 5 release](https://www.axios.com/2026/07/24/anthropic-releases-new-model-opus-5) / [Coursiv — benchmarks and pricing](https://coursiv.io/blog/claude-opus-5) / [Anthropic models overview](https://platform.claude.com/docs/en/about-claude/models/overview)

---

### 1.4 NEW: Claude Sonnet 5 released June 30, 2026 (just after the last report)

Released June 30 — one day after the last report cutoff.

**Pricing:** Introductory $2 / $10 per MTok through **August 31, 2026**, then standard $3 / $15.

**Key changes vs Sonnet 4.6:**
- Adaptive thinking with selectable effort (low / medium / high / max / x-high), replacing the `thinking.type: "enabled"` extended thinking API.
- 1M context window (vs 1M on Sonnet 4.6, but the new tokenizer means the same text produces ~30% more tokens).
- 128k max output (vs 64k on Sonnet 4.6).
- Described as bringing "Opus-like coding, tool use, browser work, and professional-task performance" into Sonnet pricing.
- Sonnet 5 is now the default model for Claude.ai Free, Pro, Team Standard, and Enterprise subscription seats.

**Cost note:** At introductory pricing, Sonnet 5 is 33% cheaper than Sonnet 4.6 on input tokens ($2 vs $3). After August 31, input price is identical. Output doubles ($10 vs $5 on Sonnet 4.6's old pricing at $15 standard). For agents that write long outputs (implementer, spec-lead), output token cost goes up at standard pricing; the 128k max output window means sessions can produce much longer artifacts without truncation.

**For PerFiApp's agent team:** Implementer, test-engineer, and code-reviewer agents should migrate from `claude-sonnet-4-6` to `claude-sonnet-5`. Lock in the introductory pricing window by migrating before September 1 — cost models should be updated to reflect the $3/$15 standard rate taking effect then.

**Recommendation: Adopt.**

Sources: [TechCrunch — Sonnet 5](https://techcrunch.com/2026/06/30/anthropic-launches-claude-sonnet-5-as-a-cheaper-way-to-run-agents/) / [Anthropic — introducing Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5) / [Finout — pricing analysis](https://www.finout.io/blog/claude-sonnet-5-pricing-2026-the-hidden-costs-and-real-savings-behind-the-cost-neutral-launch)

---

### 1.5 Updated model table and recommended agent assignments

Current active models as of August 3, 2026:

| Model | API ID | Input / Output ($/MTok) | Context | Notes |
|---|---|---|---|---|
| **Fable 5** | `claude-fable-5` | $10 / $50 | 1M | Most capable; adaptive thinking always-on; Jan 2026 cutoff |
| **Opus 5** | `claude-opus-5` | $5 / $25 | 1M | NEW July 24; 2x Opus 4.8; May 2026 cutoff |
| **Sonnet 5** | `claude-sonnet-5` | $2 / $10 (intro to Aug 31) then $3 / $15 | 1M | NEW June 30; 128k output; Jan 2026 cutoff |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | $1 / $5 | 200k | Still valid for lightweight tasks |
| **Opus 4.8** | `claude-opus-4-8` | $5 / $25 | 1M | Legacy; active; no retirement announced |
| **Sonnet 4.6** | `claude-sonnet-4-6` | $3 / $15 | 1M | Legacy; active; no retirement announced |
| **Opus 4.1** | `claude-opus-4-1-20250805` | $15 / $75 | 200k | **RETIRED AUGUST 5 — migrate NOW** |

Recommended agent assignments (updated):

| Agent | Recommended model | Rationale |
|---|---|---|
| **spec-lead** | `claude-fable-5` (primary) or `claude-opus-5` | Long-horizon constitution and spec work; Fable 5 restored |
| **architect** | `claude-fable-5` or `claude-opus-5` | Complex technical design; effort: high |
| **implementer** | `claude-sonnet-5` | Broad coding capability at Sonnet price; 128k output |
| **test-engineer** | `claude-sonnet-5` | Test authoring + adaptive thinking |
| **code-reviewer** | `claude-sonnet-5` or `claude-haiku-4-5` | Review is scoped; Haiku for quick checks |
| **security-reviewer** | `claude-opus-5` | Deep reasoning needed for financial security analysis |
| **researcher** | `claude-sonnet-5` | Good balance; effort: low on simple research steps |
| **debugger** | `claude-sonnet-5` | Root-cause analysis benefits from adaptive thinking |

The fallback chain should be updated to: `["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"]`.

The new `"default"` mode for the `fallbacks` parameter applies Anthropic's own recommended fallback models per refusal category — useful as an alternative to maintaining a hardcoded list.

Source: [Anthropic models overview](https://platform.claude.com/docs/en/about-claude/models/overview) / [Claude Sonnet 5 vs Opus 5 guide](https://www.cosmicjs.com/blog/claude-sonnet-5-vs-opus-5)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Sonnet 5 introductory pricing window closes August 31

The $2/$10 MTok introductory rate for Sonnet 5 ends on September 1 when standard $3/$15 pricing takes effect. This is a confirmed date from Anthropic's own pricing page.

**For PerFiApp:** Before September 1:
- Update cost models for all Sonnet-tier agents to use $3/$15 from September onward.
- Verify whether the new tokenizer's ~30% higher token count changes the effective cost comparison vs Sonnet 4.6 (at $3/$15, Sonnet 5 input is the same price per token but more tokens for the same text).
- For high-output workflows (spec drafts, long implementation sessions), the jump from 64k to 128k max output on Sonnet 5 may increase output costs — measure before defaulting to effort: high on every call.

Source: [Finout — Sonnet 5 pricing analysis](https://www.finout.io/blog/claude-sonnet-5-pricing-2026-the-hidden-costs-and-real-savings-behind-the-cost-neutral-launch) / [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing)

---

### 2.2 Adaptive thinking effort levels — new cost-control knob

The `effort` parameter on Opus 5 and Sonnet 5 replaces the `thinking.type: "enabled"` extended thinking API. Effort levels: `low`, `medium`, `high` (default on API and Claude Code), `max`, `x-high`.

**Concrete cost impact:**
- `effort: low` reduces adaptive thinking budget substantially, cutting output token cost on tasks that don't need deep reasoning (e.g., linting suggestions, simple code formatting, PR title generation, research summaries of already-processed web content).
- `effort: high` is the sweet spot for most coding and financial reasoning tasks.
- `effort: x-high` is appropriate for the most complex spec or architecture decisions; expect the highest output token volumes.

**For PerFiApp:** Add agent-specific effort guidance:
- Researcher agent on simple web summarization steps: `effort: low`
- Code-reviewer quick linting pass: `effort: low`
- Implementer on financial logic (money math, credit calculations): `effort: high`
- Spec-lead on new feature constitutions: `effort: high` or `max`
- Security-reviewer on auth flows: `effort: high`

This is a free optimization — no new configuration, just explicit effort settings in agent prompts.

Source: [Anthropic models overview — effort guidance](https://platform.claude.com/docs/en/about-claude/models/overview)

---

### 2.3 Batch API now supports Opus 5 and Sonnet 5

The Message Batches API (50% discount, 300k output tokens via `output-300k-2026-03-24` beta header) now supports Opus 5 and Sonnet 5 in addition to the prior model list. No pricing change — the 50% discount remains.

**For PerFiApp:** The researcher agent runs weekly research scans — a natural batch workload. Running research scans as batch jobs at Sonnet 5 introductory pricing ($2/$10) + 50% batch discount = effective $1/$5 per MTok until August 31, matching Haiku pricing for far more capable research work.

Source: [Anthropic batch processing docs](https://platform.claude.com/docs/en/build-with-claude/batch-processing) / [Claude cost optimization guide](https://pecollective.com/tools/claude-pricing-guide/)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 Claude Code v2.1.202–v2.1.206 (July 6–10, 2026)

Five releases in one week. Most actionable for PerFiApp:

**v2.1.202 — Dynamic workflow size setting**
`/config` now has a "Dynamic workflow size" setting (small / medium / large) controlling the number of agents generated in dynamic workflows. For the implementer spawning sub-agents for PerFiApp module builds, this controls parallelism without per-call configuration.

**v2.1.204 — In-app browser on Desktop**
Claude Code Desktop now has a built-in sandboxed browser. Claude can read, click through, and interact with external sites (docs, designs, live dev servers). Safety classifiers review actions on external sites. Browsing session persistence is configurable.

**For PerFiApp:** The researcher agent gains the most from this — it can now browse Flinks' API docs, Bank of Canada pages, and Plaid documentation directly inside a session rather than via the WebFetch tool. The code-reviewer can also pull up referenced GitHub issues or API specs.

**v2.1.205 — /doctor now diagnoses AND fixes**
`/doctor` (alias `/checkup`) now:
- Checks installation health
- Finds unused skills, MCP servers, and plugins relative to their context cost
- Deduplicates local `CLAUDE.md` against checked-in versions
- Proposes trimming `CLAUDE.md` content Claude can derive from the codebase
- Flags slow hooks
- Reports findings first, asks for confirmation before changing anything

**For PerFiApp:** Run `/doctor` on every developer environment. The `CLAUDE.md` deduplication and trimming is directly applicable — the project `CLAUDE.md` is already substantial, and any redundant content that Claude can infer from the codebase wastes tokens on every agent call.

**v2.1.205 — MCP per-server `request_timeout_ms`**
MCP servers can now be assigned individual request timeouts. For PerFiApp, this allows a tighter timeout on the Plaid sandbox MCP (fast reads expected) vs a more generous timeout on any batch processing MCP server.

**v2.1.205 — Background task fabrication prevention**
Background task notifications now explicitly state that "no human input has occurred," preventing fabricated in-transcript approvals from being acted on. This is a security fix relevant to the implementer running in background mode on financial code changes.

**v2.1.205 — `EnterWorktree` confirmation**
Claude Code now asks for confirmation before entering a git worktree outside the project's `.claude/worktrees/` directory. Prevents accidental modification of git state outside the expected isolation boundary.

**v2.1.206 — Auto mode transcript tampering protection**
Auto mode now blocks any attempt to tamper with session transcript files. Combined with the background-task notification fix, this closes a class of attacks where a malicious MCP server could inject false approval records into a session transcript.

Sources: [Claude Code Week 28 changelog](https://code.claude.com/docs/en/whats-new/2026-w28) / [DevelopersIO — v2.1.202](https://dev.classmethod.jp/en/articles/20260707-cc-updates-v2-1-202/) / [Releasebot — Claude Code July 2026](https://releasebot.io/updates/anthropic/claude-code)

---

### 3.2 Claude Cowork expands to web and mobile (July 7, 2026)

Claude Cowork (formerly the desktop-only remote session feature) is now in beta for Max subscribers on web and iOS/Android. Sessions run on Anthropic's servers 24/7 — no device needs to be online. Session state is saved and synced across devices.

**For PerFiApp:** This enables the researcher agent to run long scans overnight without a developer machine staying awake. For CI-triggered research runs that exceed typical session lengths, Cowork remote sessions provide continuity. Relevant if the weekly research workflow is extended to include deeper web crawls.

Source: [Claude Cowork expansion guide](https://www.digitalapplied.com/blog/claude-cowork-web-mobile-expansion-guide-2026) / [Claude Code July 2026 notes](https://releasebot.io/updates/anthropic/claude-code)

---

### 3.3 MCP 2026-07-28 stateless specification — now live

The MCP release candidate announced in the June 24 report shipped on July 28, 2026. This is now the current MCP specification. Key changes that are live:

**Protocol changes:**
- `initialize` / `initialized` handshake and `Mcp-Session-Id` header removed. Any MCP request can land on any server instance.
- Client metadata travels in `_meta` fields on every request.
- `Mcp-Method` and `Mcp-Name` headers required for load balancer routing.
- `ttlMs` and `cacheScope` on list and resource-read results (structured caching hints).
- W3C Trace Context standardized in `_meta` for distributed tracing.

**Security / authorization changes (6 OAuth/OIDC SEPs):**
- Clients must validate the `iss` parameter per RFC 9207 to mitigate mix-up attacks.
- `application_type` in Dynamic Client Registration.
- Credentials bind to issuing servers; re-registration required on resource migration.

**Extensions:**
- Tasks and MCP Apps are now official extensions with reverse-DNS identifiers.
- Roots, Sampling, Logging are deprecated with 12-month removal windows.

**Claude Code MCP support updated** to align with the new spec.

**For PerFiApp — three concrete impacts:**

1. Any custom MCP server (e.g., a Flinks adapter) must be stateless. If the current design uses session-level state, redesign now — the prior report's "design stateless" advice is now mandatory for spec-compliance.

2. The `cacheScope` field controls whether list results are shared across users. For any MCP server returning financial data (account balances, transactions), verify `cacheScope` is set to user-scoped and not inadvertently shared across sessions.

3. The OAuth hardening SEPs make implementing proper authentication on a custom MCP server more straightforward and more secure. Add the 6 SEPs to PerFiApp's MCP vetting and design checklist.

Sources: [MCP 2026-07-28 release candidate blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [CData — stateless MCP](https://www.cdata.com/blog/stateless-mcp) / [Microsoft Community Hub — MCP stateless on App Service](https://techcommunity.microsoft.com/blog/appsonazureblog/mcp-just-went-stateless)

---

### 3.4 Flinks MCP server — still no official offering

Confirmed by re-checking in this research cycle: Flinks has no official MCP server as of August 3, 2026. Flinks has launched its Open Banking Environment (OBE) with National Bank and has onboarded 300+ fintechs, and continues to position as the CDBA accreditation pathway. But the MCP tooling gap remains.

**Recommendation: Contact Flinks directly.** The CDB Regulations' streamlined accreditation pathway for RPAA-registered PSPs (which Flinks is) suggests Flinks will be among the first accredited entities. An official MCP server from Flinks would be the highest-value external tool addition to PerFiApp's agent toolchain. A direct inquiry to their developer program is warranted now that the accreditation framework is published.

Source: [Flinks open banking](https://www.flinks.com/blog/open-banking-canada-2026-launch-fintech-institutions) / [Flinks OBE](https://www.fintechfutures.com/open-banking/flinks-and-national-bank-of-canada-launch-open-banking-solution)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval — 17k stars, Agent-as-a-Judge pattern emerging

DeepEval v4.0 (adopted in the June 24 report) remains current — no new major release since June 22. Current stats: 17,000 GitHub stars, 8M+ monthly PyPI downloads.

**New development worth tracking: Agent-as-a-Judge**

A new evaluation pattern is gaining adoption alongside LLM-as-judge: an agent system evaluates another agent's **reasoning trajectory** (chain of tool calls, intermediate decisions, and final output) rather than just the final answer. Two runs of the same task can take completely different paths and both be correct — trajectory-aware evaluation catches regressions that final-output-only metrics miss.

**For PerFiApp:** The implementer agent's financial data workflows — particularly anything touching Plaid API call sequences for transaction categorization or balance reconciliation — would benefit from trajectory-level evaluation. A "did the agent use the right tool calls in the right order?" check is more meaningful than a "did the final output look correct?" check for financial logic.

**LangSmith update:** LangSmith's July 2026 release adds an AI-powered monitoring engine that detects anomalous traces automatically, replacing manual threshold-based alerting. If PerFiApp uses LangSmith for agent observability, this substantially reduces monitoring overhead.

**Recommendation: Watch (Agent-as-a-Judge for trajectory evaluation of implementer financial workflows).**

Sources: [DeepEval frameworks comparison](https://deepeval.com/blog/top-5-llm-evaluation-frameworks) / [Top 7 agent evaluation frameworks July 2026](https://techwithibrahim.medium.com/top-7-ai-agent-evaluation-frameworks-to-know-in-2026-786828662571)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v0.15.1 (July 31, 2026)

Major jump from v0.11.6 (last report) to v0.15.1 (current). All releases since June 23:

**v0.14.4 (July 29):**
- Config robustness: non-UTF-8 configuration reads degrade to cleaner error handling.
- Step-progress output escaping to prevent step ID rendering failures.
- Multiple governance presets updated.
- Azure CLI token resolution fix on Windows.

**v0.15.0 (July 30):**
- First-class agent-native runtime hooks for integrations.
- Security requirements synchronization made deterministic.
- UTF-8 encoding corrections for registry file operations.
- Prompt step timeout validation improved.

**v0.15.1 (July 31):**
- Rich markup escaping in workflow resolution output.
- Tar archive support during installations.
- **Security hardening against symlink/junction races in extension URL caching** — directly relevant for CI environments.
- TOCTOU (time-of-check-time-of-use) race condition fixes in file operations.
- Opt-in `constitution-sync` preset — synchronizes spec constitution changes across linked specs automatically.

**For PerFiApp:** Upgrade from v0.11.6 to v0.15.1. The symlink race and TOCTOU fixes are the most security-relevant items — CI-level security hardening for spec artifact caching. The `constitution-sync` preset is useful as PerFiApp's constitution evolves across feature specs.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.15.1`

Source: [Spec Kit GitHub releases](https://github.com/github/spec-kit/releases)

---

### 5.2 Expo SDK 57 (June 30, 2026) and React Native 0.86

SDK 57 is a deliberately minimal release: React Native 0.86 (non-breaking from 0.85), React 19.2 unchanged. Expo described it as a proof-of-concept for a new "small, non-breaking upgrade" cadence between major SDK releases.

**Notable changes for PerFiApp:**
- Edge-to-edge fixes on Android (relevant for PerFiApp's full-screen dashboard views).
- Light/dark mode emulation in React Native DevTools.
- `expo prebuild` now clears and regenerates the `android/` and `ios/` native directories by default — this is a **breaking change to local workflows** if developers have custom native modifications outside Expo's managed workflow.

**Current state:** SDK 55 removed Legacy Architecture support. SDK 56 is the current stable recommended SDK. SDK 57 is available for teams that want RN 0.86 specifically.

**Recommendation for PerFiApp:** Since application code has not started, adopt SDK 56 as the baseline and note SDK 57 for the first implementation sprint. Verify that the new `expo prebuild` default behavior is accounted for in CI scripts.

Source: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57) / [Expo SDK 57 medium writeup](https://medium.com/@adsalihac/expo-sdk-57-the-small-release-that-could-change-how-expo-upgrades-feel-782d7778e566)

---

### 5.3 NestJS v12 — imminent, plan migration now

NestJS v12 has a merged roadmap PR targeting early Q3 2026. As of August 3, the final release has not shipped, but the PR is committed and pre-release commentary suggests an August ship date.

**Breaking changes that affect PerFiApp's `apps/api`:**

1. **Full ESM migration**: All official packages move from CommonJS to ESM. Node.js `require(esm)` support means most existing code continues to work, but any dynamic `require()` in custom PerFiApp code or third-party NestJS plugins needs to be audited.

2. **Jest → Vitest**: New projects default to Vitest. If PerFiApp's API test suite uses Jest (the prior NestJS default), migrating to Vitest is now the path forward — Vitest has better ESM support and faster hot reload.

3. **ESLint → oxlint**: oxlint is written in Rust, 50-100x faster than ESLint on large codebases. The rule set overlaps significantly with ESLint but custom ESLint rules require rewriting.

4. **Webpack → Rspack**: Rspack is a Rust-based Webpack-compatible bundler. Drop-in for most projects.

5. **Standard Schema in route decorators**: `@Body(schema)`, `@Query(schema)` now accept Zod, Valibot, and ArkType schemas natively — eliminating `class-validator` / `class-transformer` dependency for most validation.

**For PerFiApp:** Since the API has not been built yet, implementing against NestJS v12 from the start is strongly preferred over building on v11 and migrating. The spec-lead and architect should note that Vitest is the right test runner choice (aligns with PerFiApp's TDD requirements), and Zod is the right validation library choice (Standard Schema native support, aligns with TypeScript `strict` mode).

Source: [NestJS v12 roadmap — InfoQ](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/) / [NestJS v12 Medium article July 2026](https://medium.com/@ahmadfiazjan/nestjs-v12-is-dropping-commonjs-what-your-backend-needs-before-it-ships-3a816e3bbbca) / [NestJS v12 PR #16391](https://github.com/nestjs/nest/pull/16391)

---

### 5.4 TypeScript 5.9

TypeScript 5.9 released in late July / early August 2026.

**Key features for PerFiApp:**

1. **`import defer` syntax**: Deferred module evaluation — imports a module without immediately executing it. Relevant for mobile app startup performance (defer heavy financial calculation libraries until needed).

2. **`--strictInference` under `--strict`**: A new flag (now part of the `--strict` family) that catches previously undetected type errors in unchecked generics and conditional types. PerFiApp already uses `strict: true` — this will surface new errors on first upgrade but catches real bugs.

3. **Decorator metadata stable**: Stage 3 TC39 decorator metadata is now stable. NestJS v12 depends on this for metadata-driven APIs. Required for NestJS v12 compatibility.

4. **10-20% build performance improvement for monorepos** via smarter project reference caching. PerFiApp's pnpm monorepo (`apps/mobile`, `apps/api`, `packages/*`) will benefit at every CI run.

**Recommendation: Adopt** when starting implementation — configure `tsconfig.json` with TypeScript 5.9 from the first commit. The `--strictInference` flag will be automatically active under `strict: true`.

Source: [TypeScript 5.9 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) / [The New Stack — TS 5.9](https://thenewstack.io/typescript-5-9-brings-less-friction-more-features/)

---

### 5.5 pnpm 11.11–11.19 native workspace release management

pnpm released 11.11–11.14 on July 18, 2026, adding first-class native workspace release management; 11.15–11.19 followed in late July.

**Key additions:**
- `pnpm change`: Records change intents in `.changeset/*.md` files compatible with the changesets format — naming affected packages, bump types, and changelog summaries.
- `pnpm version -r`: Bumps versions across the workspace based on recorded changes.
- `pnpm doctor`: End-to-end installation diagnostics.
- `pnpm update --write-changesets`: When upgrading dependencies, automatically records the change as a changeset.
- `pnpm access` and `pnpm team`: Registry package and organization management.

**For PerFiApp:** The native changeset support eliminates the need for the `changesets` package as a separate dependency. For a monorepo with `apps/mobile`, `apps/api`, and `packages/*`, pnpm's native release management means coordinated version bumps across packages with a single command, integrated with pnpm's existing workspace graph. Plan for this from the first implementation sprint rather than adopting changesets and migrating later.

Source: [pnpm 11.11–11.14 blog](https://pnpm.io/blog/releases/11.11-11.14) / [pnpm 11.15–11.19 blog](https://pnpm.io/blog/releases/11.15-11.19)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 Microsoft MCP Tool-Poisoning Playbook targeting fintech (June 30, 2026)

Microsoft published a detailed advisory and defensive playbook on June 30, 2026 documenting MCP **tool-description poisoning** attacks. This is distinct from the RCE and injection attacks covered in prior reports.

**The attack:** An MCP server keeps its visible name and summary unchanged but alters the natural-language tool description (metadata that is never shown to users but that AI agents consume to decide which tools to call). The altered description instructs the agent to retrieve sensitive financial data and attach it to a seemingly benign API call. Microsoft's production example involves a finance-operations agent connected to vendor, email, and invoice-enrichment MCP servers — the enrichment server's description is poisoned to exfiltrate unpaid invoice data.

**Why it matters for PerFiApp:** A tool-poisoning attack does not require compromising the AI model. It exploits the agent's trust in MCP tool metadata. For PerFiApp's agent team interacting with Plaid, Flinks, or any third-party MCP server, a poisoned tool description could cause the implementer or researcher agent to leak account data, transaction records, or API credentials through what appears to be a routine API call.

**Defenses:**
1. Pin MCP server versions to exact content hashes (via `apm.lock.yaml` — already recommended).
2. Audit tool descriptions on every MCP server before adoption, and on every update. The description field is now a security-sensitive input.
3. Run MCP servers with the principle of least privilege — a server that can only read transactions should not have access to write endpoints.
4. The MCP 2026-07-28 `cacheScope` and per-request `_meta` fields provide audit trail hooks that can be used to detect unexpected tool call patterns.

**Add to the MCP vetting checklist:** "Have the tool descriptions of every tool in this MCP server been audited for injection language or unexpected data-retrieval instructions?"

Source: [Microsoft Security Blog — tool-poisoning advisory](https://www.microsoft.com/en-us/security/blog/2026/06/30/securing-ai-agents-ai-tools-move-from-reading-acting/) / [Security Boulevard](https://securityboulevard.com/2026/07/microsoft-warns-poisoned-mcp-tool-descriptions-can-make-ai-agents-leak-data/) / [The Hacker News](https://thehackernews.com/2026/06/microsoft-warns-poisoned-mcp-tool.html)

---

### 6.2 MCP OAuth hardening in 2026-07-28 spec — direct design guidance

The MCP 2026-07-28 spec's six security extension proposals (SEPs) for OAuth/OIDC provide concrete, low-cost mitigations for the most common MCP authentication attacks:

- **`iss` validation (RFC 9207):** Prevents mix-up attacks where a malicious authorization server redirects an agent to a different resource server. Must be implemented in any Flinks or Plaid OAuth adapter.
- **`application_type` in Dynamic Client Registration:** Prevents authorization server misconfiguration that could allow one application's tokens to be used by another.
- **Credential binding to issuing server:** Credentials obtained from one OAuth server cannot be replayed against another. Critical if PerFiApp ever operates across multiple open-banking authorization servers (e.g., separate per-bank OAuth servers in the CDBA framework).

**For PerFiApp:** When PerFiApp eventually builds a Flinks adapter or any CDBA-compliant OAuth integration, these SEPs should be implemented from the first draft. They are not breaking changes to existing code — they are additions that harden new implementations.

Source: [MCP 2026-07-28 release candidate blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [MCP stateless migration guide](https://www.digitalapplied.com/blog/mcp-2026-07-28-spec-stateless-migration-guide)

---

### 6.3 Adversa AI MCP CVE tracker — July 2026 summary

Adversa AI published a July 2026 MCP CVE tracker. Current statistics:

- 30+ CVEs filed against MCP servers in a 60-day window in early 2026.
- 43% are command-injection patterns.
- 82% of MCP server downloads show path traversal vulnerability exposure.
- Only 8.5% of MCP servers use OAuth for authentication.

These numbers are worse than the June 11 report's 38%-without-auth figure, suggesting the ecosystem has grown faster than security practices have kept up.

No new individual CVEs warranting immediate action for PerFiApp were identified in this cycle beyond those already covered in prior reports (CVE-2026-32211 and the OX Security RCE advisory remain the most significant). The MCP vetting checklist items from the June 24 report remain current.

Source: [Adversa AI — MCP CVEs July 2026](https://adversa.ai/blog/top-mcp-security-resources-july-2026/) / [MCP security statistics 2026](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 CRITICAL: Consumer-Driven Banking Regulations published — consultation closes August 26

**This is the most significant Canadian compliance development since the CDBA Royal Assent in March.**

On June 27, 2026, the Department of Finance published the proposed Consumer-Driven Banking Regulations in Canada Gazette, Part I. A 60-day consultation period runs until **August 26, 2026** — three weeks away. This is the first time concrete implementation requirements have been published.

**Key provisions for PerFiApp:**

1. **Accreditation fee: C$2,500** (with annual indexation). This is the cost to apply for accreditation as a third-party service provider (TPSP) under the CDBA framework. Substantially lower than many had expected — not a barrier for a funded startup.

2. **Risk-based accreditation pathways:**
   - **Streamlined pathway:** Federal financial institutions and RPAA-registered Payment Service Providers (PSPs). Flinks is an RPAA-registered PSP — this is the fastest route for PerFiApp to access CDBA-compliant open banking data by partnering with Flinks.
   - **Full requirements:** All other applicants, including fintechs applying directly as TPSPs.

3. **Technical standards, authentication, and consent requirements:** Detailed requirements are specified. OAuth-based access with explicit user consent is confirmed as the framework (not screen scraping, not credential sharing).

4. **Reporting, record-keeping, framework transparency:** TPSPs must maintain records and report to the Bank of Canada. Relevant for PerFiApp's data layer design — audit logs for data-sharing consent events are mandatory.

5. **Violation provisions:** Specifics are included but enforcement details will follow in supplementary guidance.

**For PerFiApp's architect and spec-lead:** The proposed regulations should be read in full before the August 26 consultation closes. The risk-based streamlined pathway via an RPAA-registered partner (Flinks) may be the optimal first approach for PerFiApp's Phase 1 launch — the architect should model this pathway in the data aggregation layer spec.

Sources: [Bennett Jones — CDB Regulations](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations) / [Canada Gazette — CDB Regulations full text](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [McCarthy Tétrault — framework analysis](https://www.mccarthy.ca/en/insights/blogs/techlex/canadas-consumer-driven-banking-framework-takes-shape-with-draft-regulations) / [Mondaq — open banking milestone](https://www.mondaq.com/canada/financial-services/1812418/open-banking-milestone-draft-consumer-driven-banking-regulations-released)

---

### 7.2 CRITICAL: RTR By-law comes into force August 24, 2026 — 21 days away

The Canada Gazette, Part II, published the Real-Time Rail By-law and RTR Rules on July 1, 2026, with an in-force date of **August 24, 2026**. The RTR launch remains Q4 2026, but the **legal foundation activates in three weeks**, which is the trigger for Payments Canada to proceed with final operational readiness steps.

**What this means practically:**
- RTR By-law in force on August 24 → RTR launch Q4 2026 (phased, universal in 2027)
- RTR is a prerequisite for Phase 2 write-access open banking (payment initiation) under the CDBA framework
- Phase 2 read/write is targeted for mid-2027
- Universal RTR participation: 2027

**For PerFiApp:** The RTR timeline is now on a confirmed legal foundation. The architect can design Phase 2 write-access features (Pay & Payment Optimization, Cash Safety modules) with Q4 2026 RTR availability and 2027 universal coverage as firm planning assumptions, not estimates. This is a signal to begin Phase 2 architecture design.

Sources: [McCarthy Tétrault — RTR By-law](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published) / [Payments Canada — RTR milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [ClearingPost — RTR Q4 2026](https://clearingpost.com/insights/canada-rtr-q3-2026-launch/)

---

### 7.3 PIPEDA / Bill C-27 — still stalled, no timeline for replacement

Bill C-27 (the Digital Charter Implementation Act, which would have replaced PIPEDA with CPPA and added Canada's first AI act) died when Parliament was prorogued on January 6, 2025. As of mid-2026, no replacement bill has been tabled.

**Current situation:**
- PIPEDA remains in force federally.
- Quebec Law 25 is fully in force (previously covered).
- A future replacement bill is expected to separate AI regulation from privacy reform (the bundling of AIDA with CPPA was identified as the primary reason C-27 failed).
- Commentators expect fines of up to the greater of C$25M or 5% of gross global revenue in the eventual bill, carried over from C-27.

**For PerFiApp:** No immediate design changes required. Continue designing to PIPEDA + Quebec Law 25 as the operative framework. When a new bill is tabled, it will be covered in a future research cycle.

Source: [IAPP — 2026 privacy reform outlook](https://iapp.org/news/a/what-2026-may-bring-for-canadas-privacy-reform-efforts) / [Gowling WLG — privacy reform status](https://gowlingwlg.com/en/insights-resources/articles/2025/federal-privacy-reform)

---

### 7.4 OSFI Fast-Track Framework — competitive implications for PerFiApp

OSFI launched its Targeted Fast-Track Framework for new fintech bank licensing in June 2026. Key terms: 4-week initial feedback, 12-month risk review, 3-month ministerial decision. Public dashboard proposed. Applications from fintechs and crypto-asset custodians are explicitly prioritized.

**For PerFiApp:** The Fast-Track Framework does not currently affect PerFiApp's product or architecture — PerFiApp is not applying for a banking license. However, it directly affects the competitive landscape:

- **KOHO** is in Phase 2 of OSFI review. Under the Fast-Track timeline (12 months + 3 months), a license approval could come as early as Q1-Q2 2027. If approved, KOHO becomes the first neobank with a full Schedule 1 bank license, enabling deposit insurance, direct lending, and full-stack banking — significantly expanding its competitive footprint.
- Other fintechs (Wealthsimple, Neo Financial, Brim Financial) may file applications under the same framework.

**The spec-lead should assess** whether PerFiApp's positioning narrative in the PDR accounts for a scenario where KOHO holds a Schedule 1 license by 2027. PerFiApp's AI coaching and bilingual differentiators remain intact, but the competitive gap in banking services would narrow substantially.

Sources: [Mondaq — OSFI Fast-Track](https://www.mondaq.com/canada/fintech/1750030/osfis-fast-track-approvals-pilot-making-way-for-innovative-fintechs-to-scale-as-financial-institutions-in-canada) / [Startup Ecosystem Canada](https://www.startupecosystem.ca/news/osfis-fast-track-framework-to-transform-canadas-fintech-landscape/) / [KOHO banking license status](https://ca.finance.yahoo.com/news/koho-moves-closer-getting-banking-110050793.html)

---

## Track 8 — Competitive & Product Intel

### 8.1 Wealthsimple hits $100B AUA milestone, launches AI stock research tools

Wealthsimple crossed CAD $100 billion in assets under administration and raised nearly $1B at a $10B valuation (May 2026). At its "Trade Show" event (May 1, 2026), it launched:

- AI-powered research-and-trading dashboard: natural language queries about stocks, performance patterns, and market driver summaries.
- Zero-commission options contracts.
- IPO Access feature (shares at IPO price, no minimum).
- Direct indexing and alternative investment portfolio access.

**For PerFiApp:** Wealthsimple's AI integration is in the investment-research domain (stock and ETF analysis), not the personal finance coaching domain PerFiApp targets. PerFiApp's differentiation (AI coaching on spending, budgeting, credit, rewards) is distinct. However, Wealthsimple's success demonstrates that Canadian users are receptive to AI-powered financial tools — validating PerFiApp's market positioning.

Source: [BetaKit — Wealthsimple $100B](https://betakit.com/wealthsimple-hits-100-billion-milestone-unveils-new-suite-of-advanced-investing-tools/) / [Fintech.ca — Trade Show](https://www.fintech.ca/2026/05/01/wealthsimple-trade-show-tools-upgrades-active-investors/)

---

## Top Recommendations — Prioritized List

### Immediate (next 48 hours — before August 5)

**P0 — Migrate `claude-opus-4-1` to `claude-opus-5` today.**

Search every file in `.claude/agents/`, `.github/workflows/`, and any API wrapper for `claude-opus-4-1-20250805` or `claude-opus-4-1`. The model returns API errors starting August 5. The replacement is `claude-opus-5` (same $5/$25/MTok price, twice the benchmark performance).

---

### This week

**P1 — Update agent model assignments across the roster.**

Based on the updated model table: spec-lead → `claude-fable-5` (primary) or `claude-opus-5`; architect → `claude-fable-5` or `claude-opus-5`; implementer, test-engineer, researcher → `claude-sonnet-5`; security-reviewer → `claude-opus-5`; code-reviewer → `claude-sonnet-5` or `claude-haiku-4-5`.

Update the fallback chain to: `["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"]`.

**P2 — Read the proposed Consumer-Driven Banking Regulations.**

The full text is in Canada Gazette, Part I (June 27, 2026). The 60-day consultation window closes August 26. The architect and spec-lead should review the accreditation requirements, the streamlined PSP pathway (via Flinks), the technical standards, and the consent/reporting obligations before the window closes. This is the foundational document for PerFiApp's data layer design.

**P3 — Add MCP tool-description audit to the MCP vetting checklist.**

Microsoft has documented fintech-targeted tool-poisoning attacks that exploit MCP tool descriptions (never shown to users, fully trusted by agents). For every MCP server under consideration (Plaid, Flinks partner API, GitHub), verify the tool description text does not contain any data-retrieval or data-transmission instructions beyond the server's stated purpose.

---

### This sprint (before August 31)

**P4 — Model cost forecasting before Sonnet 5 standard pricing takes effect.**

Run actual token counts on representative agent sessions using Sonnet 5. The new tokenizer produces ~30% more tokens for equivalent text. Combined with the output increase (128k vs 64k max, and effort: high is the default), effective per-session cost may differ substantially from Sonnet 4.6. Build the cost model before September 1.

**P5 — Upgrade Spec Kit to v0.15.1.**

Run `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.15.1`. The security hardening for symlink/junction races and TOCTOU fixes are the most important additions for CI security. The `constitution-sync` preset is useful as PerFiApp begins spec work.

**P6 — Run `/doctor` on all developer environments.**

Claude Code v2.1.205 makes `/doctor` a full interactive diagnostic. It will identify unused MCP servers and skills by context cost, propose CLAUDE.md trimming, and flag slow hooks. For a financial app where agent sessions can be long and context-intensive, trimming unnecessary CLAUDE.md content reduces cost on every call.

**P7 — Design Phase 2 write-access architecture in parallel with Phase 1.**

With the RTR By-law in force August 24 and Q4 2026 RTR launch confirmed, Phase 2 write-access (payment initiation, cash safety features) has a firm timeline anchor. The architect should begin Phase 2 design now — it need not be implemented before Phase 1, but the architecture decisions for the payment layer have long lead times (RTR participation, CDBA Phase 2 accreditation, FINTRAC MSB review).

---

### Medium-term (next 4–6 weeks)

**P8 — Plan NestJS v12 as the implementation baseline.**

NestJS v12 is expected to ship in August or early September. Since PerFiApp's API has not been built yet, planning for v12 from the first implementation sprint avoids a disruptive migration. This means: Vitest as the test runner (aligns with TDD requirement), Zod as the validation library (Standard Schema native), oxlint as the linter (Rust-based, much faster in CI), ESM from the first commit.

**P9 — Contact Flinks about MCP server roadmap and accreditation partnership.**

The CDB Regulations confirm that RPAA-registered PSPs like Flinks have a streamlined accreditation pathway. An official Flinks MCP server would be the highest-value external tool addition. Simultaneously, Flinks' streamlined PSP accreditation pathway may be the fastest route for PerFiApp to achieve CDBA Phase 1 compliance — worth a direct conversation now that the regulatory requirements are published.

**P10 — Trial Claude Fable 5 on spec-lead for the first feature spec.**

Fable 5 is restored and stable (new safety classifier active). The prior trial recommendation from June 11 is now actionable. Run the first PerFiApp feature spec through both Fable 5 and Opus 5 and compare output quality, constitution fidelity, and token cost. The ~30% tokenizer premium on Fable 5 means cost per token is higher than listed — measure actual input token counts.

**P11 — Adopt pnpm native workspace release management.**

With pnpm 11.11+, PerFiApp's monorepo can use `pnpm change`, `pnpm version -r`, and `pnpm update --write-changesets` natively without the changesets package. Plan for this from the first implementation sprint to avoid adopting changesets and migrating later.

**P12 — Prototype Agent-as-a-Judge evaluation for the implementer's financial workflows.**

The Agent-as-a-Judge pattern evaluates the implementer's full tool-call trajectory, not just final output. For financial logic (money math, Plaid API call sequences, transaction categorization), trajectory evaluation catches regressions that final-output checks miss. DeepEval v4.0 is the starting point; the test-engineer agent should design the evaluation schema.

---

*Report generated 2026-08-03. All findings verified against primary sources as of August 3, 2026. This is a recommendation-only report — nothing is installed or configured until the team reviews and approves. Delta vs 2026-06-24: prior findings not repeated unless status changed.*

---

## Sources

- [Anthropic — Redeploying Claude Fable 5](https://www.anthropic.com/news/redeploying-fable-5)
- [9to5Mac — Fable 5 export controls lifted](https://9to5mac.com/2026/07/01/claude-fable-5-cleared-to-return-as-us-lifts-anthropics-export-control-restriction/)
- [VentureBeat — Fable 5 restored globally](https://venturebeat.com/technology/anthropic-is-bringing-back-claude-fable-5-globally-after-us-lifts-export-control-order-where-can-enterprises-access-it)
- [Axios — Claude Opus 5 release](https://www.axios.com/2026/07/24/anthropic-releases-new-model-opus-5)
- [Coursiv — Opus 5 benchmarks and pricing](https://coursiv.io/blog/claude-opus-5)
- [Anthropic — Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [TechCrunch — Claude Sonnet 5](https://techcrunch.com/2026/06/30/anthropic-launches-claude-sonnet-5-as-a-cheaper-way-to-run-agents/)
- [Anthropic — Introducing Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)
- [Finout — Sonnet 5 pricing analysis](https://www.finout.io/blog/claude-sonnet-5-pricing-2026-the-hidden-costs-and-real-savings-behind-the-cost-until-cost-neutral-launch)
- [Anthropic — Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)
- [Claude Code Week 28 changelog](https://code.claude.com/docs/en/whats-new/2026-w28)
- [Releasebot — Claude Code July 2026](https://releasebot.io/updates/anthropic/claude-code)
- [MCP 2026-07-28 release candidate blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [CData — Stateless MCP](https://www.cdata.com/blog/stateless-mcp)
- [Microsoft Community Hub — MCP on App Service](https://techcommunity.microsoft.com/blog/appsonazureblog/mcp-just-went-stateless)
- [Microsoft Security Blog — MCP tool poisoning playbook](https://www.microsoft.com/en-us/security/blog/2026/06/30/securing-ai-agents-ai-tools-move-from-reading-acting/)
- [Security Boulevard — MCP tool poisoning advisory](https://securityboulevard.com/2026/07/microsoft-warns-poisoned-mcp-tool-descriptions-can-make-ai-agents-leak-data/)
- [Adversa AI — MCP CVEs July 2026](https://adversa.ai/blog/top-mcp-security-resources-july-2026/)
- [Spec Kit GitHub releases](https://github.com/github/spec-kit/releases)
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
- [NestJS v12 roadmap — InfoQ](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/)
- [NestJS v12 — July 2026](https://medium.com/@ahmadfiazjan/nestjs-v12-is-dropping-commonjs-what-your-backend-needs-before-it-ships-3a816e3bbbca)
- [TypeScript 5.9 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)
- [pnpm 11.11–11.14 blog](https://pnpm.io/blog/releases/11.11-11.14)
- [Canada Gazette — CDB Regulations full text](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html)
- [Bennett Jones — CDB Regulations](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations)
- [McCarthy Tétrault — RTR By-law in force](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published)
- [Payments Canada — RTR milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail)
- [IAPP — 2026 Canadian privacy reform](https://iapp.org/news/a/what-2026-may-bring-for-canadas-privacy-reform-efforts)
- [Mondaq — OSFI Fast-Track Framework](https://www.mondaq.com/canada/fintech/1750030/osfis-fast-track-approvals-pilot-making-way-for-innovative-fintechs-to-scale-as-financial-institutions-in-canada)
- [Yahoo Finance — KOHO banking license](https://ca.finance.yahoo.com/news/koho-moves-closer-getting-banking-110050793.html)
- [BetaKit — Wealthsimple $100B](https://betakit.com/wealthsimple-hits-100-billion-milestone-unveils-new-suite-of-advanced-investing-tools/)
- [DeepEval — top LLM evaluation frameworks 2026](https://deepeval.com/blog/top-5-llm-evaluation-frameworks)
- [Flinks — open banking 2026](https://www.flinks.com/blog/open-banking-canada-2026-launch-fintech-institutions)
