# PerFiApp Agent Research — 2026-09-21

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: Canadian open-banking regulatory progress, model family expansion (Sonnet 5 / Opus 5 / Fable 5.1), Claude Code toolchain jump from v2.1.187 to v2.1.276, MCP 2026-07-28 specification now live, and new MCP CVE with no fix.

---

## Executive Summary

Five findings demand action this week or in the next 30 days:

1. **CVE-2026-75130 (Context7 MCP, CVSS 9.0) — no fix documented as of September 21.** If any developer or agent uses the Context7 MCP documentation server, remove it immediately. Exploiting the prompt-injection vulnerability exfiltrates credentials from environment files and performs destructive file deletion. There is currently no patched version available.

2. **claude-sonnet-4-5 tentative retirement window opens September 29 — 8 days.** The "not sooner than September 29, 2026" date means Anthropic can formally deprecate this model ID this week. PerFiApp's CI workflows already use `claude-sonnet-4-6` (verified), so no CI change is needed, but any developer running the agent team interactively with a manually set model should confirm they are not on `claude-sonnet-4-5-20250929`.

3. **claude-opus-4-1 is now RETIRED (August 5, 2026 deadline has passed).** The prior report gave 42 days of warning. Any system still calling `claude-opus-4-1-20250805` is receiving API errors right now. Audit Claude Console usage export.

4. **MCP 2026-07-28 spec is finalized and live in Claude Code.** Claude Code now negotiates the stateless MCP protocol by default for direct HTTP servers. If PerFiApp designs a Flinks adapter or any custom MCP server, stateless operation is no longer a future target — it is the current protocol. Session-based designs will fail with modern Claude Code clients.

5. **CDBA draft regulations consultation period closed August 26.** The Bank of Canada now holds final comments. Finalization and Phase 1 operational launch are expected within approximately one year of the Canada Gazette Part II publication. This is the clearest regulatory timeline PerFiApp has had to date. The FDX standard and specific API uptime/history requirements are now publicly visible — design can proceed against them.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| CVE-2026-75130 Context7 MCP CVSS 9.0 — no fix | MCP Security | All agents using documentation MCP servers | **Act — remove Context7 MCP immediately if used** |
| claude-opus-4-1 RETIRED August 5 | Model | Any system using this model ID | **Act — audit Console for live traffic** |
| claude-sonnet-4-5 retirement window opens Sept 29 | Model | Any developer with manual model setting | **Act — confirm no agent pinned to this ID** |
| MCP 2026-07-28 spec finalized, live in Claude Code | MCP | architect, implementer (Flinks adapter design) | **Act — design any custom MCP server stateless now** |
| CDBA draft regs consulted — finalization ~1 year | Compliance | architect, spec-lead | **Act — begin spec work against published requirements** |
| Claude Sonnet 5 ($2/$10 permanent pricing) | Cost | All agents — primary workhorse model | **Adopt — near-Opus-4.8 quality; replaces Sonnet 4.6 as default** |
| Claude Opus 5 (July 24, $5/$25) | Model / Cost | spec-lead, architect, security-reviewer | **Adopt — higher capability than Opus 4.8 at same price** |
| Claude Fable 5 restored July 1 — status resolved | Model | spec-lead, architect (for hardest reasoning tasks) | **Trial — was suspended in prior report; now GA globally** |
| Claude Fable 5.1 — cache read rate -75% ($0.25/MTok) | Cost | spec-lead (extended thinking workflows) | **Adopt — apply prompt caching to Fable 5.1 calls** |
| Claude Code v2.1.276 — auto mode now default | Toolchain | implementer | **Adopt — verify implementer agent permissions align with auto mode** |
| claude plugin eval (Sept 12, 2026) | Agent Quality | test-engineer | **Trial — native eval for agent plugins; applies to skills/subagents** |
| Spec Kit v1.0.0 (Aug 21) | Toolchain | spec-lead | **Adopt — major milestone; upgrade from v0.11.6** |
| Claude Code Projects beta — parallel threads | Toolchain | All agents | **Watch — multi-agent coordination; not production-stable yet** |
| AGENTS.md support (v2.1.277, Sept 18) | Toolchain | All developers | **Monitor — PerFiApp uses CLAUDE.md; interop concern only if adding Codex** |
| RTR By-law in force August 24; Q4 2026 pilot | Compliance | architect | **Monitor — Phase 2 payment initiation design can begin** |
| FINTRAC AMP increases: up to $4M for serious violations | Compliance | architect, spec-lead | **Act — review if any module triggers reporting-entity status** |
| KOHO OSFI banking license in late-stage review | Competitive | spec-lead | **Monitor — approval possible Q4 2026 / Q1 2027** |
| Wealthsimple SWIFT membership + family/business banking | Competitive | spec-lead | **Monitor — significantly expanded competitive footprint** |
| Agent SDK billing split — still paused | Cost | All CI users | **Monitor — no change; continue tracking usage** |
| claude-haiku-4-5 retirement window opens Oct 15 | Model | test-engineer (if using Haiku) | **Watch — 24 days; confirm no agent hardcodes this ID** |

---

## Track 1 — Canadian Compliance & Open Banking

### 1.1 STATUS CHANGE: CDBA Draft Regulations Published — Comment Period Now Closed

**Previous status:** No technical standards body designated, no accreditation criteria, 2026 launch widely seen as at risk.

**Current status:** Draft Consumer-Driven Banking Regulations published Canada Gazette Part I, June 27, 2026. The 60-day public comment period closed August 26, 2026. The framework now has published, concrete operational requirements.

Key requirements in the draft regulations that directly affect PerFiApp's architecture:

- **API uptime**: Participating entities must maintain 99.5% monthly uptime for data-sharing APIs
- **Data depth**: Minimum 24 months of transaction history must be available
- **Consent lifecycle**: Consumer consent must be renewed at least every 12 months
- **Records retention**: Five years for all data-sharing records
- **Technical standard**: FDX (Financial Data Exchange) is the named standard — not yet formally recognized in Canada, but now the clear industry choice. FDX is well-established in the US, and the draft regulations reference it as the likely interoperability baseline.
- **Accreditation**: Risk-based. PSPs already registered under the Retail Payment Activities Act (RPAA) get a streamlined pathway. Third-party fintech apps (PerFiApp's category) face more detailed requirements.
- **Oversight**: Bank of Canada is lead regulator. FCAC provides consumer-facing guidance.

**Timeline after comment period:** Final regulations (Canada Gazette Part II) will be published after the Bank of Canada processes comments. The framework is expected to come into force within approximately one year of that final publication. No specific date is confirmed.

**For PerFiApp:** This is the most concrete CDBA information available to date. The architect and spec-lead can now begin designing the data-sharing consent module and API integration layer against these published requirements rather than waiting for "something definitive." The FDX standard choice means: plan for OAuth 2.0 authorization code flow, FDX API schema for account and transaction data, and structured consent tokens. Flinks already implements this — their existing live programs with National Bank and EQ Bank are effectively Phase 1 previews.

Sources: [Canada Gazette Part I — Consumer-Driven Banking Regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Government of Canada press release](https://www.canada.ca/en/department-finance/news/2026/06/government-pre-publishes-regulations-to-prevent-fraud-and-facilitate-the-next-phase-of-consumer-driven-banking.html) / [Bennett Jones analysis](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations) / [McCarthy Tétrault analysis](https://www.mccarthy.ca/en/insights/blogs/techlex/canadas-consumer-driven-banking-framework-takes-shape-with-draft-regulations)

### 1.2 STATUS CHANGE: RTR By-law Now in Force — Q4 2026 Pilot Confirmed

**Previous status:** Targeting Q4 2026.

**Current status:** Both the RTR By-law and RTR Rules came into force on **August 24, 2026**. The legal foundation is complete. The first direct participants are targeting live Q4 2026. This is no longer a target — the infrastructure is legally authorized to operate.

Phased rollout timeline:
- **Q4 2026**: Initial participants go live (pilot phase)
- **Q1 2027**: Interac e-Transfer clearing and settlement migrates to RTR
- **Q2 2027**: Additional migration phase
- **Q3 2027**: Participants reach full transaction volumes

Initial transaction limit at launch: **CAD $100,000** (individual participants may set lower limits).

**For PerFiApp:** Phase 2 write-access open banking (payment initiation) depends on RTR. The RTR's legal framework is now live. Architecture for PerFiApp's Pay & Payment Optimization and Cash Safety modules should plan for RTR-based payment initiation becoming technically available Q1-Q2 2027 (when Interac migrates and volumes build). This aligns with Phase 2 open banking targeting mid-2027.

Sources: [Payments Canada By-law milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [McCarthy Tétrault RTR By-law analysis](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published) / [Crowdfund Insider launch update](https://www.crowdfundinsider.com/2026/08/296334-real-time-payments-go-into-effect-in-canada-this-month/)

### 1.3 STATUS UPDATE: FINTRAC Penalty Maximums Dramatically Increased

The March 26, 2026 Budget Implementation Act increased FINTRAC's Administrative Monetary Penalty (AMP) ceiling substantially:

- **Minor violation**: Maximum $40,000 (up from $1,000 — 40x increase)
- **Serious violation**: Maximum $4,000,000

Additional new obligation: Domestic and foreign MSBs must now **verify the eligibility of every agent or mandatary** that provides services on their behalf, before engagement and again every two years.

**For PerFiApp:** If any module — particularly Cash Advance Lite, or any future payment initiation feature — triggers reporting-entity status under PCMLTFA, the fines for a compliance failure are now in the millions, not thousands. The architect and spec-lead should explicitly scope whether any Phase 1 feature triggers MSB or RPAA registration requirements and, if so, consult legal counsel before launch.

Sources: [Fasken FINTRAC guidance](https://www.fasken.com/en/knowledge/2026/04/fintrac-provides-information-on-recent-changes-to-canadas-aml-regime) / [Blake's AML analysis](https://www.blakes.com/insights/canada-s-new-anti-money-laundering-legislation-significantly-raises-penalties-and-adds-new-violation/) / [AML Incubator FINTRAC 2026](https://amlincubator.com/blog/fintrac-2026-legislative-amendments-what-canadian-msbs-fintechs-and-crypto-platforms-must-know-1)

---

## Track 2 — Model & Capability Updates

### 2.1 RESOLVED: Claude Fable 5 Access Restored July 1, 2026

The suspension flagged as the lead finding in the June 24 report is resolved. The U.S. Department of Commerce lifted export controls on June 30, 2026. Access to `claude-fable-5` and `claude-mythos-5` was restored globally on July 1, 2026, across the Claude platform, Claude Code, AWS, GCP, and Azure.

Anthropic deployed updated safety classifiers to detect and block cybersecurity-related jailbreak techniques before restoring access. No nationality-based access controls were applied — the earlier unconfirmed June 18 report claiming "nationality controls" was inaccurate.

**For PerFiApp:** The fallback-chain emergency from the prior report is resolved. However, both Sonnet 5 (June 30) and Opus 5 (July 24) launched in the same window. The agent tiering recommendation is now more nuanced — see the consolidated model table below.

Sources: [Anthropic redeployment statement](https://www.anthropic.com/news/redeploying-fable-5) / [CNBC coverage](https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html)

### 2.2 NEW: Claude Sonnet 5 (June 30, 2026) — Permanent $2/$10 Pricing

`claude-sonnet-5` launched June 30 as the default model for Free and Pro plans. Introductory pricing of $2/$10 per MTok was made permanent — a planned September 1 price increase to $3/$15 was cancelled.

Capabilities: Near-Opus-4.8 performance at Sonnet pricing. 1M token context window. Particularly strong on agentic multi-step tasks. 90% savings with prompt caching; 50% with Batch API.

**For PerFiApp:** `claude-sonnet-5` should become the default model for the implementer, test-engineer, code-reviewer, and debugger agents. At $2/$10, it delivers substantially better capability than `claude-sonnet-4-6` at a lower price. The researcher agent (currently on `claude-sonnet-4-6` in CI) is a candidate for upgrade.

Sources: [Anthropic Sonnet 5 announcement](https://www.anthropic.com/news/claude-sonnet-5) / [QZ coverage](https://qz.com/anthropic-claude-sonnet-5-ai-agents-pricing-070126)

### 2.3 NEW: Claude Opus 5 (July 24, 2026) — Same Price, Higher Capability

`claude-opus-5` launched July 24 at $5/$25 per MTok — identical to Opus 4.8's pricing. Anthropic describes it as approaching Fable 5's capability at half the cost. Adds an effort toggle (low/medium/high) per request, allowing cost-performance tuning within a single model. Sets new state-of-the-art on agentic coding and knowledge-work benchmarks. Default on Claude Max.

**For PerFiApp:** The spec-lead and architect agents should upgrade from `claude-opus-4-8` to `claude-opus-5`. Same budget, meaningfully better capability for complex spec reasoning and technical design. The security-reviewer agent, which needs careful analysis of financial data flows, also benefits.

Sources: [Anthropic Opus 5 release — Axios](https://www.axios.com/2026/07/24/anthropic-releases-new-model-opus-5) / [Trend Topics analysis](https://www.trendingtopics.eu/anthropic-ships-opus-5-half-the-price-of-fable-5-and-even-better/)

### 2.4 NEW: Claude Fable 5.1 and Mythos 5.1 (September 1, 2026)

`claude-fable-5-1` launched September 1 at the same $10/$50 headline pricing as Fable 5, with one significant change: **cache read rate dropped 75% from $1.00 to $0.25 per MTok**. This makes extended-thinking workflows on Fable 5.1 materially cheaper. `claude-mythos-5-1` is limited to U.S. vetted organizations under Project Glasswing — not relevant for PerFiApp's current setup.

**For PerFiApp:** If the spec-lead agent is ever moved to Fable 5.1 for the hardest reasoning tasks (complex spec generation, compliance analysis), prompt caching is now highly cost-effective at $0.25 cached read rate. With 90% caching savings stacked on the already-discounted cache read, long spec sessions become significantly cheaper.

Sources: [MacRumors Fable 5.1](https://www.macrumors.com/2026/09/01/anthropic-claude-fable-5-1/) / [Avenue Z analysis](https://avenuez.com/blog/claude-fable-5-1-mythos-5-1-released/)

### 2.5 Updated Model Status Table

| Model ID | Status | Retirement (earliest) | Suggested agent |
|---|---|---|---|
| `claude-fable-5-1` | Active | Sept 1, 2027 | spec-lead (hardest tasks only) |
| `claude-fable-5` | Active | June 9, 2027 | — |
| `claude-opus-5` | Active | July 24, 2027 | spec-lead, architect, security-reviewer |
| `claude-opus-4-8` | Active | May 28, 2027 | fallback for Opus 5 |
| `claude-sonnet-5` | Active | June 30, 2027 | implementer, test-engineer, code-reviewer, debugger, researcher |
| `claude-sonnet-4-6` | Active | Feb 17, 2027 | CI baseline (current, stable) |
| `claude-opus-4-5` | Active | Nov 24, 2026 | — |
| `claude-haiku-4-5` | Active | Oct 15, 2026 earliest | cost-sensitive tasks |
| `claude-sonnet-4-5` | Active | **Sept 29, 2026 earliest** | migrate off immediately |
| `claude-opus-4-1` | **RETIRED** | August 5, 2026 | — |

Sources: [Anthropic model deprecations (official)](https://platform.claude.com/docs/en/about-claude/model-deprecations) / [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing)

---

## Track 3 — Claude Code & Agent Tooling

### 3.1 Claude Code v2.1.276 (September 18, 2026) — 89 versions since v2.1.187

The most relevant new features since the June 24 report, in order of priority for PerFiApp:

**AGENTS.md support (v2.1.277, September 18, 2026)**
Claude Code now reads `AGENTS.md` as a fallback when no `CLAUDE.md` exists in a directory. The file to prioritize can be changed under "Project instructions" in `/config`; both files can be loaded simultaneously.

For PerFiApp: PerFiApp uses `CLAUDE.md`, which takes priority by default — no change needed. However, if PerFiApp ever integrates with OpenAI Codex or another tool that reads `AGENTS.md`, the same instructions file can be loaded by both tools. No action required now; awareness item.

Source: [Anthropic AGENTS.md announcement](https://www.theregister.com/ai-and-ml/2026/09/18/anthropic-decides-to-support-openais-markdown-instructions-spec/) / [InfoWorld](https://www.infoworld.com/article/4224410/claude-code-now-also-accepts-instructions-in-openais-agents-md-format.html)

**claude plugin eval (September 12, 2026)**
New native Claude Code command: `claude plugin eval`. Creates test cases, runs the plugin against them, scores the results, then runs each case again without the plugin to produce a WITH vs. WITHOUT delta. Three evaluation layers: Static (deterministic, under 2 seconds), LLM Judge (semantic, 30 seconds, uses Haiku + Sonnet), Monte Carlo (50-100 simulated runs, 2-5 minutes). See Track 6 for full details.

**Auto mode is now default for new sessions (August 14, 2026)**
On Pro, Max, and Team plans, new Claude Code sessions start in auto mode. For the implementer agent running autonomous coding sessions, this means developers who have not explicitly configured permission policies will now be in auto mode by default.

For PerFiApp: Review the implementer agent's hooks in `.claude/settings.json`. The existing agent hooks are good, but consider adding explicit permission rules for any bash commands that touch credential files or financial data, especially now that auto mode is the default entry point for new contributors.

**Claude Code Projects beta**
New coordination layer: one project can manage parallel threads, shared memory, and a project library across multiple repos and tasks. Not production-stable — beta only.

**MCP 2026-07-28 negotiation by default**
Claude Code now initiates MCP 2026-07-28 (stateless) protocol negotiation by default for direct HTTP servers. Legacy MCP servers that use `Mcp-Session-Id` will need to handle the fallback or be upgraded.

**Per-command allowed_domains in Bash with sandboxing**
Auto mode with sandboxing now supports per-command network domain allowlists. For the implementer calling external APIs (Plaid sandbox, Flinks sandbox), specific domains can be allowlisted without opening the full network.

Sources: [Claude Code what's new](https://code.claude.com/docs/en/whats-new) / [Gradually.ai Claude Code changelog](https://www.gradually.ai/en/changelogs/claude-code/) / [Releasebot Claude Code September 2026](https://releasebot.io/updates/anthropic/claude-code)

### 3.2 Spec Kit v1.0.0 (August 21, 2026) — Major Milestone

Spec Kit shipped v1.0.0 exactly one year after its first public release, then v1.0.1 the same day, and subsequently v1.0.2 (August 31) and v1.0.5. The project now has 132,000+ GitHub stars, 150+ community extensions, 30+ community presets, and integration with 35+ coding agents.

The v1.0.0 release formalizes the "five primitives" framework: integrations, extensions, presets, workflows, and workflow steps. This is a conceptual reframing of what was previously loosely organized — if PerFiApp has any custom `.specify/` extensions or presets, the v1.0.x documentation is the canonical reference.

**For PerFiApp:** Upgrade from v0.11.6 to v1.0.5. The major version milestone means the API surface is now stable. The 35+ coding agent integrations include Claude Code as a first-class integration.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.5`

Source: [Spec Kit v1.0.0 milestone](https://www.manorrock.com/blog/2026/08/21/spec_kit_turns_one.html) / [GitHub Spec Kit releases](https://github.com/github/spec-kit/releases)

---

## Track 4 — MCP Ecosystem

### 4.1 STATUS CHANGE: MCP 2026-07-28 Specification Finalized and Live

**Previous status:** RC planned for July 28, ten-week validation window.

**Current status:** The 2026-07-28 specification shipped on schedule. Claude Code now negotiates this protocol version by default for direct HTTP connections. The specification is the production standard.

Key changes that affect PerFiApp design:

- **No more `Mcp-Session-Id`**: Protocol is fully stateless. Capability negotiation travels inline in a `_meta` field on each request. Any custom MCP server (e.g., a Flinks adapter) that PerFiApp designs must be stateless from day one.
- **`ttlMs` + `cacheScope` on list/resource read results**: For a financial data server, set these carefully: account balances and transactions must not be stale-cached across users. Set `cacheScope: "session"` (not `"global"`) for any user-specific financial data.
- **Tasks extension**: Long-running async operations are now a first-class MCP concept. Relevant for Plaid account linking flows or Flinks data ingestion jobs.
- **OAuth/OIDC alignment**: Authorization is more tightly aligned with standard OAuth flows — good news for integrating with CDBA's FDX OAuth requirements.

Sources: [MCP 2026-07-28 spec blog post](https://blog.modelcontextprotocol.io/posts/2026-07-28/) / [Microsoft App Service MCP stateless analysis](https://techcommunity.microsoft.com/blog/appsonazureblog/mcp-just-went-stateless-%E2%80%94-what-the-2026-spec-changes-about-scaling-on-app-servic/4530222) / [Google Developers MCP stateless update](https://developers.googleblog.com/scaling-ai-agent-infrastructure-with-the-mcp-stateless-updates/)

### 4.2 NEW CRITICAL: CVE-2026-75130 — Context7 MCP Prompt Injection, CVSS 9.0, No Fix

Published August 18, 2026. Context7 (one of the most widely installed MCP documentation servers — used to retrieve TypeScript, React Native, NestJS, and similar framework documentation) contains a prompt injection vulnerability through the Custom AI Instructions feature.

**Attack vector:** Attacker injects malicious instructions via custom instructions served through the MCP server. When any connected AI coding agent makes a routine library documentation request, the injected instructions execute.

**Impact:** Credential exfiltration from environment files (e.g., `PLAID_SECRET`, `FLINKS_API_KEY`, `ANTHROPIC_API_KEY` from `.env` or shell environment) to an attacker-controlled endpoint; destructive file deletion on the developer machine.

**Affected versions:** Context7 2.1.2 and earlier.

**Fix status:** No documented fix as of August 18, 2026 publication. The advisory notes no patched version exists in the affected range.

**For PerFiApp:** A financial-app developer environment is a high-value target. If any developer has installed Context7 MCP (commonly used for NestJS, React Native, TypeScript docs), remove it and disable it until a patched version ships. Flag in the code-reviewer and security-reviewer agents' instructions: reject any PR that adds Context7 to `.claude/settings.json` MCP configuration until a patched version is confirmed.

Sources: [CVE-2026-75130 OpenCVE](https://app.opencve.io/cve/CVE-2026-75130) / [Digital Applied advisory](https://www.digitalapplied.com/blog/context7-mcp-prompt-injection-cve-2026-75130) / [Strix.ai CVE detail](https://www.strix.ai/cve/CVE-2026-75130) / [The Hacker Wire RCE analysis](https://www.thehackerwire.com/context7-prompt-injection-leads-to-rce/)

### 4.3 MCP Security Landscape Q3 2026

14 CVEs were published against MCP implementations in Q3 2026, with approximately 200,000 exposed servers reported. A security statistics report from Practical DevSecOps notes that 82% of audited MCP implementations use file operations prone to path traversal, 67% use APIs related to code injection, and 34% use APIs susceptible to command injection.

The prior report's MCP vetting checklist items remain valid and should now include: "Has this server been updated since July 28, 2026 to support stateless operation?" — outdated servers using `Mcp-Session-Id` may have unfixed session management vulnerabilities in addition to being protocol-incompatible.

Source: [MCP Security Q3 2026 report](https://the-agent-report.com/2026/07/mcp-security-landscape-2026-vulnerabilities-mitigations/) / [Practical DevSecOps MCP security stats](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/)

---

## Track 5 — AI Cost & Token Optimization

### 5.1 Claude Sonnet 5 Pricing Locked at Introductory Rate — September Price Rise Cancelled

The planned September 1, 2026 standard pricing of $3/$15 per MTok for Sonnet 5 was cancelled. The $2/$10 introductory rate is now the permanent price. This changes the calculus for agent tiering: `claude-sonnet-5` now delivers near-Opus-4.8 capability at a price point competitive with the previous `claude-sonnet-4-6`, with substantially better output quality.

Stacked savings on Sonnet 5:
- Prompt caching: 90% off cached input tokens ($0.20/MTok cached vs $2.00/MTok standard)
- Batch API: 50% off ($1.00/$5.00 per MTok)
- Combined: up to 95% reduction in effective spend for repeated-context workflows

**For PerFiApp:** The implementer agent running long multi-step coding sessions benefits most from prompt caching on Sonnet 5. System prompt caching (5-minute TTL) should be enabled for all agent invocations.

Sources: [Anthropic Sonnet 5 announcement](https://www.anthropic.com/news/claude-sonnet-5) / [Finout pricing guide](https://www.finout.io/blog/anthropic-api-pricing) / [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing)

### 5.2 Fable 5.1 Cache Read Rate -75%

`claude-fable-5-1` reduces the cache read token cost from $1.00/MTok to $0.25/MTok — a 75% reduction. Standard token pricing ($10/$50) is unchanged. This specifically rewards workflows that cache large system prompts or repeated context against Fable 5.1.

**For PerFiApp:** The spec-lead agent's constitution and spec template system prompts are good cache candidates. If spec-lead is upgraded to Fable 5.1 for the hardest spec-generation tasks, prompt caching becomes significantly more economical than on Fable 5.

Source: [Fable 5.1 pricing analysis](https://cellcog.ai/blog/fable-5-1-release-date/) / [Avenue Z Fable 5.1 coverage](https://avenuez.com/blog/claude-fable-5-1-mythos-5-1-released/)

### 5.3 Agent SDK Billing Split — Still Paused

No change from the June 24 report. The planned billing split announced May 13 and paused June 15 has not been rescheduled as of September 21, 2026. Anthropic has committed to advance notice before any future change. CI research runs and workflow automation continue to draw from subscription quotas as before.

Source: [The New Stack — pause announcement](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/)

---

## Track 6 — Agent Quality & Evaluation

### 6.1 NEW: claude plugin eval — Native Claude Code Plugin Evaluation (September 12, 2026)

Anthropic's Claude Code team shipped `claude plugin eval` on September 12, 2026. This is the first first-party evaluation tool built directly into Claude Code.

How it works:
1. Define test cases for your plugin or skill
2. `claude plugin eval` runs each case with the plugin active, scoring across 10 quality dimensions
3. The same cases run again without the plugin, producing a WITH / WITHOUT delta (labeled "Δ")
4. Results include confidence intervals (Monte Carlo statistical layer), letter grades (Bronze through Platinum quality badges), and anti-pattern detection

Three evaluation layers:
- **Static**: Deterministic structural analysis, under 2 seconds, free
- **LLM Judge**: Semantic evaluation across 4 dimensions, approximately 30 seconds (uses Haiku + Sonnet)
- **Monte Carlo**: 50-100 simulated runs for statistical reliability, 2-5 minutes

**For PerFiApp:** The PerFiApp agent team lives in `.claude/agents/` as subagents rather than plugins. The `claude plugin eval` command is most directly applicable if PerFiApp adopts any skills/plugins from the Claude skills marketplace. However, the test-case framing (define inputs, compare WITH vs WITHOUT) is directly portable to a manual eval harness for the subagents. The test-engineer agent should investigate whether the Monte Carlo layer can be adapted for evaluating the implementer agent's code output quality.

Sources: [Claude Code plugin evals docs](https://code.claude.com/docs/en/plugin-evals) / [Developers Digest plugin eval](https://www.developersdigest.tech/blog/claude-code-plugin-evals-ci) / [Claude Directory plugin eval](https://www.claudedirectory.org/plugins/plugin-eval)

### 6.2 DeepEval 2026 — Enhanced Tracing and OpenTelemetry

DeepEval's 2026 updates (changelog through July 21, 2026) include richer trace fields, better OpenTelemetry export for distributed tracing, optional internal tracing for metric and model methods, and new guides for multi-turn chatbots, RAG flows, and AI agent evaluation. The July 2026 update added structured result exports and more flexible conversation simulation.

The prior report's Adopt verdict for DeepEval v4.0 stands. No breaking changes were found in the 2026 updates. The OpenTelemetry export improvement is relevant if PerFiApp adopts distributed tracing for its NestJS API layer.

Source: [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026)

---

## Track 7 — Competitive & Product Intel

### 7.1 KOHO Banking License in Late-Stage OSFI Review

KOHO's Schedule 1 bank licence application is described as being in "late-stage final stages" of OSFI review as of September 2026. Under the new OSFI fast-track framework: initial feedback within 4 weeks, risk-based review within 12 months, then the Minister of Finance has up to 3 months for final approval. With the $130M raise completed, the capital threshold is met.

If OSFI approves the licence and the Minister signs off, KOHO could receive a Schedule 1 banking licence before the end of 2026 or in early 2027. This would make KOHO Canada's first fintech-originated Schedule 1 bank.

**For PerFiApp:** A KOHO banking licence would transform the competitive landscape. KOHO would gain direct deposit accounts, CDIC deposit insurance eligibility, and lending capabilities — becoming a full bank with 2.5M existing users rather than a prepaid card app. PerFiApp's positioning as an aggregator-first, AI-coaching-first product becomes the differentiated angle, but the competitive intensity increases significantly.

Sources: [KOHO banking licence status](https://money.ca/banking/koho-schedule-1-bank-licence) / [Fintech Observer KOHO analysis](https://fintechobserver.substack.com/p/koho-canadas-most-used-neobank-app)

### 7.2 Wealthsimple: SWIFT Member, Family Banking, Business Banking

Since the prior report, Wealthsimple has executed one of the most aggressive product expansions in Canadian fintech history:

- **SWIFT membership (March 2026)**: First Canadian fintech and second non-bank fintech globally to join the SWIFT network, enabling faster, more visible international money transfers
- **Wealthsimple Households (live now)**: View and manage household finances across chequing, investments, mortgages, group RRSPs, and external accounts — directly comparable to PerFiApp's household financial aggregation concept
- **Wealthsimple Business (May 2026)**: Business chequing, prepaid business card (1% unlimited cashback), USD business accounts, portfolio line of credit from 3.95%
- **Kids/Teens accounts (Fall 2026 target)**: Chequing + spend card with parental controls
- **USD chequing account (Fall 2026 target)**: Cross-border access to USD and CAD payments

**For PerFiApp:** Wealthsimple is no longer purely an investing platform. It now covers: investing, chequing, savings, crypto, mortgage, household aggregation, business banking, cross-border payments, and family accounts. PerFiApp's differentiation must be sharper: specifically AI-first coaching, Canada-native bilingual (FR-CA is a noted Wealthsimple weakness), credit and rewards optimization depth, and the aggregation layer that surfaces insights across all accounts — including Wealthsimple accounts themselves. The spec-lead should review the PDR competitive analysis for freshness.

Sources: [Wealthsimple SWIFT membership](https://newsroom.wealthsimple.com/wealthsimple-becomes-first-canadian-fintech-to-join-swift-network) / [Wealthsimple family and business launch](https://www.fintech.ca/2026/05/21/wealthsimple-expands-into-family-and-business-banking/) / [CBC News expansion](https://www.cbc.ca/news/business/wealthsimple-launching-kids-businesses-9.7207296)

---

## Recommended Next Steps

### Immediate (this week)

1. **Remove Context7 MCP from all developer environments.** CVE-2026-75130 (CVSS 9.0) has no documented fix as of September 21. Run `claude mcp list` in each developer's Claude Code session and remove any Context7 entry. Add to the security-reviewer checklist: block any PR adding Context7 to `.claude/settings.json` until a patched version is confirmed.

2. **Audit Claude Console for traffic to `claude-opus-4-1-20250805`.** The August 5 retirement deadline has passed. Any system still calling this model receives errors. Go to Claude Console > Usage > Export to identify live traffic.

3. **Confirm no agent or developer session is pinned to `claude-sonnet-4-5-20250929`.** PerFiApp CI is verified safe (uses `claude-sonnet-4-6`). The concern is individual developer sessions where a manual `--model` flag or settings file might reference this ID. After September 29, Anthropic can formally deprecate it.

4. **Add MCP vetting checklist item: "Does this server support MCP 2026-07-28 stateless operation?"** Claude Code already negotiates the stateless protocol by default. Legacy servers using `Mcp-Session-Id` are protocol-incompatible and may have unfixed session security issues.

### Short-term (this sprint)

5. **Upgrade the agent model recommendations in team documentation.** Update `docs/AGENT_TEAM.md` with the new recommended models: Opus 5 for spec-lead/architect/security-reviewer (same price as Opus 4.8, higher capability); Sonnet 5 for implementer/test-engineer/code-reviewer/debugger (permanent $2/$10, near-Opus-4.8 quality).

6. **Enable prompt caching for all agent invocations.** With Sonnet 5 cached reads at $0.20/MTok (90% off), caching the system prompt for every agent call is the single highest-leverage cost optimization available. The 5-minute TTL system prompt cache should be enabled in any API wrapper or Claude Code configuration.

7. **Upgrade Spec Kit to v1.0.5** (from v0.11.6). The v1.0.0 milestone formalizes the "five primitives" framework and stabilizes the API surface. Install with: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.5`

8. **Begin design work on the consent and data-sharing module** using the published CDBA draft regulations as the specification source. Key design inputs now available: FDX standard for API schema, 24-month transaction history requirement, 12-month consent renewal cycle, 99.5% uptime SLA for data-sharing endpoints. Assign to spec-lead; use the architect to map these to the existing module structure in the PDR.

### Medium-term (next 4–6 weeks)

9. **Watch KOHO's OSFI decision.** An approval announcement before end of 2026 would be a significant competitive signal. The spec-lead should have a prepared response brief ready to update the PDR competitive analysis when this news breaks.

10. **Review Wealthsimple Households as a design reference.** This is the closest existing product to PerFiApp's household aggregation concept. The architect should assess what the "better than Wealthsimple Households" bar is for PerFiApp's equivalent feature, specifically around: bilingual (FR-CA parity), AI-driven insights vs. static dashboards, and integration with the credit/rewards modules.

11. **Design any custom MCP server (Flinks adapter) for stateless operation.** MCP 2026-07-28 is now the live protocol. Statelessness is mandatory, not aspirational. Design the consent token as a claim embedded in each request's `_meta` payload, not as a server-side session. Set `cacheScope: "session"` for all financial data tools to prevent cross-user cache pollution.

12. **Trial `claude plugin eval` for agent skill quality measurement.** Have the test-engineer agent define a test case suite for one of the existing agent skills (e.g., the security-reviewer's output on a known-bad diff). Run the WITH/WITHOUT comparison to establish a baseline quality score. This creates a regression-detection capability before the first feature is implemented.

13. **Monitor claude-haiku-4-5 retirement window (October 15, 2026 — 24 days).** Anthropic can formally deprecate this model after October 15. If any agent or tooling uses Haiku 4.5, confirm the next intended model for that workload is ready (Sonnet 5 at $2/$10 makes the cost argument for staying on Haiku weaker).

---

*Report generated 2026-09-21. Findings verified against primary sources including Anthropic's official model deprecations page, Canada Gazette, Payments Canada, FINTRAC, and CVE databases. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
