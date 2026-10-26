# PerFiApp Agent Research — 2026-10-26

**Fourth run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: (1) New API version 2026-10-21 breaking changes and SDK major-version bumps, (2) Claude 5.5 model family and Fable 5 restoration, (3) CDBA/RTR regulation timeline updates.

---

## Executive Summary

Three findings require action in the next seven days:

1. **Anthropic API version `2026-10-21` released October 21 — breaking changes effective now.** The new version formally removes `temperature`, `top_p`, and `top_k` from every model (not just Opus 4.7+). The TypeScript SDK is now v1.0.0 and the Python SDK is v2.0.0. Any PerFiApp code or CI script that starts an SDK client (even for tooling/testing) should target these new major versions from day one. Additional breaking changes: `document` blocks in assistant messages and `citations` in user messages now return 400 errors. Since PerFiApp has no deployed code yet, this is a "set up correctly from the start" action, not a migration fire.

2. **`claude-sonnet-4-5-20250929` deprecated September 30, retires November 30, 2026 — 35 days away.** If any agent file or CI script uses this model ID, it must be migrated now. Recommended replacement: `claude-sonnet-5-5`.

3. **`claude-haiku-4-5-20251001` minimum retirement date (October 15) has passed.** The deprecations page shows this model as "Active" but with retirement "not sooner than October 15, 2026" — a date now in the past. Anthropic has not yet announced the formal retirement date, but the next notification cycle could come any week. Migrate proactive routing to `claude-haiku-5-5`.

Beyond these, the Claude 5.5 family (Opus, Sonnet, Haiku — all three tiers launched September–October 2026) represents the most significant capability and cost change since the last report. The Fable 5 suspension is fully resolved. The MCP stateless spec is finalized. Spec Kit has jumped to v1.x with a major feature expansion.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **API version 2026-10-21 — sampling params removed, SDK major versions** | Model / API | All agents, CI | **Act — configure PerFiApp SDK targets to new major versions from first commit** |
| **claude-sonnet-4-5-20250929 retires November 30** | Model | Any agent using this ID | **Act — audit agent files and CI scripts; migrate to claude-sonnet-5-5** |
| **claude-haiku-4-5-20251001 minimum retirement date passed** | Model | researcher, debugger agents | **Act — proactively migrate to claude-haiku-5-5** |
| **STATUS CHANGE: Fable 5 suspension RESOLVED (July 1, 2026)** | Model | spec-lead, architect | **Adopt — claude-fable-5 and claude-fable-5-1 both active; re-evaluate for spec-lead** |
| **Claude 5.5 family: Opus 5.5, Sonnet 5.5, Haiku 5.5** | Model / cost | All agents | **Adopt — new recommended tier for all agents; Sonnet 5.5 near Opus quality at half price** |
| **Claude Duet research preview (Oct 21, 2026)** | Agent tooling | spec-lead (competitive intel) | **Monitor — proactive AI agent; competing with PerFiApp's AI coaching differentiator** |
| **Claude Mods system (v2.1.287+, Oct 1)** | Agent tooling | implementer, test-engineer | **Trial — JS/TS plugins for deep Claude Code customization; financial workflow hooks** |
| **claude_code.safety_event OTel telemetry (v2.1.307)** | Security | security-reviewer, CI | **Adopt — structured audit trail of all blocked tool calls; essential for financial app** |
| **Claude Code v2.1.310 current (Oct 23); plugin monitors on all cloud providers** | Toolchain | All agents | **Adopt — update and enable plugin monitors on Bedrock/Vertex/Foundry if used** |
| **MCP 2026-07-28 spec FINALIZED — stateless protocol** | Agent tooling | architect | **Act — design any custom MCP server (Flinks adapter) stateless from the start** |
| **Flinks MCP server = docs only, no banking-data adapter** | Agent tooling | architect | **Watch — docs MCP is useful for implementer; banking MCP still not available** |
| **New MCP CVEs: CVE-2026-33032 (CVSS 9.8, exploited), DuneSlide pair (CVSS 9.8 in Cursor), TypeScript SDK CVE-2026-25536** | Security | architect, code-reviewer | **Act — add new CVEs to MCP vetting checklist; audit TS SDK transport sharing** |
| **Anthropic Git MCP CVEs: CVE-2025-68143/144/145 (patched)** | Security | all developers | **Act — verify Anthropic Git MCP server is on patched version** |
| **CISA KEV: 11 AI-orchestration CVEs added 2026** | Security | security-reviewer | **Monitor — Langflow CVE-2026-33017 actively exploited** |
| **Spec Kit v1.2.3 (Oct 22) — major version jump from v0.11.6** | Toolchain | spec-lead, architect | **Adopt — GitHub extension, AttackTree catalog entry, PR assessment workflow** |
| **DeepEval v4.1.0 — AgentLoopDetectionMetric** | Agent quality | test-engineer | **Adopt — deterministic loop detection in financial agent traces** |
| **React Native 0.87 (Aug 11) — strict TypeScript API default, Node 22 minimum** | Toolchain | implementer | **Watch — verify Expo compatibility before starting mobile work** |
| **NestJS 12 roadmap — ESM migration, Vitest replacing Jest** | Toolchain | implementer, test-engineer | **Watch — likely releases before PerFiApp backend starts; design for ESM from day one** |
| **CDBA: Draft regulations published June 27; consultation ended August 26** | Compliance | architect, spec-lead | **Monitor — in-force within one year of Canada Gazette Part II; framework now in late draft** |
| **RTR: Q4 2026 target but delay notice exists** | Compliance | architect | **Monitor — Phase 2 payment initiation still targeting 2027; confirm RTR live before designing write flows** |
| **OSFI Guideline E-23 Model Risk Management (in force May 1, 2027)** | Compliance | spec-lead | **Watch — applies to institutions, not PerFiApp directly, but partners may require alignment** |
| **KOHO banking license: still pending; OSFI Fast-Track Framework introduced** | Competitive | spec-lead | **Monitor — approval could come in 2026; full-stack banking competitor getting closer** |
| **Wealthsimple AI Products team building proactive AI features (no launch yet)** | Competitive | spec-lead | **Monitor — no live feature, but direction is directly competitive with PerFiApp's AI coaching** |
| **Monarch Money: price increase, Goals 3.0, free tier removed; Plaid-only in Canada** | Competitive | spec-lead | **Monitor — Canadian connection quality gap (no Flinks) is a PerFiApp differentiator** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGE: Fable 5 suspension fully resolved

**Status changed from "Suspended" (June 24 report) to "Active."**

Anthropic restored access to `claude-fable-5` on July 1, 2026, after the US Department of Commerce lifted export controls. The model returned with new anti-cyber classifiers; when they fire, users receive a notification and get a response from `claude-opus-4-8` instead. By July 20, 2026, Fable 5 was included in Max and Team Premium subscriptions at 50% of normal usage limits; Pro users access it via usage credits plus a one-time $100 credit.

`claude-fable-5-1` and `claude-mythos-5-1` launched in September 2026 as the next iteration, both active until at least September 1, 2027.

**For PerFiApp:** The prior report's trial recommendation for spec-lead and architect now stands without caveats. With the full Claude 5.5 family now available (see below), re-evaluate which model offers the best cost/capability for spec-lead: `claude-fable-5-1` for constitutional reasoning and long-horizon spec work vs. `claude-opus-5-5` for balanced cost-capability. Verify the fallback chain is updated to `["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]` rather than the now-outdated Opus 4.x chain.

Sources: [Fable 5 returns — iGeeksBlog](https://www.igeeksblog.com/claude-fable-5-export-controls-lifted/) / [Fable 5 worldwide return](https://pasqualepillitteri.it/en/news/6981/claude-fable-5-returns-worldwide-anti-cyber-classifiers) / [Vercel AI Gateway restored](https://vercel.com/changelog/claude-fable-5-access-restored-on-ai-gateway) / [Deprecations page (official)](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.2 New model family: Claude 5.5 (Opus, Sonnet, Haiku) — all three tiers now available

Three new models launched in September–October 2026:

| Model | Launch | API ID | Price (input/output per MTok) | Retirement floor |
|---|---|---|---|---|
| Claude Opus 5.5 | Sep 22 | `claude-opus-5-5` | ~$4/$20 (unverified) | Sep 22, 2027 |
| Claude Sonnet 5.5 | Sep 28 | `claude-sonnet-5-5` | $2/$10 | Sep 28, 2027 |
| Claude Haiku 5.5 | Oct 7 | `claude-haiku-5-5` | $0.10/$0.50 | Oct 7, 2027 |

**Sonnet 5.5 benchmark context (third-party, unverified):** Terminal-Bench 4.0 score reportedly increased from 10.3% to 70.6% vs. Sonnet 5. Composite quality scores between Opus 5.5 and Sonnet 5.5 are close (within one point on multiple evaluators), with Sonnet at lower latency. At Sonnet 5.5's $2/$10 pricing vs. Opus 5.5's reported $4/$20, Sonnet 5.5 is the strong default for PerFiApp's mid-tier agents (implementer, test-engineer, code-reviewer). Verify Opus 5.5 pricing at [anthropic.com/pricing](https://www.anthropic.com/pricing) before agent file commits.

**Haiku 5.5 note:** At $0.10/$0.50 per MTok with a 1M-token context window, this is the obvious model for the researcher agent's weekly CI runs and for debugger's first-pass triage. Third-party sources note potential API compatibility changes from Haiku 4.5 — verify with the official migration guide.

**`claude-opus-5`** is also active (launched July 24, 2027 retirement floor), now one tier below Opus 5.5.

Sources: [Sonnet 5.5 guide](https://codersera.com/blog/claude-sonnet-5-5-complete-guide-2026/) / [Haiku 5.5 release](https://computingforgeeks.com/claude-haiku-5-5-released-features-benchmarks/) / [Model deprecations page (official)](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.3 CRITICAL: API version 2026-10-21 released — breaking changes in effect

**This is a new API major version, released October 21, 2026 — five days ago.**

The new version changes the official SDK major versions:
- TypeScript: `@anthropic-ai/sdk` → v1.0.0
- Python: `anthropic` → v2.0.0
- These SDKs send `anthropic-version: 2026-10-21` automatically

**Breaking changes in 2026-10-21:**

1. **Sampling parameters fully removed.** `temperature`, `top_p`, and `top_k` now return 400 errors on ALL models at ANY value — even defaults. The prior report noted this for Opus 4.7+; 2026-10-21 extends the ban to every model including Sonnet 4.6. Earlier SDK versions using API version 2023-06-01 still accept these parameters for older models — so this is a new-SDK breaking change, not a retroactive one.

2. **Document blocks in assistant messages return 400.** Send documents in user messages only.

3. **Citations in user messages return 400.** Remove `citations` arrays from text blocks in user messages.

4. **TypeScript `MessageParam` is now a union.** `MessageParam` splits into `UserMessageParam | AssistantMessageParam | SystemMessageParam`. Code that handles a message of any role needs a role check before operating on content. This affects any TypeScript code that passes messages to the API.

5. **Admin API field renames.** `roles` → `role_ids`, `group_id` → `rbac_group_id`, `workspace_id` → `scope` on API keys.

**For PerFiApp:** No deployed code exists yet, so there is no migration emergency. The immediate action is: configure all future PerFiApp code and any toolchain scripts to use `@anthropic-ai/sdk` v1.0.0 and never set sampling parameters. Document this in the constitution or a developer setup guide before the first implementer session.

Source: [API migration 2026-10-21 (official)](https://platform.claude.com/docs/en/api/migration-2026-10-21)

### 1.4 URGENT: claude-sonnet-4-5-20250929 retires November 30, 2026 (35 days)

Deprecated September 30, 2026. Retires in 35 days. Recommended replacement: `claude-sonnet-5-5`.

Scan all `.claude/agents/*.md` frontmatter and CI workflow files for `claude-sonnet-4-5` or `claude-sonnet-4-5-20250929`. This model ID was not in the prior report's focus but may have been added to agent files since.

### 1.5 WATCH: claude-haiku-4-5-20251001 past minimum retirement threshold

The deprecations page still shows `claude-haiku-4-5-20251001` as "Active" with retirement "not sooner than October 15, 2026." That date passed 11 days ago. Anthropic has not yet announced a formal retirement, but the next notification cycle may announce one with 60 days' notice. The researcher agent and other low-cost routing should migrate proactively to `claude-haiku-5-5`.

### 1.6 Updated model status table (October 26, 2026)

| API Model ID | Status | Notes |
|---|---|---|
| `claude-fable-5-1` | Active | Not before Sep 1, 2027 |
| `claude-mythos-5-1` | Active | Not before Sep 1, 2027 |
| `claude-fable-5` | Active | Restored Jul 1; not before Jun 9, 2027 |
| `claude-mythos-5` | Active | Not before Jun 9, 2027 |
| `claude-opus-5-5` | Active | Not before Sep 22, 2027 |
| `claude-opus-5` | Active | Not before Jul 24, 2027 |
| `claude-opus-4-8` | Active | Not before May 28, 2027 |
| `claude-sonnet-5-5` | Active | Not before Sep 28, 2027 |
| `claude-sonnet-5` | Active | Not before Jun 30, 2027 |
| `claude-sonnet-4-6` | Active | Not before Feb 17, 2027 |
| `claude-sonnet-4-5-20250929` | **Deprecated** | **Retires Nov 30, 2026** |
| `claude-haiku-5-5` | Active | Not before Oct 7, 2027 |
| `claude-haiku-4-5-20251001` | Active | Past Oct 15 minimum — watch |
| `claude-opus-4-1-20250805` | Retired | Aug 5, 2026 (resolved) |

Source: [Model deprecations page (official)](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.7 Claude Duet research preview (October 21, 2026)

Anthropic launched a proactive AI agent called Claude Duet as a research preview on October 21, available by waitlist to US Pro and Max subscribers. It runs on Opus 5.5, operates as a standalone iOS/Android app and on claude.ai, and sends proactive briefings and takes background tasks. It includes a credential isolation layer and prompt-injection defenses per Anthropic's description.

**For PerFiApp:** No immediate team impact — there is no Duet API. The product context matters: Duet is a proactive personal-finance-adjacent assistant that can build dashboards and generate forecasts. If it launches in Canada (no timeline), it competes with PerFiApp's AI coaching module. The security architecture (credential isolation, action-approval classifier) is worth studying as a reference design for PerFiApp's own financial agent safeguards.

Sources: [Claude Duet — iPhone in Canada](https://iphoneincanada.ca/2026/10/21/claude-duet-proactive-ai-agent-app) / [Newsbytes announcement](https://www.newsbytesapp.com/news/science/anthropic-announces-claude-duet-ai-assistant-on-october-22-2026/tldr)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Agent SDK billing split — still paused (no change)

No new developments since June 15 pause. The split has not been rescheduled. The August 2026 optional-credit addition (users can prepay at API rates after hitting subscription limits) is separate and voluntary. Continue tracking Agent SDK token consumption in Claude Console to model eventual cost impact.

### 2.2 Cost model update with Claude 5.5 tier

The introduction of Haiku 5.5 at $0.10/$0.50 per MTok makes a tiered routing strategy significantly more economical. Concrete guidance for PerFiApp agent files (approximate, pending Opus 5.5 price verification):

| Agent | Recommended model | Reasoning |
|---|---|---|
| spec-lead | `claude-fable-5-1` | Constitutional/spec reasoning justifies premium |
| architect | `claude-opus-5-5` | Architectural design needs top-tier capability |
| implementer | `claude-sonnet-5-5` | Cost-effective for iterative code generation |
| test-engineer | `claude-sonnet-5-5` | Test synthesis benefits from reasoning, not pure speed |
| code-reviewer | `claude-sonnet-5-5` | Consistent quality needed; Sonnet 5.5 near-Opus |
| security-reviewer | `claude-opus-5-5` | Security analysis requires top capability; no cost savings justified |
| debugger | `claude-sonnet-5-5` | First-pass debugging; escalate to Opus manually |
| researcher | `claude-haiku-5-5` | Weekly CI scans; $0.10/$0.50 MTok is negligible cost |

### 2.3 promptCacheTtl per-subagent setting (Claude Code v2.1.243)

Added August 22–25, 2026. The `promptCacheTtl` setting in Claude Code now accepts separate values for the main conversation and subagents. For PerFiApp's implementer running multi-step financial workflows, setting a longer TTL for the main conversation system prompt and a shorter TTL for subagent calls reduces token waste when subagents have shorter useful cache lifetimes.

Source: [Classmethod v2.1.243 article](https://dev.classmethod.jp/en/articles/20260825-cc-updates-v2-1-245/)

---

## Track 3 — Agent Tooling

### 3.1 Claude Code versions v2.1.188 through v2.1.310 — key changes since June 24

The changelog now runs from v2.1.188 to v2.1.310 (October 23, 2026). The most actionable items for PerFiApp:

**Claude Mods system (v2.1.287, October 1, 2026)**

Mods are JavaScript or TypeScript plugins that run inside the Claude Code process and fire on every internal event. Unlike hooks and MCP servers, Mods can modify interface elements. They are enabled by default from v2.1.287. Key Mods features added since:

- **v2.1.304:** `tool.check` hooks can return `decider: "person"`, forcing only a human permission dialog (not another agent) to approve certain tool calls. This is directly useful for financial actions: an implementer Mod could require human approval before any tool call touching payment credentials or production config.
- **v2.1.300:** `prompt.change` hook fires on recalled history and undo events; `$.ui.view({ agentId })` shows an agent's transcript from within another agent's context.
- **v2.1.302:** `CLAUDE_CODE_AUTO_MODE_MODEL` environment variable sets the model for auto-mode sessions separately from interactive sessions — allows CI/CD runs to use a cheaper model without changing the interactive default.

**Security hardening (v2.1.299)**

- `mcp__<server>` allow rules now match only the named server — previously a rule for `mcp__flinks` could have matched `mcp__flinks-internal` inadvertently.
- HTTP redirects are no longer followed for connector proxies and cloud MCP traffic — blocks SSRF-style attacks via redirect chains in MCP responses.
- Plugin hooks refuse returned values nested deeper than 28,000 levels — prevents JSON bomb attacks from malicious MCP tool outputs.

**`claude_code.safety_event` OpenTelemetry event (v2.1.307)**

Every tool call that a permission rule, auto-mode check, safety check, hook, or sandbox blocks is now emitted as an OTel span. For PerFiApp, this is the foundation of a financial-grade audit trail: export safety events to a log aggregator and alert on blocked actions involving payment tool calls or credential file paths.

**`ultrareview` workspace trust requirement (v2.1.309)**

`claude ultrareview` now requires workspace trust before executing. CI scripts that use ultrareview must pass `--trust-workspace` or set `CLAUDE_CODE_DISABLE_ULTRAREVIEW_TRUST_CHECK=1`. Relevant for the automated PR review workflow.

**Linux namespace sandbox (v2.1.305)**

New `sandbox.allowNestedUserNamespaces` setting allows sandboxed commands to create user namespaces (needed for Chromium-based E2E testing or rootless Podman). Changelog warns this weakens sandbox file protections — for PerFiApp, only enable this setting in developer environments doing Expo web testing, never in financial-data-processing containers.

**Plugin monitors on Bedrock, Vertex, Foundry (v2.1.310)**

Plugin-based monitors now work on all cloud providers. If PerFiApp uses Bedrock or Vertex for production agent runs, plugin monitors for usage alerting, cost tracking, and safety events now work in those environments.

**Fork subagents on by default (v2.1.302)**

`subagent_type: "fork"` subagents are now on by default outside the terminal. The AGENT_TEAM doc's reference to explicit team spawning still works, but the default behavior has changed. Disable with `CLAUDE_CODE_FORK_SUBAGENT=0` if the fork behavior causes unexpected behavior in CI.

Current version: v2.1.310 (October 23, 2026). Source: [Claude Code changelog (official)](https://code.claude.com/docs/en/changelog)

### 3.2 Flinks MCP server — docs adapter confirmed; banking-data adapter still absent

Flinks has published an official MCP server at `docs.flinks.com/guides/ai/mcp-server-setup`. This server gives AI coding assistants (Claude Code, Cursor, others) access to Flinks' API documentation — useful for the implementer agent when building the Flinks integration. It is not a banking-data proxy (no account/transaction data flows through it).

**For PerFiApp:** Add the Flinks docs MCP server to the implementer agent's MCP list when starting the data aggregation module. This gives the implementer agent accurate, up-to-date Flinks API references without web search overhead. It does not resolve the gap of a banking-data MCP adapter — that still does not exist. The prior report's recommendation to contact Flinks about an MCP adapter roadmap stands.

**Security note:** This is a read-only documentation server. No financial credentials are involved. Low risk. Vet against the MCP vetting checklist before adopting, but expected to pass.

Source: [Flinks MCP server setup guide](https://docs.flinks.com/guides/ai/mcp-server-setup)

### 3.3 MCP 2026-07-28 specification FINALIZED

The stateless MCP spec shipped July 28, 2026 as planned. Key confirmed changes:

- Session handshake (`initialize`/`initialized`) removed; no more `Mcp-Session-Id` header
- Each request carries its own protocol version and capability data
- New `server/discover` method for upfront capability negotiation without a live connection
- Server can run behind a plain round-robin load balancer
- `Roots`, `Sampling`, and `Logging` deprecated with 12-month removal runway
- Extensions framework and Tasks formalized
- Formal deprecation policy: Active → Deprecated → Removed with minimum 12-month window

**For PerFiApp:** Any custom MCP server (e.g., Flinks banking adapter, Equifax credit MCP) must be designed stateless from the first commit. The 12-month removal runway on `Roots` and `Sampling` means servers built using those features before the final spec have until mid-2027 to migrate.

Sources: [MCP spec 2026-07-28 blog](https://blog.mcpservers.org/posts/mcp-spec-2026-07-28) / [Xenospectrum analysis](https://xenospectrum.com/en/mcp-2026-stateless-release/) / [Official RC announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval v4.1.0 — AgentLoopDetectionMetric and ToolPermissionMetric

DeepEval added two new metrics relevant to PerFiApp's financial agent workflows:

**`AgentLoopDetectionMetric` (deterministic, not LLM-judged)**
Detects when an agent trace enters a loop — repeating the same tool call sequence without progress. For PerFiApp, this catches an implementer agent that loops between `fetchTransactions` → `categorize` → `fetchTransactions` without making forward progress. Deterministic means it does not consume tokens and gives consistent results.

**`ToolPermissionMetric` (deterministic)**
Checks that an agent only called tools it was authorized to call based on its permission configuration. For a financial app, this verifies the implementer agent never called a payment-execution tool (if one existed) during a read-only spec-review session.

**MCP metrics fix:** `MCP metrics` now use `tools_called` field correctly — a bug fix affecting evaluations of MCP-tool-heavy workflows like the Flinks data-fetching chain.

**For PerFiApp:** Add `AgentLoopDetectionMetric` to the test-engineer agent's eval suite for all financial workflow agents. The loop detector is especially relevant for multi-step workflows involving Plaid/Flinks pagination (an agent can easily loop if error handling is missing). Add `ToolPermissionMetric` to verify security boundaries in the implementer agent's tool access profile.

Sources: [newreleases.io v4.1.0](https://newreleases.io/project/github/confident-ai/deepeval/release/v4.1.0) / [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v1.2.3 (October 22, 2026) — major version jump from v0.11.6

Spec Kit has jumped from v0.11.6 (covered in the June 24 report) through an entire 1.x series. Current latest: v1.2.3 (October 22, 2026).

Key additions since v0.11.6:

**v1.0.13 / v1.1.0 — GitHub extension and `taskstoissues` deprecation (September–October 2026)**
The core `/speckit.taskstoissues` command is deprecated. Its replacement is the bundled `github` extension, installed separately. For PerFiApp's workflow where spec tasks are converted to GitHub issues, this is a behavioral change: install `github` extension and update any workflow scripts that call `taskstoissues` directly.

**v1.1.1 / v1.1.2 — Artifact MCP tools and version MCP tools**
First-class MCP server tools for listing artifacts and versions — enables the implementer agent to query spec artifacts directly via MCP rather than file-system reads. This integrates tightly with Spec Kit's plan/task artifacts.

**v1.1.3 — AttackTree extension in community catalog**
An AttackTree security extension is now installable from the community catalog. For PerFiApp's financial modules (payment flows, credit data access, banking aggregation), attack tree analysis during spec phase is directly applicable. The security-reviewer agent could use this to generate threat models before implementation.

**v1.2.0 — Built-in GitHub workflow step and maintainer PR description assessment**
The architect and spec-lead can now trigger a PR description assessment from within a workflow, and GitHub actions are a first-class workflow step type.

**v1.2.3 — `.presetignore` and workflow MCP inventory**
`.presetignore` lets repos exclude certain preset files from Spec Kit's discovery. Workflow MCP inventory documents which MCP tools a workflow uses — useful for security review of spec workflows.

**Install:** `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.2.3` (verify exact install path against official docs, as the v1.x module structure may have changed).

Sources: [newreleases.io v0.12.6](https://newreleases.io/project/github/github/spec-kit/release/v0.12.6) / [GitHub spec-kit releases (official)](https://github.com/github/spec-kit/releases)

### 5.2 React Native 0.87 (August 11, 2026) — strict TypeScript API by default

React Native 0.87 shipped August 11, 2026 with two breaking default changes relevant to PerFiApp:

- **Strict TypeScript API is now the default.** This aligns with PerFiApp's `strict` mode TypeScript requirement but may affect React Native community packages that used looser types.
- **Node.js 22 is the minimum.** Verify PerFiApp's CI and developer environment spec targets Node 22.
- Also: experimental SwiftPM support, AGP 9, Kotlin 2.0, Metro 0.87.

Expo SDK 56 (May 2026) bundled React Native 0.85. Expo SDK 57 is reported by some sources as launched June 30 with React Native 0.86, but was not confirmed on Expo's official SDK 56 page. Before starting the `apps/mobile` workspace, verify current Expo SDK version and which React Native it bundles, since 0.87's strict TypeScript change could affect the Expo SDK.

Sources: [tech-insider.org RN 0.87](https://tech-insider.org/fi/react-native-opas-tutorial-mobiilisovellus-12-askelta-2026/) / [Expo SDK 56 page (official)](https://expo.dev/sdk/56)

### 5.3 NestJS 12 roadmap — ESM migration and Vitest

NestJS 11 is the current stable release (various patch versions in 11.1.x). The NestJS team has published a draft for v12.0.0 targeting "early Q3 2026" (i.e., now potentially delayed to Q4 2026 or beyond). Key v12 changes:

- Every official NestJS package migrates from CommonJS to ESM
- Jest replaced with Vitest as the default test runner

**For PerFiApp:** Since `apps/api` has not been started, design the NestJS backend assuming ESM and Vitest from day one. Do not start the backend with CommonJS module resolution or Jest assumptions — the v12 migration from CJS to ESM is non-trivial if done retroactively. Check the NestJS releases page before starting the API workspace to confirm whether v12 is available.

Source: [InfoQ NestJS 12 roadmap](https://infoq.com/news/2026/04/nestjs-12-roadmap-esm/)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 New MCP CVEs since June 24, 2026 — CVSS 9.8 exploitation confirmed

**CVE-2026-33032 — nginx-ui MCP endpoint (CVSS 9.8) — exploited in the wild**
Missing authentication on command-execution requests. This is a direct realization of the architectural pattern identified in CVE-2026-32211 (the prior report's Azure MCP finding) — another server that shipped without authentication on a privileged endpoint. Confirmed exploitation in the wild. Adds to the vetting checklist: authentication is mandatory before any command execution endpoint.

**CVE-2026-50548 and CVE-2026-50549 — Cursor (CVSS 9.8 each, "DuneSlide" pair)**
Terminal sandbox escape via injected text. An attacker-controlled MCP tool response can inject text that causes Cursor's terminal sandbox to allow arbitrary command execution. Not directly a Claude Code CVE, but the attack surface (MCP tool output → terminal sandbox bypass) applies to any environment where MCP tool output reaches a terminal emulator. For PerFiApp: if any MCP server handles user-controlled financial data (e.g., transaction descriptions, account names), that data must be sanitized before rendering in any terminal/log context.

**CVE-2025-68143, CVE-2025-68144, CVE-2025-68145 — Anthropic Git MCP server (patched)**
Three CVEs in Anthropic's own Git MCP server: path traversal, argument injection, and repository scoping bypass. All patched. Verify the Git MCP server is updated if it is in use in any PerFiApp developer environment.

**CVE-2026-25536 — Anthropic TypeScript SDK (CVSS 7.1) — cross-client response leakage**
When one transport is shared across multiple MCP clients, responses can leak between clients. This affects architectures where multiple simultaneous tool calls share a single underlying connection. For PerFiApp: do not share a single transport instance across multiple agent sessions, especially if those sessions belong to different users. This is a multi-tenant risk if PerFiApp ever runs a shared MCP gateway.

**CISA KEV: 11 AI-orchestration CVEs added in 2026**
CISA has added 11 AI-orchestration vulnerabilities to the Known Exploited Vulnerabilities catalog. Langflow CVE-2026-33017 saw active scanning immediately after advisory publication.

**Updated MCP vetting checklist additions (combine with prior report's checklist):**
- Does this server require authentication on ALL endpoints including command execution? (CVE-2026-33032, CVE-2026-32211)
- Does the server sanitize MCP tool output before it reaches any terminal context? (CVE-2026-50548/50549)
- If this server uses the Anthropic TypeScript SDK: is the transport private to one agent session? (CVE-2026-25536)
- Is the Anthropic Git MCP server version patched against CVE-2025-68143/144/145?

Sources: [Practical DevSecOps MCP statistics 2026](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/) / [Authzed MCP breach timeline](https://authzed.com/blog/timeline-mcp-breaches) / [Q3 2026 MCP security roundup](https://the-agent-report.com/2026/07/mcp-security-landscape-2026-vulnerabilities-mitigations/)

### 6.2 Claude Code v2.1.299 MCP allow-rule hardening

Two security fixes in v2.1.299 directly affect PerFiApp's MCP configuration:

- `mcp__<server>` allow rules now match only the exact named server. Previously a rule for `mcp__flinks` could unintentionally match `mcp__flinks-dev` or `mcp__flinks-internal`. Review any existing allow rules for inadvertent over-matching.
- HTTP redirects are no longer followed for connector proxies and cloud MCP traffic. This blocks an attack where a malicious MCP response redirects a tool call to an attacker-controlled endpoint.

Source: [Claude Code changelog (official)](https://code.claude.com/docs/en/changelog)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS CHANGE: CDBA draft regulations published — framework entering final stage

**Status changed from "information-gathering" to "published regulations in consultation."**

Draft regulations under Bill C-15's Consumer-Driven Banking Act were published June 27, 2026 in the Canada Gazette, Part I. The public consultation period ended August 26, 2026.

Key developments:
- **Bank of Canada confirmed as regulator** (replacing FCAC as lead overseer — some older sources still name FCAC)
- **Single national review pathway confirmed:** one accreditation covering both open banking and real-time payments
- **In-force timeline:** Regulations are intended to come into force within one year of Canada Gazette Part II publication (the final publication, after consultation). That publication has not yet occurred, so this is a 2027 target.
- **Phase 1 (read access) not yet broadly available** as a national framework; existing programs (National Bank via Flinks, EQ Bank) remain "preview" implementations
- **Phase 2 (write access / payment initiation)** still targeted for mid-2027, contingent on RTR universal availability

**For PerFiApp:** The architecture direction remains unchanged (OAuth-only data access via Flinks or future accredited providers). The timeline pressure has slightly reduced — Phase 1 as a mandatory national framework is now more likely in 2027 than 2026. However, the draft regulations confirm the technical requirements PerFiApp must meet when it launches, and the one-year clock from Canada Gazette Part II starts whenever that final publication occurs. If Part II publishes in Q1 2027, PerFiApp would need CDBA-compliant data access by Q1 2028 to be compliant at launch.

Sources: [Flinks CDBA 2026 blog](https://www.flinks.com/blog/open-banking-canada-2026-launch-fintech-institutions) / [Open Banking Tracker Canada](https://www.openbankingtracker.com/country/canada) / [Norton Rose Fulbright analysis](https://www.nortonrosefulbright.com/en/knowledge/publications/83263b6e/open-banking-in-canada-key-insights-into-the-proposed-regulations) / [Mozaic Finance overview](https://mozaicfinance.com/blog/open-banking-canada-what-changes-2026/)

### 7.2 STATUS UPDATE: RTR — Q4 2026 target with delay risk

Payments Canada's Q3 2026 update reports that Industry Solution Assurance testing is now underway, with the first Direct-to-Exchange participants targeting a Q4 2026 live date. However, a separate Payments Canada notice states "current delivery delays, unrelated to the exchange technology components, are impacting the launch date." This conflict means the Q4 target remains official but is at risk.

**RTR By-law published:** The RTR By-law was published in the Canada Gazette and came into force August 24, 2026. This is a governance milestone, not the system launch.

**For PerFiApp:** The architect should not design Phase 2 payment initiation flows assuming RTR is live before confirmation from Payments Canada. Monitor the Q4 2026 Payments Canada quarterly update (expected November 2026) for a revised launch timeline. The Phase 2 target of mid-2027 remains reasonable as a planning assumption, but the 2027 universal availability date for RTR is more conservative.

Sources: [Payments Canada Q3 RTR update](https://www.payments.ca/canadas-real-time-rail-quarterly-update-jude-pinto-2026-q3) / [McCarthy Tétrault RTR By-law post](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published)

### 7.3 OSFI Guideline E-23 — Model Risk Management in force May 1, 2027

OSFI's final Guideline E-23 on Model Risk Management covers AI and machine learning models used by federally regulated financial institutions. It comes into force May 1, 2027.

**For PerFiApp:** PerFiApp is not yet a federally regulated institution, so E-23 does not apply directly. However:
- If PerFiApp integrates with bank partners (e.g., white-labeling, data sharing agreements), those banks will be building E-23 frameworks during 2026 and may impose contractual model-risk requirements on fintech partners.
- KOHO, when it receives a banking license, will be subject to E-23. Its AI features will be constrained accordingly.
- PerFiApp's AI coaching and credit optimization recommendations qualify as "models" under E-23's definition. Designing with documentation, validation, and monitoring from the start is good practice regardless of OSFI obligation.

Source: [OSFI E-23 overview](https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/model-risk-management-guideline)

### 7.4 FINTRAC enforcement posture hardening

FINTRAC has removed language about "willingness to work with reporting entities" before imposing Administrative Monetary Penalties. This signals a more enforcement-first posture for 2026 AML violations. The "reasonably designed, risk-based, effective" standard from the prior report's PCMLTFA amendments remains the applicable compliance bar.

**For PerFiApp:** No change to the prior report's guidance. If any module triggers reporting-entity status, the AML program must work in practice, not just exist on paper. FINTRAC's harder enforcement posture makes this more important, not less.

### 7.5 Bill C-27 (federal privacy reform) — remains dead

Bill C-27, the Consumer Privacy Protection Act that would have replaced PIPEDA, died when Parliament prorogued in January 2025 and has not been revived. Canada continues to operate under PIPEDA federally, with Quebec Law 25 as the stronger provincial regime. No federal AI framework legislation is in force.

**For PerFiApp:** Design for Quebec Law 25 compliance (Privacy Impact Assessments, Data Protection Officer designation for applicable size thresholds, explicit consent for AI decision-making affecting Quebec users) as the highest applicable bar. PIPEDA remains the federal floor. Monitor the Parliament of Canada bill tracker for any C-27 successor.

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO banking license — still pending, OSFI Fast-Track Framework introduced

KOHO has raised its capital ($130M, $1.33B valuation, June 11) and is waiting for OSFI/ministerial approval. No license has been granted. In June 2026, OSFI introduced a Targeted Fast-Track Framework for fintech bank applicants, promising initial feedback within 4 weeks and a full risk review within 12 months, with a subsequent Minister of Finance decision within 3 months. This could compress KOHO's remaining timeline.

KOHO CEO mentioned a telco product "in the next six months" — this would be a significant expansion into mobile services bundled with financial accounts. No formal announcement exists.

**For PerFiApp:** A licensed KOHO bank would be a full-stack competitor: banking, spending, savings, credit, and potentially telecom, at 2.5M users. PerFiApp's differentiation (bilingual AI coaching, credit optimization, aggregation-first, comprehensive rewards module) is defensible only while it executes faster than KOHO can build equivalent AI features post-licensing.

Sources: [BetaKit KOHO banking licence](https://betakit.com/koho-on-the-verge-of-securing-a-banking-licence-and-months-from-launching-telco-product-ceo-says/) / [NCFA KOHO profile](https://ncfacanada.org/?p=81534)

### 8.2 Wealthsimple — AI products team hiring, no launched features yet

Wealthsimple's AI Products team is actively hiring (July 2026 job posting) to build "proactive and personalized" client-facing AI experiences. No consumer-facing AI feature has been announced. The company hit $124.8B AUA in Q1 2026 with 3.4M clients. CIRO approved Wealthsimple for prediction market contracts in March 2026.

**For PerFiApp:** Wealthsimple's scale (3.4M vs. PerFiApp's zero) and capital advantage mean a launched AI feature from Wealthsimple would reach millions of users quickly. The 2026 window to establish PerFiApp's AI coaching differentiation before Wealthsimple launches is real but narrowing. The spec-lead should prioritize getting the core AI coaching module into spec and plan before Q1 2027.

Source: [Wealthsimple AI job posting](https://careers.inovia.vc/companies/wealthsimple/jobs/85629332-staff-product-manager-ai-products) / [Wealthsimple Q1 2026 results](https://www.newsfilecorp.com/release/296531/Wealthsimple-Reports-Record-Q1-Growth-Driven-by-BestEver-RRSP-Season)

### 8.3 Monarch Money — price increase, free tier removed, Plaid-only in Canada

Monarch raised its top-tier price from $14.99 to $16.67/month in May 2026, removed its free tier, and launched Goals 3.0. The AI Assistant and credit score tracking features from the June 24 report are confirmed live.

**The PerFiApp differentiator that's emerging:** Monarch connects to Canadian banks only through Plaid, Mastercard, and MX — not Flinks. Sources note that "some Canadian banks are hard to connect or keep synced" through Monarch's connectors. Flinks' deeper relationships with Canadian institutions (National Bank live OAuth, EQ Bank, FirstOntario) give a Flinks-native app like PerFiApp a structural Canadian data quality advantage over Monarch. This should be a named differentiator in the PDR.

Sources: [Monarch Money price increase](https://costbench.com/changelog/monarch-money-price-increase-2026-05/) / [FinlyWealth Monarch alternative](https://www.finlywealth.com/money/monarch-money-alternative) / [Monarch What's New](https://partners.monarchmoney.com/whats-new)

---

## Recommended Next Steps

### Immediate (this week, before November 1)

1. **Audit agent files for `claude-sonnet-4-5-20250929`.** This model retires November 30. Scan `.claude/agents/*.md`, `.github/workflows/`, and any test fixtures. Replace with `claude-sonnet-5-5`.

2. **Migrate researcher agent to `claude-haiku-5-5`.** The `claude-haiku-4-5-20251001` minimum retirement date has passed. Switch the researcher agent (and any other cost-sensitive routing) to `claude-haiku-5-5` proactively.

3. **Pin SDK versions to new majors in any tooling/package.json.** Set `@anthropic-ai/sdk` to `^1.0.0` and ensure no code passes `temperature`, `top_p`, or `top_k`. These parameters are formally removed in API version 2026-10-21. Since PerFiApp has no deployed code, this is a "configure once, correctly" action.

4. **Update Claude Code to v2.1.310** (from v2.1.187). Picks up: MCP allow-rule hardening, HTTP redirect blocking for MCP traffic, `claude_code.safety_event` OTel telemetry, `ultrareview` workspace trust enforcement, and the full Mods system.

### Short-term (this sprint)

5. **Upgrade Spec Kit to v1.2.3** (from v0.11.6). Install the `github` extension (replacement for deprecated `taskstoissues`). Evaluate the AttackTree extension from the community catalog for security threat modeling on PerFiApp's payment and credit modules.

6. **Wire `claude_code.safety_event` OTel telemetry into CI.** Export safety events from the implementer agent's CI runs to a log store. Alert on blocked tool calls involving credential paths. This provides a financial-grade audit trail with zero code changes — just OTel configuration.

7. **Add four new items to the MCP vetting checklist:** (a) Authentication on ALL endpoints including command execution. (b) Sanitization of MCP tool output before terminal rendering (DuneSlide pattern). (c) Private transport per agent session, not shared across users (CVE-2026-25536). (d) Anthropic Git MCP server version checked against CVE-2025-68143/144/145.

8. **Evaluate Fable 5-1 for spec-lead.** The suspension is fully resolved. Trial `claude-fable-5-1` for the spec-lead agent on constitutional amendments and complex spec generation tasks — it is designed for long-horizon reasoning and competes with Opus 5.5.

### Medium-term (next 4–6 weeks)

9. **Update agent file model assignments across the roster.** Adopt the tiered model table from Track 2.2 above: Fable 5.1 / Opus 5.5 for reasoning-heavy roles (spec-lead, architect, security-reviewer), Sonnet 5.5 for implementer/test-engineer/code-reviewer, Haiku 5.5 for researcher and first-pass debugger.

10. **Verify NestJS 12 status before starting the API workspace.** Check [github.com/nestjs/nest/releases](https://github.com/nestjs/nest/releases) for whether v12 has launched. If it has, scaffold `apps/api` with ESM and Vitest from day one. If still v11, design for the ESM migration path with no CommonJS assumptions.

11. **Add the Flinks docs MCP server to the implementer agent's configuration.** When starting the data aggregation module, `docs.flinks.com/guides/ai/mcp-server-setup` gives the implementer accurate API references. Vet against the updated MCP checklist first.

12. **Evaluate Claude Mods for a PerFiApp-specific financial safety hook.** The `tool.check` Mod hook with `decider: "person"` from v2.1.304 allows PerFiApp to require human approval before any tool call matching certain patterns (e.g., tool calls touching payment credentials, production API keys, or PII fields). Design a lightweight PerFiApp Mod that intercepts these patterns and forces human confirmation.

13. **Update the PDR competitive section to name Flinks connectivity as a differentiator vs. Monarch.** Monarch's Plaid-only Canadian connectivity has documented connection reliability issues. Flinks' direct bank relationships are a product differentiator worth naming explicitly in positioning materials.

14. **Monitor RTR Q4 2026 quarterly update.** Payments Canada's Q4 update (expected November 2026) should clarify whether the Q4 live date holds or slips. The architecture decision for PerFiApp's Phase 2 payment initiation flows depends on RTR timeline confirmation. Do not finalize Phase 2 technical design until RTR status is confirmed.

---

*Report generated 2026-10-26. All findings verified against primary sources where possible; third-party sources on model pricing noted as unverified pending confirmation at anthropic.com/pricing. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
