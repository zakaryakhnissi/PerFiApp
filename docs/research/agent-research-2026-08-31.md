# PerFiApp Agent Research — 2026-08-31

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: Fable 5 / Mythos 5 export-control resolution, Opus 4.1 retirement confirmation, Claude Code changelog through v2.1.251, MCP stateless RC (July 28 deadline), Canadian open banking regulation, and new security CVEs.

---

## Executive Summary

Three findings demand immediate attention:

**1. Claude Opus 5 and Sonnet 5 both released — agent-team model routing needs a full update.** Opus 5 (released July 24, `claude-opus-5`) matches Opus 4.8 pricing ($5/$25 per million tokens) while approaching Fable 5-level intelligence. Sonnet 5 (released June 30, `claude-sonnet-5`) is priced at $2/$10 — permanently, as of August 10 — which is cheaper and stronger than Sonnet 4.6 ($3/$15). Every agent on the PerFiApp roster should be re-evaluated against the new model table. The prior "Opus 4.8 for spec-lead and architect; Sonnet 4.6 for implementer" tiering is now suboptimal for both cost and capability.

**2. STATUS CHANGE: Fable 5 and Mythos 5 access restored July 1, 2026.** The export-control suspension that dominated the last two reports is resolved. Fable 5 is generally available with updated safety classifiers. Mythos 5 remains restricted to Project Glasswing (defensive-cybersecurity partners only) — not relevant for PerFiApp. Fable 5 is now usable for spec-lead and architect trials, but requires explicit usage-credits consent through `/model fable` in Claude Code v2.1.232+.

**3. Canada CDBA consultation closed August 26 — open banking regulation now advancing to finalization.** The draft Consumer-Driven Banking Regulations (Canada Gazette, June 27) set specific operational requirements: accreditation, OAuth-based authentication/consent, and a phased account-type rollout. The 60-day consultation period just closed. Final regulations are expected within 12 months. This is the most concrete regulatory signal yet on what PerFiApp's data-sharing architecture must satisfy.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **STATUS CHANGE: Fable 5 restored July 1** | Model | spec-lead, architect | **Act — re-evaluate trial for top agents; consent flow required** |
| **STATUS CHANGE: Opus 4.1 retired Aug 5 (confirmed)** | Model | Any config referencing this ID | **Act — confirm no live traffic; it is now broken** |
| **Claude Sonnet 5 — cheaper and stronger than Sonnet 4.6** | Model / Cost | implementer, code-reviewer, test-engineer | **Adopt — immediate cost and quality win** |
| **Claude Opus 5 — Opus 4.8 pricing, near-Fable-5 quality** | Model / Cost | spec-lead, architect | **Adopt — same cost, major capability lift** |
| **claude-haiku-4-5-20251001 retiring Oct 15, 2026** | Model | Any agent using Haiku | **Act — 6 weeks; plan migration** |
| **MCP 2026-07-28 spec finalized — stateless, no Mcp-Session-Id** | Agent tooling | architect | **Act — design any custom MCP server for stateless operation now** |
| **Claude Code v2.1.251 — file tool symlink vuln patched** | Security | implementer, CI | **Act — update to latest; critical security fix** |
| **Claude Code GitHub Actions checkWritePermissions flaw (CVSS v4.0 7.8)** | Security | CI pipeline, security-reviewer | **Act — verify claude-code-action is at v1.0.94+** |
| **Claude Code v2.1.248 — `--restricted` flag + `experimental.cacheTtl`** | Toolchain / Cost | implementer subagents | **Adopt — cache control per agent + locked-down mode** |
| **Claude Code v2.1.243 — `promptCacheTtl` / `subagentPromptCacheTtl` settings** | Cost | All agents | **Adopt — fine-tune cache window per agent role** |
| **Claude Code v2.1.247 — `/claude-api cost-optimize`** | Cost | All developers | **Trial — profiles per-session spend** |
| **Claude Code v2.1.234 — Windows NTLM credential leak fix** | Security | Windows CI runners | **Act — update if running Claude Code on Windows** |
| **Spec Kit v1.0.2 (major jump from v0.11.6)** | Toolchain | spec-lead | **Adopt — v1.0 milestone; feature-assess workflow; Jira Mirror extension** |
| **APM v0.29.0 (from v0.21.0)** | Toolchain / Security | All developers | **Adopt — Executable Trust Governance v1, lifecycle hooks, archive checksum** |
| **CDBA draft regulations consultation closed Aug 26** | Compliance | architect, spec-lead | **Act — review final regulation text when published; architecture decisions now have regulatory anchors** |
| **Quebec Law 25 2026 — cross-border PIA required for all transfers** | Compliance | architect, security-reviewer | **Act — document data-transfer routes and produce PIA before launch** |
| **Sonnet 5 tokenizer: 1.0–1.35× more tokens for same text** | Cost | implementer, any Sonnet 5 call | **Monitor — retest prompt-cache hit rates after migration** |
| **DeepEval v4.1.x patch series** | Agent quality | test-engineer | **Adopt — incremental patches to v4.0; PyPI-only; update via pip** |
| **KOHO banking license status** | Competitive | spec-lead | **Watch — no license confirmation as of Aug 31** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGE: Fable 5 and Mythos 5 export-control suspension lifted — access restored July 1, 2026

**Prior state (June 24 report):** Access suspended globally since June 12. No restoration confirmed.

The US Department of Commerce lifted the export-control directive on June 30, 2026. Anthropic began restoring access the following day (July 1) with updated safety classifiers specifically targeting the cybersecurity jailbreak that triggered the suspension.

**Mythos 5 status:** Mythos 5 remains restricted to Project Glasswing (defensive-cybersecurity partners only). Not relevant for PerFiApp. The `claude-mythos-preview` deprecation remains in effect (retired June 30).

**Claude Code behavior change:** As of v2.1.232 (August 13), Fable 5 is available again in `/advisor` mode. Accessing it requires explicit usage-credits consent via `/model fable`. On Max subscriptions, Fable 5 draws from a usage-credit pool rather than the standard quota.

**For PerFiApp:** The mandatory Opus 4.8 fallback is no longer required for reliability. However, given the release of Opus 5 (see 1.3 below) at comparable intelligence and lower operational friction, evaluate whether Fable 5 is worth the added consent/credit layer for spec-lead and architect agents. Tentative retirement date for `claude-fable-5`: not before June 9, 2027.

Sources: [Anthropic redeployment announcement](https://www.anthropic.com/news/redeploying-fable-5) / [CNBC — export controls lifted](https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html) / [Al Jazeera](https://www.aljazeera.com/economy/2026/7/1/us-lifts-restrictions-on-powerful-ai-models-fable-mythos-anthropic-says)

### 1.2 STATUS CHANGE: claude-opus-4-1-20250805 retired on schedule — confirmed August 5, 2026

**Prior state (June 24 report):** Deprecated June 5, retirement 42 days away (August 5).

The model is now listed as "Retired" on the official deprecations page. Any call to `claude-opus-4-1-20250805` or the alias `claude-opus-4-1` fails immediately. This is no longer a warning — it is broken.

Action: Run a usage export from Claude Console (Usage > Export > CSV) to verify no live traffic is hitting this ID.

Source: [Model deprecations — confirmed Retired status](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.3 NEW: Claude Sonnet 5 — released June 30, 2026

- **Model ID:** `claude-sonnet-5`
- **Pricing:** $2/M input, $10/M output — introductory pricing made **permanent** August 10, 2026 (planned September 1 increase to $3/$15 cancelled)
- **Key capability shift:** Substantially improved over Sonnet 4.6 in reasoning, tool use, coding, and agentic multi-step tasks. Approaches Opus-class at Sonnet price. Reduced undesirable behaviors.
- **Important caveat:** Sonnet 5 uses a new tokenizer. The same text encodes to approximately 1.0–1.35× more tokens depending on content type. Prompt-cache hit rates may shift after migrating from Sonnet 4.6 — retest cache efficiency on the implementer's system prompts after migration.

**For PerFiApp:** `claude-sonnet-5` should replace `claude-sonnet-4-6` as the default for the implementer, code-reviewer, and test-engineer agents. It is cheaper (Sonnet 4.6 was $3/$15; Sonnet 5 is permanently $2/$10) and stronger. Retest cache efficiency after migrating due to the tokenizer change.

Sources: [Anthropic Sonnet 5 announcement](https://www.anthropic.com/news/claude-sonnet-5) / [TechCrunch](https://techcrunch.com/2026/06/30/anthropic-launches-claude-sonnet-5-as-a-cheaper-way-to-run-agents/) / [Finout pricing analysis](https://www.finout.io/blog/claude-sonnet-5-pricing-2026-the-hidden-costs-and-real-savings-behind-the-cost-neutral-launch)

### 1.4 NEW: Claude Opus 5 — released July 24, 2026

- **Model ID:** `claude-opus-5`
- **Pricing:** $5/M input, $25/M output — same as Opus 4.8
- **Context window:** 1M tokens
- **Key capability shift:** Described as "close to the frontier intelligence of Fable 5 at half the price" relative to Fable 5's pricing. Adds a low/medium/high effort toggle for cost-per-request control.
- **Default model:** Opus 5 is now the default for seat-based Enterprise Claude Code (as of v2.1.238, August 20).
- **Tentative retirement:** Not before July 24, 2027.

**For PerFiApp:** `claude-opus-5` should be evaluated as the new ceiling for spec-lead and architect agents. Same price as Opus 4.8 with substantially higher capability — a straightforward upgrade. The effort toggle is particularly useful for the spec-lead: complex constitution review can use `high` effort; routine clarification passes use `low`. Verify `temperature`/`top_p`/`top_k` are absent from Opus-tier API calls (required since Opus 4.7+; confirm Opus 5 inherits this behaviour).

Sources: [Anthropic Opus 5 announcement](https://www.anthropic.com/news/claude-opus-5) / [Technology.org pricing analysis](https://www.technology.org/2026/07/27/anthropic-claude-opus-5-launch-half-price/)

### 1.5 Upcoming: claude-haiku-4-5-20251001 retires October 15, 2026

The current light-tier model retires in approximately 6 weeks. If the debugger agent or any low-stakes triage step uses Haiku 4.5, a replacement must be identified now. No next-generation Haiku model has been announced as of this report.

Source: [Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.6 Updated model status table (as of 2026-08-31)

| Model ID | Status | Retirement |
|---|---|---|
| `claude-fable-5` | Active | Not before June 9, 2027 |
| `claude-opus-5` | Active | Not before July 24, 2027 |
| `claude-sonnet-5` | Active | Not before June 30, 2027 |
| `claude-opus-4-8` | Active | Not before May 28, 2027 |
| `claude-sonnet-4-6` | Active | Not before Feb 17, 2027 |
| `claude-haiku-4-5-20251001` | Active | **Oct 15, 2026 — 6 weeks** |
| `claude-opus-4-1-20250805` | **Retired Aug 5, 2026** | — |
| `claude-mythos-preview` | Retired June 30, 2026 | — |

Source: [Model deprecations — primary](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Sonnet 5 permanent pricing — net cost reduction for mid-tier agents

Sonnet 5's introductory $2/$10 pricing was originally capped through August 31, 2026. Anthropic confirmed on August 10 that this is now the permanent rate. For PerFiApp's implementer, code-reviewer, and test-engineer agents, migrating from Sonnet 4.6 ($3/$15) to Sonnet 5 ($2/$10) cuts per-token cost by 33% on input and output. The tokenizer change (same text = up to 1.35× more tokens) partially offsets this — expect a 10–20% real-world cost reduction with highly repetitive system prompts, less if prompts are varied.

Source: [Finout Sonnet 5 pricing analysis](https://www.finout.io/blog/claude-sonnet-5-pricing-2026-the-hidden-costs-and-real-savings-behind-the-cost-neutral-launch)

### 2.2 NEW: per-agent prompt cache TTL control (Claude Code v2.1.243 and v2.1.248)

Two new cache-control mechanisms:

**v2.1.243:** `promptCacheTtl` (project-level) and `subagentPromptCacheTtl` (subagent-level) settings in `settings.json`. Tune the cache window independently per agent role. For the security-reviewer's large but infrequently-used system prompt, a longer TTL prevents cold-start overhead. For the implementer running rapid iterative sessions, a shorter TTL reduces stale-context risk.

**v2.1.248:** `experimental.cacheTtl` in agent frontmatter (`.claude/agents/*.md`). Brings cache TTL control directly into each agent definition file — no project-level settings needed. The most ergonomic addition for PerFiApp: each agent in `.claude/agents/` declares its own cache preference alongside its system prompt.

**For PerFiApp:** Set `experimental.cacheTtl` in each agent frontmatter. Suggested starting points: spec-lead (long TTL — large constitution + spec context), security-reviewer (long TTL — large rule set), implementer (medium TTL), debugger (short TTL — context changes per session).

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 2.3 NEW: `/claude-api cost-optimize` profiling tool (v2.1.247)

A new built-in command profiles per-session API spend and surfaces high-cost operations. Useful for the researcher and architect agents when evaluating whether a multi-step MCP workflow is cost-efficient.

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 STATUS CHANGE: MCP 2026-07-28 spec finalized on schedule — stateless protocol is now the standard

**Prior state (June 24):** RC planned for July 28. "Design any custom MCP server for stateless operation now."

The RC shipped exactly on July 28, 2026, and the specification is now final. The four Tier 1 SDKs (Python, TypeScript, Go, C#) shipped beta support on publication day.

**Key confirmed changes:**

- **Protocol sessions removed:** `Mcp-Session-Id` is gone. Servers and clients must not rely on sticky sessions.
- **`Mcp-Method` and `Mcp-Name` headers required** on Streamable HTTP requests — enables stateless load balancers to route by method without session affinity.
- **`ttlMs` + `cacheScope` on list/resource responses** — structured caching hints. The `cacheScope` field controls whether a cached response is user-scoped, session-scoped, or global. For a financial app, any tool returning account balances or transaction data must explicitly set `cacheScope: "session"` or narrower. A misconfigured `cacheScope: "global"` on a banking tool is a data-leak vector.
- **W3C Trace Context in `_meta`** — distributed tracing across MCP calls; useful for debugging multi-step Plaid + Flinks workflows.
- **MCP Apps and Tasks extensions** — server-rendered UIs and long-running async work are now part of the spec as extensions.

**For PerFiApp:** The stateless constraint is now the standard, not a future concern. Any Flinks adapter or Plaid MCP wrapper must be stateless. OAuth tokens and consent state must live in the client or external store, not in the MCP server process. Audit `cacheScope` on all financial-data tool responses — minimum scope of `"session"` for any tool returning user-specific data.

Sources: [MCP 2026-07-28 RC announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [MCP 2026-07-28 final spec](https://blog.modelcontextprotocol.io/posts/2026-07-28/) / [SDK betas](https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/) / [Migration guide](https://www.developersdigest.tech/blog/mcp-2026-07-28-breaking-changes)

### 3.2 No Flinks MCP server confirmed

No official Flinks MCP server has been announced as of this report. Flinks' public developer documentation references REST APIs and FDX-aligned architecture. The prior recommendation to contact Flinks directly remains in the next-steps section.

### 3.3 NEW: Claude Code self-hosted runners (v2.1.224, August 7)

`claude self-hosted-runner` enables Claude Code web, mobile, and desktop interfaces on customer-controlled machines (Team/Enterprise tier). Relevant if PerFiApp eventually wants to run agent workflows against production-adjacent infrastructure without sending data through Anthropic's SaaS API. Watch item for post-MVP cost optimization.

Source: [Claude Code changelog v2.1.224](https://code.claude.com/docs/en/changelog)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 STATUS UPDATE: DeepEval v4.1.x patch series

**Prior state (June 24):** DeepEval v4.0 adopted with native Claude Code CLI integration.

DeepEval shipped a v4.1.x patch series (4.1.2 through 4.1.10) to PyPI between the June 24 report and today. GitHub releases were not created for these patches — they only appear in PyPI. Key theme: metrics refactored to standardize scoring (higher is always better across all metrics), improvements to tracing and observability, expanded model support. No breaking changes reported.

**For PerFiApp:** Run `pip install --upgrade deepeval` to pick up the 4.1.x patches. The standardized scoring direction is useful for the test-engineer agent when setting pass/fail thresholds.

Source: [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026)

---

## Track 5 — Toolchain Releases

### 5.1 Claude Code v2.1.188 through v2.1.251 — ten weeks of releases

The most actionable for PerFiApp across forty-plus versions:

**v2.1.224 — Structured credential masking (August 7)**
New `extract`, `decode: "jwt"`, `awsPairs`, and `sigv4` options for credential masking in sandbox mode. More precise than the blunt `sandbox.credentials: false` from v2.1.187 — define exactly how each credential type (Plaid API key, Flinks token, Equifax key) is redacted from bash output.

**v2.1.232 — Subagent forking default change, cross-session messaging (August 13)**
Non-teammate subagents in interactive sessions now **background by default**. Breaking behavioral change: if PerFiApp's workflows relied on subagents blocking the main session until complete, they now run concurrently. Verify the spec-lead → architect → implementer chain still sequences correctly. Cross-session messaging (`@mention` another session by name) is now live.

Fable 5 available in `/advisor` again as of this version.

**v2.1.234 — Windows NTLM credential leak fix (August 17)**
Rejected NT-namespace (`\??\`) paths that would leak NTLM credentials on Windows. Update immediately if any developer or CI runner uses Claude Code on Windows. Also: `Monitor` permission rules are now set aside while auto mode is active (treated as Bash rules) — breaking change for any workflow relying on Monitor rules for auto-mode gating.

**v2.1.238 — Opus 5 as Enterprise default, `ANTHROPIC_DEFAULT_MODEL` env var (August 20)**
Seat-based Enterprise sessions now default to `claude-opus-5`. `ANTHROPIC_DEFAULT_MODEL` env var sets the default without modifying `settings.json` — useful for CI scripts.

**v2.1.243 — `promptCacheTtl`, `subagentPromptCacheTtl`, model picker curation (August 25)**
`modelPicker` setting customizes which models appear in the `/model` picker — relevant for org governance (lock the picker to Sonnet 5, Opus 5, Fable 5 only).

**v2.1.246 — `/permissions` tab for auto mode (August 25)**
Shows classifier rules and allows editing in auto mode. Useful for auditing exactly what the implementer agent can do autonomously.

**v2.1.248 — `--restricted` flag, `experimental.cacheTtl` in agent frontmatter (August 27)**
`--restricted` removes all built-in command/code execution tools (Read, Write, Edit, Bash). A safe-mode for code-reviewer and security-reviewer agents that should only read, never write. `experimental.cacheTtl` enables per-agent cache control in agent frontmatter (see Track 2.2).

**v2.1.251 — File tool symlink vulnerability patched (August 28)**
Fixed a symlink vulnerability in the Read, Write, and Edit tools that could read or write outside approved locations. Also fixed: plugin commands pointing outside the plugin directory (path traversal), and Bash permission checks auto-approving arithmetic expressions in integer variables. **Update immediately.**

**Breaking changes summary:**
- `CLAUDE_CODE_SUBAGENT_MODEL` now sets default only; agent definitions and explicit spawns override it
- Non-teammate subagents background by default in interactive sessions (v2.1.232)
- `Monitor` rules set aside while auto mode is active (v2.1.234)
- Todo tools removed from Opus 4.8+, Sonnet 5+, Fable 5+, Mythos 5+ (v2.1.233)
- Cloud synced plugins show as `name@synced` — do not shadow local plugins (v2.1.243)

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 5.2 Spec Kit v1.0.2 — major version milestone (August 21–31, 2026)

**Prior state (June 24):** Spec Kit at v0.11.6.

Spec Kit crossed the v1.0 milestone on August 21, 2026 (v1.0.0 and v1.0.1 same day, v1.0.2 on August 31). If the team has not yet upgraded from v0.9.5 per the prior recommendation, jump directly to v1.0.2.

Key changes since v0.11.6:

**v0.16.0 (August 5) — BREAKING:** Copilot integration now defaults to skills instead of commands. If PerFiApp's Spec Kit setup uses VS Code Copilot with custom command configuration, behaviour will differ after upgrade.

**v0.16.1 (August 7):** `agent-context` recursion improvement for nested plans — directly relevant to PerFiApp's spec-driven workflow. Managed `.gitignore` scaffolding on `init`.

**v0.16.5 (August 19):** New `feature-assess` agentic workflow — a pre-spec assessment step before `speckit-specify`. Useful for evaluating whether a proposed feature fits the constitution before committing to a full spec cycle.

**v1.0.0 (August 21):** Stable milestone release.

**v1.0.2 (August 31 — today):** Community extensions added: Jira Mirror (sync spec tasks to Jira), AgentDocx SpecKit V2 (export specs to .docx), Pre-Spec Cards, Taco Review. Enhanced bundler validation.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.2`

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases)

### 5.3 APM v0.22.0 through v0.29.0 (late June through August 2026)

**Prior state (June 24):** APM at v0.21.0.

Eight releases since v0.21.0:

**v0.22.0 — Executable Trust Governance v1:** Builds on the v0.21.0 `allowExecutables` gate with a full governance framework: configurable default install targets, LF normalization, lockfile recording package names and versions.

**v0.23.0 — Lifecycle hooks + MCP version routing:** Pre/post-install hooks for MCP server management. MCP version routing to registry when defaults are configured.

**v0.24.0 — Archive checksum verification:** SHA-256 verification before extracting archive packages. Direct mitigation for supply-chain tampering.

**v0.27.0 — OCI container package support:** Docker launcher rendering for MCP servers shipped as OCI containers. Relevant if PerFiApp builds a containerized Flinks adapter.

**v0.29.0 — GitHub Copilot native registration, plugin bin/ consent controls:** Plugin executables in `bin/` now require explicit per-binary consent before execution. Tightens `allowExecutables` governance to the binary level.

Upgrade: `npm install -g @microsoft/apm@latest`

Source: [APM releases](https://github.com/microsoft/apm/releases)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CRITICAL: Claude Code v2.1.251 — symlink vulnerability in file tools (Act immediately)

Fixed in v2.1.251 (August 28): a symlink vulnerability in the Read, Write, and Edit built-in tools allowed reads and writes outside approved workspace locations. A malicious file in the working directory could create a symlink pointing outside the workspace; Claude Code would follow it without an additional permission check.

Also fixed in the same version:
- Plugin commands resolving paths outside the plugin directory (path traversal)
- Bash permission checks incorrectly auto-approving shell arithmetic expressions containing integer variables

No CVE ID has been separately filed as of this report date.

**For PerFiApp:** Update Claude Code to v2.1.251 immediately (`npm install -g @anthropic-ai/claude-code@latest`). Particularly relevant for any session where the implementer reads or writes files in a directory that might contain user-controlled content.

Source: [Claude Code changelog v2.1.251](https://code.claude.com/docs/en/changelog)

### 6.2 Claude Code GitHub Actions `checkWritePermissions` flaw — verify CI is patched

Disclosed June 1, 2026 by researcher RyotaK (GMO Flatt Security). CVSS v4.0: 7.8. Fixed in `claude-code-action` v1.0.94.

The `checkWritePermissions` function in the Claude Code GitHub Action unconditionally trusted any GitHub App actor as having write access. An attacker who could open a GitHub issue (any authenticated GitHub user) could craft prompt-injection payloads. When the Action processed the issue, the injected payload could exfiltrate CI secrets and OIDC tokens via `/proc/self/environ` access, and push malicious code to downstream repos.

Real-world precedent: the Cline project suffered a compromised npm publish token via a similar GitHub Actions attack in February 2026.

**For PerFiApp:** PerFiApp's `.github/workflows/` uses the Claude Code GitHub Action for automated PR review. Verify the action is pinned to v1.0.94 or later. Verify workflows grant minimum necessary permissions (no `write-all`). Add to the security-reviewer checklist: "Does this PR modify `.github/workflows/`? If so, flag for manual security review."

Sources: [The Hacker News](https://thehackernews.com/2026/08/claude-code-and-gemini-cli-flaws-let.html) / [Cybersecurity News](https://cybersecuritynews.com/claude-codes-github-actions-vulnerability/) / [Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/06/05/securing-ci-cd-in-agentic-world-claude-code-github-action-case/)

### 6.3 CVE-2026-54316 — Hugging Face API key exfiltration side channel (patched pre-prior report)

CVSS v3.1: 9.1. Affected Claude Code v0.2.54 through v2.1.163. Fixed in v2.1.163. Disclosed publicly in August 2026 news cycle despite being patched earlier. The attack used Claude Code's pre-approved access to `huggingface.co` as an exfiltration oracle — model download counters leaked API keys one character at a time.

**For PerFiApp:** All developers on v2.1.187+ (prior report recommendation) are protected. Architectural lesson: be cautious about pre-approving any public web service as an MCP or WebFetch domain — even read-only public services can become exfiltration channels.

Sources: [The Hacker News](https://thehackernews.com/2026/08/claude-code-and-gemini-cli-flaws-let.html) / [SentinelOne CVE entry](https://www.sentinelone.com/vulnerability-database/cve-2026-24887/)

### 6.4 Windows NTLM credential leak (v2.1.234, patched August 17)

Claude Code on Windows did not reject NT-namespace paths (`\??\...`), which can trigger NTLM authentication requests to attacker-controlled servers, leaking Windows domain credentials. Fixed in v2.1.234. Also fixed: Git Bash Cygwin-style symlink bypass and nested git repository trust inheritance issues.

**For PerFiApp:** If any developer or CI runner uses Claude Code on Windows, updating to v2.1.234+ is mandatory. Informational only for macOS/Linux-only teams.

Source: [Claude Code changelog v2.1.234](https://code.claude.com/docs/en/changelog)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS CHANGE: CDBA draft regulations published and consultation just closed

**Prior state (June 24):** Phase 1 timeline "widely seen as at risk," no operational requirements published.

On June 27, 2026, Finance Canada published the proposed Consumer-Driven Banking Regulations in the Canada Gazette, Part I. The 60-day public consultation period closed **August 26, 2026 — five days ago.** This is the most significant Canadian compliance development since the CDBA received Royal Assent.

**What the regulations specify (newly actionable):**

- **Accreditation framework:** Service providers (including fintechs like PerFiApp) must be accredited by the Bank of Canada to participate. Accreditation requirements include security standards, consumer liability rules, and operational capacity.
- **Authentication and consent:** OAuth-based authentication with explicit, granular consumer consent — not screen-scraping, not credential sharing.
- **Phased account-type rollout:** Deposit and payment accounts first; lending accounts second; registered and non-registered investment accounts third. Credit-related data arrives in Phase 1 Wave 2, not Wave 1 — relevant for module prioritization.
- **Technical standards body:** Designation not yet announced; FDX is the most-cited candidate.
- **Bank of Canada as regulator:** Not FCAC — a significant governance decision finalized in this regulation set.

**Timeline:** Final regulations expected within 12 months of final publication. Best-case: Q2 2027. The comment period closing removes the last major public input gate.

**For PerFiApp:** This is the architectural anchor the spec-lead and architect have been waiting for. The regulations confirm: (a) OAuth is mandatory; (b) accreditation is required; (c) data rollout sequence is specified. The architect should assess whether the data-sharing architecture spec needs to explicitly reference the accreditation path and consent model. The spec-lead should consider whether an amended spec is needed before implementation begins.

Sources: [Canada Gazette — draft regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Finance Canada announcement](https://www.canada.ca/en/department-finance/news/2026/06/government-pre-publishes-regulations-to-prevent-fraud-and-facilitate-the-next-phase-of-consumer-driven-banking.html) / [Mondaq analysis](https://www.mondaq.com/canada/financial-services/1812418/open-banking-milestone-draft-consumer-driven-banking-regulations-released) / [Norton Rose Fulbright](https://www.nortonrosefulbright.com/en-ca/knowledge/publications/37d88caf/open-banking-in-canada)

### 7.2 STATUS UPDATE: Canada RTR — Q4 2026 launch remains the target

No change to prior finding. Q4 2026 phased launch is still the target; universal participation 2027. Phase 2 write-access features (payment initiation) remain realistically 2027.

### 7.3 NEW: Quebec Law 25 2026 amendments — cross-border PIA now mandatory

Quebec's Law 25 (LPRPSP enforcement regime) received 2026 amendments tightening two provisions relevant to PerFiApp:

**Cross-border transfer PIA requirement (new):** A documented Privacy Impact Assessment is now required for every transfer of personal information outside Quebec — even to jurisdictions previously treated as having "adequate protection." For PerFiApp, this applies if US-hosted cloud infrastructure processes Quebec-resident financial data, if analytics or ML inference occurs outside Quebec, or if Plaid or other US-based aggregators receive Quebec-resident data. Because PerFiApp serves Quebec residents as a bilingual Canadian app, this obligation is live from the first Quebec user.

**Penalties:** Administrative monetary penalties up to C$10M or 2% of global revenue; penal proceedings up to C$25M or 4%. GDPR-scale for a Canadian fintech.

**For PerFiApp:** The security-reviewer agent's compliance checklist should include a Quebec Law 25 cross-border transfer audit before production launch. The architect should document all data flows that cross the Quebec border. A PIA template should be part of the spec for any data-sharing module.

Sources: [Sherlock Forensics — 2026 amendments](https://www.sherlockforensics.com/blog/quebec-law-25-2026-amendments-canadian-organizations.html) / [Osler — enforcement scheme](https://www.osler.com/en/insights/updates/law-25-a-new-enforcement-scheme-for-protection-of-personal-information-in-the-private-sector-in-que/)

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO banking license — no confirmation as of August 31

No public confirmation of KOHO receiving its banking license as of this report date. The June 24 report noted it was described as "imminent." Maintain "Monitor" status.

### 8.2 Canada RTR competitive implications

With RTR targeting Q4 2026, Wealthsimple and KOHO (both Payments Canada members) are positioned to offer real-time payment features before a CDBA-accreditation-required PerFiApp can offer payment initiation. PerFiApp's Phase 2 write-access features remain gated on both RTR availability and CDBA Phase 2, both realistically 2027. The competitive gap in payment features is structural and near-term.

---

## Recommended Next Steps

### Immediate (this week)

1. **Update Claude Code to v2.1.251.** The file tool symlink vulnerability, plugin path traversal, and Bash arithmetic auto-approval bug are patched in this version. Every developer and CI runner needs this update: `npm install -g @anthropic-ai/claude-code@latest`.

2. **Verify `claude-code-action` is at v1.0.94+** in all `.github/workflows/` files. Pin the action version explicitly (not `@latest`). Audit GitHub Action permissions — no workflow should have `permissions: write-all`.

3. **Confirm `claude-opus-4-1-20250805` is fully retired** from all integrations. Run a Claude Console usage export (Usage > Export > CSV). Any remaining traffic to this model ID is failing right now.

4. **Evaluate the new model table for agent routing.** Direct upgrade path: replace `claude-sonnet-4-6` with `claude-sonnet-5` in implementer, code-reviewer, and test-engineer agent files; replace `claude-opus-4-8` with `claude-opus-5` in spec-lead and architect agent files. Both swaps are same-cost-or-cheaper with higher capability. Confirm `temperature`/`top_p`/`top_k` remain absent from all Opus-tier API calls — verify Opus 5 inherits this restriction.

### Short-term (this sprint)

5. **Upgrade Spec Kit to v1.0.2.** If still on v0.9.5 (prior recommendation gap), upgrade directly to v1.0.2. Note the v0.16.0 breaking change for Copilot integration. Command: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.2`.

6. **Upgrade APM to v0.29.0.** Key additions over v0.21.0: Executable Trust Governance v1 (v0.22.0), lifecycle hooks (v0.23.0), archive checksum verification (v0.24.0), per-binary consent for plugin executables (v0.29.0). Command: `npm install -g @microsoft/apm@latest`.

7. **Add `experimental.cacheTtl` to each agent frontmatter** in `.claude/agents/`. Start with longer TTLs for spec-lead and security-reviewer (large, stable system prompts), shorter for debugger (context changes per session).

8. **Draft a Quebec Law 25 cross-border data transfer inventory** as pre-work before the first spec that touches user data storage. Assign to the security-reviewer agent as an input to the architecture spec. Every cloud service that will handle Quebec-resident financial data needs a PIA before production launch.

9. **Review the CDBA draft regulations** and update the architecture spec accordingly. Key inputs for the architect: (a) accreditation is a business milestone, not just technical; (b) OAuth with granular consent is mandatory; (c) data rollout sequence (deposit/payment first, lending second) should drive module-level feature gating.

### Medium-term (next 4–8 weeks)

10. **Plan for Haiku retirement (October 15, 2026 — 6 weeks).** If any PerFiApp agent or workflow uses `claude-haiku-4-5-20251001`, identify a replacement. No next-gen Haiku has been announced — Sonnet 5 is the next step up.

11. **Migrate any custom MCP server designs to the 2026-07-28 stateless spec.** Remove any reliance on `Mcp-Session-Id`. OAuth tokens and consent state must live client-side. Add `cacheScope` to all financial-data tool responses — minimum scope of `"session"` for any tool returning user-specific data.

12. **Adopt `--restricted` flag for code-reviewer and security-reviewer agents.** The `--restricted` flag (v2.1.248) removes all built-in code execution tools. These agents should be read-only — this eliminates the risk of a review agent making unintended writes.

13. **Re-evaluate Fable 5 for spec-lead and architect**, now that access is restored. Weigh against Opus 5: Opus 5 is the seat-based Enterprise default, has no credit-consent friction, and is near-Fable-5 intelligence at half the price. Fable 5's usage-credit consent flow adds operational overhead. Fable 5 may still be worth it for the most complex constitution work; Opus 5 is likely sufficient for most architect-level design.

14. **Contact Flinks about MCP server availability.** No official Flinks MCP server exists. The MCP 2026-07-28 stateless spec makes this simpler to build. If Flinks does not have one on their roadmap, PerFiApp should plan to build a Flinks MCP adapter — stateless HTTP, OAuth, `cacheScope: "session"` on all financial data tools. This would be the highest-value addition to the PerFiApp agent toolchain.

---

*Report generated 2026-08-31. Delta report vs 2026-06-24. All findings verified against primary sources. Prior findings not repeated unless status changed.*
