# PerFiApp Agent Research — 2026-11-24

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: model generation update (new 5.5 tier replaces the prior lineup), two urgent deprecation deadlines this week and next month, and Canadian open-banking infrastructure (RTR launched November 9).

---

## Executive Summary

- **URGENT — claude-sonnet-4-5 retires November 30, 2026 (six days away).** If any agent file, CI script, or fallback chain references `claude-sonnet-4-5` or `claude-sonnet-4-5-20250929`, it will break Monday. Recommended replacement per Anthropic: `claude-sonnet-5-5`.
- **NEW MODEL GENERATION (5.5 tier) is now the official Anthropic lineup.** Fable 5.2, Opus 5.5, Sonnet 5.5, Haiku 5.5 — all with 1M-token context, 128K output, training cutoff June 2026. This is a full tiering reset that affects every agent-role assignment.
- **RESOLVED: Fable 5 / Mythos 5 export-control suspension.** US Commerce Department lifted the order on June 30, 2026; Anthropic restored global access July 1. Fable 5.2 is now the recommended model for demanding agentic work and is the new default on Claude Code.
- **STATUS UPDATE — temperature/top_p/top_k removed API-wide.** Previously a 400 error on Opus 4.7+; now formally removed in API version 2026-10-21. Any integration on the new SDK major version will error on these params across all models.
- **Canada RTR launched November 9, 2026 — $100,000 limit, phased onboarding.** Q4 2026 target was met. This is the prerequisite for PerFiApp Phase 2 (payment initiation) and directly unblocks the Pay & Payment Optimization architecture.
- **Wealthsimple launched Penny AI assistant November 5, 2026** — directly competes with PerFiApp's core AI coaching module. Canada's big banks have simultaneously moved to restrict third-party AI agent access to customer accounts, creating a widening moat for Wealthsimple's first-party approach.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **claude-sonnet-4-5 retires November 30 — six days** | Model | Any agent using this ID | **Act now — migrate to claude-sonnet-5-5 this week** |
| **claude-opus-4-5 deprecated Nov 23 — retires Jan 22, 2027** | Model | Any agent using this ID | **Act — migrate to claude-opus-5-5 before Jan 22** |
| **RESOLVED: Fable 5.2 fully available — adopt for spec-lead/architect** | Model | spec-lead, architect | **Adopt — Fable 5.2 is now the top recommended agentic model** |
| **New 5.5 tier: Opus 5.5, Sonnet 5.5, Haiku 5.5** | Model / Cost | All agents | **Adopt — full tiering reset; rebalance agent assignments** |
| **API version 2026-10-21 — temperature/top_p/top_k removed API-wide** | Model / Cost | All API integrations | **Act — confirm any wrapper/SDK does not set these params** |
| **claude-haiku-4-5-20251001 — "not before Oct 15, 2026" window passed** | Model | test-engineer, routing agents | **Act — verify status; migrate to claude-haiku-5-5** |
| **Claude Code v2.1.331 — routines, Code Mode, blockWritesOutside** | Toolchain / Security | implementer, all agents | **Adopt — several security and automation features are actionable** |
| **MCP 2026-07-28 spec finalized — stateless protocol** | Agent tooling | architect | **Adopt — any custom MCP server should be built stateless; migration checklist available** |
| **Claude Code v2.1.317 — asks before sending account email to network** | Security | All agents | **Adopt — upgrade to v2.1.331 to pick this up** |
| **Claude Code v2.1.325 — file tools refuse writes to .credentials.json** | Security | implementer | **Adopt — built-in credential write protection** |
| **New Claude Code CVEs (CVE-2026-25725, CVE-2026-24052, CVE-2026-24053, CVE-2026-25723)** | Security | All developers | **Act — verify every developer is on v2.1.331 or later** |
| **Spec Kit v1.0.0 / v1.0.6 — first stable release** | Toolchain | spec-lead | **Adopt — upgrade from v0.11.6; stable API guarantees** |
| **DeepEval v4.2.6 — voice simulation, TypeScript Vitest** | Agent quality | test-engineer | **Watch — no breaking changes; TypeScript Vitest is relevant to PerFiApp stack** |
| **Canada RTR launched November 9, 2026** | Compliance | architect, spec-lead | **Act — unblocks Phase 2 payment initiation architecture; update PDR timeline** |
| **CDBA Phase 1 — final regulations still pending** | Compliance | architect, spec-lead | **Monitor — draft regs closed August 26; final regs expected late 2026 or early 2027** |
| **FINTRAC AMP framework active — penalties up to 40x** | Compliance | spec-lead, architect | **Act — verify any cash-advance or payment module has an effective AML program, not just documentation** |
| **OSFI fast-track banking license pilot** | Compliance / Competitive | spec-lead | **Monitor — 12-month pilot creates clearer path for fintech-turned-bank competitors** |
| **Wealthsimple Penny AI assistant (Nov 5, 2026)** | Competitive | spec-lead | **Act — directly competes with PerFiApp AI coaching; spec-lead should re-assess differentiation** |
| **Big banks restricting third-party AI agent access** | Competitive / Compliance | architect | **Monitor — may reduce data aggregation options; watch CDBA as counterweight** |
| **KOHO banking license pending; OSFI fast-track helps** | Competitive | spec-lead | **Monitor — still pending approval; OSFI fast-track may accelerate** |

---

## Track 1 — Model & Capability Updates

### 1.1 URGENT STATUS CHANGE: claude-sonnet-4-5 retires November 30, 2026

Anthropic notified developers on September 30, 2026, that `claude-sonnet-4-5-20250929` (and the undated alias `claude-sonnet-4-5`) will be retired on **November 30, 2026 — six days from this report**. Requests to this model ID will fail after that date.

Recommended replacement: `claude-sonnet-5-5`.

If any PerFiApp agent definition or CI script references `claude-sonnet-4-5`, migrate immediately. Also check fallback chains: if a primary model is unavailable and the fallback is `claude-sonnet-4-5`, the fallback itself will break Monday.

Source: [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.2 URGENT STATUS CHANGE: claude-opus-4-5 deprecated November 23 — retires January 22, 2027

Anthropic notified developers on **November 23, 2026** (yesterday) that `claude-opus-4-5-20251101` retires on **January 22, 2027**. Recommended replacement: `claude-opus-5-5`.

This was the mid-range Opus tier (200K context, 64K output). With the 5.5 generation available at comparable or better cost, there is no reason to hold. Add to the sprint: audit agent definitions for `claude-opus-4-5` and migrate.

Source: [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.3 STATUS UPDATE: claude-haiku-4-5-20251001 — "not before Oct 15, 2026" window

The June 2026 report listed this model as "not before October 15, 2026." That floor date has now passed. The official deprecations page does not show it as deprecated or retired, but it also does not appear in the "latest models" table — it is superseded by `claude-haiku-5-5`. Verify current status and migrate proactively. If the model carries over into the 5.5 era, it retains a 200K context window vs Haiku 5.5's 1M, making migration worthwhile regardless.

Recommended replacement: `claude-haiku-5-5`.

Source: [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.4 RESOLVED: Fable 5 / Mythos 5 export-control suspension lifted

The US Commerce Department issued a letter on **June 30, 2026** withdrawing the export-control requirement. Anthropic restored global access to `claude-fable-5` and `claude-fable-5-1` on **July 1, 2026**, across Claude.ai, Claude Code, the Claude Platform, and Claude Cowork. Access on AWS Bedrock, Google Cloud, and Microsoft Foundry followed shortly after.

A patched and updated `claude-fable-5-2` is now the recommended top-tier model for demanding reasoning and long-horizon agentic work. This is the model Claude Code's `/claude-api` skill defaults to for agentic workflows. Fable 5.2's pricing is $8/$40 per MTok input/output — slightly cheaper than Fable 5/5.1 at $10/$50.

**For PerFiApp:** Remove the Fable 5 emergency fallback chain instructions from prior reports. The primary recommendation from June 2026 — trial Fable 5 for spec-lead and architect — can now proceed, updated to Fable 5.2. Note: Mythos 5.2 is listed as "limited availability" (Cyber Verification Program only); do not plan on Mythos.

Sources: [Axios — restrictions lifted](https://www.axios.com/2026/06/30/trump-anthropic-ai-model-fable-restrictions) / [VentureBeat — global restoration](https://venturebeat.com/ai/anthropic-is-bringing-back-claude-fable-5-globally-after-us-lifts-export-control-order-where-can-enterprises-access-it/) / [Anthropic models overview](https://platform.claude.com/docs/en/about-claude/models/overview)

### 1.5 New model generation: the 5.5 tier is now the official Anthropic lineup

Since June 2026, Anthropic has shipped an entirely new model generation. The official "latest models" table as of November 24, 2026, verified from the Anthropic docs:

| Model | Model ID | Context | Max output | Input ($/MTok) | Output ($/MTok) | Recommended role |
|---|---|---|---|---|---|---|
| Claude Fable 5.2 | `claude-fable-5-2` | 1M | 128K | $8 | $40 | spec-lead, architect (top-tier agentic) |
| Claude Opus 5.5 | `claude-opus-5-5` | 1M | 128K | $4 | $20 | architect, complex implementer tasks |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | 1M | 128K | $2 | $10 | implementer, code-reviewer |
| Claude Haiku 5.5 | `claude-haiku-5-5` | 1M | 128K | from $0.10 | from $0.50 | test-engineer (routing, extraction, classification) |

All models have a **1M-token context window** and **128K max output**. Batch API discount: 50% off. Cache read rates: 2.5% of input price on Fable 5.2, 5% on Opus/Sonnet 5.5. This cache-read pricing improvement (from 10%) makes extended prompt caching substantially cheaper on the top two tiers.

Retirement commitments: Fable 5.2 not before November 9, 2027; Opus 5.5 not before September 22, 2027; Sonnet 5.5 not before September 28, 2027; Haiku 5.5 not before October 7, 2027.

**For PerFiApp agent roles:** The prior tier recommendation of "Opus 4.8 for spec-lead and architect, Sonnet 4.6 for implementer, Haiku 4.5 for test-engineer" should be updated to: Fable 5.2 for spec-lead and architect, Sonnet 5.5 for implementer and code-reviewer, Haiku 5.5 for test-engineer bulk/classification tasks. Opus 5.5 is an optional step for complex implementation sessions.

Source: [Anthropic models overview](https://platform.claude.com/docs/en/about-claude/models/overview)

### 1.6 STATUS UPDATE: temperature/top_p/top_k — removed API-wide in version 2026-10-21

**The scope of this issue has expanded.** The June 2026 report noted a 400 error on Opus 4.7+ when setting these parameters. This is now a formal API-level removal: in **API version 2026-10-21** (the version shipped with current SDK major versions), `temperature`, `top_p`, and `top_k` are removed across **all models**. Setting them returns a 400 error regardless of model.

Any integration that sets sampling parameters — including agent definitions with these fields in their configuration — must remove them. The fix is the same: omit these fields entirely. The API version gates this, so if running an older SDK major version, the old behavior applies (400 on Opus 4.7+ only). Upgrading SDKs without removing these params will break all models simultaneously.

Source: [API migration guide 2026-10-21](https://platform.claude.com/docs/en/api/migration-2026-10-21)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Agent SDK billing split — still paused, no reschedule

No new announcement found. The June 15 pause is still in effect as of the most recent coverage. Agent SDK usage (including Claude Code GitHub Actions and CI runs) continues to draw from subscription limits rather than a separate credit pool. Anthropic has given no rescheduled date.

**For PerFiApp:** The CI research runs remain covered by subscription. Continue tracking Agent SDK token consumption as advised — the split will eventually happen and the data will be needed for break-even analysis.

Source: [The Decoder — billing pause context](https://the-decoder.com/anthropic-backs-off-unpopular-billing-overhaul-as-price-war-with-openai-looms/)

### 2.2 Cache read pricing improved on top-tier models

New finding not in prior reports. Official pricing documentation shows prompt cache reads now cost **2.5% of input price on Fable 5.2** and **5% on Opus 5.5 and Sonnet 5.5**, compared to 10% on earlier models. At $8/MTok input for Fable 5.2, a cache read costs $0.20/MTok — a meaningful reduction for spec-lead sessions with long constitutions and system prompts.

**For PerFiApp:** System prompt caching for the 5+ minute TTL already recommended is now cheaper on the top tier. No code change required — the lower rate applies automatically on cache hits.

Source: [Anthropic models overview pricing footnotes](https://platform.claude.com/docs/en/about-claude/models/overview)

### 2.3 300K output tokens on Batch API — broadly available

New across the 5.5-generation batch runs and several 4.x models: up to **300K output tokens** per message on the Message Batches API (using the `output-300k-2026-03-24` beta header). Supported on claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5, claude-opus-4-8, claude-opus-4-7, claude-opus-4-6, and claude-sonnet-4-6. Synchronous limit remains 128K.

**For PerFiApp:** The test-engineer agent running bulk test generation via Batch API can produce much larger test suites per request. Also useful for the implementer agent generating a full module's scaffold in one pass.

Source: [Anthropic models overview](https://platform.claude.com/docs/en/about-claude/models/overview)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 Claude Code v2.1.331 — 140+ versions since June 24

Claude Code is now at **v2.1.331 (November 23, 2026)**, up from v2.1.187. The most actionable new features for PerFiApp:

**Routines / scheduled tasks (April 2026 — v2.1.230 era):**
Cloud-based, cron-style automation. Each routine is a saved Claude Code configuration (prompt + repo + connectors) that runs on a schedule or in response to an event, on Anthropic's infrastructure. Available on Pro, Max, Team, and Enterprise plans. Pro: 5/day; Max: 15/day; Team/Enterprise: 25/day. Full cloud sessions with no interactive permission prompts. The weekly research run already in this repo's CI can be supplemented with on-demand routines for regression checks or compliance monitoring. See [Routines documentation](https://code.claude.com/docs/en/routines) and [Introducing routines](https://claude.com/resources/articles/introducing-routines-in-claude-code).

**permissions.blockWritesOutsideWorkingDirectories (v2.1.314 — October 2026):**
When enabled, Write, Edit, and NotebookEdit refuse paths outside the declared working directories in every permission mode — including when permissions are bypassed. For the implementer running in auto mode on financial code, this prevents accidental writes to global config files, home directory, or system paths. Add to `settings.json`:
```json
{ "permissions": { "blockWritesOutsideWorkingDirectories": true } }
```
See: [Claude Code v2.1.314 changelog](https://code.claude.com/docs/en/changelog)

**permissions.denyInsteadOfPrompting (v2.1.319):**
Denies a tool call that would otherwise require a permission prompt, allowing the current turn to continue without blocking. Useful for the researcher and test-engineer agents in unattended CI contexts where stalling on prompts is worse than failing the tool call.

**v2.1.317 — asks before sending account email to network:**
Any web or shell tool call that would transmit the user's account email address to the network now requires explicit confirmation. Financial-app relevant — prevents exfiltrating identity from an MCP server call.

**v2.1.325 — file tools refuse writes to .credentials.json:**
File write tools now refuse paths that match sign-in credential files (e.g., `.credentials.json`, OAuth token caches). Builds on the earlier `sandbox.credentials` setting.

**v2.1.325 — sandboxed Bash follows normal permission flow:**
Previously, sandboxed Bash ran without prompts by default. Now sandboxed Bash goes through the normal permission flow unless `"sandbox.autoAllowBashIfSandboxed": true` is set. Defaults to safe. Important for financial app contexts where sandboxed subagents run scripts that may touch config or credential paths.

**v2.1.323 — MCP v1 client removed:**
The legacy MCP v1 client is gone. `MCP_SDK_GENERATION=v1` now runs the v2 client in compatibility mode. Any MCP server or integration that depended on v1 wire format must migrate. The compatibility flag is a temporary bridge.

**v2.1.321 — Fable 5.2 added as default Fable model:**
`claude-fable-5-2` is now the default Fable model in Claude Code, replacing the original `claude-fable-5`. Existing agent definitions that specify `claude-fable-5` should be updated — Fable 5.2 is cheaper ($8 vs $10/MTok input) and has the same 1M context.

**v2.1.330 — easel chart mod:**
Built-in `easel` mod draws charts from data. Turn off automatic chart rendering in `/config`. Useful for the researcher agent when visualizing token usage or cost trends — not critical for financial app logic.

**v2.1.328 — /code-review with severity classification:**
`/code-review` now marks findings as Important, Pre-existing, or Nit, and reports only bugs and CLAUDE.md violations on most models. This reduces noise from the automated PR review workflow. The code-reviewer and security-reviewer agents benefit directly.

**v2.1.331 — `claude doctor` and Code Mode on cloud platforms:**
`claude doctor` reports whether the API is reachable and what may be wrong. Code Mode (experimental) — where Claude writes JavaScript to call its tools — is now available on Bedrock, Google Cloud's Agent Platform, Microsoft Foundry, and Claude Platform on AWS.

Sources: [Claude Code changelog](https://code.claude.com/docs/en/changelog) / [Routines announcement](https://claude.com/resources/articles/introducing-routines-in-claude-code)

### 3.2 STATUS CHANGE: MCP 2026-07-28 specification — released and stable

The stateless MCP release candidate planned for July 28, 2026, was published on schedule. The specification is now stable and widely adopted. Key changes confirmed:

- **Mcp-Session-Id removed.** Each request carries its own context. Servers may not expect session continuity at the protocol layer.
- **Mcp-Method and Mcp-Name headers required** on Streamable HTTP requests (for load balancer routing).
- **MCP Apps extension** ships with the spec — server-rendered UIs for MCP tools.
- **Tasks extension** ships with the spec — formal support for long-running background work (MCP server initiates a task, Claude Code moves it to the background and reports when done — v2.1.319 on the client side).
- **Feature lifecycle** categories: Active, Deprecated, Removed.
- **MCP v1 client removed** in Claude Code v2.1.323 — protocol-version dispatch via compatibility flag only.

**For PerFiApp:** Any custom MCP server (Flinks adapter, rewards data server) must be built stateless. The Tasks extension is directly relevant: a Flinks account-refresh operation can be a background task rather than blocking the agent turn. If the team built an MCP server between June and now that used session IDs, migrate to stateless design.

Sources: [MCP 2026-07-28 release candidate blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [MCP stateless migration guide](https://workos.com/blog/mcp-stateless-spec-2026-07-28) / [SDK betas announcement](https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/)

### 3.3 Flinks — documentation MCP server confirmed; no live-data financial MCP server yet

Flinks publishes a documentation MCP server (`docs.flinks.com/guides/ai`) that gives an AI assistant real-time search over its integration documentation. This is a developer productivity tool, not a financial data aggregation server — it does not give agents access to end-user bank accounts.

No official Flinks live-data MCP server exists as of this report. The prior recommendation (contact Flinks about their MCP roadmap) remains active. The Subaio open banking MCP server launched in November 2026 is EU-only (PSD2) and not relevant to Canada.

**Security note:** The Flinks documentation MCP server is safe for developer use (read-only, public docs). Do not confuse it with a financial data server that would require PIPEDA-level vetting.

Sources: [Flinks AI skill documentation](https://docs.flinks.com/guides/ai/skill) / [FF News — Subaio EU launch](https://ffnews.com/news/pressrelease-talk-to-your-finances-9ad63b5d)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval v4.2.6 (September 24, 2026) — incremental updates

**Status unchanged from "Adopt."** DeepEval has shipped incremental updates since v4.0 (June 22). Current version is v4.2.6 (Sep 24, 2026). No breaking changes from v4.0.

Notable additions in 4.1.x:
- **Voice conversation simulation** — generates and stores conversation audio files for evaluating voice-enabled agent flows. Not directly relevant to PerFiApp MVP (text-based).
- **TypeScript Vitest unit test setup** — adds TypeScript test scaffolding for DeepEval metrics. Directly relevant: PerFiApp uses TypeScript `strict` mode throughout, and this enables metric assertions in the same test runner as application code.

Adopt path remains: `deepeval generate` to synthesize test datasets, `deepeval test run` in CI, `deepeval inspect` for per-span debugging. The TypeScript Vitest integration should be wired into PerFiApp's test pipeline when tests are written.

Sources: [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026) / [DeepEval releases](https://github.com/confident-ai/deepeval/releases)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v1.0.0 → v1.0.6 — first stable major version

**Status change from "Adopt v0.11.6" to "Adopt v1.0.6."**

Spec Kit shipped its first stable major version, **v1.0.0, on August 21, 2026** — marking a stable API commitment. Current version as of September 10, 2026 is **v1.0.6**. The 1.0 release means no more breaking changes within the 1.x series.

For teams on v0.11.6, the upgrade path is:
```
specify self upgrade
# or pin to: uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.6
```

The upgrade guide at `github.github.com/spec-kit/upgrade.html` documents breaking changes from 0.x to 1.x. Review this before upgrading, as slash commands and workflow syntax may have changed from v0.11.6.

**For PerFiApp:** Upgrading from v0.11.6 to v1.0.6 is recommended for the stable API guarantee. Check the upgrade guide first. The spec-lead agent's slash commands (`/speckit-specify`, `/speckit-plan`, etc.) may need updating if the syntax changed.

Source: [Spec Kit history](https://github.github.com/spec-kit/history.html)

### 5.2 APM — activity uncertain after May 2026

A third-party tracker (Desktop Insights) lists APM at v0.35.0, but this is unverified. The official GitHub repository (`microsoft/apm`) shows last push on May 31, 2026 — over five months ago. This suggests either a slowdown in active development or a migration to a different release mechanism.

**Recommendation: Verify on the [official APM releases page](https://github.com/microsoft/apm/releases).** If activity has stalled, assess whether APM continues to meet PerFiApp's supply-chain governance needs or whether an alternative MCP server dependency manager is warranted.

The `allowExecutables` gate from v0.21.0 and SBOM export remain the key security features from the prior report. These should still be in use regardless of APM's development pace.

Source: [microsoft/apm GitHub](https://github.com/microsoft/apm)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 New Claude Code CVEs since June 2026 — patch by upgrading to v2.1.331

Four CVEs disclosed between April and June 2026 affect earlier Claude Code versions. All are patched in current releases. Developers on v2.1.187 from June 2026 may still be on a vulnerable version for some of these:

- **CVE-2026-25725 — sandbox escape via settings.json.** Mechanism: crafted project settings.json allows code to escape the sandbox. Patched in a version after the initial disclosure; v2.1.325's tightened sandbox defaults address the class of issue.
- **CVE-2026-24052 — WebFetch domain validation bypass.** Allows crafted URLs to bypass the domain allowlist, potentially exfiltrating data to unintended hosts. Financial-app relevant: if the implementer or researcher agent uses WebFetch with a domain allowlist, this bypass could reach unintended endpoints.
- **CVE-2026-24053 — path restriction bypass.** Patched in Claude Code v2.0.74. If upgrading from a very old version, verify this patch is included.
- **CVE-2026-25723 — command injection via piped sed.** Shell pattern injection via tool call with piped sed commands.

**Recommendation:** Ensure every developer is on v2.1.331. The jump from v2.1.187 to v2.1.331 picks up fixes for all four CVEs plus the broader security hardening in v2.1.314–v2.1.325.

Sources: [Tenable CVE-2026-24052](https://www.tenable.com/cve/CVE-2026-24052) / [Wiz CVE-2026-24053](https://www.wiz.io/vulnerability-database/cve/cve-2026-24053) / [GitLab advisory CVE-2026-25723](https://advisories.gitlab.com/npm/@anthropic-ai/claude-code/CVE-2026-25723/) / [CyberSecurityNews](https://cybersecuritynews.com/?p=143811)

### 6.2 OX Security MCP CVEs — partial patch status, Windsurf still unresolved

No new advisory from OX Security found since May 2026. Patch status as of the most recent data:
- **LiteLLM (CVE-2026-30623):** Patched in v1.83.7-stable or later. If PerFiApp uses LiteLLM as a model router, verify the pinned version.
- **Windsurf (CVE-2026-30615):** Still listed as unresolved in May sources. If any developer uses Windsurf IDE, treat it as a risk surface for zero-click MCP prompt injection.
- **Other CVEs (Langchain-Chatchat, GPT Researcher, Agent Zero):** Patch status unconfirmed as of May 2026.

**For PerFiApp:** The MCP vetting checklist items from the June 2026 report remain mandatory: (a) authentication on every MCP server, (b) no unsanitized exec() on tool output. No change to verdict.

Source: [OX Security MCP supply chain advisory](https://www.ox.security/mcp-supply-chain/)

### 6.3 API version 2026-10-21 — sampling parameter removal is a silent breakage risk on SDK upgrades

Noted in Track 1 (1.6) but deserves a security/reliability flag: when upgrading to the new SDK major version, any code that sets `temperature`, `top_p`, or `top_k` will start returning 400 errors on all models simultaneously, not just Opus 4.7+. This is a regression risk that could silently break all agent calls if sampling parameter removal is not tested before upgrading the SDK.

**Action:** Before upgrading the SDK major version, search all agent definitions, API wrappers, and test fixtures for these parameter names and remove them.

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 RESOLVED: Canada RTR launched November 9, 2026

**Status changed from "Q4 2026 target, phased" to "LAUNCHED."**

Payments Canada launched the Real-Time Rail on **November 9, 2026**, with 24/7 instant settlement. Canada is the first G7 country to launch a real-time payment system with **mandatory centralized fraud services** at go-live. Key details:

- **Transaction limit at launch:** $100,000 CAD (to be re-evaluated as the system matures)
- **Initial participants:** Approximately 8 financial institutions; Payments Canada target is full transaction volumes from Q4 2026 initial participants by end of Q4 2026. Universal participation expected through 2027.
- **e-Transfer not replaced:** Interac e-Transfer continues; the RTR is an infrastructure layer that enables new payment products including direct account-to-account transfers, request-for-payment, and future open-banking write operations.
- **Bennett Jones advises Payments Canada** on the system (confirmed November 2026 client announcement).

**For PerFiApp:** This is the prerequisite for Phase 2 write-access open banking (payment initiation) and the Pay & Payment Optimization module. The architecture for real-time payment initiation can now be designed against a live, confirmed timeline. Update the PDR's Phase 2 notes from "RTR Q4 2026 target" to "RTR launched; universal access 2027." The $100K limit covers all practical personal-finance use cases at MVP.

Sources: [IBTimes — RTR launch](https://www.ibtimes.co.uk/canada-real-time-rail-instant-payments-launch-1831406) / [The Paypers — RTR launch](https://thepaypers.com/payments/news/payments-canada-launches-real-time-rail-for-247-instant-payments) / [Payments Canada FAQ](https://www.payments.ca/systems-services/payment-systems/real-time-rail-payment-system/frequently-asked-questions)

### 7.2 STATUS UPDATE: CDBA Phase 1 — draft regulations closed for comment, final regs pending

**Status changed from "2026 launch at risk" to "regulations drafted, comment period closed, awaiting finalization."**

The Government of Canada pre-published proposed Consumer-Driven Banking Regulations on **June 27, 2026**, in Canada Gazette Part I. The 60-day public comment period closed **August 26, 2026**. The regulations cover:
- Accreditation criteria for third-party service providers
- Consumer consent mechanics and liability framework
- Technical standards body designation
- Data scope (read-only Phase 1)
- Security, privacy, and enforcement

Final regulations have not been published as of this report's search data (most recent sources: August 2026). The Bank of Canada advisory committee notes from July 2026 indicate final regulations are "targeted for publication in late 2026 or early 2027," which means Phase 1 accreditation and launch likely slip to Q1 2027 at earliest.

**For PerFiApp:** The architecture advice is unchanged — design for OAuth-based data sharing, not screen scraping, and use Flinks for the pre-accreditation period (Flinks already has live OAuth programs with National Bank and EQ Bank). The regulatory framework is now clear enough that the security-reviewer agent should evaluate any planned data-sharing flow against the draft regulation's consent and liability provisions.

Sources: [Canada Gazette — draft regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [DLA Piper analysis](https://www.dlapiper.com/en-ca/insights/publications/2026/08/preparing-for-open-banking-key-takeaways-from-canadas-draft-consumer-driven-banking-regulations) / [McCarthy Tetrault](https://www.mccarthy.ca/en/insights/blogs/techlex/canadas-consumer-driven-banking-framework-takes-shape-with-draft-regulations)

### 7.3 STATUS UPDATE: FINTRAC — AMP penalties framework now fully active, final guidance pending

**Status changed from "new standard enacted, guidance to follow" to "framework active March 26, elevated penalties, guidance still being finalized."**

Bill C-12 AMP provisions are now active for violations on or after **March 26, 2026**. Key new facts:

- **Penalties up to 40x prior limits.** DLA Piper reports penalties can rise to up to 40 times the previous amounts under the new framework. FINTRAC has not yet published its updated penalty policy for the new tier.
- **Mandatory compliance agreements** are required for all cases where an AMP is imposed for a prescribed violation — not discretionary.
- **Compliance order = new violation.** Contravening a compliance order is now a distinct violation under PCMLTFA with its own penalties.
- **Universal enrolment** (every section 5 entity must enroll with FINTRAC) comes into force on a date to be fixed by Governor in Council order — not yet announced.
- **Final guidance still pending.** FINTRAC said it would publish updated guidance on what "reasonably designed, risk-based and effective" means in practice. As of August 2026 sources, this has not been published.

**For PerFiApp:** Any module that could trigger reporting-entity status (Cash Advance Lite, Phase 2 payment initiation) must have an AML program that is demonstrably effective, not just documented. The elevated penalty structure makes a documentation-only approach a material liability. The spec-lead and architect should consult specialized AML counsel before finalizing any cash advance or payment initiation design.

Sources: [DLA Piper — AMP framework](https://www.dlapiper.com/en/insights/publications/2026/05/canadas-new-administrative-monetary-penalties-framework-under-the-pcmltfa) / [Fasken — FINTRAC guidance](https://www.fasken.com/en/knowledge/2026/04/fintrac-provides-information-on-recent-changes-to-canadas-aml-regime) / [BLG — universal enrolment](https://www.blg.com/en/insights/2026/04/preparing-for-universal-enrolment-higher-penalties-and-fintrac-enforcement)

### 7.4 OSFI fast-track banking license pilot

New finding not in prior reports. In June 2026, OSFI introduced a **Targeted Fast-Track Framework** to expedite banking license applications from fintech companies. The framework is a 12-month pilot for a "clearer, more risk-based and predictable pathway to a banking licence." KOHO's CEO publicly welcomed the change.

**For PerFiApp:** This does not directly affect PerFiApp's development but is a competitive intelligence signal — it accelerates the path for KOHO (and potentially others like Wealthsimple or Neo) to become full Schedule I banks, increasing the competitive pressure in the neobank segment. It also signals OSFI's intent to increase competition in Canadian banking.

Source: [The Logic — OSFI fast-track](https://thelogic.co/news/osfi-fast-track-bank-licences/)

---

## Track 8 — Competitive & Product Intel

### 8.1 MAJOR: Wealthsimple launches "Penny" AI banking assistant — November 5, 2026

**New finding — highest-priority competitive development in this report.**

On November 5, 2026, Wealthsimple launched **Penny**, a conversational AI assistant, at its Wealthsimple Presents event in Toronto. This is the most significant competitive development since Monarch Money added its AI assistant and credit tracking (reported June 2026).

Key capabilities:
- Executes everyday financial actions: Interac e-transfers, bill payments, expense tracking, trades, portfolio rebalancing — all with user confirmation before execution.
- Operates only within the Wealthsimple platform (no open internet access, no third-party data).
- Broad rollout expected through late 2026 / early 2027.
- **ChatGPT and Claude integrations planned for early 2027** — Wealthsimple customers will be able to access their accounts through ChatGPT or Claude, with actions still requiring in-app approval.

**Wider context:** Canada's major banks (TD, RBC, BMO, CIBC, Scotiabank) have simultaneously moved to **restrict third-party AI agent access to customer accounts**, citing security concerns. This creates a structural advantage for Wealthsimple's first-party AI approach vs aggregation-dependent products.

**For PerFiApp:** This directly competes with PerFiApp's core AI coaching module and the Pay & Payment Optimization module. PerFiApp's remaining differentiators: (1) bilingual EN/FR (Penny is English-only at launch), (2) cross-institution aggregation (Penny works only within Wealthsimple), (3) Canadian-native credit monitoring and rewards optimization, (4) full module breadth (Credit & Coaching, Rewards & Loyalty, Bills & Subscriptions). The spec-lead should update the PDR competitive section and assess whether the aggregation-first position needs to be more prominently articulated given the bank restrictions on third-party agents.

**Security/privacy note:** The planned ChatGPT/Claude integration with read access to Wealthsimple data is worth monitoring — the consent and data-minimization model they use may set a precedent for how Canadian regulators view AI-to-financial-data integrations under the CDBA framework.

Sources: [BNN Bloomberg — Wealthsimple Penny](https://www.bnnbloomberg.ca/business/artificial-intelligence/2026/11/05/wealthsimple-launches-ai-banking-assistant-that-can-help-move-money-place-trades/) / [Betakit — Wealthsimple Presents](https://betakit.com/wealthsimple-unveils-ai-assistant-and-major-product-expansion-in-latest-showcase/) / [Advisor.ca — ChatGPT/Claude integration](https://www.advisor.ca/industry-news/wealthsimple-embraces-ai-with-new-chatbot-connections-to-chatgpt-and-claude/)

### 8.2 KOHO — banking license still pending; OSFI fast-track may help

KOHO raised $130M at $1.33B valuation in June 2026 (reported in prior report). Banking license application is still in progress as of the most recent sources (October 2026). No OSFI approval confirmation found. The new OSFI Targeted Fast-Track Framework (see 7.4) could accelerate KOHO's application, which the CEO has publicly stated is "imminent."

**For PerFiApp:** Monitor. If KOHO receives its Schedule I banking license, it transitions from a prepaid card + budgeting app to a full-stack financial institution — a materially different competitive position.

Sources: [The Logic — KOHO license next stage](https://arc-dev.theglobeandmail.com/business/article-online-bank-koho-financial-moves-to-next-stage-of-approval-toward/) / [FF News — KOHO Phase 2](https://ffnews.com/newsarticle/fintech/koho-advances-into-phase-two-of-canadian-banking-license/)

### 8.3 Neo Financial — competing head-to-head with KOHO on everyday banking

A Sacra report confirms Neo Financial's most direct rival on everyday banking and rewards is KOHO — both converging from different directions. No major funding or feature announcements found for Neo since the prior report.

---

## Recommended Next Steps

### Immediate (this week — by November 30)

1. **Migrate `claude-sonnet-4-5` before November 30.** Audit every agent definition, CI script, and fallback chain for `claude-sonnet-4-5` or `claude-sonnet-4-5-20250929`. Replace with `claude-sonnet-5-5`. Test in development before Monday. This model retires November 30 — requests will fail without migration.

2. **Update all agent model assignments to the 5.5 tier.** Recommended assignments: spec-lead and architect → `claude-fable-5-2`; implementer and code-reviewer → `claude-sonnet-5-5`; test-engineer → `claude-haiku-5-5`. Remove all Fable 5 emergency fallback chains — Fable 5.2 is fully available globally.

3. **Remove `temperature`, `top_p`, `top_k` from API calls and agent configs.** These are now removed API-wide in SDK major version 2026-10-21. Remove before upgrading any SDK to avoid a simultaneous breakage on all models.

4. **Update Claude Code to v2.1.331.** Picks up: CVE patches (CVE-2026-25725, CVE-2026-24052, CVE-2026-24053, CVE-2026-25723), file tool protection for `.credentials.json`, sandboxed Bash permission flow, `permissions.blockWritesOutsideWorkingDirectories`, and `permissions.denyInsteadOfPrompting`. Update all developer machines and CI.

### Short-term (this sprint)

5. **Migrate `claude-opus-4-5` before January 22, 2027.** Deprecated November 23. Replace with `claude-opus-5-5`. Not urgent this week but should be in the sprint before the holiday period.

6. **Verify `claude-haiku-4-5-20251001` status and migrate.** The "not before October 15" floor is past. If the model is still active, migrate proactively to `claude-haiku-5-5` (1M context vs 200K, comparable price).

7. **Enable `permissions.blockWritesOutsideWorkingDirectories` in project settings.json.** Prevents the implementer agent from accidentally writing financial configuration or secrets outside the project root. Add `{ "permissions": { "blockWritesOutsideWorkingDirectories": true } }` to `settings.json`.

8. **Migrate any MCP server built between June and October 2026 to stateless protocol.** The 2026-07-28 MCP spec is now stable — servers using session IDs must migrate. Add Tasks extension support for long-running financial data operations (Flinks account refresh, credit bureau pulls).

9. **Upgrade Spec Kit from v0.11.6 to v1.0.6.** First stable major version. Review the upgrade guide at `github.github.com/spec-kit/upgrade.html` for breaking changes before upgrading.

10. **Add DeepEval TypeScript Vitest integration to the test-engineer setup.** Wire into PerFiApp's existing TypeScript test pipeline. Use `deepeval generate` to synthesize initial bilingual (EN/FR) test datasets.

### Medium-term (next 4–6 weeks)

11. **Update PDR and competitive positioning for the Wealthsimple Penny launch.** Penny directly competes with PerFiApp's AI coaching module. Recommended spec-lead actions: (a) update PDR's competitive table for Wealthsimple, (b) assess whether bilingual (EN/FR) should be emphasized as a primary differentiator vs Penny's English-only launch, (c) evaluate cross-institution aggregation positioning given bank restrictions on third-party AI.

12. **Architect Phase 2 (payment initiation) now that RTR is live.** The November 9 RTR launch resolves the last major infrastructure prerequisite. Begin design work for the Pay & Payment Optimization module's payment initiation flow. Target: universal RTR access in 2027. The $100K transaction limit covers all personal-finance use cases.

13. **Evaluate cloud routines for the weekly researcher CI workflow.** The existing GitHub Actions research workflow can be supplemented or replaced with Claude Code cloud routines. Routines support event-driven triggers (not just cron), which could enable the researcher to run on PR events that touch `.specify/` or when new Anthropic model announcements are detected.

14. **Assess whether OSFI fast-track changes the KOHO competitive timeline.** If KOHO receives a banking license faster than expected, PerFiApp's differentiation from KOHO narrows. Consult the OSFI fast-track framework guidance when published (12-month pilot, so framework will be clear by mid-2027).

15. **Re-contact Flinks about live-data MCP server plans.** Still no live-data financial MCP server from Flinks. With CDBA Phase 1 regulations drafted, Flinks has more regulatory clarity for what a compliant MCP server offering would look like. A direct inquiry now — when the draft regulations are out and comment period is closed — is well-timed.

---

*Report generated 2026-11-24. All findings verified against primary sources where available. Delta report vs 2026-06-24 — prior findings not repeated unless status changed. Official model data verified directly against [platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview) and [platform.claude.com/docs/en/about-claude/model-deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations). RTR launch data from Payments Canada FAQ and secondary reporting. Competitive data from primary news sources (BNN Bloomberg, Betakit, The Logic). MCP specification status from modelcontextprotocol.io.*
