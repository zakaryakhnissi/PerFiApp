# PerFiApp Agent Research — 2026-09-14

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: Fable 5 export-control resolution, Opus 4.1 retirement outcome, MCP stateless RC publication, CDBA draft regulations, RTR launch timeline, and the substantial wave of new Claude models and Claude Code features released across the July-September window.

---

## Executive Summary

Three findings demand immediate attention before any other work this sprint:

1. **Claude Sonnet 4.5 API retirement is 15 days away (September 29, 2026).** The `claude-sonnet-4-5-20250929` identifier becomes invalid in two weeks. Audit all agent files and CI scripts for any reference to this model ID. The recommended replacement is `claude-sonnet-5` (June 30 release, near-Opus-4.8 quality at 60-70% lower cost).

2. **Three new Claude models launched since the last report — routing and cost assumptions need a complete refresh.** Claude Sonnet 5 ($2/$10/Mtok), Claude Opus 5 ($5/$25/Mtok, same price as Opus 4.8 with ~26% fewer tokens at max reasoning), and Claude Fable 5.1 ($10/$50/Mtok, 4x cache-read price cut to $0.25/Mtok) are all now in Claude Code's default model chain. The architect and spec-lead can now be pointed at Sonnet 5 rather than Opus 4.8 for most tasks, cutting Opus-tier API cost dramatically.

3. **Deadbugz (August 10, 2026) — a novel MCP supply-chain pattern that evades single-inspection vetting.** The campaign ships two honest MCP tools, counts tool calls, and triggers credential-harvesting payload only on the fourth call. There is no CVE because the protocol permits this. Any MCP vetting checklist that relies on a single test run is insufficient. This directly affects PerFiApp's planned Flinks MCP adapter and any third-party MCP servers in use.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Sonnet 4.5 API retirement September 29, 2026** | Model | Any agent using this ID | **Act — audit and migrate before Sep 29** |
| **Claude Sonnet 5 ($2/$10/Mtok) — near Opus 4.8 quality** | Model / Cost | spec-lead, architect, code-reviewer | **Adopt — reassign Opus-tier agents to Sonnet 5** |
| **Claude Opus 5 ($5/$25/Mtok) — same price as Opus 4.8, better performance** | Model / Cost | spec-lead when maximum reasoning needed | **Adopt — drop-in Opus 4.8 replacement** |
| **Claude Fable 5.1 — cache reads $0.25/Mtok (4x cut from Fable 5)** | Model / Cost | Any cache-heavy agentic workflow | **Adopt — update Fable fallback chain to Fable 5.1** |
| **STATUS CHANGE: Fable 5 restored July 1 with conditions** | Model | spec-lead, architect (trial now unblocked) | **Trial — reopen evaluation; note US-collaboration conditions** |
| **Claude Opus 4.1 retired August 5** | Model | All agents | **Resolved — verify no remaining references** |
| **Deadbugz — MCP delayed-payload campaign** | Security | architect, code-reviewer | **Act — update MCP vetting to require multi-session testing** |
| **Three August MCP CVEs (path traversal, token cleartext, SSRF)** | Security | architect | **Act — add to MCP vetting checklist** |
| **Claude Code v2.1.257 Containment Escape rule** | Security | implementer in auto mode | **Adopt — blocks cloud metadata-credential reads** |
| **Claude Code managedMcpServers (v2.1.259)** | Agent tooling | architect, CI | **Adopt — org-wide MCP provisioning** |
| **Claude Code self-hosted environments (v2.1.224)** | Agent tooling / compliance | architect | **Watch — useful for data-residency compliance** |
| **Claude Code PreModelSwitch/PostModelSwitch hooks (v2.1.251)** | Agent tooling | All agents | **Adopt — enables model-switch audit logging** |
| **MCP 2026-07-28 spec — stateless, cacheScope, Roots/Sampling deprecated** | Agent tooling | architect | **Act — design Flinks MCP adapter for stateless operation; default cacheScope to "private"** |
| **DeepEval v4.0.8 — AgentLoopDetectionMetric + ToolPermissionMetric** | Agent quality | test-engineer | **Adopt — deterministic, no API key required** |
| **DeepEval v4.2.0 — metric rescaling breaking change** | Agent quality | test-engineer | **Act — update any existing metric thresholds** |
| **Spec Kit v1.0.0 — Security Review extension v2.0.0** | Toolchain | spec-lead, security-reviewer | **Adopt — major milestone; Security Review extension updated** |
| **NestJS v12 — ESM migration, Vitest default, Rspack** | Toolchain | implementer, test-engineer | **Watch — plan migration; breaking changes for ESM; not urgent** |
| **pnpm v11 — Node.js 22+ required, ESM-only, SQLite store** | Toolchain | implementer | **Watch — Node 18-21 dropped; validate CI environment** |
| **APM v0.30.0 — plugin binary trust consent, Homebrew primary install** | Toolchain | architect | **Adopt — upgrade from v0.21.0** |
| **CDBA draft regulations — comment period closed August 26** | Compliance | architect, spec-lead | **Act — read final requirements; accreditation design decision needed** |
| **Canada RTR legal framework in force August 24 — Q4 2026 launch confirmed** | Compliance | architect | **Monitor — Phase 2 payment-initiation design timeline now concrete** |
| **Quebec Law 25 s.12.1 — AI transparency obligation** | Compliance | architect, spec-lead, security-reviewer | **Act — requires AI decision-logic disclosure for credit recommendations** |
| **Agent SDK billing split — still paused** | Cost | All developers | **Monitor — no rescheduling announced** |
| **Wealthsimple — 3.6M clients, $155.6B AUM, chequing as growth engine** | Competitive | spec-lead | **Monitor — largest Canadian fintech competitor accelerating** |
| **KOHO banking license — OSFI fast-track (12-month review) introduced** | Competitive | spec-lead | **Monitor — license decision likely within 12 months of June 2026** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGE: Claude Fable 5 restored July 1, 2026 — with conditions

**Status changed from "suspended" (June 24 report) to "active with restrictions."**

The US Department of Commerce lifted the export-control directive on July 1, 2026, allowing Anthropic to restore API access to `claude-fable-5` globally. `claude-mythos-5`, the less-restricted variant, is being reintroduced only to approved US organizations following government review.

Restoration conditions imposed on Anthropic: proactively detect and address security risks associated with the models; collaborate with the government on protocols for future releases; report any malicious activity discovered. These are ongoing obligations, not one-time steps.

**For PerFiApp:** The prior report's trial recommendation for spec-lead and architect is now unblocked. Begin evaluation against `claude-opus-5` (the new practical alternative that launched while Fable 5 was suspended) before committing. The 19-day suspension illustrated real operational risk — the fallback chain (`claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5`) should remain in `settings.json` regardless of whether Fable 5 is adopted.

Sources: [9to5Mac — Fable 5 restored](https://9to5mac.com/2026/07/01/claude-fable-5-cleared-to-return-as-us-lifts-anthropics-export-control-restriction/) / [CoinDesk](https://www.coindesk.com/tech/2026/07/01/anthropic-restores-ai-models-fable-mythos-after-the-u-s-lifts-export-controls) / [VentureBeat](https://venturebeat.com/technology/anthropic-is-bringing-back-claude-fable-5-globally-after-us-lifts-export-control-order-where-can-enterprises-access-it)

### 1.2 RESOLVED: claude-opus-4-1-20250805 retired August 5, 2026

**Status: Retired as scheduled.** The model ID `claude-opus-4-1-20250805` was removed from the API on August 5, 2026 exactly as announced. If the team completed the migration to `claude-opus-4-8` following the June 24 report, no action is needed. Verify via Claude Console Usage Export that no traffic hit this model ID after August 5.

Source: [Claude Opus 4.1 Is Gone Today — Medium](https://blurbrahlab.medium.com/claude-opus-4-1-is-gone-today-top-10-ai-flutter-news-august-5-2026-b1c8ca9545e3) / [TheRouter.ai](https://therouter.ai/news/anthropic-deprecates-claude-opus-4-1-august-5-migration-guide/)

### 1.3 URGENT: claude-sonnet-4-5-20250929 API retirement September 29, 2026

The `claude-sonnet-4-5-20250929` model ID retires from the Claude API on **September 29, 2026 — 15 days from this report's date.** It was removed from consumer apps (Claude.ai, Claude Cowork) on June 22. API callers have been on borrowed time since then.

**For PerFiApp:** Search all agent `.md` files, `settings.json`, any `ANTHROPIC_DEFAULT_*_MODEL` environment variables, and CI scripts for `claude-sonnet-4-5`. Replacement: `claude-sonnet-5` — launched June 30, near Opus 4.8 quality, $2/$10/Mtok.

Source: [endoflife.date/claude](https://endoflife.date/claude) / [Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.4 New model: Claude Sonnet 5 — launched June 30, 2026

- **API ID:** `claude-sonnet-5`
- **Pricing:** $2/$10 per million input/output tokens (introductory pricing through August 31 became standard)
- **Context:** 1M tokens
- **Capabilities:** Performance approaching Opus 4.8 at 60-70% lower cost. Now default in Claude Code from v2.1.197.

**For PerFiApp's agent routing:** The architect, code-reviewer, and spec-lead agents were running on `claude-opus-4-8` ($15/$75/Mtok) as a Fable 5 fallback. Routing these to `claude-sonnet-5` achieves comparable quality at a fraction of the cost. Reserve `claude-opus-5` for tasks requiring maximum reasoning depth.

Sources: [Anthropic announcement](https://www.anthropic.com/news/claude-sonnet-5) / [Claude Code v2.1.197 update](https://claude-world.com/articles/claude-code-21197-release/)

### 1.5 New model: Claude Opus 5 — launched July 24, 2026

- **API ID:** `claude-opus-5`
- **Pricing:** $5/$25 per million input/output tokens — same as Opus 4.8
- **Context:** 1M tokens
- **Capabilities:** ~26% fewer tokens at max reasoning than Opus 4.8 on typical workloads; thinking on by default; research-preview "fast mode" at $10/$50/Mtok

**For PerFiApp:** This is a drop-in Opus 4.8 replacement at no cost increase with meaningfully better performance. The spec-lead agent, which drives constitution and spec work requiring deep reasoning, benefits most. Default Opus model in Claude Code from v2.1.219.

Sources: [Claude Code v2.1.219 update](https://dev.classmethod.jp/en/articles/20260725-cc-updates-v2-1-219/) / [OpenRouter Opus 5](https://openrouter.ai/anthropic/claude-opus-5)

### 1.6 New model: Claude Fable 5.1 — launched September 1, 2026

- **API ID:** `claude-fable-5-1`
- **Pricing:** $10/$50/Mtok (unchanged); cache reads fell from $1.00 to **$0.25/Mtok (4x cut)**
- **Context:** 1M tokens; 128K max output; always-on adaptive thinking; June 2026 knowledge cutoff
- **Improvements:** Biggest gains in agentic coding, long code refactors, front-end/visual generation, and finance/analysis tasks. Anthropic estimates ~25% lower cost for a typical workload mix and up to ~45% for cache-heavy agentic work.

**For PerFiApp:** Now default in Claude Code from v2.1.257. The cache-read price cut is significant — multi-turn spec and code sessions that reuse the system prompt will see substantially lower API bills at the Fable tier. Update fallback chain to prefer `claude-fable-5-1` over `claude-fable-5`.

Sources: [Fable 5.1 release guide](https://codersera.com/blog/claude-fable-5-1-complete-guide-2026/) / [OpenRouter Fable 5.1](https://openrouter.ai/anthropic/claude-fable-5.1) / [Claude Code v2.1.257](https://ai-tldr.dev/releases/anthropic-claude-code-2-1-257/)

### 1.7 Claude Haiku 4.5 — no retirement announcement

The minimum life floor of "not before October 15, 2026" on `claude-haiku-4-5-20251001` has not produced a retirement announcement. No Haiku 5 has been released. Haiku 4.5 remains the budget tier. Monitor the deprecations page; a successor is widely expected in late 2026 but unannounced.

Source: [endoflife.date/claude](https://endoflife.date/claude)

### 1.8 Updated model table (as of September 14, 2026)

| Model ID | Status | Retirement |
|---|---|---|
| `claude-fable-5-1` | Active — default Fable | Not announced |
| `claude-fable-5` | Active (restored July 1) | Not announced |
| `claude-opus-5` | Active — default Opus | Not announced |
| `claude-sonnet-5` | Active — default Sonnet | Not announced |
| `claude-opus-4-8` | Active | Not before May 28, 2027 |
| `claude-opus-4-7` | Active | Not before Apr 16, 2027 |
| `claude-sonnet-4-6` | Active | Not before Feb 17, 2027 |
| `claude-haiku-4-5-20251001` | Active | Not before Oct 15, 2026 |
| `claude-sonnet-4-5-20250929` | **Retiring September 29, 2026** | **September 29, 2026** |
| `claude-opus-4-1-20250805` | **Retired August 5, 2026** | Done |
| `claude-mythos-preview` | Deprecated | June 30, 2026 (done) |

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Agent SDK billing split — still paused, no rescheduling

**Status unchanged from June 24 report.** The Anthropic Agent SDK billing split (separate monthly credit) remains paused as of September 14, 2026. No rescheduling has been announced. The pause was publicly attributed to competitive pressure from OpenAI. Agent SDK usage — including `claude -p`, Claude Code GitHub Actions, and third-party apps — still draws from subscription limits as before.

**For PerFiApp:** Continue tracking Agent SDK token consumption via Claude Console Usage Export, but no financial change is imminent.

Source: [The New Stack — pause](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/)

### 2.2 Major routing opportunity: Sonnet 5 at Opus 4.8 quality, fraction of Opus 4.8 price

The most impactful cost optimization since the project started is now available. The recommended agent routing given new models:

| Agent | Prior model | Recommended model | Estimated savings |
|---|---|---|---|
| spec-lead | claude-opus-4-8 ($15/$75/Mtok) | claude-sonnet-5 ($2/$10/Mtok) | ~87% on typical sessions |
| architect | claude-opus-4-8 | claude-sonnet-5 | ~87% |
| code-reviewer | claude-sonnet-4-6 ($3/$15/Mtok) | claude-sonnet-5 ($2/$10/Mtok) | ~35% |
| implementer | claude-sonnet-4-6 | claude-sonnet-5 | ~35% |
| test-engineer | claude-sonnet-4-6 | claude-sonnet-5 | ~35% |
| security-reviewer | claude-opus-4-8 | claude-opus-5 ($5/$25/Mtok) | ~67% vs prior Opus 4.8 |

Reserve `claude-fable-5-1` or `claude-opus-5` only for constitution drafting and complex planning sessions requiring maximum reasoning depth. This is a structural cost change, not a micro-optimization.

### 2.3 Fable 5.1 cache-read price cut — 4x

Cache reads on `claude-fable-5-1` fell from $1.00/Mtok to $0.25/Mtok. For PerFiApp's CI research runs and any long agentic sessions that reuse the system prompt, this directly lowers the marginal cost of repeated Fable-tier calls. The 5-minute system-prompt cache recommended in prior reports becomes even more economically attractive at the Fable tier.

### 2.4 maxEffortLevel cap (Claude Code v2.1.267)

A new `maxEffortLevel` setting (top-level or per model) caps the effort level accepted from any provider, preventing agents from silently escalating to maximum-effort (and maximum-cost) mode without human approval. Relevant for the spec-lead and architect agents when they run in CI contexts where cost must be bounded.

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 MCP 2026-07-28 specification — PUBLISHED (status change from "planned")

**Status changed from "planned July 28" (June 24 report) to "published and ratified."**

The 2026-07-28 release candidate was locked May 21 and ratified July 28. It is the largest revision to MCP since launch. Key changes:

**Breaking — sessions removed:**
- `Mcp-Session-Id` header and protocol-level sessions are gone. Servers no longer maintain per-client session state. Load balancers can use round-robin; sticky sessions and shared Redis stores are not needed.
- The initialize handshake is removed.

**New — cacheScope (privacy-critical):**
- `tools/list`, `prompts/list`, `resources/list`, and `resources/read` now carry `ttlMs` and `cacheScope` fields. `cacheScope: "public"` allows shared intermediaries to serve one tenant's list to another. **For PerFiApp:** Default to `cacheScope: "private"` on every MCP response that could contain account, balance, or transaction data. Only widen to "public" for responses that are genuinely identical across all callers (e.g., a static tool list with no user-specific filtering).

**Deprecated (12-month removal policy, not yet removed):**
- Roots, Sampling, and Logging extensions are deprecated as of 2026-07-28. They must remain deprecated for 12 months before eligible for removal — so until July 2027 at earliest.
- `tasks/list` removed immediately.

**New — Mcp-Method and Mcp-Name headers:**
Required on Streamable HTTP for load-balancer routing without deep packet inspection.

**For PerFiApp's Flinks MCP adapter design:** The adapter must be stateless from the start. The prior report's "design for stateless operation" recommendation is now the ratified standard, not a future migration target.

Sources: [MCP 2026-07-28 RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [Microsoft Azure analysis](https://techcommunity.microsoft.com/blog/appsonazureblog/mcp-just-went-stateless-%E2%80%94-what-the-2026-spec-changes-about-scaling-on-app-servic/4530222) / [Stacktree breaking changes](https://stacktr.ee/blog/mcp-2026-spec-changes) / [DEV Community](https://dev.to/krlz/mcp-went-stateless-what-the-2026-07-28-spec-actually-changes-273k)

### 3.2 Claude Code major version highlights (v2.1.188 through v2.1.270)

From v2.1.187 (June 23) to v2.1.270 (September 12), Claude Code shipped roughly 80 versions. Most actionable for PerFiApp:

**v2.1.197 (July 1) — Claude Sonnet 5 default**
Claude Sonnet 5 became the default model across Claude Code. Fable 5 also re-enabled on the same day (access restored). The `/model` picker now shows Sonnet 5 and Fable 5 as primary options.

**v2.1.219 (July 24) — Claude Opus 5 default Opus**
`claude-opus-5` becomes the default Opus model. 1M context, fast mode at $10/$50/Mtok, "safety fallback" beta: if a request would be refused mid-session, Opus 5 can downgrade its reasoning tier to find a compliant answer rather than refusing outright.

**v2.1.224 (August 7) — Self-hosted environments + cross-session messaging**
`claude self-hosted-runner` allows organizations to run Claude Code sessions on their own infrastructure (Team/Enterprise plans, disabled by default). Cloud sessions previously executed on Anthropic-managed servers — this removes that constraint for compliance requirements. Also added: `ListAgents` and `SendMessage` for cross-session agent communication on macOS/Linux, and archive plugin source (zip over HTTPS with SHA-256 pinning).

**For PerFiApp:** Self-hosted runner is directly relevant if PerFiApp ever processes real transaction or banking-credential data in CI agents — code and secrets would remain on PerFiApp's own network.

**v2.1.251 (August 28) — PreModelSwitch / PostModelSwitch hooks, spend limits**
`PreModelSwitch` and `PostModelSwitch` hooks allow intercepting and logging model switches. For a financial app with audit requirements, this enables a simple hook that logs every model change in a CI session. Also: `/usage` now shows a spend limit bar; `/cost` now shows per-session prompt-cache analytics.

**v2.1.257 (September 1) — Fable 5.1 default, Containment Escape rule**
`claude-fable-5-1` becomes the default Fable model. Containment Escape rule added to auto mode: blocks cloud metadata-credential fetches (AWS `169.254.169.254`, GCP equivalent), egress evasion, and cross-tenant reach unless the environment marks them as expected. A new `Host containment` environment slot in auto mode config documents container/VM/pod setups where these should be allowed.

**For PerFiApp:** This is a meaningful protection for the implementer running in auto mode — standard container-escape techniques are now blocked by default at the Claude Code layer, even if the implementer's sandbox is otherwise misconfigured.

**v2.1.259 (September 2) — managedMcpServers + --permission-prompts none**
Organizations can now push HTTP/SSE MCP servers to all Claude Code users centrally via `managedMcpServers` in a managed settings source. Users receive organizational servers in addition to their personal servers. `allowedMcpServers` does not apply to managed servers (except those using `${VAR}` expansion). Also: `--permission-prompts none` for unattended headless execution.

**For PerFiApp:** If the team approves a Flinks MCP server or GitHub MCP server, `managedMcpServers` pushes it to every developer without per-person configuration. This also creates a single audit point for which MCP servers are active across the team.

**v2.1.261 (September 4) — /skill-doctor, expanded bash output**
`/skill-doctor` shows unused skills and their context cost — useful for identifying dead weight in PerFiApp's agent skills that are burning token budget. `bashOutputMaxChars` and `taskOutputMaxChars` now configurable up to 128K.

**v2.1.267 (September 9) — maxEffortLevel, symlink fix, MCP cache fix**
Fixed mid-session MCP tool additions breaking prompt-cache reuse (important for multi-tool agentic sessions). Fixed symlink swapping attacks in file tools. `maxEffortLevel` setting introduced.

**v2.1.269 (September 11) — claude plugin eval, CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS**
`claude plugin eval` runs plugin eval suites with scored, reproducible results — Anthropic's first-party agent evaluation tooling built into Claude Code. Permission rules starting with `!` now apply only within their own settings source (fixes a security scope leak). `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` controls concurrent agent limits.

Sources: [Claude Code official changelog](https://code.claude.com/docs/en/changelog) / [Classmethod v2.1.224 update](https://dev.classmethod.jp/en/articles/20260807-cc-updates-v2-1-224/) / [managedMcpServers docs](https://code.claude.com/docs/en/managed-mcp) / [Claude Code 2.1.259 detail](https://clauding.de/en/posts/claude-code-2-1-259/)

### 3.3 Flinks MCP server — still no official server

A search for a Flinks-produced or Flinks-endorsed MCP server found no new announcement since the June 24 report. Flinks is actively publishing content about the CDBA framework (see Track 7) but has not announced an MCP server. The recommendation to make direct contact with Flinks about their MCP roadmap remains standing.

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval v4.0.5 through v4.2.0 — key updates since v4.0 (June 22)

**v4.0.5–v4.0.7 (late June):**
- Dataset versioning with multiple-version management
- Multi-file context generation for cross-file evaluation scenarios
- TypeScript governance command to validate projects against governance policies
- Token usage tracking visible per-metric

**v4.0.8 (July) — deterministic metrics (no API key required):**
Three new deterministic metrics that do not require an LLM API call:
- `AgentLoopDetectionMetric` — detects infinite agent loops; production-safe
- `ToolPermissionMetric` — enforces authorized tool usage from allowlist/denylist; relevant for verifying implementer only calls approved MCP tools
- `CitationFaithfulnessMetric` — validates citation accuracy in outputs

**For PerFiApp's test-engineer:** These deterministic metrics can run in CI with zero additional API cost. `ToolPermissionMetric` is directly applicable to verifying that the implementer's MCP tool calls stay within the approved Plaid/Flinks tool list.

**v4.1.x–v4.2.0 (August) — BREAKING CHANGE:**
- Bias, Hallucination, Misuse, and Toxicity metrics rescaled so **higher scores indicate better performance** (reversed from prior convention). Any existing threshold logic using these metrics must be updated.
- Component-level evaluation in TypeScript with span-level metric collection
- Flaky test/metric flagging distinguishes unstable results from genuine failures
- Mastra framework integration for TypeScript agent tracing

**For PerFiApp:** If the test-engineer agent built any evaluation harness using DeepEval after the June 24 report, check whether it uses the four rescaled metrics — thresholds like "score > 0.5 means fail" now mean the opposite.

Sources: [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026) / [DeepEval repo](https://github.com/confident-ai/deepeval)

### 4.2 Claude Code first-party eval: claude plugin eval (v2.1.269)

`claude plugin eval` runs plugin eval suites with scored, reproducible results inside Claude Code. This is Anthropic's first-party response to the need for agent evaluation without external tooling. It complements DeepEval rather than replacing it — DeepEval has richer metrics; `claude plugin eval` has tighter Claude Code integration and no configuration overhead.

**For PerFiApp's test-engineer:** Use `claude plugin eval` for rapid iteration on PerFiApp's agent prompts and skills (low setup cost); use DeepEval for structured regression testing of financial-logic outputs (richer metrics, dataset management).

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v1.0.0 milestone (August 21) — Security Review extension v2.0.0

**Status changed from v0.11.6 (June 23) to v1.0.6 (September 10).** Spec Kit crossed its 1.0.0 milestone on its first anniversary (August 21, 2026).

Most relevant releases since v0.11.6:

**v1.0.0 (August 21):**
- **Security Review extension v2.0.0** — significant update to the security governance preset used for spec security reviews. Pairs directly with PerFiApp's security-reviewer agent workflow.
- AgentDocx extension — generates Word documents from Spec Kit artifacts
- Inventory Alignment preset

**v1.0.1 (August 21):**
- Adoption guide, project history, and workflow quickstarts added to documentation
- Azure Cosmos DB support extension added

**v1.0.2 (August 31):**
- Bundler robustness improvements
- Windows PowerShell UTF-8 fix (relevant for Windows contributors)
- Community extensions: Jira Mirror, Pre-Spec Cards, Taco Review

**v1.0.5 (September 8):**
- Task generation from data models with field constraints — spec-lead can generate task lists directly from PerFiApp's PostgreSQL schema definitions
- Workflow slot feature for conditional workflow branching
- Muse Code agent integration

**v1.0.6 (September 10):**
- `/speckit.taskstoissues` deprecated, moving to bundled GitHub extension — teams using this command should plan the transition
- Extension author preservation in generated skills

**Upgrade command:** `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.6`

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases)

### 5.2 APM v0.30.0 (September 7, 2026)

APM reached v0.30.0 from v0.21.0 over nine minor releases in this period. Key highlights:

**v0.29.0 (August 30):**
- **Agent plugins foundation** — APM can now manage agent plugin packages (distinct from MCP servers)
- **Plugin binary trust consent:** `--trust-bin` / `--no-trust-bin` flags require explicit approval when a plugin ships executables. Builds on the `allowExecutables` gate from v0.21.0 with finer-grained per-plugin control.

**v0.28.0 (August 6):**
- Agents primitive deployment to `.kiro/agents/` — adds Kiro IDE agent deployment as a first-class target

**v0.30.0 (September 7):**
- Homebrew becomes the primary macOS install path
- HTTP cache recency refresh and cache management fixes
- Support for catalog-only marketplace plugins and improved MCP configuration

Source: [newreleases.io/project/github/microsoft/apm](https://newreleases.io/project/github/microsoft/apm/release/v0.30.0) / [APM releases](https://github.com/microsoft/apm/releases)

### 5.3 NestJS v12 — major release Q3 2026 (Watch)

NestJS v12 shipped in Q3 2026 with the headline change of full ESM migration. Existing CommonJS projects can upgrade and continue working without a rewrite, but there are notable changes:

- **Vitest replaces Jest** as the default test runner for ESM projects; CommonJS projects continue with Jest. This is a potential source of test-suite breakage during migration.
- **Rspack replaces Webpack** for bundling.
- **CLI rebuilt** with ESM source; command classes now take typed context objects instead of untyped inputs.
- **`nest upgrade`** command automates the v11→v12 migration.

**For PerFiApp:** PerFiApp's backend has not started implementation yet. Starting on NestJS v12 avoids a future migration. However, the team should verify that all planned NestJS plugins and middleware (authentication, PostgreSQL, validation) have v12-compatible releases before committing. The NestJS ecosystem was still catching up at v12 launch.

Sources: [InfoQ NestJS 12 roadmap](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/) / [Trilon blog — NestJS 12 available](https://trilon.io/blog/nestjs-12-is-now-available)

### 5.4 pnpm v11 — Node.js 22+ required, ESM-only (Watch)

pnpm v11 shipped April 28, 2026, with several changes relevant to PerFiApp's monorepo:

- **Requires Node.js 22+** — drops support for Node 18, 19, 20, and 21. PerFiApp's CI must run Node 22.
- **Pure ESM** — pnpm itself is now ESM; compatibility with legacy CommonJS tool chains may require adjustment.
- **SQLite store index** replaces the JSON-per-package index — faster and more reliable on concurrent installs.
- **Supply-chain security improvements:** `minimumReleaseAge` now defaults to 24 hours (prevents zero-day package poisoning); `blockExoticSubdeps: true` by default (blocks malicious code hidden in obscure protocol references).

The security defaults are a meaningful improvement for a financial app's dependency supply chain.

**For PerFiApp:** Since the project has not started application code, adopting pnpm v11 from the start (with Node 22) is the cleanest path. The supply-chain security defaults align with the project's security posture.

Sources: [pnpm 11.0 announcement](https://pnpm.io/blog/releases/11.0) / [InfoQ pnpm v11 RC](https://www.infoq.com/news/2026/04/pnpm-11-rc-release/)

### 5.5 Expo SDK 57 — June 30, 2026

Expo SDK 57 (June 30) upgrades React Native from 0.85 to 0.86. Designed as a minor release; primarily a React Native version update with no significant breaking changes from SDK 56. New Architecture is the default since SDK 53 and remains so.

**For PerFiApp:** No urgency. When PerFiApp begins mobile development, target SDK 57 (React Native 0.86, New Architecture). SDK 58 expected in late 2026.

Source: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CRITICAL: Deadbugz — delayed-payload MCP supply-chain campaign (August 10, 2026)

A supply-chain campaign tracked to a single GitHub account (`zellkernel`) submitted 23 pull requests to unrelated AI, MCP, and developer-tool repositories in a 74-minute window on August 10, 2026. The attack pattern is novel and protocol-compliant — **no CVE was filed because MCP allows this behavior.**

**The mechanism:** A malicious MCP server ships two completely honest and functional tools. It internally counts how many tool calls the connected agent has made. On the fourth call, the server rewrites the metadata it returns to include instructions for the agent to collect SSH keys, AWS credentials, shell history, and kubeconfig — without mentioning this action in its outputs.

**Why this evades standard vetting:** A reviewer checking a new server, or an automated test that calls each tool once, receives only benign metadata. The payload only triggers on repeated use in a trusted session. The three-call threshold was specifically chosen to evade brief inspection.

**For PerFiApp:** This directly affects any MCP server adoption. The current vetting checklist (from the June 24 report) requires checking authentication and exec-injection. Two additions are now mandatory:

1. **Multi-session testing:** Any MCP server must be tested across at least 10 consecutive tool calls in a session before approval. Automated testing in a network-isolated sandbox. Observe all responses.
2. **Dynamic metadata inspection:** Tool response metadata must be logged and diffed across calls. Any change in metadata structure or content between call 1 and call N should trigger immediate rejection.

Sources: [Pillar Security — Deadbugz campaign](https://www.pillar.security/blog/deadbugz-currently-active-mcp-supply-chain-campaign) / [ByteIota — attack mechanism](https://byteiota.com/deadbugz-the-mcp-attack-that-waits-3-calls-before-striking/) / [Adversa AI — September 2026 roundup](https://adversa.ai/blog/top-mcp-security-resources-september-2026/)

### 6.2 Three MCP server CVEs — August 2026

Three MCP server vulnerabilities surfaced in August 2026 from an audit of 640 production servers:

- **Path traversal:** Authenticated clients could read arbitrary files via cursor manipulation in resource tools.
- **Settings tool token leak:** A settings/config inspection tool returned a cluster API token in cleartext in its response body.
- **SSRF:** Server-Side Request Forgery enabling requests to internal cloud metadata services.

The cleartext token pattern is directly analogous to a Plaid or Flinks API key appearing in a tool response. **For PerFiApp:** Add to the MCP vetting checklist: (a) Does any tool expose configuration or credentials in its response body? (b) Can any tool be induced to make outbound requests to arbitrary URLs?

Source: [Adversa AI — September 2026 roundup](https://adversa.ai/blog/top-mcp-security-resources-september-2026/) / [Practical DevSecOps statistics](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/)

### 6.3 Claude Code Containment Escape rule (v2.1.257)

The auto-mode Containment Escape rule (shipped September 1) blocks, without explicit approval:

- Cloud metadata-credential fetches (`GET 169.254.169.254` on AWS/GCP — the standard first step in container escapes)
- Egress evasion (outbound connections to unusual endpoints)
- Cross-tenant reach

A new `Host containment` environment slot in auto-mode config allows marking these as expected in a container/VM/pod setup where they are legitimate.

**For PerFiApp:** PerFiApp's CI agents may need to be configured with the `Host containment` slot if they legitimately call cloud services. Without this, auto mode will block those calls. The default (blocking) is the right posture for financial app CI.

Source: [Claude Code Containment Escape blog](https://claudcod.com/blog/claude-code-containment-escape-rule/) / [Claude Code v2.1.257 release](https://ai-tldr.dev/releases/anthropic-claude-code-2-1-257/)

### 6.4 Claude Code permission rule scope fix (v2.1.269)

Permission rules starting with `!` (deny rules) previously could leak out of their settings source and apply globally. v2.1.269 scopes them to apply only within their own settings source. This prevents deny rules in a subagent's local settings from accidentally denying actions in the parent session.

**For PerFiApp:** If PerFiApp uses per-agent settings files with deny rules (e.g., blocking the implementer from touching auth files), verify these rules are still being applied as expected after v2.1.269.

### 6.5 Claude Code symlink swapping attacks — patched in v2.1.251 and v2.1.267

Two separate symlink-swapping attack vectors in file tools were patched across these versions. Both allowed an attacker-controlled MCP server or file to replace a file with a symlink after Claude Code's read-check but before its write, causing writes to go to an unintended destination. This is a class of TOCTOU (time-of-check/time-of-use) vulnerability.

**For PerFiApp:** Verify Claude Code is at v2.1.267 or later before any implementer agent is given write access to financial logic files in auto mode.

### 6.6 Quebec Law 25 s.12.1 — AI transparency obligation for automated processing

**Status: Fully in force; no new regulatory change, but surfaced as under-recognized in the prior reports.**

Section 12.1 of Quebec's Law 25 (Loi 25) requires organizations to provide "meaningful information about the AI decision-making logic and consequences" before automated processing of personal information — generic privacy notices are insufficient. Violations carry penalties up to $25M CAD.

**For PerFiApp:** Three modules have direct exposure:
1. **Credit Monitor** — if credit score recommendations are generated algorithmically (via AI), users must be told what logic was used and how it affects them.
2. **AI coaching / insights** — budget insights generated by an LLM from financial data are automated decisions about personal financial data.
3. **Best-Card Recommender** — if the recommendation algorithm uses AI scoring, Quebec users must receive a meaningful explanation.

The security-reviewer agent's checklist should include a Law 25 s.12.1 check for any feature that produces AI-generated output from user financial data. This applies from the first spec, not just at launch.

Sources: [Augure AI — Law 25 AI guide](https://augureai.ca/blog/law-25-ai-compliance-guide-quebec) / [Agentys — Law 25 fines guide](https://www.agentys.io/en/blog/loi-25-quebec-privacy-ai-email) / [Canada AI compliance overview](https://www.opsintel.io/blog/canada-ai-compliance-laws-guide-2026/)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 CDBA Phase 1 — draft regulations published, comment period closed August 26

**Status changed from "Bank of Canada in information-gathering" (June 24 report) to "draft regulations published, comment period closed."**

The Department of Finance published proposed Consumer-Driven Banking Regulations in the Canada Gazette on June 27, 2026. The 60-day public comment period closed August 26. Final regulations are expected to be published in Q4 2026 or early Q1 2027. No operational launch date for the live banking data API has been announced.

Key requirements from the draft regulations that PerFiApp must understand for its architecture:

- **Four accreditation pathways:** Federal/provincial FIs (streamlined), RPAA-registered PSPs, accredited third-party service providers, and general fintechs (most stringent — requires independent security confirmation and insurance). PerFiApp would likely qualify as a third-party service provider. The $2,500 accreditation fee is nominal.
- **Phase 1 data:** Consumer profile data, account data (numbers, transactions, balances, fee/interest terms), and product data. Deposit and payment accounts first; lending and investment accounts follow.
- **99.5% monthly API uptime** required of participating institutions.
- **24 months of transaction history** must be available.
- **Consent renewal every 12 months** mandatory.
- **Penalties:** $1M per violation (individuals), $10M (participating entities or service providers).
- **Record retention:** 5 years.

**For PerFiApp's architect:** The accreditation pathway decision (which of the four routes PerFiApp will pursue) needs to be made before the final regulations are published, as it determines which security controls and insurance requirements must be built. The "third-party service provider" route is the most likely fit but has the strictest requirements. The spec-lead should initiate a spec for the Consent Management module now — it needs to support the 12-month renewal cycle from the start.

Sources: [Bennett Jones — proposed regulations](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations) / [McCarthy Tetrault — draft regulations](https://www.mccarthy.ca/en/insights/blogs/techlex/canadas-consumer-driven-banking-framework-takes-shape-with-draft-regulations) / [Flinks blog](https://www.flinks.com/blog/blog/open-banking-canada-2026-launch-fintech-institutions) / [Canada Gazette — draft text](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html)

### 7.2 Canada RTR — legal framework in force August 24, production Q4 2026

**Status changed from "Q4 2026 target, no legal framework" (June 24 report) to "bylaws in force, Q4 2026 confirmed."**

The RTR By-law and RTR Rules received all necessary approvals and came into force August 24, 2026, establishing the core legal framework. No transactions went live on August 24 — this was a legal milestone, not a technical launch. The production schedule:

- **Q4 2026:** Initial direct participants go live (real-time payment clearing and settlement)
- **Q1 2027:** Initial Interac e-Transfer clearing and settlement migration
- **Q2 2027:** Additional migration
- **Q3 2027:** Full transaction volumes across all partner institutions

**For PerFiApp's Phase 2 design:** RTR-based payment initiation (the "Phase 2 write-access" open banking feature) is now on a concrete timeline. The architect should plan for RTR-native payment APIs to be available in PerFiApp's Phase 2 target window (mid-2027), aligned with Q3 2027 full RTR availability. ISO 20022 messaging is the RTR data standard — the financial data model in `packages/` should include ISO 20022 payment message types.

Sources: [Payments Canada — RTR bylaw milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [McCarthy Tetrault — bylaw published](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published) / [BetaKit](https://betakit.com/canadas-real-time-rail-system-will-launch-this-year-after-achieving-critical-milestone/) / [Fundmore.ai analysis](https://blog.fundmore.ai/canada-real-time-rail-comes-into-force-lender-batch-assumptions-just-got-a-deadline)

### 7.3 FINTRAC AML — no new guidance since April 2026

No new FINTRAC guidance was published between June 24 and September 14, 2026. The "reasonably designed, risk-based and effective" compliance standard from the March 2026 PCMLTFA amendments (covered in the June 24 report) remains the current state. Monitoring FINTRAC's Modernization page for pending regulatory detail on the Stablecoin Act provisions is still warranted.

### 7.4 Bill C-27 (CPPA) — still not passed

Canada's federal privacy modernization bill (Consumer Privacy Protection Act) has not received Royal Assent as of September 14, 2026. PIPEDA and Quebec Law 25 remain the governing privacy framework. Continue monitoring — C-27 passage would introduce AI transparency rules at the federal level that overlap with Law 25 s.12.1 but apply to federally regulated sectors including financial services.

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO — banking license still pending, OSFI fast-track introduced

OSFI introduced a Targeted Fast-Track Framework in June 2026 for fintech banking license applications: initial feedback within 4 weeks, risk-based review completed within 12 months, then ministerial sign-off (up to 3 months). KOHO has been in OSFI's process since 2021 and entered Phase 2 in 2024. The fast-track framework, applied retroactively or to a renewed application, could mean a decision by mid-to-late 2027.

KOHO has not announced a license approval as of September 14. If approved, KOHO becomes Canada's first new federally regulated Schedule 1 bank in decades — directly competing with PerFiApp's neobank-adjacent positioning.

Sources: [Yahoo Finance KOHO 2026](https://ca.finance.yahoo.com/news/2-5-million-canadians-already-111500202.html) / [KOHO banking license summary](https://money.ca/banking/koho-schedule-1-bank-licence)

### 8.2 Wealthsimple — accelerating, chequing as growth engine

Wealthsimple recorded $17 billion in net inflows in Q2 2026, ending at $155.6 billion AUM (+24.7% quarter-over-quarter, +84.1% year-over-year). 3.6 million clients. The company describes chequing as its new growth engine — positioning it as a primary bank account rather than an investment platform.

Nearly 1-in-4 Canadians aged 18-40 now uses at least one Wealthsimple product. This is the most direct competitive threat to PerFiApp's core demographic.

**For PerFiApp:** Wealthsimple does not offer bilingual (EN/FR) AI coaching, cross-institution aggregation, or credit optimization. These remain PerFiApp's differentiation points. However, the speed of Wealthsimple's AUM growth suggests that Canadian consumers in PerFiApp's target age range are already comfortable with fintech-as-primary-bank, which is positive for PerFiApp's adoption assumptions.

Source: [Fintech.ca — Wealthsimple chequing](https://www.fintech.ca/2026/07/30/wealthsimple-chequing-becomes-a-growth-engine/)

### 8.3 Neo Financial — Mastercard direct issuer, Interac member

Neo Financial joined the Interac network in April 2026 (following Wealthsimple and KOHO). It also became a direct Mastercard issuer, removing the ATB Financial intermediary. These moves make Neo a more direct payments competitor.

**For PerFiApp:** Neo's vertical integration is relevant context for Phase 2 payment initiation design — Canadian consumers will have growing expectations for instant payments even from non-bank apps.

Source: [iPhone in Canada — Neo Interac](https://www.iphoneincanada.ca/2026/04/08/fintech-neo-financial-joins-interac-network-following-wealthsimple/)

---

## Recommended Next Steps

### Immediate (this week — before September 29)

1. **Audit all agent files, settings.json, and CI scripts for `claude-sonnet-4-5` or `claude-sonnet-4-5-20250929`.** This model retires in 15 days. Replace with `claude-sonnet-5`. Run `grep -r "sonnet-4-5" .claude/ .github/` to find references.

2. **Update the fallback model chain in settings.json to reflect the new model landscape.** Recommended chain: `["claude-fable-5-1", "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"]`. Remove any reference to `claude-fable-5` (the 5.0 version) or `claude-opus-4-8` as primary models.

3. **Verify no traffic hit `claude-opus-4-1-20250805` after August 5.** Use Claude Console Usage Export. If any live calls show that model ID, the system was broken for over 5 weeks.

### Short-term (this sprint)

4. **Reroute spec-lead and architect agents to `claude-sonnet-5`.** The model delivers near-Opus-4.8 quality at ~87% lower cost. Escalate to `claude-opus-5` only for constitution-level reasoning. This single routing change is the highest-ROI cost optimization available.

5. **Re-open the Claude Fable 5.1 evaluation for spec-lead.** Access is restored (July 1). Fable 5.1 (September 1) supersedes Fable 5 with up to 45% cost reduction for cache-heavy agentic work. Test against Sonnet 5 on a representative spec or plan task before committing to the Fable tier.

6. **Update the MCP vetting checklist to add Deadbugz-pattern testing.** For any new MCP server under evaluation: (a) run 10+ consecutive tool calls in an isolated sandbox, (b) log all tool response metadata and diff across calls, (c) terminate evaluation if metadata changes between call 1 and call N. Add this as a mandatory gate in the architect's MCP review process.

7. **Add Quebec Law 25 s.12.1 to the security-reviewer checklist.** Every feature spec involving AI-generated output from user financial data needs a "What does the user see about this decision's logic?" answer before the spec is approved. This includes Credit Monitor, AI coaching, and the Best-Card Recommender.

8. **Upgrade Claude Code to v2.1.270** and enable `Containment Escape` verification in CI agent configs. Verify whether any legitimate CI tool calls hit cloud metadata endpoints — if so, configure the `Host containment` slot.

9. **Enable `managedMcpServers` for the GitHub MCP server** (or any other MCP server the team has approved). This replaces per-developer configuration with a single auditable org-wide setting.

### Medium-term (next 4–6 weeks)

10. **Upgrade Spec Kit to v1.0.6** (from v0.11.6). Install with `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.6`. Prioritize: Security Review extension v2.0.0 for the security-reviewer agent; task generation from data models (v1.0.5) for the architect's schema-to-task workflow.

11. **Upgrade APM to v0.30.0** (from v0.21.0). Key addition: plugin binary trust consent (`--trust-bin`/`--no-trust-bin`) gives finer-grained control over MCP server executable approval than the v0.21.0 `allowExecutables` gate.

12. **Initiate a Consent Management spec** in Spec Kit. The CDBA draft regulations require 12-month consent renewal and 5-year record retention. With the comment period closed and final regulations expected Q4 2026, PerFiApp needs a Consent Management module designed to the draft requirements before the final text lands.

13. **Decide on the CDBA accreditation pathway.** The "third-party service provider" route requires independent security confirmation and insurance coverage. This is an architect + spec-lead decision that affects the security architecture and compliance budget. Engage legal counsel now — the final regulations will be published before any lawyer can respond if the decision is deferred.

14. **Plan backend technology baseline as NestJS v12 + pnpm v11 + Node 22.** Since no application code has been written, starting on the current major versions avoids mid-project migrations. Validate that the target NestJS v12 plugins (Passport, TypeORM/Prisma, class-validator) have stable v12 releases before committing.

15. **Model ISO 20022 payment message types in `packages/money`** in preparation for RTR payment initiation in Phase 2. The RTR legal framework is in place; production launch is Q4 2026. A well-typed ISO 20022 payment model now prevents a schema rewrite when Phase 2 development begins.

---

*Report generated 2026-09-14. Delta report vs 2026-06-24 — prior findings not repeated unless status has changed. All findings verified against primary sources where accessible; secondary sources flagged where primary sources were not directly reachable.*

**Primary sources consulted:**
- [Claude Code changelog](https://code.claude.com/docs/en/changelog) / [GitHub anthropics/claude-code releases](https://github.com/anthropics/claude-code/releases)
- [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)
- [Anthropic — Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)
- [MCP 2026-07-28 RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [Payments Canada — RTR bylaws milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail)
- [Canada Gazette — CDB Regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html)
- [Pillar Security — Deadbugz](https://www.pillar.security/blog/deadbugz-currently-active-mcp-supply-chain-campaign)
- [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026)
- [Spec Kit releases](https://github.com/github/spec-kit/releases)
- [APM releases](https://github.com/microsoft/apm/releases)
- [pnpm 11.0](https://pnpm.io/blog/releases/11.0)
- [NestJS v12 announcement](https://trilon.io/blog/nestjs-12-is-now-available)
- [managedMcpServers docs](https://code.claude.com/docs/en/managed-mcp)
- [McCarthy Tetrault — CDBA draft regulations](https://www.mccarthy.ca/en/insights/blogs/techlex/canadas-consumer-driven-banking-framework-takes-shape-with-draft-regulations)
- [Augure AI — Quebec Law 25 AI guide](https://augureai.ca/blog/law-25-ai-compliance-guide-quebec)
