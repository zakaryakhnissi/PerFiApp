# PerFiApp Agent Research — 2026-11-02

**Third run. Delta report vs 2026-06-24.** Rotation emphasis: new model wave (Sonnet 5, Opus 5, Opus 5.5, Sonnet 5.5, Haiku 5.5 — updated agent recommendations for each role), Canadian open-banking breakthrough (CDBA regulations published in Canada Gazette), Claude Code evolution (v2.1.187 → v2.1.316, 129 releases), and MCP 2026-07-28 specification now live.

---

## Executive Summary

1. **Opus 4.8 fast mode retiring before November 30, 2026 — 28 days from today.** The Claude Code v2.1.316 (Oct 31) release notes flag this. If any agent is configured to use fast mode with Opus 4.8, migration is needed now. Verify agent files and CI scripts.

2. **Canada RTR Q4 2026 phased launch is imminent.** The RTR By-law was published in the Canada Gazette July 1 and took effect August 24, 2026. Payments Canada's Q3 quarterly update confirmed Q4 2026 go-live for first participants. This changes PerFiApp's Phase 2 timeline assumptions.

3. **Six new Claude models in four months.** Sonnet 5 (Jun 30), Opus 5 (Jul 24), Fable 5.1 (Sep 1), Opus 5.5 (Sep 22), Sonnet 5.5 (Sep 28), Haiku 5.5 (Oct 7). The prior recommendation of `claude-opus-4-8` for spec-lead/architect is now outdated; `claude-opus-5-5` is the correct primary choice. Haiku 5.5 is ~75% cheaper than Haiku 4.5 — direct impact on test-engineer and implementer costs.

4. **CDBA draft Consumer-Driven Banking Regulations published June 27, 2026.** Published in Canada Gazette Part I; 60-day comment period closed August 26. Bank of Canada confirmed as accreditor. Finalization now targeted for early 2027. This is the most concrete CDBA progress since the Act received Royal Assent — PerFiApp's open-banking architecture decisions can now be grounded in published regulatory text.

5. **Spec Kit crossed a major version boundary: v1.2.6** (from v0.11.6). APM is at v0.35.0 (from v0.21.0). MCP 2026-07-28 specification is live and stateless — any custom MCP server designed during the last report cycle needs to drop session management before launch.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Opus 4.8 fast mode retiring before Nov 30** | Model | Any agent using fast mode | **Act — audit and migrate within 28 days** |
| **Canada RTR Q4 2026 launch imminent** | Compliance | architect, spec-lead | **Act — update Phase 2 timeline assumptions** |
| **Claude Opus 5.5 — new recommended default for spec-lead/architect** | Model | spec-lead, architect, security-reviewer | **Adopt — $4/$20 MTok, 1M context, 20% cheaper than Opus 5** |
| **Claude Haiku 5.5 — cost savings for high-volume agents** | Model / Cost | test-engineer, implementer (cheap tasks) | **Adopt — ~75% cheaper than Haiku 4.5, 1M context** |
| **Claude Sonnet 5.5 — new recommended default for implementer/code-reviewer** | Model | implementer, code-reviewer, debugger | **Adopt — $2/$10 MTok, 1M context** |
| **Fable 5 globally restored (Jul 1); Mythos 5 still gated** | Model | spec-lead, architect (optional) | **Monitor — Fable 5 available; Mythos 5 remains Project Glasswing only** |
| **CDBA draft regulations in Canada Gazette (Jun 27, 2026)** | Compliance | architect, spec-lead | **Act — read published text; finalization early 2027** |
| **Canada RTR By-law effective August 24, 2026** | Compliance | architect | **Act — Q4 2026 phased launch; align Phase 2 design** |
| **MCP 2026-07-28 spec live — stateless, no Mcp-Session-Id** | Agent Tooling | architect (custom MCP server design) | **Act — any in-flight custom MCP server must drop session management** |
| **Spec Kit v1.2.6 (major version jump from v0.11.6)** | Toolchain | spec-lead | **Adopt — v1.0+ is a significant evolution; upgrade and check breaking changes** |
| **APM v0.35.0 (from v0.21.0)** | Toolchain | architect, all developers | **Adopt — security hardening, apm auth, CODEOWNERS-safe skills** |
| **Claude Code v2.1.316 — select key features** | Agent Tooling | all agents | **Adopt — idle compaction, PreModelSwitch hooks, writes locked to working dir, onFailure:block hooks** |
| **Claude Code --restricted mode (v2.1.248)** | Security | implementer in auto mode | **Adopt — removes bash/code/WebFetch tools entirely for read-only review tasks** |
| **Claude Code writes locked to working directories (v2.1.314)** | Security | implementer | **Adopt — prevents accidental writes outside project root** |
| **Kong Konnect MCP CVE-2026-13341 (verified)** | Security | architect (MCP vetting) | **Act — add tool-output injection check to MCP vetting checklist** |
| **aws-mcp-server CVE-2026-5058 CVSS 9.8 (unverified)** | Security | architect | **Watch — CVSS 9.8 RCE claimed; verify against NVD before any AWS MCP adoption** |
| **MCP cacheScope cross-user data leakage risk** | Security | architect (Plaid/Flinks MCP design) | **Act — verify cacheScope is user-scoped on any financial data MCP server** |
| **Agent SDK billing split: still paused** | Cost | CI, research workflow | **Monitor — no rescheduled date found; begin measuring programmatic usage** |
| **claude plugin eval (v2.1.269)** | Agent Quality | test-engineer | **Trial — reproducible scored plugin evaluations from within Claude Code** |
| **KOHO banking licence: no confirmed approval** | Competitive | spec-lead | **Monitor — OSFI fast-track framework published; approval timing still unknown** |

---

## Track 1 — Agent Tooling

### 1.1 Claude Code v2.1.187 → v2.1.316: 129 Versions — Highest-Impact Changes

Claude Code shipped 129 versions between June 23 and October 31, 2026. The most actionable for PerFiApp, grouped by area:

**Session and subagent architecture**

- **v2.1.212 (Jul 16):** `/fork` creates a separate background session (new); the old in-session subagent is now `/subtask`. Default caps introduced: 200 WebSearch calls and 200 subagent spawns per session. MCP calls running over 2 minutes move to the background automatically. The WebSearch and spawn caps are important for PerFiApp's research agent workflow.
- **v2.1.232 (Aug):** Cross-session `@` mentions — you can reference another Claude session by name to coordinate work. Subagent forking enabled by default.
- **v2.1.251 (Aug 27):** `PreModelSwitch` and `PostModelSwitch` hooks. These can block, confirm, or annotate any model switch triggered by fallback chains. Relevant for PerFiApp's model governance: a hook can enforce that no agent silently falls through to a model outside the approved list.
- **v2.1.292 (Oct 6):** Plugins can be installed directly from marketplaces. Users can control how hard sub-agents work (effort level per subagent spawn).

**Security**

- **v2.1.214 (Jul 18):** Blocks unauthorized access to nested directories; closes Windows PowerShell permission loopholes.
- **v2.1.219 (Jul 24):** `sandbox.network.strictAllowlist` — denies non-allowlisted hosts for sandboxed commands without prompting. Directly relevant for a financial app where sandboxed bash should never reach unexpected external hosts.
- **v2.1.221 (Aug):** Credentials masked in Linux and WSL sandbox.
- **v2.1.234 (Aug):** Stronger credential leak safeguards (details not fully documented in changelogs; verify against Claude Code security docs).
- **v2.1.248 (Aug 27):** `--restricted` mode removes bash, code execution, and WebFetch tools entirely. Useful for read-only code review and security review passes where the agent should have zero execution surface.
- **v2.1.295 (Oct 8):** Hooks can block actions when they fail via `onFailure: "block"`. Previously hooks could only warn or log.
- **v2.1.309 (Oct 22):** Tighter sandbox and permission checks; fixes for hooks and PowerShell.
- **v2.1.314 (Oct 30):** Writes can be locked to working directories — the implementer agent cannot write outside the project root. This is a direct guard against path-traversal mistakes in file-writing operations.

**Cost and context efficiency**

- **v2.1.225 (Aug):** Gateway spending limits with notifications showing cap and reset time.
- **v2.1.243 (Aug):** `/usage` shows run count and tokens per `/loop` task — first-ever per-task cost visibility.
- **v2.1.299 (Oct 14):** Idle compaction — compacts long conversations before the prompt cache TTL expires, preserving cache hits across long sessions. Directly saves cost for spec-lead sessions that run multiple Spec Kit commands.

**MCP**

- **v2.1.259 (Sep 2):** `managedMcpServers` setting for org administrators to centrally manage which MCP servers are available.
- **v2.1.273 (Sep 15):** Automatic MCP server reconnect after disconnect; warns if recovery fails.
- **v2.1.306 (Oct 21):** Fixes false "Not logged in" on `claude -p` for cloud sessions with large MCP tool setups.

**Agent administration**

- **v2.1.283 + v2.1.285 (Sep):** Managed settings `deniedModels`, `availableModelsMatch`, and `allowedProviders` restrict models and providers at the org level.
- **v2.1.312 (Oct 27):** Custom OIDC user ID claims — org SSO can now map user identity directly into Claude Code sessions.
- **v2.1.314 (Oct 30):** Gateway traffic can be routed by IdP group — different model tiers or cost budgets per team.
- **v2.1.316 (Oct 31):** Pooled group budgets; new subagent effort setting; **Opus 4.8 fast mode retiring before November 30, 2026** (see Track 3).

**For PerFiApp:** The four most impactful changes to act on: (1) `sandbox.network.strictAllowlist` — configure to restrict sandboxed commands to known-safe hosts; (2) `--restricted` mode for code-reviewer and security-reviewer agents (read-only, no execution surface); (3) writes locked to working directories for the implementer; (4) `onFailure: "block"` on safety hooks to make them enforceable rather than advisory.

Sources: [Claude Code October 2026 releases](https://www.havoptic.com/releases/claude-code/2026/10) / [July 2026 releases](https://www.havoptic.com/releases/claude-code/2026/7) / [August 2026 releases](https://www.havoptic.com/releases/claude-code/2026/8) / [September 2026 releases](https://www.havoptic.com/releases/claude-code/2026/9)

### 1.2 MCP 2026-07-28 Specification: Live and Stateless

The final MCP 2026-07-28 specification shipped on or around July 28, 2026, with simultaneous SDK releases for TypeScript, Python, Go, and C# (Rust in beta). The RC that was "scheduled for July 28" in the prior report landed on schedule.

**What changed:** Protocol-level sessions removed. The `Mcp-Session-Id` header no longer exists. The initialization handshake is gone. Every request is self-contained. Streamable HTTP requests carry `Mcp-Method` and `Mcp-Name` headers for load-balancer routing without body parsing.

**For PerFiApp:** Any custom MCP server (e.g., a Flinks adapter or transaction-enrichment server) that was designed to be stateful must be updated before deployment. The SDK RC support added in v0.11 of the spec is now the production SDK. The `cacheScope` field introduced in this spec deserves explicit attention: financial data (balances, transactions) returned from a Flinks or Plaid MCP server must be scoped to the individual user, not cached at a shared scope. A misconfigured `cacheScope` would expose one user's financial data to another user's agent session — a PIPEDA violation.

Sources: [Official MCP blog 2026-07-28](https://blog.modelcontextprotocol.io/posts/2026-07-28/) / [Cloudflare MCP v2 post](https://blog.cloudflare.com/mcp-v2/) / [Flavio Copes writeup](https://flaviocopes.com/mcp-2026-07-28-stateless/)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Claude Haiku 5.5 — Most Impactful Cost Change for PerFiApp

Released October 7, 2026. Pricing: **$0.10 input / $0.50 output per million tokens** for prompts under 100K tokens (the tier covering almost all routine agent tasks). Prompts over 100K tokens bill at $0.50 / $2.50 per MTok. Context window: 1M tokens.

Third-party benchmarks claim approximately 75% cost reduction versus Claude Haiku 4.5, with meaningful capability improvements. Anthropic has not published an official cost-comparison figure; verify against `platform.claude.com/pricing` before budgeting.

**For PerFiApp:** The test-engineer agent — which runs bulk test generation, fixture synthesis, and lint passes — should be the first migration target. At $0.10/$0.50 per MTok, even high-volume test runs become cheap enough to run on every commit. The implementer agent's lower-complexity subtasks (formatting, i18n key insertion, boilerplate) should also move to Haiku 5.5.

Sources: [Claude Haiku 5.5 release coverage](https://computingforgeeks.com/claude-haiku-5-5-released-features-benchmarks/) / [Pricing analysis](https://braindetox.kr/en/posts/claude_haiku_5_5_release_pricing_2026.html)

### 2.2 Agent SDK Billing Split: Still Paused — No Rescheduled Date Found

No evidence found that Anthropic has rescheduled the Agent SDK billing split that was paused on June 15, 2026. As of this report, Agent SDK usage (including the CI research workflow and PR review automation) still draws from the maintainer's subscription. The competitive pressure from OpenAI pricing that triggered the pause has not abated.

**For PerFiApp:** The reprieve continues, but the split will eventually happen. Now is the right time to instrument Claude Console Usage Export to separate interactive vs. programmatic token usage. That data will be needed for break-even modeling when the change does land.

### 2.3 Sonnet 5 Introductory Pricing Ended September 1, 2026

Claude Sonnet 5 launched June 30 at an introductory $2/$10 per MTok. Standard pricing took effect September 1: **$3 input / $15 output per MTok**. If any cost projections were based on the introductory rate, revise them upward.

---

## Track 3 — Model & Capability Updates

### 3.1 Fable 5 / Mythos 5 Export Controls: RESOLVED for Fable 5; Mythos 5 Still Gated

**Status changed from "suspended" to "partially restored."**

The US Commerce Department lifted export controls on June 30, 2026 — 18 days after imposition. Anthropic restored global API access to `claude-fable-5` on July 1, 2026. The model is now available to all API customers without nationality restrictions (earlier reports of nationality-based controls were unsubstantiated; Anthropic's restoration was unconditional).

**Mythos 5 remains restricted.** Access is limited to vetted organizations in Project Glasswing (defensive cybersecurity, critical infrastructure). Normal API keys return an error. A `claude-mythos-5-1` variant was reportedly released September 1, 2026 under the same restricted access terms — this is unverified (single Japanese-language aggregator source; not confirmed by Anthropic).

**For PerFiApp:** `claude-fable-5` is available for trial as the prior report intended. However, given the availability of `claude-opus-5-5` at half the price with comparable benchmark scores (see 3.2), Fable 5 is likely overkill for PerFiApp's agent tasks. Reserve it for evaluation only, not as a primary recommendation.

Sources: [US lifts Fable 5 export controls](https://www.marketscale.com/industries/software-and-technology/us-lifts-export-controls-on-anthropics-claude-fable-5-and-mythos-5-ending-19-day-shutdown.md) / [Fable 5 restored](https://propakistani.pk/2026/07/01/us-lifts-ban-on-foreign-access-to-claude-fable-5/) / [Mythos 5 access details](https://blog.laozhang.ai/en/posts/claude-mythos-api-access.md)

### 3.2 New Model Wave — Six Models in Four Months

All pricing is per million tokens (input/output), from third-party sources; verify against `platform.claude.com/pricing`:

| Model | API ID | Release | Input | Output | Context | Notes |
|---|---|---|---|---|---|---|
| Claude Sonnet 5 | `claude-sonnet-5` | Jun 30, 2026 | $3 | $15 | 1M | Intro pricing ($2/$10) ended Sep 1 |
| Claude Opus 5 | `claude-opus-5` | Jul 24, 2026 | $5 | $25 | 1M | Extended thinking on by default |
| Claude Fable 5.1 | `claude-fable-5-1` | Sep 1, 2026 | ~$10 | ~$50 | 1M+ | Expanded context; became Claude Code default |
| Claude Opus 5.5 | `claude-opus-5-5` | Sep 22, 2026 | $4 | $20 | 1M | 20% cheaper than Opus 5 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Sep 28, 2026 | $2 | $10 | 1M | — |
| Claude Haiku 5.5 | `claude-haiku-5-5` | Oct 7, 2026 | $0.10 | $0.50 | 1M | Under 100K tokens; higher tier above |

**Pricing note:** All figures from third-party aggregators. Several sources conflict on exact dates and rates. Verify all prices at `platform.claude.com/pricing` before committing them to agent configuration or cost models.

**Benchmark highlight (Opus 5 vs prior generation):** Third-party benchmarks show Claude Opus 5 at 70.57% on OSWorld 2.0 (computer-use), up from 55.7% for Opus 4.8 — a meaningful improvement for agentic tasks involving UI interaction or complex multi-step workflows.

Sources: [Claude Opus 5 specs](https://datanorth.ai/news/claude-opus-5-by-anthropic) / [Claude Sonnet 5 pricing](https://claudelog.com/faqs/what-is-claude-sonnet-5/) / [Claude Haiku 5.5 coverage](https://computingforgeeks.com/claude-haiku-5-5-released-features-benchmarks/) / [Claude Opus 5.5 benchmarks](https://metricnexus.ai/blog/claude-opus-5-5-benchmarks-pricing)

### 3.3 RESOLVED: Opus 4.1 Retired August 5, 2026 — No Breakage Reported

`claude-opus-4-1-20250805` retired as announced. No secondary reports of broken workflows appeared in searches. If any agent or script was still using this model ID, it is now returning API errors. Verify via Claude Console Usage Export (Usage > Export > CSV) that no traffic is hitting this model ID.

### 3.4 URGENT: Opus 4.8 Fast Mode Retiring Before November 30, 2026

Claude Code v2.1.316 (October 31, 2026) notes that Opus 4.8 fast mode retires before November 30, 2026. This aligns with the earlier deprecation of Opus 4.7 fast mode on July 24, 2026. Fast mode was a variant that ran Opus 4.8 approximately 2.5x faster at $10/$50 per MTok.

**Status:** Could not confirm an official Anthropic deprecation notice from a primary source in this search session. The retirement date comes from a third-party tracker's summary of the Claude Code v2.1.316 release notes. Treat as high-confidence but verify against `platform.claude.com/docs/about-claude/model-deprecations` before acting.

**For PerFiApp:** If any agent file or API client is using the fast-mode variant (typically activated via `/fast` in Claude Code or a fast-mode API flag), migrate to `claude-opus-5-5` ($4/$20 MTok, comparable capability, lower cost than Opus 4.8 fast mode). There are 28 days remaining.

Source: [Claude Code v2.1.316 notes](https://www.havoptic.com/r/claude-code-2.1.316)

### 3.5 Updated PerFiApp Model Recommendations

Supersedes the June 24 report's recommendation of `claude-opus-4-8` as the primary model:

| Agent | Recommended model | Rationale |
|---|---|---|
| spec-lead | `claude-opus-5-5` | Best reasoning for constitution/spec work; $4/$20 MTok |
| architect | `claude-opus-5-5` | Complex design requires top reasoning; same |
| implementer | `claude-sonnet-5-5` | Good balance of code quality and cost; $2/$10 MTok |
| test-engineer | `claude-haiku-5-5` (bulk) / `claude-sonnet-5-5` (complex) | ~75% cost savings on test generation |
| code-reviewer | `claude-sonnet-5-5` | Sufficient for diff review at lower cost |
| security-reviewer | `claude-opus-5-5` | Security reasoning benefits from top model |
| debugger | `claude-sonnet-5-5` | Debug traces don't require Opus |
| researcher | `claude-sonnet-5-5` | Current — this instance uses Sonnet 4.6 |

**Note on `claude-fable-5-1`:** Available and restored, but at ~$10/$50 MTok is twice Opus 5.5's cost. Reserve for experimental evaluation, not as a primary recommendation.

---

## Track 4 — Agent Quality & Evaluation

### 4.1 `claude plugin eval` — Native Plugin Evaluation in Claude Code (v2.1.269)

Added September 11, 2026. The `claude plugin eval` command runs scored, reproducible evaluations of plugins from within Claude Code sessions. This is distinct from DeepEval — it operates directly on Claude Code plugins and skills rather than external LLM applications.

**For PerFiApp:** The test-engineer agent can now evaluate custom skills (e.g., a `/speckit-implement` skill or a bilingual i18n validation skill) systematically before committing them. Reproducible scoring means regressions in skill behavior are detectable in CI.

Source: [Claude Code September 2026 releases](https://www.havoptic.com/releases/claude-code/2026/9)

### 4.2 DeepEval: Reportedly at v4.3.1 — Not Confirmed from Primary Source

One third-party article (ecorpit.com) reports DeepEval v4.3.1 on PyPI as of October 16, 2026. The official DeepEval changelog at `deepeval.com/changelog/changelog-2026` was not accessible to verify this. The prior recommendation to adopt DeepEval v4.0 stands. Verify the current version against `github.com/confident-ai/deepeval/releases` before upgrading.

Source: [Third-party RAG evaluation comparison](https://ecorpit.com/rag-evaluation-tools-ragas-deepeval-braintrust-giskard-2026/) (unverified for version number)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v1.2.6 — Major Version Jump from v0.11.6

Spec Kit crossed a major version boundary. The v1.0.x line shipped in August 2026 (v1.0.1 tagged August 21). The current version as of November 2, 2026 is **v1.2.6** (released November 2, 2026 — same day as this report).

The v0.11.x to v1.0.0 jump is a major version increment. **Check the migration guide before upgrading** — breaking changes are likely in the `specify-cli` command interface, workflow definitions, and preset formats. The v1.0.1 release focused on docs (project history page, existing-project adoption guide, workflow quickstarts) alongside internal fixes, suggesting v1.0.0 was primarily architectural.

Key additions in the v1.x series relevant to PerFiApp:

- **v1.1.1 (Oct 6):** Workflow expression filters (`upper`, `lower`, `split`, `length`, `to_json`). Experimental version-only MCP stdio server.
- **v1.1.2 (Oct 7):** First-class artifact list and version MCP tools — spec artifacts (specs, plans, tasks) are now directly accessible as MCP tools, enabling the implementer agent to read specs without manual file fetching.
- **v1.1.3 (Oct 9):** Composed workflows with unified execution tree. Support for catalog-installed external agent adapters.
- **v1.2.0 (Oct 13):** Built-in GitHub workflow step — can open PRs, post comments, or trigger Actions from within a Spec Kit workflow. `--no-model-invocation` for Claude Code.
- **v1.2.1 (Oct 16):** Opt-in output capture for command and prompt steps (useful for logging spec generation outputs in CI).
- **v1.2.3 (Oct 22):** `.presetignore` support. Workflow MCP inventory.
- **v1.2.5 (Oct 28):** Shared Knowledge and Domain Spec Maintenance extensions added to the community catalog. Workflow listing now exposed through MCP.
- **v1.2.6 (Nov 2):** `specify workflow definition` for run-scoped workflow definitions; opt-in strict shell execution.

**For PerFiApp:** The two most valuable additions: (1) Artifact MCP tools (v1.1.2) — the implementer can now pull specs directly without a human relaying them; (2) Built-in GitHub workflow step (v1.2.0) — the spec-lead can trigger PR creation from within a Spec Kit workflow, closing the loop between specification and code review.

**Upgrade path:** `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.2.6` — but read the CHANGELOG for breaking changes from v0.11.6 first.

Sources: [Spec Kit GitHub releases](https://github.com/github/spec-kit/releases) / [v1.0.1 release notes](https://github.com/github/spec-kit/releases/tag/v1.0.1) / [v1.1.1 release notes](https://github.com/github/spec-kit/releases/tag/v1.1.1)

### 5.2 APM v0.35.0 — From v0.21.0

Fourteen releases since the last report. Current version: **v0.35.0** (October 22, 2026).

Key changes since v0.21.0:

- **v0.27.0 (Aug 2):** Docker launcher for OCI container MCP packages — run MCP servers in containers rather than as host processes (security improvement for untrusted MCP servers).
- **v0.29.0 (Aug 30):** GitHub Copilot native Agent Plugin registration. `--trust-bin` / `--no-trust-bin` explicit consent for plugin `bin/` directories. Windows binaries now Authenticode-signed.
- **v0.31.0 (Sep 15):** `apm outdated` — reports available registry versions beyond pinned versions. Useful for tracking MCP server updates.
- **v0.32.0 (Sep 25):** `origin-aware skills` with CODEOWNERS-safe review for autopilot. Rejects path-traversing dependency aliases (security fix — prevents a malicious package from installing files outside expected directories).
- **v0.33.0 (Oct 2):** `apm auth` for git host credentials. Fixes Claude dependency memory discovery at arbitrary depth.
- **v0.34.0 (Oct 19):** Corporate CA bundle support for HTTPS — important for enterprise networks that use internal CAs. `user-invocable` agent frontmatter field.
- **v0.35.0 (Oct 22):** Frozen-mode installs verify local content and preserve lockfile bytes. Rejects path-traversing dependency aliases (second fix — previous version had an edge case).

**For PerFiApp:** `apm auth` (v0.33.0) removes the manual credential management step for git-hosted MCP packages. The OCI container launcher (v0.27.0) is the most significant security addition — if PerFiApp eventually installs a Flinks MCP server, running it in a container limits the blast radius of any vulnerability. Path-traversal rejection (v0.32.0 / v0.35.0) is a direct supply-chain security fix.

Source: [APM GitHub releases](https://github.com/microsoft/apm/releases)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 MCP CVEs Continuing — Kong Konnect Verified; Two Others Unverified

**Verified:** CVE-2026-13341 in the Kong Konnect MCP Server (prior to version 1.0.0). An input validation flaw (CWE-20) allows a remote attacker to craft content that triggers indirect prompt injection, causing the server to run unintended API requests for the connected agent. Fix: upgrade to v1.0.0 or later. GHSA-7767-3m3w-2p44.

**Unverified (treat as alerts, not confirmed facts):** Secondary blog posts claim CVE-2026-5058 in `aws-mcp-server` (CVSS 9.8, unauthenticated RCE) and CVE-2026-27825 in `mcp-atlassian` (CVSS 9.1). Neither appeared in NVD search results. Do not block aws-mcp-server adoption based on this alone — verify against NVD and the relevant GitHub advisory before acting.

**Pattern:** The rate of MCP CVEs has not slowed since the OX Security advisory covered in the June report. The underlying architecture — MCP SDK has no built-in authentication, tool output passes through unsanitized in many server implementations — has not changed. Treat every new MCP server as untrusted until audited.

**For PerFiApp:** The MCP vetting checklist items from the June report remain in force. Add one more from CVE-2026-13341: "Does this server validate or sanitize content before passing it to the model as tool output?" That is the direct root cause of the Kong CVE.

Sources: [CVE-2026-13341 SentinelOne](https://www.sentinelone.com/vulnerability-database/cve-2026-13341/) / [MCP CVE tracker blog](https://mcp.directory/blog/mcp-security-200000-exposed-servers-owasp-mcp-top-10-cves)

### 6.2 Claude Code --restricted Mode (v2.1.248) — Zero Execution Surface for Review Agents

The new `--restricted` flag removes the bash execution, code execution, and WebFetch tools from Claude Code entirely. It also ignores local settings files.

**For PerFiApp:** The code-reviewer and security-reviewer agents currently have no mechanism to prevent themselves from accidentally (or via prompt injection) running bash commands. Running these agents with `--restricted` removes that surface entirely — they can only read files and produce text output. This should be the default invocation mode for both review agents in CI.

Source: [Claude Code August 2026 releases](https://www.havoptic.com/releases/claude-code/2026/8)

### 6.3 MCP cacheScope Cross-User Financial Data Leakage

The MCP 2026-07-28 specification introduced the `cacheScope` field on list/resource read results. This field controls whether a server's response is cached for a single user or across users.

**For PerFiApp:** A Flinks or Plaid MCP server that returns account balances or transactions must set `cacheScope` to user-level (not shared). An incorrectly scoped cache response could serve User A's financial data to User B's agent session. This is a PIPEDA violation (unauthorized disclosure of personal financial information) and a potential PCI-DSS concern. Add `cacheScope` verification to the MCP server design checklist and to the security-reviewer agent's checklist for any PR touching an MCP server implementation.

Source: [MCP 2026-07-28 specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/)

### 6.4 sandbox.credentials (v2.1.187) — Documentation Status

The prior report noted this setting was underdocumented. No evidence found that official documentation has been updated since June 23. The setting remains active. If not yet configured, add to project `settings.json`:

```json
{
  "sandbox": {
    "credentials": false
  }
}
```

This blocks sandboxed bash commands from reading `~/.aws/credentials`, `~/.ssh/`, and secret environment variables — directly relevant given developers may have Plaid sandbox keys or Equifax API credentials in their shell environment.

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 CDBA — Draft Regulations Published: Major Progress

**Status changed from "timeline slipping" to "draft regulations in public consultation."**

On June 27, 2026, the Department of Finance pre-published the draft **Consumer-Driven Banking Regulations** in Canada Gazette, Part I (Volume 160, Number 26). This is the most concrete regulatory progress since the Consumer-Driven Banking Act received Royal Assent in March 2026.

Key provisions (from law firm summaries — read the Gazette text directly for authoritative details):

- **Bank of Canada as accreditor and oversight body** — confirmed. Financial institutions and fintechs must obtain Bank of Canada accreditation to participate.
- **Data scope defined** — what account data must be shareable is specified in the draft.
- **Security requirements** — technical security standards for data sharing are included.
- **Liability rules** — consumer liability mechanics in the event of fraud or unauthorized access are addressed.
- **Screen scraping prohibition** — the draft includes a measured approach to prohibiting screen scraping (exact timeline and conditions in the Gazette text).

**Timeline update:** The 60-day comment period closed August 26, 2026. Wealthsimple's public submission called for a full implementation schedule. The Department now targets **finalization of regulations in early 2027**, with Phase 1 launch to follow. Phase 2 (payment initiation) remains targeted for mid-2027.

**For PerFiApp:** The draft regulations provide enough detail to begin architecture decisions that were previously blocked by uncertainty. Specifically: (a) accreditation by the Bank of Canada is confirmed as the pathway — begin understanding those requirements; (b) screen scraping will be prohibited under the final framework — the Flinks OAuth integration (not screen-scraping) is the right long-term architecture; (c) liability rules will affect how PerFiApp handles disputed transactions in the aggregation module.

**Action:** Read the Canada Gazette Part I text directly. Have the architect produce a gap analysis against PerFiApp's planned data-sharing architecture.

Sources: [Canada Gazette Part I — Consumer-Driven Banking Regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Department of Finance news release](https://www.canada.ca/en/department-finance/news/2026/06/government-pre-publishes-regulations-to-prevent-fraud-and-facilitate-the-next-phase-of-consumer-driven-banking.html) / [Bennett Jones analysis](https://www.bennettjones.com/Insights/Blogs/2026/07/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations) / [Blakes analysis](https://www.blakes.com/insights/proposed-consumer-driven-banking-regulations-released-for-comment/)

### 7.2 Canada RTR — By-Law Effective August 24; Phased Launch Confirmed for Q4 2026

**Status changed from "targeting Q4 2026" to "by-law effective, first participants going live."**

The Real-Time Rail By-law and Rules received all necessary approvals on June 30, 2026. Published in the Canada Gazette July 1, 2026. **Effective date: August 24, 2026.** Payments Canada's 2026 Q3 quarterly update confirmed the program has entered the industry assurance phase with system participants, on track for Q4 2026.

**Scope:** Initial participants (large banks) go live in Q4 2026. Universal participation is expected in 2027. Interac e-Transfer clearing migrates to the RTR in 2027.

**For PerFiApp:** Phase 2 of PerFiApp (payment initiation, cash safety write-access) requires RTR. The Q4 2026 launch means RTR will be live for early architecture and integration testing, even if universal participation is 2027. The architect should update the Phase 2 timeline to reflect this: RTR infrastructure is live now, and PerFiApp can begin integration design work rather than waiting.

Sources: [Payments Canada RTR](https://www.payments.ca/real-time-rail-payment-system) / [Payments Canada Q3 quarterly update](https://www.payments.ca/canadas-real-time-rail-quarterly-update-jude-pinto-2026-q3) / [Betakit RTR milestone](https://betakit.com/canadas-real-time-rail-system-will-launch-this-year-after-achieving-critical-milestone/)

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO Banking Licence — No Confirmed Approval

OSFI introduced a Targeted Fast-Track Framework in June 2026 to expedite fintech bank approvals. KOHO, which raised C$130M in June 2026, secured an additional **C$190M in equity and debt** (confirmed by Betakit) to bolster the licence effort. CEO Daniel Eberhard stated in May 2026 that approval could come "as early as this year."

No evidence found of formal OSFI or ministerial approval as of November 2, 2026. The licence application requires both OSFI recommendation and Minister of Finance approval. Coverage remains at "in process" without a confirmed date.

**For PerFiApp:** The threat level is unchanged — KOHO becoming a Schedule 1 bank would increase its product depth (deposit insurance, direct lending, broader payment rails). The OSFI fast-track framework increases the probability of 2026 approval but has not confirmed it. Continue monitoring.

Sources: [KOHO C$190M round](https://betakit.com/koho-secures-190-million-cad-in-equity-and-debt-to-bolster-banking-licence-efforts/) / [KOHO close to licence](https://betakit.com/koho-on-the-verge-of-securing-a-banking-licence-and-months-from-launching-telco-product-ceo-says/)

---

## Recommended Next Steps

### Immediate (this week)

1. **Audit for Opus 4.8 fast mode usage — 28 days to retirement.** Check all agent files, `settings.json`, and CI scripts for `/fast` mode references or the fast-mode API variant of `claude-opus-4-8`. Migrate to `claude-opus-5-5` ($4/$20 MTok). Verify the official retirement date at `platform.claude.com/docs/about-claude/model-deprecations` — the current source is a third-party tracker summary.

2. **Migrate spec-lead and architect to `claude-opus-5-5`.** The prior recommendation of `claude-opus-4-8` is two model generations behind. Spec Kit v1.x's workflow complexity benefits from the improved reasoning of Opus 5.5.

3. **Read the Canada Gazette CDBA draft regulations.** The Gazette text (linked in 7.1) contains the authoritative data-scope and security requirements. Have the architect produce a gap analysis against PerFiApp's planned aggregation module architecture.

4. **Enable `sandbox.network.strictAllowlist` in project settings.** Added in Claude Code v2.1.219. Configure the allowlist to include only the API endpoints the agent team legitimately needs (Anthropic API, GitHub, npm registry). No other hosts should be reachable from sandboxed bash.

5. **Set `--restricted` as the default invocation mode for code-reviewer and security-reviewer agents in CI.** Removes bash/code/WebFetch from these agents entirely — they should only read and report.

### Short-term (this sprint)

6. **Migrate test-engineer bulk tasks to `claude-haiku-5-5`.** At $0.10/$0.50 per MTok (under 100K tokens), this is a significant cost reduction. Run `deepeval generate` against the test-engineer's outputs to verify quality is maintained after the model switch.

7. **Upgrade Spec Kit to v1.2.6.** This is a major version jump from v0.11.6 — read the migration guide before upgrading. Key benefits: artifact MCP tools (implementer can fetch specs directly), built-in GitHub workflow step (spec-lead can trigger PR creation). Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.2.6`.

8. **Upgrade APM to v0.35.0.** Key additions since v0.21.0: OCI container launcher for MCP servers (run untrusted servers in containers), path-traversal rejection, `apm auth` for git credentials, `apm outdated` for update tracking.

9. **Add `cacheScope` to the MCP vetting checklist.** Any MCP server returning financial data (Flinks, Plaid, Equifax) must be verified to set `cacheScope` to user-level, not shared. Add this as a mandatory check in the security-reviewer agent's checklist.

10. **Add tool-output injection check to MCP vetting checklist** (from CVE-2026-13341). "Does this server validate or sanitize content before passing it to the model as tool output?" should be a blocking question on the vetting checklist.

### Medium-term (next 4–6 weeks)

11. **Update Phase 2 architecture timeline for RTR.** The RTR By-law is effective and Q4 2026 participants are going live. PerFiApp's payment initiation and cash safety features can now be designed against a live RTR specification rather than a planned one. Have the architect update the Phase 2 design document.

12. **Configure `PreModelSwitch` and `PostModelSwitch` hooks** (v2.1.251) to enforce the PerFiApp model allowlist. A `PreModelSwitch` hook can block the fallback chain from silently switching to a model outside `availableModelsMatch`. This closes the last gap in model governance.

13. **Enable `writes locked to working directories`** (v2.1.314) for the implementer agent. This prevents any write operation outside the project root — a meaningful guard for a financial application where accidental writes to config or credential directories would be serious.

14. **Trial `claude plugin eval`** (v2.1.269) for the `/speckit-implement` and `/speckit-clarify` skills. Reproducible scored evaluation makes it possible to detect when a Spec Kit upgrade or model change degrades skill behavior.

15. **Begin designing the Flinks MCP adapter as stateless** now that MCP 2026-07-28 is the production spec. No `Mcp-Session-Id`, no initialization handshake. Design for per-request context. Apply `cacheScope: "user"` to all financial data responses. Add authentication as the first feature (CVE-2026-32211 lesson from the June report).

---

*Report generated 2026-11-02. Findings verified against primary sources where accessible; unverified claims explicitly flagged. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
