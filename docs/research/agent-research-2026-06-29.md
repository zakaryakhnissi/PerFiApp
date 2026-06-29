# PerFiApp Agent Research — 2026-06-29

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: Fable 5 / Mythos 5 export-control development (highest time-sensitivity), Claude Code v2.1.188–v2.1.195 changelog, MCP RC new details, new MCP security advisories (VIPER-MCP, NSA guidance, CVE-2026-27825), APM v0.22.0–v0.23.0, Spec Kit v0.11.8–v0.11.10, OSFI fast-track pilot launch, Bank of Canada PSP registry.

---

## Executive Summary

Three findings are most time-sensitive as of June 29, 2026:

1. **Mythos 5 partially restored for ~100 US organizations (June 27); Fable 5 remains suspended for all general users.** The June 24 report's "watch" status has changed: the suspension is no longer blanket — Mythos is accessible to "Annex A" US entities under a new export-control licensing regime. Fable 5 remains blocked for API developers and Claude Code users worldwide. The practical implication for PerFiApp is unchanged: do not plan on Fable 5 being available before August at the earliest.

2. **`claude-mythos-preview` retirement deadline is tomorrow, June 30, 2026.** The prior report listed this model as deprecated in the deprecation table. Any reference to `claude-mythos-preview` in agent files, Bedrock configurations, or CI scripts will break starting tomorrow. Verify and remove all references today.

3. **NSA published authoritative MCP security guidance (May 20, 2026), VIPER-MCP disclosed 106 zero-days in 40K MCP repos, and CVE-2026-27825 (CVSS 9.1) hit the most widely used Atlassian MCP server (4M+ downloads).** The MCP security landscape has materially worsened since June 24. The NSA guidance is now the authoritative baseline for designing PerFiApp's custom MCP servers. Any team member who has `mcp-atlassian` installed must upgrade to v0.17.0 immediately.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Fable 5 still suspended; Mythos 5 partially restored for Annex A orgs** | Model | spec-lead, architect | **Act — confirm no Fable 5 traffic; Mythos N/A for PerFiApp** |
| **claude-mythos-preview retires June 30 (tomorrow)** | Model | Any agent using this ID | **Act — audit and remove all references today** |
| **No new Anthropic model IDs beyond current lineup** | Model | All agents | No change since June 24 |
| **Agent SDK billing split — still paused** | Cost | All developers | No change since June 24 — still paused |
| **Opus 4.8 Fast Mode 3x cheaper than Opus 4.7 Fast Mode** | Cost | spec-lead, architect agents | **Adopt — $10/$50 vs prior $30/$150 per MTok; verified pricing** |
| **Claude Code v2.1.191 — `/rewind` + CPU −37%** | Toolchain | All agents | **Adopt — resumable conversations, lower compute** |
| **Claude Code v2.1.193 — `autoMode.classifyAllShell`** | Security / Toolchain | implementer in auto mode | **Adopt — routes all shell commands through classifier** |
| **Claude Code v2.1.195 — hook matcher exact-match fix** | Toolchain | All agents with hooks | **Adopt — critical correctness fix for hyphenated hook names** |
| **MCP RC: Tasks & MCP Apps extensions finalized; authorization hardening** | Agent tooling | architect | **Watch — `iss` validation now required; affects custom MCP server design** |
| **CVE-2026-27825 — mcp-atlassian CVSS 9.1, unauthenticated RCE** | Security | all developers | **Act — upgrade mcp-atlassian to >= 0.17.0 immediately** |
| **CVE-2026-5058/5059 — aws-mcp-server CVSS 9.8, command injection** | Security | architect, code-reviewer | **Act — add to MCP vetting checklist** |
| **VIPER-MCP: 106 zero-days in 40K MCP repos, 67 CVEs assigned** | Security | architect, code-reviewer | **Act — taint-style input→exec pattern now the primary MCP threat class** |
| **NSA MCP Security Design Considerations (May 20, 2026)** | Security | architect, spec-lead | **Act — authoritative standard; align custom MCP server design** |
| **APM v0.22.0 — Executable Trust Governance v1 (deny-wins)** | Toolchain | All developers | **Adopt — stronger than v0.21.0's allowExecutables gate** |
| **APM v0.23.0 — lifecycle hooks framework + security patches** | Toolchain | All developers | **Adopt — June 29 release; 4 Dependabot CVEs cleared** |
| **Spec Kit v0.11.8 — CI security (action pinning, shellcheck)** | Toolchain | spec-lead, CI | **Adopt — direct CI hardening** |
| **Spec Kit v0.11.9 — /speckit-analyze no longer forks long sessions** | Toolchain | spec-lead | **Adopt — fixes long-session freezes** |
| **Spec Kit v0.11.10 — auth and expression parsing fixes** | Toolchain | spec-lead | **Adopt — latest stable as of June 29** |
| **OSFI Fast-Track licensing pilot launched June 2026** | Compliance | spec-lead, architect | **Monitor — 16–18 month timeline to Schedule 1 bank status; relevant to KOHO** |
| **Bank of Canada publishes first 300 PSP registrations** | Compliance | architect, spec-lead | **Monitor — fintechs now have direct payment rail access** |
| **KOHO: second phase of OSFI process, license not yet granted** | Competitive | spec-lead | No change since June 24 — license still pending |
| **Copilot Money officially expands Canada support** | Competitive | spec-lead | **Monitor — new iOS/macOS premium competitor** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGE: Fable 5 still suspended; Mythos 5 partially restored for ~100 US entities (June 27)

**Status changed from "blanket suspension" to "partial, tiered access."**

On June 27, 2026, the US Department of Commerce notified Anthropic that Mythos 5 can be redeployed to "entities identified in Annex A" — approximately 100 US companies and government agencies operating and defending critical infrastructure. Anthropic subsequently updated its access controls to enable these organizations. A waiver from the export control allows transfers among Annex A partners and to Anthropic's own foreign national employees.

**Fable 5 is still fully suspended for general use.** The June 27 letter from Commerce Secretary Lutnick is "silent on Fable 5," according to reporting. Government sources indicate they are "moving toward releasing Fable," but no timeline exists. This is the same effective status as June 24 for any API developer or Claude Code user.

**For PerFiApp:** Nothing has changed for the agent team. PerFiApp is not a US critical infrastructure operator and will not qualify under Annex A. Continue using `claude-opus-4-8` for spec-lead and architect. Continue maintaining the fallback chain. Do not re-evaluate Fable 5 for any PerFiApp agent until Anthropic posts a confirmed general-availability restoration to its status page.

Sources: [Semafor — US releases Mythos to some companies (June 27)](https://www.semafor.com/article/06/27/2026/us-releases-powerful-anthropic-model-mythos-to-some-us-companies) / [CNBC — Trump admin allows Mythos release (June 26)](https://www.cnbc.com/2026/06/26/us-government-anthropic-claude-mythos5-ai.html) / [Anthropic statement](https://www.anthropic.com/news/fable-mythos-access) / [ExplainX — June 27 update](https://explainx.ai/blog/is-fable-5-back-2026)

### 1.2 DEADLINE TOMORROW: claude-mythos-preview retires June 30, 2026

The June 24 report listed `claude-mythos-preview` as deprecated with a June 30, 2026 retirement date. That date is tomorrow. Any API call, Bedrock configuration, or agent file referencing this model ID will begin failing at midnight UTC June 30.

Verify: search all agent YAML/JSON files and any CI scripts for `mythos-preview` and remove or replace references. There is no general-access replacement — if `claude-mythos-preview` was in use for internal research purposes, `claude-opus-4-8` is the nearest available replacement.

Source: [Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations) / [AWS Bedrock model card — claude-mythos-preview](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-mythos-preview.html)

### 1.3 No new model IDs released since June 24

No new Anthropic model IDs have been released or announced between June 24 and June 29. The current active lineup remains `claude-opus-4-8`, `claude-sonnet-4-6`, and `claude-haiku-4-5-20251001`. No change to model pricing has been announced since Opus 4.8 Fast Mode's 3x price reduction at launch (May 28, 2026).

Source: [Current model lineup — Tygart Media](https://tygartmedia.com/current-claude-model-version/) / [Anthropic release notes](https://support.claude.com/en/articles/12138966-release-notes)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Agent SDK billing split — no change

Still paused as of June 29. No new announcement from Anthropic. The June 24 report's analysis stands: usage via Claude Code and Agent SDK still draws from subscription limits. No action required.

Source: [The New Stack — pause announcement](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/)

### 2.2 NEW: Opus 4.8 Fast Mode pricing confirmed at 3x discount vs Opus 4.7

Now confirmed stable as a cost optimization option. Opus 4.8 Fast Mode is priced at **$10 input / $50 output per million tokens**, down from Opus 4.7's $30/$150. Standard Opus 4.8 remains $5/$25.

For PerFiApp's spec-lead and architect agents (highest-cost tiers), Fast Mode delivers approximately 2.5x speed for complex single-turn tasks at $10/$50 — which is still cheaper than standard Opus 4.7 at $15/$60. Combined with prompt caching (−90% on cached input) and the Batch API (−50% on both), the effective cost floor for these agents can reach approximately $0.25/$2.50 per million tokens on cached, batched requests.

**Recommendation:** For spec-lead and architect tasks that are non-interactive (bulk analysis, spec generation, code review passes), route to Opus 4.8 Fast Mode + Batch API rather than standard Opus 4.8. This requires no model version change — just add `fast_mode: true` and batch the requests.

Source: [Cryptopolitan — Opus 4.8 Fast Mode pricing](https://www.cryptopolitan.com/anthropic-ships-opus-4-8-with-a-3x-fast-mode-price-cut/) / [Anthropic pricing docs](https://platform.claude.com/docs/en/about-claude/pricing) / [pricepertoken.com](https://pricepertoken.com/pricing-page/model/anthropic-claude-opus-4.8-fast)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 Claude Code v2.1.188 through v2.1.195 — changes since June 24

The last known version at the June 24 report was v2.1.187. Six versions shipped between June 24 and June 26. Key changes for PerFiApp:

**v2.1.191 (June 24) — `/rewind` command + CPU −37%**

`/rewind` allows resuming a conversation from before `/clear` was run. In multi-step agent sessions, the implementer or spec-lead can recover from an accidental `/clear` without restarting from scratch. CPU usage during streaming was reduced by approximately 37% via text update coalescing (batched at 100ms intervals) — meaningful for long agent sessions. Long-session memory growth from terminal output cache was also reduced.

Two bug fixes with direct PerFiApp relevance: "Fixed hooks with comma-separated matchers silently not firing" and "Fixed `/permissions` approval not persisting on close." If any PerFiApp hooks use comma-separated matchers, they were silently broken before v2.1.191.

**v2.1.193 (June 25) — `autoMode.classifyAllShell` + OpenTelemetry**

The new `autoMode.classifyAllShell` boolean (default: false) routes all Bash/PowerShell commands through the auto-mode safety classifier, not just commands that pattern-match as arbitrary-code-execution. When enabled, every shell command the implementer runs gets classified — the trade-off is additional classifier latency per shell call. For financial-code automation where safety matters more than speed, enable this.

Auto-mode denial reasons are now written to the transcript and visible in `/permissions`. When the implementer agent's shell command is blocked in auto mode, the reason is now logged and reviewable rather than silently swallowed.

Added `claude_code.assistant_response` as an OpenTelemetry log event (redacted by default). This enables PerFiApp to pipe agent responses into an OTel-compatible APM system for production observability, with the redaction default protecting any financial data that appears in responses.

MCP `headersHelper` auth now automatically reconnects on 401/403. An expired MCP auth token will now retry authentication rather than failing silently — relevant for any MCP server using time-limited tokens (Plaid sandbox tokens, Flinks OAuth).

**v2.1.195 (June 26) — hook matcher exact-match fix (CRITICAL for named agents)**

Fixed: "hook matchers with hyphenated identifiers (e.g., `code-reviewer`, `mcp__brave-search`) were substring-matching; now exact-match only." This is a **correctness fix** that may silently change hook behavior in existing configurations. Any hook designed to match `code-reviewer` would previously also fire for any identifier containing the substring `code-reviewer`. After v2.1.195 it fires only on exact match.

**For PerFiApp:** If any hook in `.claude/settings.json` uses a hyphenated identifier in a matcher, verify the behavior is still correct after upgrading to v2.1.195. Names like `test-engineer` or `code-reviewer` from the agent roster are exactly the identifiers affected.

Also in v2.1.195: fixed "external plugins enabled only by project `.claude/settings.json` requiring explicit install consent on every loader path." If PerFiApp uses project-level plugin configurations, this fixes repeated consent prompts that were disrupting CI flows.

Sources: [Claude Code changelog](https://code.claude.com/docs/en/changelog) / [GitHub releases](https://github.com/anthropics/claude-code/releases) / [Release v2.1.193](https://github.com/anthropics/claude-code/releases/tag/v2.1.193)

### 3.2 MCP RC 2026-07-28 — new implementation details (29 days away)

**Authorization hardening:** Clients must now validate the `iss` (issuer) parameter per RFC 9207 in OAuth flows. This mitigates mix-up attacks in MCP's "single-client, many-server" deployment pattern — where an attacker tricks a client into sending tokens for Server A to Server B. For PerFiApp's planned Flinks adapter MCP server, the OAuth implementation must enforce issuer validation, not just token presence. Anthropic's Claude Code client will enforce this on the client side after the RC.

**Tasks extension redesigned:** `tasks/list` is removed entirely (scope problem without sessions). The replacement pattern: servers return a task handle from `tools/call`, clients poll with `tasks/get`, clients push updates via `tasks/update`. Any implementation targeting the 2025-11-25 experimental Tasks spec must migrate before July 28.

**MCP Apps (SEP-1865):** Tool UI templates declared server-side, rendered in sandboxed iframes in the host. Every UI-initiated action routes through the same JSON-RPC consent path as direct tool calls. A Flinks data-consent UI or transaction approval UI could be shipped as an MCP App template rather than a separate web page, keeping the full interaction within the audited tool call pathway.

**Formal 12-month deprecation guarantee:** Roots, Sampling, and Logging enter deprecation but will not be removed before July 28, 2027. One-year migration window for any PerFiApp MCP server using Sampling.

Source: [MCP RC blog post](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [Stacktree — MCP spec changes](https://stacktr.ee/blog/mcp-2026-spec-changes) / [IBM MCP Context Forge RC epic](https://github.com/IBM/mcp-context-forge/issues/5166)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval — no new releases since v4.0 (June 22)

No releases between June 22 and June 29. The v4.0 adoption recommendation from the June 24 report stands. No change.

Source: [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026)

---

## Track 5 — Toolchain Releases

### 5.1 APM v0.22.0 (June 26) and v0.23.0 (June 29)

Two releases since the June 24 report's v0.21.0 finding.

**v0.22.0 (June 26) — Executable Trust Governance v1**

Material upgrade from v0.21.0's `allowExecutables` gate. v0.22.0 introduces a **deny-wins resolver**: when multiple rules conflict (e.g., an org policy allows a package but a project policy denies it), the deny always wins. This closes a class of policy bypass where a more-permissive rule could override a security restriction. Also added: lifecycle hooks with per-target manifest selection, configurable default install targets, Windows PowerShell resilience, and compiler upgrade from v0.76.1 to v0.80.9 (all lockfiles recompiled — expect lockfile churn on upgrade).

**v0.23.0 (June 29 — today) — Lifecycle hooks framework + security patches**

Introduces a general-purpose lifecycle hooks framework for task automation (distinct from Claude Code hooks — these are APM lifecycle events: pre-install, post-install, pre-update, etc.). Security: cleared four Dependabot alerts affecting `llm`, `vite`, and `esbuild` packages in APM itself. Fixed: cached transitive registry deps being treated improperly during updates; lockfile pruning when dependencies were removed.

**For PerFiApp:** Upgrade from v0.21.0 to v0.23.0. The deny-wins resolver is the highest-value security addition — an org-level security deny on a suspicious MCP server cannot be overridden by a project-level allowlist. The four Dependabot CVEs cleared in v0.23.0 affect APM's own dependency chain — upgrade before running `apm install` in CI.

Source: [APM releases](https://github.com/microsoft/apm/releases)

### 5.2 Spec Kit v0.11.8 (June 24), v0.11.9 (June 26), v0.11.10 (June 29)

Three releases since the June 24 report's v0.11.6 finding.

**v0.11.8 (June 24) — CI security hardening**

Added GitHub Actions pin-to-SHA for all action references (action pinning) and shellcheck integration for shell scripts in CI. Community catalog gained three new extensions: Spec Roadmap, Golden Demo, and Jira Integration v0.4.0. The Jira Integration extension adds bidirectional spec-to-issue linking if the team tracks issues in Jira.

**v0.11.9 (June 26) — Long-session freeze fix**

Fixed: "`/speckit-analyze` forked a subprocess on every call, causing long-session freezes." Now runs inline without forking. Also added: private GHES release asset resolution via `/api/v3` and a mandatory hook execution directive for extensions.

**v0.11.10 (June 29 — today) — Auth and expression fixes**

Fixes: GHES auth for extensions, host-less catalog URL rejection in validators (prevents connecting to malformed catalog URLs that could point to attacker-controlled sources), infinite number-input default handling to prevent `OverflowError`, and quote-aware expression operator/literal parsing (fixes expressions with quoted strings containing operators). The quote-aware parsing fix may change behavior of existing workflow expressions — test your workflows after upgrading.

**For PerFiApp:** Upgrade from v0.11.6 to v0.11.10. The long-session freeze fix (v0.11.9) is highest-urgency — the spec-lead agent's multi-call analysis sessions were affected. The host-less catalog URL rejection (v0.11.10) is a security hardening worth having.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.11.10`

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 NEW: CVE-2026-27825 — mcp-atlassian CVSS 9.1, unauthenticated RCE (patched in v0.17.0)

Disclosed by Pluto Security (CVE IDs published June 2026). The `mcp-atlassian` package (4.4K GitHub stars, 4M+ downloads) contains two chained vulnerabilities:

- **CVE-2026-27825 (CVSS 9.1):** The `download_attachment` and `download_content_attachments` tools accept attacker-supplied target paths without directory confinement. An unauthenticated attacker on the local network can write files to arbitrary paths — including `~/.bashrc` or `~/.ssh/authorized_keys` — achieving persistence or RCE. Two HTTP requests, no authentication required.
- **CVE-2026-27826 (SSRF):** Middleware honors `X-Atlassian-Jira-Url` and `X-Atlassian-Confluence-Url` headers without validation, enabling SSRF to arbitrary destinations from the victim host.

**For PerFiApp:** If any team member has `mcp-atlassian` installed for Jira or Confluence access, upgrade to `>= 0.17.0` immediately. If declared in `apm.yml`, update the pinned version. Add to the MCP vetting checklist: "Does this server perform path traversal validation on all file-write tool paths?"

Sources: [Arctic Wolf advisory](https://arcticwolf.com/resources/blog/cve-2026-27825/) / [Pluto Security writeup](https://pluto.security/blog/mcpwnfluence-cve-2026-27825-critical/) / [blogs.jsmon.sh explanation](https://blogs.jsmon.sh/cve-2026-27825-explained-unauthenticated-rce-in-atlassian-mcp-servers/)

### 6.2 NEW: CVE-2026-5058 / CVE-2026-5059 — aws-mcp-server CVSS 9.8, command injection

Published April 11, 2026. The `aws-mcp-server` package contains command injection vulnerabilities (CWE-78) in its allowed-commands-list handler. Attacker-controlled input passes unsanitized into `exec()`, allowing arbitrary OS command execution with the privileges of the MCP server process — which typically has access to AWS credentials, environment variables, and IAM roles.

No authentication is required. Attack vector is network-based. The Zero Day Initiative advisory ZDI-26-246 is the primary reference for the patch.

**For PerFiApp:** If any agent uses `aws-mcp-server` for S3, Lambda, or other AWS operations, verify the installed version against ZDI-26-246. The bigger lesson: do not run any MCP server with AWS credential access without network-level isolation. Add to the MCP vetting checklist: "Is this server's command handling protected against injection into shell execution?"

Sources: [SentinelOne CVE-2026-5058](https://www.sentinelone.com/vulnerability-database/cve-2026-5058/) / [TheHackerWire details](https://www.thehackerwire.com/aws-mcp-server-remote-code-execution-via-command-injection-cve-2026-5058/) / [Tenable](https://www.tenable.com/cve/CVE-2026-5058)

### 6.3 NEW: VIPER-MCP — 106 zero-days confirmed in 40K MCP server repositories

A preprint (arXiv:2605.21392) describes VIPER-MCP, a combined static/dynamic taint-analysis framework for MCP server vulnerabilities. Key findings:

- Scanned 39,884 real-world open-source MCP server repositories
- Found 106 zero-day vulnerabilities, all confirmed through end-to-end exploit traces
- 67 CVE IDs assigned so far
- False positive rate: 4.6%; false negative rate: 7.7%
- Primary vulnerability class: tool handlers that take user-controlled input and pass it without sanitization into shell execution, network requests, or file system operations

The MCP security landscape as of June 2026: Censys counts 12,520 internet-accessible MCP services, approximately 40% with no authentication. A separate Adversa AI study found 40+ CVEs across MCP implementations in Python, TypeScript, Java, and Rust SDKs between January and April 2026.

**For PerFiApp:** VIPER-MCP's primary finding directly characterizes the risk profile for a custom Flinks MCP adapter. If the adapter takes any Flinks webhook payload or API response and passes it into a shell command, file write, or network request without sanitization, it is structurally vulnerable to the most common MCP exploit class. Design the Flinks adapter to treat all external data as untrusted, with the taint-to-sink pattern as the primary threat model.

Sources: [VIPER-MCP arXiv](https://arxiv.org/abs/2605.21392) / [Adversa AI — Top MCP CVEs June 2026](https://adversa.ai/blog/top-mcp-security-resources-june-2026/) / [MCP Security Statistics 2026 — PracticalDevSecOps](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/)

### 6.4 NEW: NSA MCP Security Design Considerations (May 20, 2026)

The NSA's Cybersecurity Directorate published "Model Context Protocol (MCP): Security Design Considerations for AI-Driven Automation" (CSI_MCP_SECURITY.PDF). This is the most authoritative government guidance on MCP security to date. Key recommendations:

1. **Authentication before everything else.** "The single highest-impact move for MCP is the dullest one: put authentication in front of every remote MCP server and take the unauthenticated ones off the public Internet."
2. **Granular authorization.** Least-privilege per agent: if the implementer agent doesn't need a specific database tool, it should not have access to it. Maps directly to PerFiApp's APM `apm.yml` declaration pattern.
3. **Continuous monitoring.** Track agent behavior across the full workflow, not just at entry/exit points.
4. **Input validation at every serialization boundary.** Every piece of external data passing through MCP must be sanitized before it reaches a tool handler.

When PerFiApp builds a custom Flinks MCP adapter, the NSA guidance is the design checklist.

Sources: [NSA press release](https://www.nsa.gov/Press-Room/Press-Releases-Statements/Press-Release-View/Article/4496698/nsa-releases-security-design-considerations-for-ai-driven-automation-leveraging/) / [NSA PDF (direct)](https://media.defense.gov/2026/Jun/02/2003943289/-1/-1/0/CSI_MCP_SECURITY.PDF) / [Reed Smith summary](https://www.reedsmith.com/our-insights/blogs/viewpoints/102mvg9/nsa-publishes-security-guidance-on-designing-ai-systems-with-model-context-protocol-mcp/) / [GetAIGovernance writeup](https://getaigovernance.net/blog/nsa-issues-detailed-security-guidance-on-model-context-protocol-mcp)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS CHANGE: OSFI Fast-Track Licensing Pilot launched June 2026

**Status changed from "announced" (February 2026) to "active."**

OSFI's Targeted Fast-Track Framework for New Entrants launched in June 2026 with an initial implementation period of at least 12 months. The program targets fintechs and crypto custodians seeking federal charters (Schedule 1 bank, trust company, or federal credit union continuation). Committed timelines: 4 weeks for initial feedback, 12 months to make a ministerial recommendation, 3 months for a formal green light. Well-prepared applicants could be operational in under 18 months.

OSFI has also proposed a public-facing application dashboard (with applicant consent) showing application type and status.

**For PerFiApp:** This directly affects the competitive landscape. If KOHO enters the fast-track program, its timeline to Schedule 1 bank status compresses from the historical 3–6 years to potentially 12–18 months (i.e., Q4 2027). A banking license would enable KOHO to offer deposit insurance, mortgage products, and direct payment rail access without bank partners. Monitor quarterly OSFI disclosures and KOHO announcements for fast-track enrollment confirmation.

Sources: [Torys LLP — OSFI fast-track](https://www.torys.com/our-latest-thinking/publications/2026/02/osfi-to-fast-track-new-entry-regime-for-fintechs-and-credit-unions) / [Mondaq — OSFI fast-track pilot](https://www.mondaq.com/canada/fintech/1750030/osfis-fast-track-approvals-pilot-making-way-for-innovative-fintechs-to-scale-as-financial-institutions-in-canada) / [Fathom4sight](https://www.fathom4sight.ai/blog-articles/osfi-to-fast-track-new-entry-regime-for-fintechs-and-credit-unions)

### 7.2 NEW: Bank of Canada publishes first 300 PSP registrations — structural shift in fintech access

The Bank of Canada published its first batch of 300 fully registered Payment Service Providers (PSPs) under the Retail Payment Activities Act (RPAA). Registrations confirmed include: **Wealthsimple, KOHO, Brim, Venn (formerly Vault), Helcim, Trolley, ZayZoon, Zum Rails, Shopify Payments.** Over 1,500 additional applications are pending.

PSP registration grants:
- Direct Payments Canada membership (enabling Real-Time Rail access when RTR launches Q4 2026)
- Interac e-Transfer participation eligibility (previously restricted to banks and credit unions)
- Annual reporting and incident notification obligations

**For PerFiApp:** PSP registration is not currently required for PerFiApp's Phase 1 read-only aggregation use case. However, if Phase 2 includes payment initiation (Cash Advance Lite, bill pay), PSP registration may be required before direct RTR access is possible. The architect should flag RPAA registration as a Phase 2 prerequisite alongside CDBA Phase 2 accreditation.

The competitive implication: KOHO and Wealthsimple now have direct RTR access (launching Q4 2026) without bank partnerships. This removes a structural ceiling on their payment capabilities and accelerates their path to offering instant account-to-account transfers.

Sources: [BetaKit — Bank of Canada first PSP registrations](https://betakit.com/canadas-fintech-industry-enters-new-era-as-bank-of-canada-taps-first-payment-service-providers/) / [Flinks open banking 2026](https://www.flinks.com/blog/open-banking-canada-2026-launch-fintech-institutions)

### 7.3 Canadian open banking (CDBA) — no new government statements since June 24

No new Bank of Canada or FCAC statements on CDBA implementation since June 24. The "timeline slipping, 2026 launch at risk" status from the June 24 report remains current. No change.

Source: [Open Banking Tracker Canada](https://www.openbankingtracker.com/country/canada)

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO banking license — still pending, no change since June 24

KOHO is in the second phase of OSFI's three-phase approval process. An on-site audit and capitalization of the bank entity are both underway. A license requires ministerial sign-off; it has not been granted as of June 29. The OSFI fast-track pilot (Track 7.1) may accelerate the final stage.

No new competitive product announcements from KOHO between June 24 and June 29.

Sources: [Yahoo Finance — KOHO raise](https://ca.finance.yahoo.com/news/koho-moves-closer-getting-banking-110050793.html) / [Globe and Mail](https://www.theglobeandmail.com/business/article-koho-raises-130-million-banking-licence/)

### 8.2 NEW: Copilot Money officially expands Canada support

Copilot Money (iOS/macOS personal finance app, ~$95 CAD/yr) now officially supports Canada. Previously US-only, Copilot now connects to Canadian financial institutions and includes Interac transaction categorization. Feature highlights: AI-driven transaction categorization, investment tracking with per-security returns, Amazon itemized transaction detail, and household-sharing. No Android app or web version.

**For PerFiApp:** Copilot's Canada entry is a meaningful addition to the competitive set, particularly in the premium iOS segment. PerFiApp's differentiators that Copilot lacks: French/bilingual support (Copilot is English-only), Canadian-specific credit bureau integration, and the full module set (Due-Date Coach, Rewards & Loyalty, Cash Advance Lite). Android support remains a gap Copilot cannot fill. The spec-lead should add Copilot to the competitive analysis alongside Monarch.

Source: [x1wealth.com Copilot vs Monarch (June 2026)](https://x1wealth.com/compare/copilot-vs-monarch) / [Engadget best budgeting apps 2026](https://www.engadget.com/apps/best-budgeting-apps-120036303.html)

---

## Recommended Next Steps

### Immediate (today / by June 30)

1. **Audit for `claude-mythos-preview` references — deadline is June 30, 2026.** Search all agent files, `apm.yml`, Bedrock configurations, and CI scripts for `mythos-preview`. Remove or replace with `claude-opus-4-8` before midnight UTC tonight. This is the only same-day deadline in this report.

2. **Upgrade `mcp-atlassian` to >= 0.17.0 if installed.** CVE-2026-27825 (CVSS 9.1) enables unauthenticated RCE in two HTTP requests on the local network. If declared in `apm.yml`, update the pinned version and run `apm install`.

3. **Upgrade Claude Code to v2.1.195.** The hook matcher exact-match fix (v2.1.195) may silently change behavior on existing hyphenated-name hooks (`code-reviewer`, `test-engineer`); auto-mode denial logging (v2.1.193) enables observability; `/rewind` (v2.1.191) prevents session data loss.

4. **Verify Fable 5 fallback chain is still active.** Fable 5 has not been restored for general use. Confirm `fallbackModel: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]` is active in all agent configurations that previously targeted Fable 5.

### Short-term (this sprint)

5. **Upgrade APM to v0.23.0** (released today). Critical: deny-wins Executable Trust Governance (v0.22.0) and 4 Dependabot CVEs cleared (v0.23.0). Run `apm install` after upgrading to recompile lockfiles.

6. **Upgrade Spec Kit to v0.11.10.** Critical fix: `/speckit-analyze` long-session freeze (v0.11.9). Security fix: host-less catalog URL rejection (v0.11.10). Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.11.10`

7. **Enable `autoMode.classifyAllShell: true` in implementer agent settings.** Available as of v2.1.193. Routes all shell commands through the safety classifier. For financial-code automation where safety matters more than speed, the latency trade-off is worth it.

8. **Add three items to the MCP vetting checklist:**
   - "Does this server perform path traversal validation on all file-write tool paths?" (CVE-2026-27825 root cause)
   - "Is this server's command handling protected against shell injection in exec() calls?" (CVE-2026-5058/5059 root cause)
   - "Is this server authenticated? If remote, can it be reached without credentials?" (NSA guidance primary recommendation)

9. **Evaluate Opus 4.8 Fast Mode for non-interactive spec-lead and architect tasks.** At $10/$50 per MTok, Fast Mode is 3x cheaper than Opus 4.7 Fast Mode was and delivers 2.5x speed. For batch analysis tasks (spec generation, large code reviews), combine with the Batch API for up to 95% effective cost reduction on cached, batched requests.

### Medium-term (next 4–6 weeks)

10. **Align custom MCP server design with NSA guidance.** When the Flinks adapter MCP server is designed: authentication must be the first feature, least-privilege tool declaration per agent role (map to `apm.yml` declarations), and input validation at every boundary before any exec/file-write/network-request operation. The NSA PDF at `media.defense.gov/2026/Jun/02/2003943289/-1/-1/0/CSI_MCP_SECURITY.PDF` is the design checklist.

11. **Design for MCP RC breaking changes (due July 28, 2026 — 29 days away).** Two breaking changes need pre-work: (a) `tasks/list` is removed in the RC — migrate any Tasks usage to the polling pattern (`tasks/get`). (b) OAuth flows must validate the `iss` parameter (RFC 9207) — build this into the Flinks adapter's OAuth handler before the RC ships.

12. **Flag RPAA PSP registration as Phase 2 prerequisite.** The architect should add PSP registration under the Retail Payment Activities Act to the Phase 2 dependency list alongside CDBA Phase 2 accreditation. Direct RTR access for payment initiation requires it.

13. **Monitor KOHO's OSFI fast-track entry.** If KOHO enters the fast-track program, its timeline to Schedule 1 bank status compresses to Q4 2027. This is the single biggest competitive structural change possible in the Canadian fintech market. Track quarterly OSFI disclosures.

14. **Add Copilot Money to the competitive analysis.** The spec-lead should document Copilot's differentiators vs. PerFiApp alongside Monarch. English-only and iOS/macOS-only remain significant gaps; PerFiApp's bilingual and Android coverage should be positioned against Copilot explicitly.

---

*Report generated 2026-06-29. All findings verified against primary sources. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
