# PerFiApp Agent Research — 2026-08-17

**Third run. Delta report vs 2026-06-24.** This run leads with three status changes that have now resolved (Fable 5 restored, Opus 4.1 retired, MCP RC shipped) and two newly discovered supply-chain threats — the ChainDrop npm worm and a cluster of OS command injection CVEs — that are directly relevant to PerFiApp's pnpm monorepo workflow.

---

## Executive Summary

1. **ChainDrop npm worm exploits Claude Code SessionStart hooks (August 2026 — act now).** A self-propagating supply-chain worm has infected 400+ npm packages by planting a `SessionStart` hook in `.claude/settings.json`. Opening an infected workspace in Claude Code fires the hook immediately — no npm install required — exfiltrating GitHub tokens, cloud credentials, and SSH keys. PerFiApp's pnpm monorepo is directly in scope. Immediate mitigations: lock `.claude/settings.json` to version control, audit all SessionStart hook entries, and restrict Claude Code auto-mode in open-workspace contexts.

2. **Three new OS command injection CVEs in Claude Code CLI and Agent SDK (CVE-2026-35020, -35021, -35022 — CVSS up to 8.4).** All three are fixed in Claude Code v2.1.92+ and Agent SDK for Python v0.1.56+. If any PerFiApp CI runners or developer machines are on an older version they are vulnerable. Update immediately and verify CI pipelines use pinned, audited versions.

3. **CDBA proposed regulations published June 27 — public comment closes August 26 (two days from now).** The first concrete technical framework for Canada's consumer-driven banking regime is now in the Canada Gazette. Phase 1 (read access) is targeted for 2026. The regulation covers accreditation, security, authentication/consent, and liability — all directly relevant to PerFiApp's data-aggregation design. The consultation window closes August 26, 2026.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Fable 5 globally restored July 1** | Model | spec-lead, architect | **Act — update agent files from fallback-only to primary** |
| **Opus 4.1 confirmed retired August 5** | Model | Any agent on this ID | **Act — confirm no traffic; API calls now fail** |
| **Claude Sonnet 5 launched June 30 ($2/$10/MTok, 1M ctx)** | Model / Cost | implementer, test-engineer, code-reviewer | **Adopt — replace Sonnet 4.6; net cheaper after tokenizer adjustment** |
| **Claude Opus 5 launched July 24 ($5/$25/MTok)** | Model | spec-lead, security-reviewer | **Adopt — best non-Fable frontier model; replace Opus 4.8 as primary** |
| **New tokenizer ~30% more tokens (Sonnet 5 / Opus 5)** | Cost | All agents (billing impact) | **Act — audit token budgets before migrating workloads** |
| **Sonnet 5 pricing made permanent at $2/$10 (was temporary)** | Cost | All agents | **Adopt — scheduled increase to $3/$15 cancelled; lock Sonnet 5 in** |
| **MCP 2026-07-28 spec shipped (stateless, no session IDs)** | Agent tooling | architect | **Act — breaking changes; any MCP server design must target new spec** |
| **Claude Code self-hosted runners (v2.1.224, public beta)** | Agent tooling | architect, security-reviewer | **Trial — critical for Canadian data residency compliance** |
| **Claude Code custom subagents via /agents (July 2026)** | Agent tooling | All agents | **Adopt — enables explicit agent-team delegation within Claude Code** |
| **Claude Code auto mode as default from Aug 14** | Agent tooling | implementer | **Watch — raises privilege; verify hook-based guardrails are in place** |
| **Cross-session messaging (v2.1.224, macOS/Linux)** | Agent tooling | implementer, test-engineer | **Watch — useful for orchestrating spec-lead → implementer → test-engineer chains** |
| **ChainDrop npm worm — SessionStart hook attack** | Security | All developers, CI | **Act — audit .claude/settings.json; lock to VCS immediately** |
| **CVE-2026-35020/21/22 (command injection, CVSS 8.4)** | Security | All developers, CI | **Act — update to Claude Code v2.1.92+, Agent SDK Python v0.1.56+** |
| **CVE-2026-54316 (API key exfiltration, fixed v2.1.163)** | Security | All developers | **Act — verify Claude Code version is 2.1.163 or later** |
| **DeepEval v4.1.1 (July 2026, ~17K stars)** | Agent quality | test-engineer | **Adopt (confirm version bump from v4.0; review breaking changes)** |
| **CDBA proposed regulations — comment period closes Aug 26** | Compliance | architect, spec-lead | **Act — read regulation; window closes in 2 days** |
| **RTR by-law effective August 24** | Compliance | architect | **Monitor — Phase 2 read-access payments design now has regulatory basis** |
| **KOHO advances to Phase 2 of banking license (OSFI fast-track)** | Competitive | spec-lead | **Monitor — if KOHO gains Schedule 1 status, competitive threat intensifies** |
| **Stripe MCP server (official, GA)** | Agent tooling | architect | **Watch — payments MCP tool; relevant if PerFiApp adds payment features** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGE: Claude Fable 5 restored globally July 1

**Status changed from "suspended" (Jun 24 report) to globally available.**

Anthropic redeployed `claude-fable-5` on July 1, 2026, after a 19-day suspension. The US government lifted the export-control directive that had blocked all API access. The restoration was global for Fable 5; `claude-mythos-5` (the companion model) remains restricted to approved US organizations.

Before redeployment Anthropic made two concrete changes: (1) a new classifier blocks the reported jailbreak technique in over 99% of cases and reroutes flagged requests to `claude-opus-4-8`; (2) a HackerOne channel was opened for responsible disclosure.

**For PerFiApp:** The fallback chains added after the June 12 suspension can now be relaxed. `claude-fable-5` is available again as the primary frontier choice for spec-lead. However, the fallback chain (`claude-opus-5` → `claude-sonnet-5` → `claude-haiku-4-5`) remains best practice in case of future availability issues.

Sources: [Anthropic restores Fable and Mythos — CoinDesk](https://www.coindesk.com/tech/2026/07/01/anthropic-restores-ai-models-fable-mythos-after-the-u-s-lifts-export-controls) / [VentureBeat](https://venturebeat.com/technology/anthropic-is-bringing-back-claude-fable-5-globally-after-us-lifts-export-control-order-where-can-enterprises-access-it) / [Forbes](https://www.forbes.com/sites/ronschmelzer/2026/06/29/is-anthropics-fable-5-coming-back-this-week/)

---

### 1.2 STATUS CHANGE: Claude Opus 4.1 confirmed retired August 5

**Status changed from "approaching deadline" (Jun 24 report) to retired.**

`claude-opus-4-1-20250805` is now retired. All API calls to this model ID now return errors. Recommended replacement remains `claude-opus-4-8` (itself now superseded by Opus 5; see 1.4 below).

**For PerFiApp:** Search all agent definition files and CI configuration for `claude-opus-4-1` or `claude-opus-4-1-20250805`. Any remaining references cause runtime failures. Use the Claude Console Usage export (CSV) to audit API traffic.

Source: [Anthropic model deprecations — primary source](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

### 1.3 NEW: Claude Sonnet 5 — launched June 30

`claude-sonnet-5` launched June 30, 2026 and replaced Sonnet 4.6 as the default model in Claude Code from the same date. Key characteristics:

- Native 1M-token context window at no long-context surcharge
- Priced at $2/$10 per MTok (input/output) — now permanent (see Track 2)
- New tokenizer: produces approximately 30% more tokens from the same input text vs Sonnet 4.6. Exact impact depends on content type; code and structured data see the largest increase.
- Batch API: $1/$5 per MTok (50% off)
- Prompt caching: cache reads at $0.20/MTok (90% off standard input rate)

**Effective vs Sonnet 4.6:** Sonnet 4.6 costs $3/$15 per MTok. After adjusting for ~30% tokenizer inflation, a same-task workload on Sonnet 5 costs approximately $2.60 effective input equivalent — still roughly 13% cheaper on input, ~13% cheaper on output ($13 effective vs $15), with significantly more context. Migration from Sonnet 4.6 is recommended, but benchmark actual token counts for your workloads before committing.

**Agent routing recommendation:** Assign `claude-sonnet-5` to implementer, code-reviewer, and test-engineer agents. It performs close to Opus 4.8 at a fraction of the cost.

Sources: [Introducing Claude Sonnet 5 — Anthropic](https://www.anthropic.com/news/claude-sonnet-5) / [Pricing (primary source)](https://platform.claude.com/docs/en/about-claude/pricing) / [Simon Willison writeup](https://simonwillison.net/2026/Jun/30/claude-sonnet-5/)

---

### 1.4 NEW: Claude Opus 5 — launched July 24

`claude-opus-5` launched July 24, 2026. Key characteristics:

- Priced at $5/$25 per MTok — same price as Opus 4.8, better capability
- Described by Anthropic as "close to Fable 5 performance at half the price"
- Now the default model on Claude Max subscription tier
- Model ID: `claude-opus-5` on Claude API; `anthropic.claude-opus-5` on Bedrock
- Uses the new tokenizer (~30% token inflation vs pre-4.7 models)
- Retirement not sooner than July 24, 2027 (per deprecation page)

**Agent routing recommendation:** Upgrade spec-lead and security-reviewer from `claude-opus-4-8` to `claude-opus-5`. Same cost, meaningfully better reasoning. `claude-fable-5` remains the highest-capability option for spec-lead when maximum quality is needed.

Sources: [Introducing Claude Opus 5 — Anthropic](https://www.anthropic.com/news/claude-opus-5) / [9to5Mac](https://9to5mac.com/2026/07/24/anthropic-upgrades-claude-with-new-opus-5-model-details-here/) / [Deprecation page (primary)](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

### 1.5 Updated model roster for PerFiApp agents

| Agent | Recommended model | Rationale |
|---|---|---|
| spec-lead | `claude-opus-5` (or `claude-fable-5` for max quality) | Frontier reasoning; Fable 5 now available globally |
| architect | `claude-opus-5` | Complex system design; worth the premium |
| implementer | `claude-sonnet-5` | Capable at 40–60% of Opus cost; 1M ctx |
| test-engineer | `claude-sonnet-5` | Good at test generation; batch API for bulk eval runs |
| code-reviewer | `claude-sonnet-5` | Cost-effective for repeated PR reviews |
| security-reviewer | `claude-opus-5` | Security review is high-stakes; Opus quality required |
| debugger | `claude-sonnet-5` | Iterative; cost matters; escalate to Opus if stuck |

**Note:** `temperature`, `top_p`, `top_k` remain deprecated (return 400 errors) on Opus 4.7 and later — this applies to Opus 5 as well. Omit these parameters on all Opus-tier calls.

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Sonnet 5 permanent pricing — scheduled increase cancelled

On August 10, 2026, Anthropic made the Sonnet 5 introductory price permanent. The previously scheduled increase to $3/$15 on September 1, 2026 will not occur. This is confirmed in a note directly on the Anthropic pricing page.

**Impact:** Any budget projections that assumed the September price increase should be revised downward. Sonnet 5 at $2/$10 is now the stable long-term price.

Source: [Pricing page note — primary source](https://platform.claude.com/docs/en/about-claude/pricing)

---

### 2.2 Tokenizer warning: ~30% token inflation on Sonnet 5 and Opus 5

The official pricing page states: "Claude 4.7 and later models and Claude Mythos Preview use a newer tokenizer... This tokenizer produces approximately 30% more tokens for the same text." This applies to Sonnet 5, Opus 5, Fable 5, and all models from Opus 4.7 onward.

**Practical impact for PerFiApp:**
- Existing prompt token budgets and cost estimates calibrated on Sonnet 4.6 will undercount by ~30%
- FR-CA text (accented characters, longer words) may see higher tokenizer inflation than plain English
- Agent context windows that were sized for 200K token prompts on Sonnet 4.6 will hit limits earlier on Sonnet 5 with the same content

**Action:** Before migrating implementer/test-engineer/code-reviewer to Sonnet 5, benchmark actual token counts on representative PerFiApp prompts (especially FR-CA content, TypeScript code, and financial JSON payloads).

Source: [Pricing page tokenizer note — primary source](https://platform.claude.com/docs/en/about-claude/pricing)

---

### 2.3 Current cost reference table (verified August 2026)

Sourced directly from `platform.claude.com/docs/en/about-claude/pricing`:

| Model | Input | Cache write (5m) | Cache hit | Output | Batch input | Batch output |
|---|---|---|---|---|---|---|
| Fable 5 | $10/MTok | $12.50 | $1 | $50 | $5 | $25 |
| Opus 5 | $5 | $6.25 | $0.50 | $25 | $2.50 | $12.50 |
| Sonnet 5 | $2 | $2.50 | $0.20 | $10 | $1 | $5 |
| Haiku 4.5 | $1 | $1.25 | $0.10 | $5 | $0.50 | $2.50 |

Agent SDK billing split (from Jun 24 report): still paused per last known status — no new announcement found in this cycle. Monitor.

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 MCP 2026-07-28 specification shipped — breaking changes confirmed

The MCP 2026-07-28 specification finalized and shipped on July 28, 2026. The RC was locked May 21 with a ten-week validation window for SDK maintainers.

**What shipped:**

- **Stateless protocol core:** The `initialize` handshake and `Mcp-Session-Id` header are eliminated. Any MCP request can now land on any server instance. Sticky sessions and shared session stores are no longer required. This enables plain round-robin load balancing of MCP servers.
- **Extensions framework:** Extensions (including Tasks) are now first-class with independent versioning.
- **Authorization hardening:** Six OAuth 2.0 / OpenID Connect alignment proposals including issuer validation and improved client registration.
- **New official extensions:** MCP Apps (server-rendered interactive interfaces) and Tasks (migrated from experimental core).
- **Deprecated with 12-month minimum removal window:** Roots, Sampling, Logging.

**Breaking changes for PerFiApp:**
- Any MCP server or client that relied on `initialize` handshake or session IDs must be rewritten to treat every request as self-contained.
- Tasks API users must migrate to the new extension-format Tasks API.
- The official TypeScript, Python, Go, and C# SDKs support 2026-07-28. Rust is in beta.

**For PerFiApp:** No MCP servers are deployed yet (pre-code stage), which is an advantage — design all future MCP integrations (banking aggregation, Stripe payments) against the 2026-07-28 spec from the start, not the legacy stateful protocol.

Sources: [MCP blog — 2026-07-28 RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [MCP blog — final spec](https://blog.modelcontextprotocol.io/posts/2026-07-28/) / [Developers Digest migration guide](https://www.developersdigest.tech/blog/mcp-2026-07-28-breaking-changes) / [Digital Applied](https://www.digitalapplied.com/blog/mcp-2026-07-28-spec-stateless-migration-guide)

---

### 3.2 Claude Code: key releases v2.1.188–v2.1.224 (since Jun 23)

**July releases (v2.1.188–v2.1.219):**

- **Custom Subagents via `/agents`:** Define subagents with their own system prompt, model, tool access, permission behavior, optional skills and MCP servers, and worktree isolation. Each subagent runs in its own context window. Relevant for PerFiApp's agent team (spec-lead spawning implementer, etc.) — this formalizes what was previously ad-hoc.
- **Subagent depth and concurrency tuning (v2.1.217–v2.1.219):** Concurrency capped at 20; nesting defaults to depth of 3. Stable as of v2.1.219.
- **Sonnet 5 as default model** from July 1 (see Track 1).

**August releases (v2.1.220–v2.1.224+):**

- **Self-hosted runners (v2.1.224, public beta):** `claude self-hosted-runner` lets Team and Enterprise organizations run Claude Code sessions on their own infrastructure. Fixed or on-demand mode. Each session is isolated. **Critical for PerFiApp:** this enables Canadian data residency — financial data and secrets never touch Anthropic-managed cloud. Available on Team and Enterprise plans; must be enabled by an admin.
- **Cross-session messaging (v2.1.224, macOS/Linux):** Sessions can discover each other via `ListAgents` and message with `SendMessage`. Enables orchestrated multi-agent pipelines without manual handoff — useful for a spec-lead → architect → implementer chain.
- **Auto mode as default from August 14:** New sessions on Pro, Max, and Team plans start in auto mode (no per-tool-call approval). Existing sessions unaffected; still switchable. Raises the security surface — SessionStart hooks now fire more freely. See Track 6.
- **Archive plugin source:** Install plugins from SHA-256-pinned zip over HTTPS without git or npm.
- **GitLab merge request support** added alongside GitHub PRs.

Sources: [Claude Code self-hosted post — Anthropic blog](https://claude.com/blog/run-claude-code-sessions-on-your-own-compute) / [Simon Willison on auto mode](https://simonwillison.net/2026/Aug/8/auto-mode/) / [Classmethod blog on v2.1.220-221](https://dev.classmethod.jp/en/articles/20260804-cc-updates-v2-1-221/) / [Claude Code changelog](https://code.claude.com/docs/en/whats-new)

---

### 3.3 Finance-relevant MCP servers

Three MCP servers now exist that are worth tracking for PerFiApp's Phase 2+ aggregation and payments roadmap:

**Stripe MCP Server (official, GA):** Allows AI agents to create customers, issue invoices, manage subscriptions, and process refunds through tool calls. Official server maintained by Stripe. [Stripe MCP docs](https://docs.stripe.com/mcp)

**Open Banking MCP (TrueLayer-based):** Connects to TrueLayer's Open Banking API to list bank accounts and retrieve transactions. Not Canadian-specific. [LobeHub listing](https://lobehub.com/mcp/tkom04-openbankingmcp)

**BANKSapi MCP Server:** Provides categorized transactions, contracts, cashflow analyses via MCP. EU-based; no confirmed Canadian institution coverage. [BANKSapi](https://banksapi.de/en/mcp-server-en/)

**For PerFiApp:** None of these are Canadian-institution-ready as of this report. Flinks does not yet have an official MCP server. Design the architecture to wrap Flinks' existing REST API behind a custom MCP server using the 2026-07-28 stateless spec when Phase 1 read access launches.

**Security note:** Any MCP server that handles banking credentials or transaction data must go through the full PerFiApp security-reviewer vetting process before adoption.

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval v4.1.1 (July 16, 2026)

DeepEval updated from v4.0 (the version the Jun 24 report recommended for adoption) to v4.1.1, released July 16, 2026. As of July 2026: ~17,000 GitHub stars, 8 million PyPI downloads per month.

**Changes in v4.1.1 vs v4.0 that matter for PerFiApp:**
- Richer trace fields and better OpenTelemetry exports (useful for debugging agent chains)
- Expanded model support (now includes Sonnet 5 and Opus 5 as judge models)
- Breaking: removed legacy API key aliases; updated dataset loading to use metadata; removed metric logging manager

**Note:** If the Jun 24 "Adopt" recommendation was acted on and DeepEval was integrated at v4.0, the v4.1.1 breaking changes need to be addressed before upgrading.

Source: [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit and APM

No confirmed releases for Spec Kit or APM were found in primary sources for the period June 24 – August 17, 2026. The last known versions (Spec Kit v0.11.6, APM v0.21.0) remain the baseline. Recommend checking upstream repositories directly for any releases in this window.

### 5.2 Claude Code auto mode security implications

Auto mode becoming the default (from August 14) changes the trust model for Claude Code sessions. In auto mode, tool calls execute without per-call approval. For PerFiApp this means:

- `cc-safe-setup` hooks (trialed in Jun 24 report) become more important, not less — they are the primary guard against destructive operations in auto mode
- SessionStart hook security (see Track 6) is now an even higher-severity concern because malicious hooks fire automatically in auto mode without the user seeing a confirmation

Revisit the cc-safe-setup trial status and ensure hooks are configured before any agents run in auto mode.

Source: [Digital Applied — auto mode default](https://www.digitalapplied.com/blog/claude-code-auto-mode-default-permission-model-shift)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CRITICAL: ChainDrop npm worm exploits Claude Code SessionStart hooks

The ChainDrop campaign, analyzed by StepSecurity, Elastic Security Labs, Unit 42, and Pillar Security, represents a new class of supply-chain attack that weaponizes Claude Code's hook system.

**Attack mechanism:** Operators infected 400+ npm packages (self-propagating to a peak of one package per second) and planted a `SessionStart` hook in `.claude/settings.json` inside compromised repositories. When a developer opens an infected workspace and starts a Claude Code session — with no npm install, no build, no explicit script execution — the hook fires and downloads the Bun runtime, which executes an obfuscated payload. The payload exfiltrates GitHub tokens, npm tokens, cloud provider credentials (AWS, GCP, Azure), SSH keys, Kubernetes tokens, and database credentials.

**Why this is critical for PerFiApp:**
- PerFiApp is a pnpm monorepo — pnpm dependency resolution can pull transitive dependencies from infected packages
- The attack fires on workspace open, not on package install — standard `pnpm audit` will not catch it
- Financial application developers are high-value targets (likely have banking API credentials in the environment)
- Auto mode (now the default in Claude Code as of August 14) provides no additional barrier to SessionStart hook execution

**Immediate mitigations:**
1. Commit `.claude/settings.json` to version control and review it in every PR (code-reviewer must flag unexpected SessionStart entries)
2. Run `git log -- .claude/settings.json` on existing repos to detect unauthorized modifications
3. Do not open unfamiliar repositories in Claude Code without reviewing `.claude/settings.json` first
4. Restrict the `ANTHROPIC_API_KEY` and any banking-API credentials in developer environments to least-privilege scopes
5. Use Claude Code self-hosted runners in isolated containers so hook execution cannot reach production credentials

Sources: [Hacker News — Claude Code and Gemini CLI flaws](https://thehackernews.com/2026/08/claude-code-and-gemini-cli-flaws-let.html) / [Keyv-linked npm worm — Hacker News](https://thehackernews.com/2026/08/keyv-linked-npm-worm-poisons-hundreds.html) / [Pillar Security analysis](https://www.pillar.security/blog/chaindrop-when-opening-a-repository-becomes-execution) / [StepSecurity](https://www.stepsecurity.io/blog/chaindrop-npm-worm) / [Unit 42](https://unit42.paloaltonetworks.com/chaindrop-npm-worm-analysis/)

---

### 6.2 CVE-2026-35020, CVE-2026-35021, CVE-2026-35022 — OS command injection in Claude Code CLI and Agent SDK

Three related command injection vulnerabilities disclosed in the Claude Code CLI and Claude Agent SDK for Python. Root cause: unsanitized string interpolation passed to `execa` with `shell: true` across three subsystems.

| CVE | Location | Vector | CVSS |
|---|---|---|---|
| CVE-2026-35020 | TERMINAL environment variable | Local; inject shell metacharacters via env var | 8.4 |
| CVE-2026-35021 | File path handling | Remote; inject via malicious file paths in `execSync` | Not yet published |
| CVE-2026-35022 | Authentication helper | Remote; exploit helper configuration values | Not yet published |

**Affected versions:** Claude Code CLI up to 2.1.91; Claude Agent SDK for Python up to 0.1.55.
**Fixed versions:** Claude Code CLI v2.1.92+; Claude Agent SDK for Python v0.1.56+.

**For PerFiApp:** Verify all developer machines and CI runners are on Claude Code v2.1.92 or later (current latest is v2.1.224+). If using the Agent SDK for Python in any automation scripts, verify it is on v0.1.56 or later.

Sources: [SentinelOne — CVE-2026-35020](https://www.sentinelone.com/vulnerability-database/cve-2026-35020/) / [SentinelOne — CVE-2026-35021](https://www.sentinelone.com/vulnerability-database/cve-2026-35021/) / [SentinelOne — CVE-2026-35022](https://www.sentinelone.com/vulnerability-database/cve-2026-35022/) / [Phoenix Security chain analysis](https://phoenix.security/claude-code-leak-to-vulnerability-three-cves-in-claude-code-cli-and-the-chain-that-connects-them/)

---

### 6.3 CVE-2026-54316 — API key exfiltration via Hugging Face download counter

Disclosed August 2026. The vulnerability turned Hugging Face's public download counter into a covert exfiltration channel, leaking an Anthropic API key one character at a time. A related flaw: Claude Code's command validator strips single-quoted text before running its 23 safety checks, allowing crafted payloads to bypass validation through git command flags.

**Affected versions:** Claude Code 0.2.54 through 2.1.163.
**Fixed in:** v2.1.163 (well below the current v2.1.224+; any developer on a recent version is protected).

CVSS score was disputed: Anthropic rated it 6.0 (Moderate, CVSS v4); NVD rated it 9.1 (CVSS v3.1). Exploitation required introducing untrusted content into the Claude Code context — consistent with the ChainDrop attack vector described in 6.1.

Source: [Hacker News — Claude Code and Gemini CLI flaws](https://thehackernews.com/2026/08/claude-code-and-gemini-cli-flaws-let.html) / [GitLab Advisory Database](https://advisories.gitlab.com/pkg/npm/@anthropic-ai/claude-code/CVE-2026-25723)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 CDBA proposed regulations published — public comment closes August 26

The Department of Finance published the proposed Consumer-Driven Banking Regulations on June 27, 2026 in the Canada Gazette, Part I. This is the first detailed technical framework for how Canada's open banking regime will work. The **60-day comment period closes August 26, 2026 — two days from this report's date.**

**What the proposed regulations cover (directly relevant to PerFiApp's architecture):**
- **Accreditation requirements:** Organizations that want to receive consumer financial data must be accredited; criteria include security posture, national security review, and technical standards compliance
- **Authentication and consent:** Specific requirements for how consumer consent is obtained, recorded, and honored — affects PerFiApp's data-sharing UX and backend consent management design
- **Technical standards:** Minimum API standards for data sharing (standards body not yet constituted)
- **Liability framework:** Who bears liability when data is misused
- **Oversight:** Bank of Canada confirmed as lead regulator

**Phase timeline (from regulation and supporting statements):**
- Phase 1 (read access): targeted for 2026, but exact operational date not yet confirmed by Bank of Canada
- Phase 2 (write access and payments): mid-2027

**For PerFiApp:** The architect should read the full proposed regulation before finalizing the data-aggregation module design. Key design decisions that must align with the emerging framework: consent management data model, audit logging, accreditation pathway. Flinks is positioned as an accreditation partner for fintech-to-bank API access.

Sources: [Bennett Jones — CDBA proposed regulations](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations) / [Canada Gazette Part 1 — official text](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [McCarthy Tétrault — open banking law](https://www.mccarthy.ca/en/insights/blogs/techlex/open-banking-in-canada-moves-from-blueprint-to-law) / [DLA Piper — CDBA explained](https://www.dlapiper.com/en-us/insights/publications/2026/04/the-new-consumer-driven-banking-act-explained)

---

### 7.2 RTR by-law and rules effective August 24

The Real-Time Rail's governing by-law and rules come into effect August 24, 2026 — three days from this report's date. Industry testing has been underway in Q3 2026 with approximately 1,800 registered businesses. Launch target remains Q4 2026.

KOHO has been welcomed as a new PSP member of Payments Canada, alongside Wise, Float, Paramount Commerce, and Brim Financial. Interac e-Transfer will use the RTR for clearing and settlement of its transactions.

**For PerFiApp Phase 2 design:** The RTR's by-law effective date means the legal foundation is now in place. PerFiApp's Phase 2 (payment initiation) spec can reference the RTR as the clearing infrastructure for Canadian real-time payments.

Sources: [Payments Canada — by-law approved](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [Payment Expert — RTR launch](https://paymentexpert.com/2026/08/10/rtr-canada-payments-modernisation) / [Payments Canada RTR page](https://www.payments.ca/systems-services/payment-systems/real-time-rail-payment-system)

---

### 7.3 Quebec Law 25 — AI and automated decisions under CAI scrutiny

The Commission d'accès à l'information (CAI) has signaled heightened enforcement focus on organizations using AI for automated decisions in financial services. Key compliance obligations directly relevant to PerFiApp:

- Must inform users when decisions are made exclusively through automated processing
- Must provide an opportunity for human review of automated decisions
- Privacy Impact Assessments (PIAs) are mandatory before deploying AI systems that process personal financial data
- Maximum fines: up to 4% of worldwide turnover or $25M CAD

PerFiApp's credit score analysis, spending recommendations, and any future credit adjudication features are all in-scope. Any feature that surfaces a personalized financial recommendation must be designed with a human-review pathway and a disclosed PIA.

Sources: [Augure AI — Law 25 AI compliance guide](https://augureai.ca/blog/law-25-ai-compliance-guide-quebec) / [Agentys — Law 25 guide](https://www.agentys.io/en/blog/loi-25-quebec-privacy-ai-email) / [ComplianceIQ — automated decisions](https://trycomplianceiq.com/compliance/canada-quebec-law25)

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO advances to Phase 2 of banking license under OSFI fast-track

OSFI introduced a Targeted Fast-Track Framework in June 2026 for fintech bank applicants. KOHO has advanced into Phase 2 of its banking license application under this framework, which promises initial OSFI feedback within four weeks and a risk-based review completed within 12 months. If approved, ministerial sign-off follows.

Current KOHO position: 2.5M+ users, now a Payments Canada PSP member (RTR access), $1.33B valuation. A Schedule 1 bank licence would allow KOHO to hold deposits directly — currently their deposits are held at Peoples Bank of Canada as a chartered institution.

**For PerFiApp:** If KOHO receives its banking licence within 2026–2027, it will be able to offer a fully deposit-insured account alongside its existing spending and savings product. PerFiApp's differentiation (bilingual, privacy-first, agent-powered) should be reinforced in the product roadmap.

Sources: [KOHO Phase 2 banking license — StreetInsider](https://www.streetinsider.com/Globe+Newswire/KOHO+Advances+Into+Phase+Two+of+Canadian+Banking+License/22682472.html) / [Finextra](https://www.finextra.com/newsarticle/47904/canadas-koho-hits-unicorn-status-and-targets-banking-license)

---

## Recommended Next Steps

### Immediate (this week)

1. **Audit `.claude/settings.json` across all developer machines and repositories** for unexpected SessionStart hook entries. Commit the file to version control so future modifications appear in PRs. Run `git log -- .claude/settings.json` on existing repos to detect unauthorized modifications. This is the highest-urgency action given the ChainDrop attack on pnpm/npm ecosystems. (Owner: security-reviewer, all developers)

2. **Verify Claude Code version is v2.1.163+ on all machines** (covers CVE-2026-54316) and v2.1.92+ (covers CVE-2026-35020/21/22). Current latest is v2.1.224+. Run `claude --version` on each machine and in CI. (Owner: all developers, CI maintainer)

3. **Read the CDBA proposed regulations** before the August 26 comment period closes. The text is publicly available in the Canada Gazette. The architect must understand the accreditation, consent, and technical standards framework before finalizing the data-aggregation module design. (Owner: architect, spec-lead)

4. **Update agent definition files:** Remove `claude-opus-4-1-20250805` references (API calls now fail). Update spec-lead and security-reviewer to `claude-opus-5`; update implementer, test-engineer, code-reviewer to `claude-sonnet-5`. (Owner: architect)

### Short-term (this sprint)

5. **Benchmark Sonnet 5 tokenizer impact on PerFiApp workloads.** Run representative prompts (FR-CA content, TypeScript code, financial JSON) through both Sonnet 4.6 and Sonnet 5 and compare token counts. Adjust token budgets and cost estimates before committing to migration. (Owner: test-engineer, implementer)

6. **Design MCP server infrastructure against the 2026-07-28 stateless spec.** Since PerFiApp is pre-code, there is no legacy MCP state to migrate. All future MCP integrations (Flinks aggregation wrapper, Stripe payments) should be designed stateless from the start: no initialize handshake, no session IDs, every request self-contained. (Owner: architect)

7. **Enable Claude Code self-hosted runners** (Team/Enterprise public beta) for any CI or agent workflow that will eventually handle real financial data or credentials. This is the primary mechanism for keeping financial data within Canadian infrastructure. (Owner: architect, security-reviewer)

8. **Update custom subagent definitions using Claude Code's `/agents` command.** The July 2026 release formalized the delegation model. Define spec-lead, architect, implementer, test-engineer, and code-reviewer as explicit subagents with constrained tool access and model assignments. (Owner: architect)

### Medium-term (next 4–6 weeks)

9. **Design the consent-management and automated-decision disclosure system** to align with both the emerging CDBA framework and Quebec Law 25. Any AI-driven spending recommendation or credit analysis must have a disclosed, auditable decision trail and a human-review pathway. This design should be specced before Phase 1 implementation begins. (Owner: spec-lead, architect)

10. **Review DeepEval v4.1.1 breaking changes** and update eval pipelines if v4.0 was adopted. Specifically: legacy API key aliases removed, dataset loading uses metadata, metric logging manager removed. (Owner: test-engineer)

11. **Monitor Fable 5 availability for production use.** The model is restored but carries enhanced classifiers that may affect latency or response consistency. Trial spec-lead on `claude-fable-5` for complex architecture decisions and compare output quality vs `claude-opus-5` to determine whether the premium is justified. (Owner: spec-lead)

12. **Track RTR Q4 2026 launch for Phase 2 payments design.** The RTR by-law is in effect August 24. Once the industry testing phase (Q3 2026) completes, review published technical specifications for real-time payment initiation to inform PerFiApp's Phase 2 architecture spec. (Owner: architect)

---

*Report generated 2026-08-17. Delta report vs 2026-06-24 — prior findings not repeated unless status changed. All pricing figures and model IDs verified against the Anthropic pricing and deprecation primary-source pages as of this date.*
