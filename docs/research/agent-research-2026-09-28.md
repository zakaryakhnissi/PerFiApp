# PerFiApp Agent Research — 2026-09-28

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: model generation change (entire Claude 5.x lineup landed), Deadbugz MCP supply-chain campaign, RTR By-law in force, and Bill C-36 privacy reform tabled.

---

## Executive Summary

1. **The entire Claude agent lineup needs to be re-evaluated.** Since June 24, Anthropic released Fable 5.1 (Sep 1), Opus 5.5 (Sep 22), and Sonnet 5.5 (announced Sep 22, releasing imminently). The Fable 5 export-control suspension is resolved — full access restored July 1. The current `claude-opus-4-8` / `claude-sonnet-4-6` / `claude-haiku-4-5` roster is now two generations behind. Critically, `claude-haiku-4-5-20251001` retires **not before October 15, 2026** — 17 days from today — forcing an immediate decision on a Haiku replacement. The right replacement candidate, `claude-sonnet-5-5`, has not yet appeared on the live models page but is confirmed announced.

2. **"Deadbugz" is an active MCP supply-chain campaign, not a CVE.** Disclosed August 30–September 2, 2026 by Pillar Security and the Cloud Security Alliance, it distributes a malicious MCP server via unsolicited GitHub pull requests. The server (calling itself `productivity-suite`) silently changes its tool-call instructions after three uses, redirecting agents to exfiltrate SSH keys, AWS credentials, and Kubernetes configs. PerFiApp's agent team reviews PRs automatically — any PR that adds or modifies MCP server references in `.claude/` files must now be explicitly flagged.

3. **Canada's CDBA draft regulations closed for comment August 26; RTR By-law came into force August 24.** The comment period for the proposed Consumer-Driven Banking Regulations has ended. OSFI/Bank of Canada are now finalizing them. RTR's legal framework is live, with first participants targeted for Q4 2026. PerFiApp's architecture must account for an active (if limited) RTR network by year-end, and the team should review the Bank of Canada's final regulatory text once published.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Fable 5 export-control suspension lifted July 1 — access restored** | Model | spec-lead, architect | **Resolved — re-evaluate for adoption; see Fable 5.1 below** |
| **claude-opus-4-1 retired August 5, 2026** | Model | (any remnant configs) | **Resolved — confirm no traffic in Console export** |
| **claude-haiku-4-5 retires Oct 15, 2026 — 17 days away** | Model | test-engineer, code-reviewer, security-reviewer, debugger | **Act — migrate to claude-sonnet-5-5 before Oct 15** |
| **Claude Fable 5.1 — new top model (Sep 1), 75% cache-read cost cut** | Model / Cost | spec-lead, architect | **Adopt — replace claude-opus-4-8 for both roles** |
| **Claude Opus 5.5 — new middle tier (Sep 22), 40% cheaper than Opus 5** | Model / Cost | implementer | **Adopt — replace claude-sonnet-4-6 for implementer** |
| **Claude Sonnet 5.5 — new fast tier (Sep 22, imminently GA)** | Model / Cost | test-engineer, reviewers, debugger | **Adopt — replacement for haiku-4-5 once GA; watch for release** |
| **Opus 5.5 cache reads 5% of input price — 60% cheaper than Opus 5** | Cost | implementer multi-step workflows | **Adopt — free optimization, reconfigure caching TTL** |
| **Fable 5.1 cache reads 2.5% of input price — 75% cut vs Fable 5** | Cost | spec-lead, architect | **Adopt — most impactful caching change this cycle** |
| **Claude Plugins directory opened Sep 25 — submit MCP connectors** | Agent Tooling | architect | **Watch — Flinks/Plaid adapter pathway now exists; not yet act** |
| **Plaid official MCP server — confirmed live, Canada coverage** | Agent Tooling | implementer, architect | **Trial — vet before adopting; verify Canada institution coverage** |
| **MCP 2026-07-28 RC published — stateless protocol, OAuth 2.1** | Agent Tooling | architect | **Act — design any custom MCP server stateless from the start** |
| **Claude Code v2.1.269 — `claude plugin eval` command** | Agent Tooling / Quality | test-engineer | **Adopt — A/B test agent skills with baseline comparison** |
| **Claude Code v2.1.283 — `availableModelsMatch: exact` + `/doctor`** | Agent Tooling / Security | All agents, CI | **Adopt — lock team to new model list, audit stale prompts** |
| **Deadbugz MCP supply-chain campaign — active, targets PRs** | Security | code-reviewer, security-reviewer | **Act — add PR hook: flag any commit touching .claude/ MCP files** |
| **Three August 2026 MCP CVEs (Atlassian, ArcadeDB, Facebook Ads MCP)** | Security | architect | **Monitor — add path-traversal and cleartext-secret checks to vetting** |
| **Spec Kit v1.0.0 — major milestone, Aug 21** | Toolchain | spec-lead | **Adopt — upgrade from v0.11.6; 1.0.5 is current** |
| **APM v0.32.0 (Sep 25)** | Toolchain | All developers | **Adopt — significant version jump from v0.21.0** |
| **RTR By-law in force Aug 24, Q4 2026 first participants** | Compliance | architect, spec-lead | **Act — update Phase 2 timeline in PDR; RTR live this year** |
| **CDBA draft regulations comment closed Aug 26** | Compliance | architect, spec-lead | **Monitor — watch for final regulations publication** |
| **Bill C-36 (PPCDA) — tabled Jun 15, second reading** | Compliance | security-reviewer, spec-lead | **Monitor — replaces PIPEDA; penalties up to 5% global revenue** |
| **FINTRAC Sep 2026 enforcement wave — gaming, crypto, AI** | Compliance | architect | **Monitor — watch for AI-specific guidance** |
| **Wealthsimple family/business banking launch (May 2026)** | Competitive | spec-lead | **Monitor — household view now table stakes; affects PerFiApp roadmap** |
| **KOHO banking license under OSFI fast-track (12-month target)** | Competitive | spec-lead | **Monitor — potential full-bank competition in 2027** |

---

## Track 1 — Model & Capability Updates

### 1.1 RESOLVED: Fable 5 / Mythos 5 export-control suspension lifted July 1, 2026

**Status changed from "Suspended" to "Restored."**

US Commerce Secretary Howard Lutnick confirmed on June 26 that export controls were lifted after coordinated review. Anthropic began restoring access to Fable 5 for all customers globally starting July 1; Mythos 5 access was partially restored starting June 26 to approved US organizations, and Mythos 5 remains restricted to vetted customers in Project Glasswing.

This is now superseded by Fable 5.1 (see 1.3 below). `claude-fable-5` should not be the adoption target; migrate to `claude-fable-5-1`.

Sources: [VentureBeat — Fable 5 restored](https://venturebeat.com/technology/anthropic-is-bringing-back-claude-fable-5-globally-after-us-lifts-export-control-order-where-can-enterprises-access-it/) / [Anthropic news](https://www.anthropic.com/news/claude-fable-5-mythos-5) / [GovConWire](https://www.govconwire.com/articles/anthropic-fable-5-mythos-5-access-restored)

### 1.2 RESOLVED: claude-opus-4-1-20250805 retired August 5, 2026

Confirmed retired. Requests to this model ID now return API errors. Verify no live traffic via Claude Console Usage Export.

Source: [Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.3 URGENT: claude-haiku-4-5-20251001 retires not before October 15, 2026 — 17 days away

**Status changed from "Watch" (prior report) to "Act."**

The June 24 report noted this date was not before October 15, 2026. That date is now 17 days away. The current model assignments use `claude-haiku-4-5` for five agents (test-engineer, code-reviewer, security-reviewer, debugger, and potentially researcher). All five need migration by October 15.

The best replacement is `claude-sonnet-5-5` (see 1.5 below), which Anthropic announced September 22 but whose GA date is not yet confirmed as of September 28. The fallback is `claude-sonnet-4-6` (active, retires not before February 17, 2027). Do not delay until October 14.

Source: [Anthropic models overview — verified](https://platform.claude.com/docs/en/models/overview) / [EOSL dates](https://eosl.date/eol/product/claude/)

### 1.4 ADOPT: Claude Fable 5.1 — new top model (September 1, 2026)

`claude-fable-5-1` replaces Fable 5 and should replace `claude-opus-4-8` for the spec-lead and architect agents. Key specs verified from the live models overview:

- **API ID:** `claude-fable-5-1`
- **Price:** $10/M input, $50/M output (unchanged from Fable 5)
- **Cache reads: $0.25/M (2.5% of input price) — 75% cut vs Fable 5's $1.00**
- **Context:** 1M tokens; max output: 128K tokens
- **Thinking:** Adaptive, always on; default effort: `high`
- **Knowledge cutoff:** June 2026
- **Retirement:** Not before September 1, 2027

For PerFiApp: Fable 5.1 is positioned for "demanding reasoning and long-horizon agentic work" — exactly the spec-lead (constitution management, spec authoring, clarifying requirements) and architect (technical design, task sequencing) use cases. The 75% cache-read cost reduction is the most material cost change this cycle: for agentic sessions that repeatedly send a long system prompt or constitution, this is a meaningful saving.

Sources: [Anthropic models overview](https://platform.claude.com/docs/en/models/overview) / [VentureBeat Fable 5.1](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads/) / [TechCrunch](https://techcrunch.com/2026/09/22/anthropic-releases-opus-5-5-with-lower-prices-and-fable-level-performance/)

### 1.5 ADOPT: Claude Opus 5.5 — new middle tier (September 22, 2026)

`claude-opus-5-5` is the recommended replacement for `claude-sonnet-4-6` in the implementer role. Verified specs:

- **API ID:** `claude-opus-5-5`
- **Price:** $4/M input, $20/M output
- **Cache reads: 5% of input price ($0.20/M) — 60% cheaper than Opus 5**
- **Context:** 1M tokens; max output: 128K tokens
- **Thinking:** Adaptive, always on; default effort: `medium`
- **Knowledge cutoff:** June 2026
- **Retirement:** Not before September 22, 2027
- **Speed:** 30% faster than Opus 5; "Fast mode" available at 2.5x speed for $8/M input / $40/M output

Anthropic positions Opus 5.5 for "long-running agentic coding and knowledge work" and says it performs at Fable 5.1 level on most work. For PerFiApp's implementer agent (writing NestJS/TypeScript financial code, enforcing money-as-integer conventions, wiring i18n keys), this is a direct upgrade from Sonnet 4.6 with a substantial capability increase and materially lower cost than Fable 5.1.

Sources: [Anthropic models overview](https://platform.claude.com/docs/en/models/overview) / [TechCrunch Opus 5.5](https://techcrunch.com/2026/09/22/anthropic-releases-opus-5-5-with-lower-prices-and-fable-level-performance/) / [Benzinga](https://www.benzinga.com/markets/private-markets/26/09/61933271/anthropic-launches-claude-opus-5-5-cuts-costs-40-and-scraps-5-hour-usage-caps)

### 1.6 WATCH: Claude Sonnet 5.5 — announced September 22, not yet GA

`claude-sonnet-5-5` was announced alongside Opus 5.5 but is described as "releasing in the coming weeks" as of September 22. It is listed on the live models overview page as an active model already with an API ID of `claude-sonnet-5-5`, suggesting it may already be available. Verify on the Claude Console before migrating Haiku-tier agents.

Pricing from the models page: $2/M input, $10/M output. Cache reads: 5% of input ($0.10/M). Retirement: not before September 28, 2027. Described as "best combination of speed and intelligence" — suitable for test-engineer, code-reviewer, security-reviewer, debugger, and researcher.

### 1.7 Updated model deprecation table (verified September 28, 2026)

| Model ID | Status | Retirement |
|---|---|---|
| `claude-fable-5-1` | **Active (top)** | Not before Sep 1, 2027 |
| `claude-opus-5-5` | **Active** | Not before Sep 22, 2027 |
| `claude-sonnet-5-5` | **Active (announced/GA)** | Not before Sep 28, 2027 |
| `claude-haiku-4-5-20251001` | **Active — 17 days to retirement** | **Not before Oct 15, 2026** |
| `claude-fable-5` | Legacy (available) | — |
| `claude-opus-5` | Legacy (available) | — |
| `claude-opus-4-8` | Legacy (available) | Not before May 28, 2027 |
| `claude-sonnet-4-6` | Legacy (available) | Not before Feb 17, 2027 |
| `claude-opus-4-1-20250805` | **Retired** | August 5, 2026 |

Source: [Anthropic models overview — verified directly](https://platform.claude.com/docs/en/models/overview)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 STATUS CHANGE: Agent SDK billing split — still paused, no new announcement

No new Anthropic announcement on the billing split since the June 15 pause. The change remains on hold; programmatic usage still draws from subscription limits. The recommendation from the prior report to begin tracking Agent SDK token consumption via Console Usage Export still stands. No action required this sprint.

Sources: [The New Stack — pause](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/) / [Releasebot September 2026](https://releasebot.io/updates/anthropic)

### 2.2 New: Opus 5.5 Fast Mode — 2.5x speed for time-sensitive agent steps

Claude Code now exposes "Fast mode" for Opus 5.5 at $8/M input / $40/M output. This is relevant for the implementer agent during interactive coding sessions where latency matters more than cost. For batch or overnight runs, standard Opus 5.5 at $4/$20 is preferred. The `maxEffortLevel` setting added in Claude Code week 37 can also cap effort spending across all providers.

### 2.3 New: Cache read pricing across the new model tier

The new cache read pricing is the single largest cost optimization opportunity this cycle:

| Model | Cache read (per M tokens) | vs. prior |
|---|---|---|
| `claude-fable-5-1` | $0.25 (2.5% of input) | 75% cut from Fable 5 |
| `claude-opus-5-5` | $0.20 (5% of input) | New model |
| `claude-sonnet-5-5` | $0.10 (5% of input) | New model |
| `claude-haiku-4-5` | ~$0.10 (varies) | No change |

For PerFiApp's agents, which carry a substantial system prompt (the constitution, agent role definitions, coding conventions), cache hits on the system prompt at Fable 5.1 rates means the cost of repeated spec-lead calls approaches the cost of Haiku-tier work.

Source: [Anthropic models overview — pricing footnote verified directly](https://platform.claude.com/docs/en/models/overview)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 MCP 2026-07-28 RC published — confirmed stateless protocol

The release candidate published on July 28 as forecast. Key confirmed changes from the RC:

- **Sessions removed:** `Mcp-Session-Id` header and the `initialize`/`initialized` handshake are eliminated. State is carried in `_meta` on each request or via explicit server-minted handles passed as arguments.
- **OAuth 2.1 mandatory:** MCP servers are now formally OAuth 2.1 resource servers and must implement RFC 9728 (Protected Resource Metadata) for automatic authorization server discovery.
- **Tasks extension:** Servers can return a task handle from `tools/call`, enabling long-running agentic work with `tasks/get`, `tasks/update`, `tasks/cancel`.
- **`Mcp-Method` and `Mcp-Name` headers required** on Streamable HTTP for load balancer routing.
- The ten-week validator window for SDK maintainers runs through approximately October 6, 2026.

**For PerFiApp:** Two design implications: (1) Any Flinks adapter built as an MCP server must be stateless from day one — do not rely on session state. (2) The OAuth 2.1 requirement aligns perfectly with CDBA's accreditation requirements; building a compliant MCP auth layer now satisfies both MCP 2.0 and CDBA at once.

Sources: [MCP 2026-07-28 RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [WorkOS analysis](https://workos.com/blog/mcp-2026-spec-agent-authentication) / [AAIF migration guide](https://aaif.io/blog/mcp-2026-07-28-whats-changing-and-how-to-migrate)

### 3.2 Plaid official MCP server — confirmed live with Canada coverage

Plaid's official MCP server is live and listed on PulseMCP and the MCP directory. It exposes account linking, transaction data, balance checks, identity verification, and payment initiation via natural language. Plaid supports 10,000+ institutions across the US and Canada.

**For PerFiApp's architect:** This is the fastest path to a working banking-data integration for proof-of-concept work. However, the standard vetting checklist from prior reports must be applied: verify authentication is implemented (not the CVE-2026-32211 pattern), check whether the MCP server is running Streamable HTTP or STDIO (STDIO is not suitable for remote deployment), and confirm Canadian institution coverage against PerFiApp's target bank list. Plaid's Canadian data access relies on screen-scraping partnerships for some institutions — verify which use OAuth vs. credential-based flows before committing.

Sources: [PulseMCP Plaid server](https://www.pulsemcp.com/servers/plaid) / [OpenBankingTracker — Plaid MCP](https://www.openbankingtracker.com/api-aggregators/plaid/mcp) / [Plaid Canada institutions](https://plaid.com/docs/institutions/)

### 3.3 Claude Plugins directory launched September 25, 2026

Anthropic opened a developer portal at `claude.ai/directory/manage` for submitting MCP connectors and plugin bundles. Plugins package MCP servers and Agent Skills together, submitted as a GitHub repository. MCP usage across Claude products is reportedly up 110x this year. An official `anthropics/claude-plugins-official` repository tracks Anthropic-managed plugins.

**For PerFiApp:** When the team builds a Flinks adapter or a Canadian banking MCP server, this directory is the distribution path. No partner agreement required. Relevant to the medium-term recommendation from the prior report about contacting Flinks about an official MCP server — the directory submission portal now makes this a self-serve pathway.

Sources: [Anthropic blog — plugins portal](https://claude.com/blog/build-plugins-for-claude) / [Unite.AI](https://www.unite.ai/anthropic-opens-directory-submission-portal-for-claude-plugins/) / [AlphaSignal](https://alphasignal.ai/news/anthropic-opens-claude-plugin-portal-with-110x-mcp-growth-this-year)

### 3.4 Claude Code changelog since v2.1.187 — key additions (v2.1.188–v2.1.283)

Nearly 100 versions shipped between June 23 and September 25. The most actionable for PerFiApp:

**v2.1.257 (September 1) — Claude Fable 5.1 as default**
Fable 5.1 became the Claude Code default model. Claude Code sessions not specifying a model will use Fable 5.1 unless `ANTHROPIC_MODEL` or the `model` config key is set. For PerFiApp, this means the CI researcher workflow and any CI PR-review run without a pinned model ID will now use Fable 5.1. This is likely an improvement but worth confirming explicitly.

**v2.1.269 (September 11) — `claude plugin eval`**
See Track 4. Also adds: agent map visualization in VS Code extension, `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` for concurrency control (1–256), repository-aware OpenTelemetry fields for distributed tracing. Note: v2.1.270 patch fixes a read-only Git permission regression in v2.1.269 — the safe floor is v2.1.270.

**v2.1.283 (September 25) — model governance controls**
`availableModelsMatch: "exact"` blocks any model version not explicitly listed (tighter than the previous prefix match). `deniedModels` blocks specific models even when `availableModels` allows the family. New `/doctor` prompt-audit command flags CLAUDE.md, skills, agents, and commands written for older models — relevant for catching any stale `claude-haiku-4-5` references post-October 15.

**Week 37 (September 7–11) — `maxEffortLevel` and pane pop-out**
`maxEffortLevel` setting caps effort on every provider — prevents runaway spending on expensive Fable 5.1 calls in sessions that don't need high effort. For PerFiApp's implementer agent, setting `maxEffortLevel: medium` would cap Opus 5.5 effort and reduce costs on straightforward coding tasks.

Sources: [Claude Code whats-new week 37](https://code.claude.com/docs/en/whats-new/2026-w37) / [AiCybr — v2.1.269](https://aicybr.com/blog/claude-code-2-1-269-plugin-evals-agent-map-workflow-controls) / [Havoptic — v2.1.283](https://www.havoptic.com/tools/claude-code) / [Claude Code Changelog](https://claudefa.st/blog/guide/changelog)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval — no major release since v4.0 (June 22); incremental updates only

The June 24 "Adopt" verdict stands. The changelog for 2026 shows incremental reliability improvements and additional tracing guides (multi-turn chatbots, RAG flows, AI agents with `thread_id` grouping) but no major version release. The TypeScript support and `deepeval generate` CLI command adopted in the prior sprint remain the key features for PerFiApp's test-engineer.

One addition worth noting: `CONFIDENT_TRACE_INTERNAL` now enables optional internal tracing for metric and model methods, providing more granular span visibility when debugging why a bilingual (EN/FR) test case fails a coherence metric.

Source: [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026)

### 4.2 New: Claude Code `claude plugin eval` — A/B testing for agent skills

As detailed in 3.4, `claude plugin eval` (introduced v2.1.269, week 37 of 2026) runs each test case twice — once with the plugin and once without — and scores both. This provides a controlled A/B signal for whether a new agent skill or MCP connector actually improves outcomes, not just whether it produces an output.

**For PerFiApp's test-engineer:** This is the evaluation primitive missing from the prior DeepEval integration. `deepeval generate` synthesizes test cases; `claude plugin eval` scores them against a baseline. Using both together gives the test-engineer a complete eval loop for any new agent capability. `claude plugin eval init` drafts the test suite structure — run it when adding a new Spec Kit skill or Flinks connector tool.

Source: [Claude Code week 37](https://code.claude.com/docs/en/whats-new/2026-w37) / [Developers Digest — plugin evals](https://www.developersdigest.tech/blog/claude-code-plugin-evals-ci)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v1.0.0 (August 21, 2026) — major milestone; current is v1.0.5

**Status changed: prior report was at v0.11.6; current is v1.0.5.**

Spec Kit reached its 1.0.0 milestone on August 21, 2026 — one year after the first commit. The release centers on five primitives: extensions, presets, integrations, workflows, and steps, plus bundles and catalogs. The integrations reference lists 50+ supported AI coding agents. Additional releases through v1.0.5 added workflow slots, Muse Code agent integration, and extension updates.

**For PerFiApp:** This is a meaningful stability signal — the project considers the API stable. The jump from v0.11.6 to v1.0.5 should be treated as a minor migration; review the CHANGELOG for any breaking changes in the workflow engine before upgrading in CI. The `security-governance` preset (v0.6.0 as of the prior report) may have updated further — worth checking the latest version.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.5`

Sources: [Spec Kit v1.0.0 announcement](https://www.manorrock.com/blog/2026/08/21/spec_kit_turns_one.html) / [newreleases.io v1.0.5](https://newreleases.io/project/github/github/spec-kit/release/v1.0.5) / [Spec Kit releases](https://github.com/github/spec-kit/releases)

### 5.2 APM v0.32.0 (September 25, 2026) — significant version jump from v0.21.0

**Status changed: prior report was at v0.21.0; current is v0.32.0 (11 minor versions).**

The September 25 release cuts v0.32.0 from 18 PRs merged since v0.31.0, with 12 user-facing entries and migration notes. The full changelog between v0.21.0 and v0.32.0 is available at the GitHub CHANGELOG. The `allowExecutables` gate from v0.21.0 (adopted in the prior sprint) is still present. The migration notes for v0.32.0 specifically call out breaking changes — review before upgrading in CI.

**For PerFiApp:** The SBOM export (v0.21.0) and `allowExecutables` gate are confirmed still active. The main action here is reviewing migration notes for anything that breaks the existing `apm.yml` configuration before upgrading.

Sources: [microsoft/apm CHANGELOG](https://github.com/microsoft/apm/blob/main/CHANGELOG.md) / [APM v0.32.0 PR](https://github.com/microsoft/apm/pull/3080)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CRITICAL: "Deadbugz" — active MCP supply-chain campaign via GitHub PRs

Disclosed August 30–September 2, 2026 by Pillar Security and the Cloud Security Alliance.

**How it works:** An attacker submits an unsolicited pull request adding a new MCP server named `productivity-suite`. The server offers text formatting and summarization — appears benign in code review. After three tool calls by a connected agent, the server dynamically alters the instructions it returns to the AI, directing it to seek SSH keys, AWS credentials (`~/.aws/credentials`), shell history, and Kubernetes configs, and to conceal the activity from the user. The payload is hidden behind a runtime call counter, not in static code or configuration, bypassing static analysis.

**For PerFiApp:**
1. The automated PR-review workflow runs code-reviewer and security-reviewer on every PR. Neither agent currently has an explicit check for MCP server additions. Add a rule to both agent system prompts: any commit that adds or modifies files matching `.claude/*.json`, `apm.yml` MCP entries, or any directory named `*-mcp*` or `*mcp-server*` must receive explicit human review with a comment explaining what the server does and where its code is hosted.
2. The `sandbox.credentials: false` setting from v2.1.187 (prior report, "Adopt") directly limits what a Deadbugz-style server can exfiltrate from sandboxed bash commands. Confirm this is active in the project settings.
3. The Claude Plugin directory (3.3) may help here long-term — approved plugins go through Anthropic review. Restricting agents to directory-listed plugins when possible reduces exposure.

Sources: [Pillar Security — Deadbugz](https://www.pillar.security/blog/deadbugz-currently-active-mcp-supply-chain-campaign) / [Cloud Security Alliance notes](https://labs.cloudsecurityalliance.org/research/csa-research-note-deadbugz-mcp-supply-chain-20260830-csa-sty/) / [CSA — metadata poisoning](https://labs.cloudsecurityalliance.org/research/csa-research-note-deadbugz-mcp-metadata-poisoning-20260902-c/)

### 6.2 Three new MCP CVEs (August 2026) — path traversal, cleartext token, SSRF

Three MCP server CVEs disclosed in August 2026. None is Claude-specific:

- **CVE (Atlassian Confluence MCP tool) — path traversal:** Any authenticated client can request arbitrary file reads by traversing the path in a resource URI. CVSS 7.7. Fixed in v0.22.0 of the Confluence MCP tool.
- **CVE (ArcadeDB MCP tool) — cleartext cluster token:** A settings tool exposed over MCP returns a high-availability cluster token in cleartext. CVSS 7.7. Fixed in ArcadeDB 26.7.3.
- **CVE (Facebook Ads MCP server) — SSRF:** Server-side request forgery in a Facebook Ads MCP server.

**Root cause pattern:** All three are classic web vulnerability classes appearing in MCP implementations because MCP server developers are not applying standard web-security hygiene to their tool implementations. Add to PerFiApp's MCP vetting checklist: (c) "Do any resource URI parameters traverse to local filesystem paths?" and (d) "Do any tool responses return raw credentials, tokens, or connection strings?"

Sources: [Adversa.ai — Sep 2026 MCP security](https://adversa.ai/blog/top-mcp-security-resources-september-2026/) / [Practical DevSecOps statistics](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/)

### 6.3 Claude Code v2.1.283 `/doctor` command — stale model reference audit

The new `/doctor` command in v2.1.283 audits CLAUDE.md, skills, agents, and commands for references to older model versions. For PerFiApp, this is the practical tool for ensuring no agent file still references `claude-haiku-4-5`, `claude-sonnet-4-6`, or `claude-opus-4-8` after the migration. Run `/doctor` as part of the model-migration PR review.

Source: [Havoptic — v2.1.283](https://www.havoptic.com/tools/claude-code) / [Claude Code release notes](https://www.claudeupdates.dev/version/2.1.283)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 CDBA STATUS UPDATE: Draft regulations closed for comment August 26

**Status changed from "Timeline slipping, still in information-gathering" to "Draft regulations published, comment period closed."**

The proposed Consumer-Driven Banking Regulations were published in the Canada Gazette on June 27, 2026 — the first time the framework moved from legislative intent to specific operational requirements. Key provisions in the draft: accreditation criteria, security standards, authentication and consent requirements, reporting and record-keeping obligations, technical standards, and violation enforcement. The public comment period closed **August 26, 2026**. The Office of the Privacy Commissioner filed a formal submission.

Next step: the Bank of Canada is reviewing comments and drafting final regulations. No confirmed date for final publication. Phase 1 (read access) remains nominally targeted for 2026, but a 2026 launch is still described as at risk.

**For PerFiApp:** The draft regulations are now public — the architect and spec-lead should review them directly (Canada Gazette link below) to ensure the authentication and consent architecture aligns with the final accreditation requirements. This is the most concrete compliance artifact produced by the framework to date.

Sources: [Canada Gazette — draft regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Finance Canada announcement](https://www.canada.ca/en/department-finance/news/2026/06/government-pre-publishes-regulations-to-prevent-fraud-and-facilitate-the-next-phase-of-consumer-driven-banking.html) / [OPC submission](https://www.priv.gc.ca/en/opc-actions-and-decisions/submissions-to-consultations/sub_fc_20260826/) / [Bennett Jones analysis](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations)

### 7.2 RTR STATUS UPDATE: By-law in force August 24, Q4 2026 first participants

**Status changed from "Q4 2026 phased launch" to "Legal framework live, first participants imminent."**

Both the RTR By-law and the RTR Rules received all necessary approvals and came into force on **August 24, 2026**. The schedule:

- **Q4 2026:** Initial direct participants go live (ISO 20022, irrevocable, up to CAD 100,000 per transaction)
- **Q1 2027:** Interac e-Transfer clearing-and-settlement migration begins
- **Q2 2027:** Additional migration
- **Q3 2027:** Participants reach full transaction volumes

**For PerFiApp:** RTR is now legally operational, not a future planning exercise. PerFiApp's Phase 2 payment-initiation design (Pay & Payment Optimization, Cash Safety modules) should reflect Q4 2026 first-participant availability. The CAD 100,000 limit covers all retail personal-finance use cases. ISO 20022 data richness enables richer payment metadata — relevant for transaction enrichment and Due-Date Coach features.

Sources: [McCarthy Tétrault — RTR By-law](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published) / [Crowdfund Insider — RTR launch](https://www.crowdfundinsider.com/2026/08/296334-real-time-payments-go-into-effect-in-canada-this-month/) / [Payments Canada RTR](https://www.payments.ca/systems-services/payment-systems/real-time-rail-payment-system)

### 7.3 Bill C-36 (PPCDA) — tabled June 15, replaces PIPEDA if passed

**New finding. Prior reports tracked Bill C-27 (died January 2025 when Parliament prorogued). C-27 is now C-36.**

The Protecting Privacy and Consumer Data Act (PPCDA) was tabled on June 15, 2026 and is at second reading in the House of Commons. PIPEDA remains in force until it passes. Key differences from prior iterations:

- Replaces Part 1 of PIPEDA with a modernized framework recognizing privacy as a fundamental right
- Creates a new **Digital Safety and Data Protection Commission** (separate from the OPC) as the enforcement body
- **Penalties: up to $10M or 3% of global revenue** (standard), **up to $25M or 5% of global revenue** (most serious offences)
- Special protections for children's data
- Data mobility rights (relevant to open banking)

**For PerFiApp:** If C-36 passes (uncertain — this is the third iteration of this reform), the penalty exposure multiplies substantially compared to PIPEDA. The architect and security-reviewer should note that the data-mobility provisions align with CDBA — the two bills are coordinated. The compliance posture for PIPEDA and the emerging CDBA framework should be designed to satisfy C-36's requirements as well, since the direction of travel is clear even if timing is uncertain.

Sources: [DLA Piper — C-36 analysis](https://www.dlapiper.com/en/insights/publications/2026/06/canada-tables-bill-c-36-the-protecting-privacy-and-consumer-data-act) / [Canada.ca backgrounder](https://www.canada.ca/en/innovation-science-economic-development/news/2026/06/government-of-canada-introduces-legislation-to-protect-canadians-privacy-in-the-digital-age.html) / [Osler analysis](https://www.osler.com/en/insights/reports/the-protecting-privacy-and-consumer-data-act-bill-c-36-key-obligations-and-enforcement-overview/)

### 7.4 FINTRAC September 2026 enforcement — AI-specific oversight on the horizon

FINTRAC issued penalties against two Canadian gaming corporations in September 2026 for suspicious transaction reporting failures. More broadly, the September 2026 regulatory roundup describes "heightened crypto and AI oversight" as a theme. No AI-specific FINTRAC guidance has been published yet, but enforcement activity is increasing. PerFiApp should monitor for guidance that would apply if any module (Cash Advance Lite, payment initiation in Phase 2) triggers reporting-entity status.

Source: [Finscan regulatory roundup Sep 2026](https://www.finscan.com/post/regulatory-roundup-september-2026-aml-enforcement-sanctions-expansion-and-heightened-crypto-a)

---

## Track 8 — Competitive & Product Intel

### 8.1 Wealthsimple — family/business banking launched May 2026; SWIFT member

Wealthsimple launched a sweeping product suite in May 2026: Wealthsimple Households (consolidated view of all accounts across institutions), kids/teen chequing with parental controls (fall 2026), a business chequing account with prepaid business card, USD business accounts, and a business portfolio line of credit. Wealthsimple also became the **first Canadian fintech and second non-bank globally** to join the SWIFT network (March 2026).

**For PerFiApp:** Wealthsimple Households is the most directly competing feature — it offers a cross-institution consolidated view, which is core to PerFiApp's aggregation-first position. The differentiation PerFiApp needs to articulate is: bilingual (EN/FR) depth, AI coaching against the actual data, and the module breadth (credit, rewards, due-date coaching) that Wealthsimple does not yet offer. The spec-lead should assess whether the PDR's competitive analysis needs updating.

Sources: [BetaKit — Wealthsimple launch](https://betakit.com/wealthsimple-unveils-new-family-and-business-products-as-it-broadens-banking-push/) / [CBC News](https://www.cbc.ca/news/business/wealthsimple-launching-kids-businesses-9.7207296) / [Fintech.ca — SWIFT](https://www.fintech.ca/2026/03/03/wealthsimple-swift-power-faster-visible-money/)

### 8.2 KOHO — OSFI fast-track framework active; license decision within ~12 months

The prior report noted KOHO's $130M raise and "imminent" license application. The new development: OSFI introduced a **Targeted Fast-Track Framework** in June 2026 that provides initial feedback within four weeks and completes its risk-based review within 12 months. KOHO is described as "late in the final stages." If the fast-track timeline holds, an OSFI recommendation to the Minister of Finance could come as early as Q2 2027, with a final decision by Q3 2027.

**For PerFiApp:** A KOHO banking license within 12–18 months would mean PerFiApp faces a full-stack Schedule 1 bank with 2.5M existing users as a competitor. The aggregation-first, AI-coaching-forward positioning remains the differentiation, but the timeline for first-launch features is more urgent.

Sources: [Yahoo Finance — KOHO license](https://ca.finance.yahoo.com/news/2-5-million-canadians-already-111500202.html) / [money.ca — KOHO analysis](https://money.ca/banking/koho-schedule-1-bank-licence)

### 8.3 Monarch Money — no material new Canada features since June 24

The search results show Monarch competitors gaining ground in Canada (Waypoint Budget, Unified, Hardbacon) but no new major Monarch Money Canada features since the June 24 report's finding on AI assistant and credit tracking. The prior "Monitor" verdict holds. Notably, Monarch still prices in USD with no CAD option — a persistent friction point that PerFiApp's CAD-native billing can use as a differentiator.

Sources: [Lodavo — Monarch alternatives Canada 2026](https://www.lodavo.ca/blog/monarch-money-alternatives-canada)

---

## Recommended Next Steps

### Immediate (this week — before October 15)

1. **Migrate all Haiku-tier agents to `claude-sonnet-5-5`.** Confirm `claude-sonnet-5-5` is live in the Claude Console (it appears on the models page as active). Update agent files for test-engineer, code-reviewer, security-reviewer, debugger, and researcher. Run `/doctor` (Claude Code v2.1.283) after migration to catch any stale references. The fallback if Sonnet 5.5 is not yet accessible via API is `claude-sonnet-4-6` (retires Feb 17, 2027).

2. **Update spec-lead and architect to `claude-fable-5-1`.** Fable 5.1 is verified active from the primary models page. Replace `claude-opus-4-8` in both agent files. The 75% cache-read cost reduction makes this an immediate cost win on every session that sends the constitution or long system prompt. Remove any `fallbackModel` chain pointing to `claude-fable-5` (suspended model) — update to `["claude-opus-5-5", "claude-sonnet-5-5"]`.

3. **Update implementer to `claude-opus-5-5`.** Replace `claude-sonnet-4-6`. Set `maxEffortLevel: medium` for standard coding tasks to avoid over-spending on Fable-level compute. Use `effort: high` only for complex architectural decisions.

4. **Add Deadbugz MCP defense to code-reviewer and security-reviewer prompts.** Add an explicit rule: any PR that adds, modifies, or references MCP server files (paths matching `.claude/*.json`, entries in `apm.yml` under `mcp`, or directories containing `mcp-server`) must include a human-review comment that names the server, its hosting location, and its code repository. Reject any server using runtime-counter-based behavior gating.

5. **Verify `sandbox.credentials: false` is active.** This was adopted in the prior sprint but is underdocumented. Confirm the setting is present in the project `settings.json`. It directly limits Deadbugz-style exfiltration from sandboxed bash commands.

### Short-term (this sprint)

6. **Upgrade Claude Code to v2.1.283 (or v2.1.270 as minimum safe floor).** Pick up: `availableModelsMatch: "exact"` to lock the team to the new model list, `deniedModels` to explicitly block `claude-haiku-4-5` after migration, and `/doctor` for prompt auditing. Note: v2.1.269 has a read-only Git regression; the safe floor is v2.1.270.

7. **Upgrade Spec Kit to v1.0.5** from v0.11.6. Review the CHANGELOG between v0.11.6 and v1.0.5 for breaking changes before upgrading in CI. Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.5`.

8. **Upgrade APM to v0.32.0** from v0.21.0. Read the migration notes in the CHANGELOG for the 11 minor versions between v0.21.0 and v0.32.0 — breaking changes are called out in the v0.32.0 release notes.

9. **Add `claude plugin eval` to the test-engineer workflow.** Run `claude plugin eval init` for any Spec Kit skill or agent added to the team. Wire the eval output (JSON + HTML) into CI as an artifact. Pair with `deepeval generate` for test case synthesis.

10. **Read the CDBA draft regulations** (Canada Gazette link in 7.1). The architect and spec-lead should review the authentication, consent, and accreditation requirements in the proposed Consumer-Driven Banking Regulations before any open banking API design is locked. The MCP 2.0 OAuth 2.1 mandatory requirement (finding 3.1) aligns with CDBA's accreditation framework — designing them together saves a migration.

### Medium-term (next 4–6 weeks)

11. **Update the competitive analysis section of the PDR.** Three items changed: Wealthsimple now offers household consolidation (PerFiApp's core aggregation value prop is contested), KOHO is on a 12-month path to a banking license, and Monarch's persistent USD pricing creates a PerFiApp differentiation point that should be explicitly called out. Have spec-lead review the PDR's competitive module table.

12. **Evaluate the official Plaid MCP server** against the vetting checklist (authentication, RCE-via-exec, path traversal, Canadian institution coverage, OAuth vs. credential-based for Canadian banks). If it passes, trial in a development environment against a Plaid sandbox account. Compare Canadian bank coverage against Flinks before committing to Plaid as the primary aggregation path.

13. **Design any Flinks adapter as an MCP 2.0 stateless server with OAuth 2.1.** The RC's ten-week validator window runs approximately to October 6, 2026, after which SDK libraries will update. Build the Flinks adapter after SDK updates are available so it natively speaks MCP 2.0 protocol. This also positions it for submission to the Claude Plugins directory once complete.

14. **Monitor Bill C-36 second reading progress.** If C-36 advances to committee stage, engage external privacy counsel to gap-analyze PerFiApp's PIPEDA compliance posture against C-36's requirements. The penalty exposure (5% of global revenue for most serious offences) is sufficiently large that early alignment is worth the investment.

15. **Confirm `claude-opus-4-1` has zero live traffic** via Console Usage Export before closing out the prior-sprint action item. Retirement was August 5 — any traffic after that date is returning errors.

---

*Report generated 2026-09-28. All findings verified against primary sources where URLs are provided; model table verified directly against [platform.claude.com/docs/en/models/overview](https://platform.claude.com/docs/en/models/overview). Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
