# PerFiApp Agent Research — 2026-08-24

**Third run. Delta report vs 2026-06-24.** Covers model restorations and new releases (Fable 5 back, Sonnet 5, Opus 5), Claude Code versions v2.1.188–v2.1.239, the Agent SDK billing split going live, MCP 2026-07-28 final spec, Canadian RTR legal framework active today, and CDBA consultation closing in two days.

---

## Executive Summary

Five findings demand immediate attention:

1. **CDBA consultation closes August 26 — two days from today.** The Department of Finance published proposed Consumer-Driven Banking Regulations on June 27; the 60-day public comment window closes August 26, 2026. PerFiApp cannot formally submit a comment yet (no entity accreditation), but this is the last chance to read the draft regulations before they become near-final — including the C$2,500 accreditation fee, Bank of Canada oversight model, and the "share core data at no cost" mandate. Source: [Canada Gazette, Part 1, Vol. 160 No. 26](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html)

2. **RTR legal framework came into force today (August 24, 2026).** The RTR By-law and Rules received all necessary approvals and are legally active as of today, paving the way for a Q4 2026 system launch. This is the prerequisite for Phase 2 write-access open banking in 2027. Source: [Payments Canada](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail)

3. **Agent SDK billing split went live July 10 — CI research runs now cost real money.** After pausing on June 15, Anthropic implemented the separate credit pool on July 10. Pro subscribers get $20/month, Max 5x $100/month, Max 20x $200/month — per-user, non-pooled, no rollover. The weekly researcher CI workflow now draws from this credit pool. Source: [The New Stack](https://thenewstack.io/anthropic-agent-sdk-credits/)

4. **CVE-2026-54316 (CVSS 9.1) in Claude Code disclosed at Black Hat USA (August 5).** Affected all Claude Code versions v0.2.54 through v2.1.163. The vulnerability allowed API key exfiltration using Hugging Face's public download counter as a covert channel — leaking one character at a time. Fixed in v2.1.163. Any developer who has not updated past that version on a financial-app environment must update immediately. Source: [The Hacker News](https://thehackernews.com/2026/08/claude-code-and-gemini-cli-flaws-let.html)

5. **Claude Opus 5 released July 24 at the same price as Opus 4.8 — changes the model routing calculus.** `claude-opus-5` costs $5/$25 per million input/output tokens (same as Opus 4.8) but performs dramatically better on agentic coding benchmarks, reportedly doubling Opus 4.8's score on Frontier-Bench. This is the new default on Claude Max. Claude Code updated to Opus 5 as default in v2.1.219. Source: [Anthropic](https://www.anthropic.com/news/claude-opus-5)

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| Fable 5 restored July 1 — new refusal/billing model | Model | spec-lead, architect | **Act — update agent files; handle `stop_reason: "refusal"`** |
| claude-opus-4-1 retired August 5 — confirmed | Model | Any workflow using that ID | **Act — verify no remaining calls (deadline passed)** |
| Claude Sonnet 5 released June 30 ($2/$10 per M) | Model / cost | implementer, test-engineer, code-reviewer | **Adopt — re-evaluate routing; Sonnet 5 replaces Sonnet 4.6 as default** |
| Claude Opus 5 released July 24 ($5/$25 per M, Opus 4.8 performance doubled) | Model / cost | spec-lead, architect, implementer | **Adopt — replace Opus 4.8 as default for demanding agents** |
| Agent SDK billing split live July 10 | Cost | CI/all developers | **Act — assess weekly researcher CI cost; switch to API key if credit pool insufficient** |
| Claude Code v2.1.239 (52+ versions since v2.1.187) | Toolchain | All agents | **Adopt — critical security and feature updates** |
| MCP 2026-07-28 final spec — sessions gone, cacheScope live | Agent tooling | architect | **Act — set cacheScope: "private" on financial data; update MCP server design** |
| Plaid MCP server confirmed available | Agent tooling | architect, implementer | **Watch — vet against MCP checklist before adopting** |
| CVE-2026-54316 CVSS 9.1 — Claude Code API key exfiltration | Security | All developers | **Act — verify version is past v2.1.163; critical for financial-app environments** |
| CVE-2026-39861 + CVE-2026-40068 — Claude Code RCE/auth bypass | Security | All developers | **Act — update to current Claude Code; avoid versions v2.1.63–v2.1.83** |
| Spec Kit v0.16.2 — skills-based architecture default | Toolchain | spec-lead | **Adopt — update from v0.11.6; note workflow path change** |
| Expo SDK 57 — React Native 0.86, Hermes memory fix | Toolchain | implementer | **Adopt — plan upgrade; Hermes regression in SDK 56 is fixed** |
| DeepEval v4.1.8 — component eval, conversation simulation | Agent quality | test-engineer | **Adopt — no change to prior verdict; patch is current** |
| CDBA consultation closes August 26 (2 days) | Compliance | spec-lead, architect | **Act — read proposed regulations now** |
| RTR By-law in force August 24 (today) — Q4 2026 launch | Compliance | architect | **Monitor — confirms Phase 2 timeline; no immediate design change needed** |
| Quebec Law 25 2026 amendments — 4% worldwide turnover penalties | Compliance | architect, security-reviewer | **Act — update privacy impact assessments for cross-border data flows** |
| OSFI fast-track — KOHO banking license possible by year-end | Competitive | spec-lead | **Monitor — escalates competitive timeline** |
| Wealthsimple at $100B AUM — AI assistant, everyday banking expansion | Competitive | spec-lead | **Monitor — broader competitive threat than prior reports indicated** |

---

## Track 1 — Model & Capability Updates

### 1.1 RESOLVED: Claude Fable 5 restored July 1, 2026

**Status changed from "blocked" (June 24 report) to "active with new API requirements."**

The US export-control order was lifted on June 30, 2026. Anthropic redeployed `claude-fable-5` globally on July 1, 2026, available on Claude.ai, the Claude API, Claude Code, Amazon Bedrock, Google Cloud, and Microsoft Foundry.

Three important changes affect integration code:

**1. Safety classifiers that can refuse.** Fable 5 includes safety classifiers. When a request is declined, the API returns `stop_reason: "refusal"` as an HTTP 200 (not an error). The response body identifies which classifier fired. Any agent file or API client that treats every 200 as a successful completion will silently drop refused requests. Agent wrappers must handle the `refusal` stop reason explicitly.

**2. Server-side fallback parameter.** Pass `fallbacks: "default"` (or name your own fallback list) to have the API automatically retry a refused request on another model. Fallback credit refunds the prompt-cache cost of switching, so you do not pay twice for cached context.

**3. 30-day data retention requirement.** Both `claude-fable-5` and `claude-mythos-5` carry a 30-day data retention obligation and are designated Covered Models. They cannot be used under zero data retention contracts. For a financial app, this means any Fable 5 call involving personal financial data must be disclosed in PerFiApp's privacy documentation.

**For PerFiApp:** Update agent files that were previously pointed at Fable 5. Add refusal handling. Verify the privacy disclosure covers the 30-day retention. Prior trial recommendation stands; the new refusal API is additive work, not a blocking issue.

Sources: [Anthropic redeployment statement](https://www.anthropic.com/news/redeploying-fable-5) / [Fable 5 & Mythos 5 platform docs](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)

### 1.2 CONFIRMED: claude-opus-4-1-20250805 retired August 5, 2026

The retirement happened on schedule, as flagged in the June 24 report. Any API call to this model ID now returns a hard error. Verify no remaining calls in agent files, CI scripts, or Claude Console usage data.

Source: [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.3 NEW MODEL: Claude Sonnet 5 released June 30, 2026

Model ID: `claude-sonnet-5`. Released June 30, 2026 — six days after the last report.

Positioned as "the most agentic Sonnet," now the default model on Claude Free and Pro (replacing `claude-sonnet-4-6`). Key attributes:

- Price: $2/$10 per million input/output tokens (same as Sonnet 4.6)
- Superior agentic performance: better planning, multi-step tool use (browser, terminal), and large-codebase operations
- Retirement not before June 30, 2027

**For PerFiApp:** This is the natural new default for the implementer, test-engineer, and code-reviewer agents — all of which run high-volume, multi-step, agentic workflows. At the same price as Sonnet 4.6 with meaningfully better agentic performance, this is a straightforward swap. Update agent `model` fields from `claude-sonnet-4-6` to `claude-sonnet-5`.

Sources: [Anthropic announcement](https://www.anthropic.com/news/claude-sonnet-5) / [TechCrunch](https://techcrunch.com/2026/06/30/anthropic-launches-claude-sonnet-5-as-a-cheaper-way-to-run-agents/)

### 1.4 NEW MODEL: Claude Opus 5 released July 24, 2026

Model ID: `claude-opus-5`. Released July 24, 2026.

This is the most significant model change for PerFiApp's cost model:

- Price: $5/$25 per million input/output tokens — same as Opus 4.8
- Batch API: $2.50/$12.50 per million (50% off)
- Fast mode: $10/$50 per million (2.5x throughput increase)
- Context window: 1M tokens in, 128k tokens out (300k out on Batch with beta header)
- Benchmarks: reportedly "more than doubles Opus 4.8's performance" on Frontier-Bench; within 0.5% of Fable 5 on CursorBench 3.2 at half the cost; ARC-AGI 3 score "three times as high as the next-best model"
- Retirement not before July 24, 2027
- Now the default model on Claude Max

**For PerFiApp's model routing:** Opus 5 changes the calculus significantly. The prior report recommended Opus 4.8 as the fallback when Fable 5 was suspended. Now:

- **spec-lead and architect**: `claude-opus-5` is the new recommended default. Provides near-Fable-5 reasoning at half the cost.
- **implementer**: Can elevate from Sonnet 5 to Opus 5 for complex financial logic (e.g., tax calculation, FX, credit modeling) without a price increase over prior Opus 4.8 usage.
- **Fable 5** remains justified only for the most demanding long-horizon agentic tasks where Opus 5's 0.5% benchmark gap matters.

Sources: [Anthropic announcement](https://www.anthropic.com/news/claude-opus-5) / [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.5 Updated model table (as of August 24, 2026)

| Model ID | Status | Price (in/out per M tokens) | Not retired before |
|---|---|---|---|
| `claude-fable-5` | Active | $10 / $50 | June 9, 2027 |
| `claude-mythos-5` | Active (restricted) | $10 / $50 | — |
| `claude-opus-5` | Active | $5 / $25 | July 24, 2027 |
| `claude-sonnet-5` | Active | $2 / $10 | June 30, 2027 |
| `claude-opus-4-8` | Active | $5 / $25 | May 28, 2027 |
| `claude-sonnet-4-6` | Active | $2 / $10 | Feb 17, 2027 |
| `claude-haiku-4-5-20251001` | Active | — | Oct 15, 2026 |
| `claude-opus-4-1-20250805` | **Retired** | — | August 5, 2026 |

Source: [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 STATUS CHANGE: Agent SDK billing split went live July 10, 2026

**Status changed from "paused" (June 24 report) to "live."**

After pausing on June 15, Anthropic implemented the billing split on July 10, 2026. Programmatic usage — the Agent SDK, `claude -p`, Claude Code GitHub Actions, and any third-party app using subscription-based auth — now draws from a separate monthly Agent SDK credit pool:

- Pro: $20/month
- Max 5x: $100/month
- Max 20x: $200/month

Credits are per-user, non-pooled across a team, and do not roll over to the next month.

**Critical for the CI research workflow:** The weekly researcher GitHub Action and the automated PR review workflow (`pr-review.yml`) now consume credits from the maintainer's Agent SDK credit pool, not the unlimited interactive quota. A Pro maintainer has $20/month. A Max 20x maintainer has $200/month. Estimate consumption now — an average researcher run is likely 50,000–200,000 tokens on Sonnet 5, which at $2/$10 input/output rates is roughly $0.50–$2.00 per run. Weekly runs plus PR reviews are manageable on Max but tight on Pro.

**For teams running shared CI:** Credits are per-user and non-poolable. The only sustainable path for production CI is a direct `ANTHROPIC_API_KEY` billed at pay-as-you-go rates. The `AGENT_TEAM.md` document already documents this as an alternative to subscription token auth.

Sources: [The New Stack](https://thenewstack.io/anthropic-agent-sdk-credits/) / [DevOps.com](https://devops.com/anthropic-hits-pause-on-claude-agent-sdk-billing-change-for-now/)

### 2.2 Claude Opus 5 batch pricing — new low-cost path for spec and planning tasks

`claude-opus-5` on the Batch API is $2.50/$12.50 per million tokens — 50% off the synchronous price. The output window expands to 300k tokens with a beta header. For spec-lead tasks that generate long planning documents and do not need real-time responses, this is materially cheaper than any previous Opus-tier option. The tradeoff: Batch API has no guaranteed latency; responses arrive within 24 hours.

**For PerFiApp:** Weekly spec generation or constitution amendment drafts are good Batch API candidates. Plan generation tasks (architect generating a task breakdown) are less suitable since they involve iterative clarification. Code review passes where latency does not matter are a strong fit.

Source: [eesel AI — Opus 5 pricing](https://www.eesel.ai/blog/claude-opus-5-pricing)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 Claude Code v2.1.239 — 52+ versions since v2.1.187

The current latest is v2.1.239 (August 22, 2026). Most-actionable additions since v2.1.187:

**v2.1.219 (July 24) — Claude Opus 5 as default model**
Claude Code now ships with Opus 5 as the default model. If the team uses Claude Code interactively (not locked to a specific model in settings), all interactive sessions automatically upgraded. Agent files with `model: claude-opus-4-8` still use Opus 4.8 explicitly.

**v2.1.232 (August 14) — Fork mode by default; cross-session @-mentions**
Fork mode is now enabled by default: subagents inherit full conversation context rather than a summary. This improves coherence in multi-agent research and spec workflows, but increases token usage. Cross-session `@`-mentions allow agents to directly reference artifacts from another active session — useful for the architect picking up where the spec-lead left off. GitLab token redaction added (relevant if PerFiApp mirrors to GitLab). Unique session naming prevents collisions in parallel agent runs.

**v2.1.233 (August 15) — MCP v2 connection stability; memory cgroup limits**
MCP v2 connection stability improvements: this directly patches instability that appeared after the July 28 spec update. Optional memory cgroup limits for Bash commands on Linux — relevant for CI environments where runaway subagent processes could exhaust shared runner memory.

**v2.1.234 (August 17) — Auto-continue on usage limit reset; stronger credential protections**
Claude Code now automatically resumes a session when the usage limit resets (rather than dying mid-task). This improves reliability of the weekly researcher run. Additional credential leak protections beyond the `sandbox.credentials` feature introduced in v2.1.187.

**v2.1.236 (August 20) — ANTHROPIC_DEFAULT_MODEL; macOS sandbox hardening**
The new `ANTHROPIC_DEFAULT_MODEL` environment variable sets the session default without modifying `settings.json`. Useful for CI: inject the approved model via a GitHub Actions secret rather than hard-coding in committed config. Enhanced macOS sandbox precedence rules: sandbox rules are evaluated in a defined order, closing a gap where conflicting rules could produce unexpected behavior.

**v2.1.237 (August 20) — Prompt caching fixed for LLM gateways and custom base URLs**
The regression introduced in earlier versions (also partially noted in v2.1.181) is fully resolved. If PerFiApp routes through a gateway or custom base URL (e.g., a corporate proxy), re-verify prompt caching is active.

**v2.1.239 (August 22) — Data-residency cost estimates; /claude-api upgrade tool**
Cost estimates now include the 1.1x inference premium for data-residency workspaces. If PerFiApp ever runs agents in a data-residency workspace (required for some Canadian enterprise customers), cost estimates will reflect the premium. New `/claude-api upgrade` tool migrates Python projects from the Anthropic 0.x SDK to 1.x — relevant when implementing the backend API. Alpine/musl build support added (CI runner compatibility).

Sources: [Claude Code changelog](https://code.claude.com/docs/en/whats-new) / [Releasebot](https://releasebot.io/updates/anthropic/claude-code) / [Havoptic](https://www.havoptic.com/tools/claude-code)

### 3.2 MCP 2026-07-28 final specification — breaking changes are live

The specification published July 28, 2026 on schedule. It graduated from RC (as anticipated by the June 24 report) to a final specification. Beta SDKs in Python, TypeScript, Go, and C# shipped on publication day. Key changes that affect PerFiApp's architecture:

**Session removal (breaking).** `Mcp-Session-Id` is gone. The initialize/initialized handshake is eliminated. Client info and capabilities that were exchanged once at connection must now travel in `_meta` on every request. Any MCP server PerFiApp was building using the session model must be refactored to stateless operation.

**New required headers.** `Mcp-Method` and `Mcp-Name` are required on Streamable HTTP transport. Servers reject requests where these headers conflict with the body. Load balancers and API gateways can now route on these headers without body inspection — a meaningful operational improvement.

**cacheScope on all list/resource responses (privacy-critical).** `ttlMs` and `cacheScope` ("public" or "private") are now returned on all `tools/list`, `resources/list`, `resources/read`, and related responses. "public" permits shared intermediaries (CDNs, API gateways) to cache the response. **For any MCP server handling financial data — Plaid account lists, Flinks transaction reads, Equifax credit data — `cacheScope` must be "private".** A misconfigured "public" cache scope on a financial data endpoint would leak one user's account data to another user's cached response.

**Tasks extension redesigned.** Tasks moved from experimental core to the `io.modelcontextprotocol/tasks` extension with a poll-based `tasks/get` and new `tasks/update`. Applications using the 2025-11-25 experimental Tasks API must migrate.

Sources: [MCP 2026-07-28 spec](https://blog.modelcontextprotocol.io/posts/2026-07-28/) / [SDK betas](https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/) / [Appwrite explainer](https://appwrite.io/blog/post/mcp-goes-stateless-in-the-2026-07-28-specification) / [MCP changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)

### 3.3 Plaid MCP server — confirmed available, needs vetting

Plaid has published an MCP server that allows AI assistants to query banking data and functionality through natural language. This would allow PerFiApp's implementer agent to query sandbox account data directly through tool calls rather than writing Plaid API wrapper code first. Institutions are starting to expose permissioned banking data via MCP alongside traditional developer portals.

**For PerFiApp:** This is potentially the highest-value MCP addition for the development phase — the implementer can query test account data against real Plaid responses to generate accurate schema and data transformation code. However, it must pass the MCP security checklist before adoption: authentication model, cacheScope defaults, and whether tool output passes through unsanitized exec() calls.

**Privacy note:** Any Plaid MCP connection from a developer machine would be accessing real (sandbox) credentials. Verify the `sandbox.credentials: false` setting is active on all developer machines before adopting.

Source: [Open Banking Tracker — Plaid MCP](https://www.openbankingtracker.com/api-aggregators/plaid/mcp)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval v4.1.8 (August 12) — adoption continues normally

No verdict change from "Adopt" (June 24 report). v4.1.0 through v4.1.8 are patch releases continuing the v4.0 work:

- v4.1.0 (July 12): Component-level evaluations (evaluate a single node in a pipeline rather than end-to-end), conversation simulation (synthetic multi-turn test generation)
- Prompt logging improvements: records prompt alias, commit hash, label, and version as first-class span fields across all integrations — useful for the test-engineer agent to correlate evaluation scores with specific spec-kit plan versions
- Prompt identity and caching switched to commit hashes, keeping logged hyperparameters consistent across version changes

**For PerFiApp:** The conversation simulation feature added in v4.1.0 is worth a trial for the bilingual test cases (EN/FR). Simulate a user switching languages mid-session and verify the agent handles it correctly. This is a gap not covered by unit tests.

Source: [DeepEval changelog](https://deepeval.com/changelog/changelog-2026)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v0.16.2 (August 10) — architecture change in v0.16.0

**Version jumped from v0.11.6 to v0.16.2.** The most consequential change is structural:

**v0.16.0 — skills-based architecture becomes default.** Copilot's default storage path changed from commands-based to skills-based architecture. Specifications are now stored in `.github/skills/speckit-*/SKILL.md` files rather than the prior location. This affects any Spec Kit workflow that references skill file paths. The spec-lead agent's prompts and any CI steps that read spec files must be updated if upgrading from v0.11.6.

**Security hardening across v0.12–v0.16:**
- TOCTOU (Time-of-Check-Time-of-Use) race condition fixed in file operations — relevant for concurrent spec-lead and architect runs
- HTTP response reads bounded to prevent denial-of-service on large manifests
- UTF-8 encoding normalization across manifests, configurations, and catalogs

**Gate verdict binding (v0.15.x).** `verdict_input` binds gate verdicts to workflow inputs, enabling more precise control over spec approval flow — useful when the spec-lead must pass a constitution compliance gate before the architect begins.

**For PerFiApp:** Upgrade from v0.11.6 to v0.16.2, but test the skills path change carefully. The prior `/speckit.converge` command added in v0.11.2 and the `security-governance` preset v0.6.0 remain available. Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.16.2`

Sources: [Spec Kit releases](https://github.com/github/spec-kit/releases) / [PyPI](https://pypi.org/project/specify-cli/)

### 5.2 Expo SDK 57 — React Native 0.86, Hermes memory fix

Released July 2026 (deliberate small release). Key points:

- **React Native 0.86** (from 0.85). React version unchanged at 19.2.
- **Hermes V1 memory regression fixed.** SDK 56 shipped with a Hermes memory regression. The fix landed in `expo@57.0.9` on August 13, 2026. If PerFiApp is on SDK 56, this regression may be causing memory pressure in development or test environments.
- `expo prebuild` now clears and regenerates native `android/` and `ios/` directories by default — improves reproducibility but means any manual native modifications are lost on prebuild.

**For PerFiApp:** Since the app is pre-implementation, targeting SDK 57 from the start avoids the Hermes regression entirely. When the implementer begins the `apps/mobile` workspace, initialize with SDK 57.

Sources: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57) / [Onix React — SDK 57 overview](https://medium.com/@onix_react/whats-new-in-expo-sdk-57-c3133d32ba37)

### 5.3 APM version — unverified past v0.21.0

A search for APM version releases in August 2026 did not return a confirmed version number past v0.21.0 (the version from the June 24 report). The official APM documentation appears to be current but does not surface a specific August 2026 release. This finding is **unconfirmed** — check [microsoft/apm releases](https://github.com/microsoft/apm/releases) directly before assuming v0.21.0 is still latest.

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CRITICAL: CVE-2026-54316 — Claude Code API key exfiltration (CVSS 9.1)

Disclosed at Black Hat USA (August 5, 2026) by Novee Security researchers.

- **CVSS v3.1:** 9.1 / **CVSS v4:** 6.0
- **Affected versions:** v0.2.54 through v2.1.163
- **Attack:** Untrusted content introduced into the Claude Code context (e.g., via a malicious repo file, a crafted MCP tool response, or a prompt injection in a README) triggers a sequence that uses Hugging Face's public download counter as a covert exfiltration channel. The API key leaks one character at a time via measurable download count increments. No network egress monitoring would flag this as anomalous (all requests appear as legitimate Hugging Face traffic).
- **Fix:** v2.1.163 (shipped before the Black Hat disclosure). Any version of Claude Code post-v2.1.163 is safe.
- **Verification:** Run `claude --version` on every developer machine and every CI runner. Current latest (v2.1.239) is safe.

**For PerFiApp specifically:** Developers working on the app may have Plaid client secrets, Flinks API tokens, Equifax API keys, or Stripe test keys in their shell environments. These would be the highest-value exfiltration targets. The `sandbox.credentials: false` setting (v2.1.187+) provides defense in depth, but updating past v2.1.163 is the primary fix.

Sources: [The Hacker News](https://thehackernews.com/2026/08/claude-code-and-gemini-cli-flaws-let.html) / [Seceon analysis](https://seceon.com/claude-code-vulnerability-exposes-new-ai-security-risks/)

### 6.2 CVE-2026-40068 — Claude Code auth bypass (git worktree trust logic)

- **Affected versions:** v2.1.63 through v2.1.83
- **Attack:** Exploits git worktree trust logic to execute malicious hooks without triggering the trust dialog. A project's `.claude/hooks/` can run arbitrary code if the worktree trust check is bypassed.
- **Fix:** Fixed in versions after v2.1.83. All versions past the June 24 report's v2.1.187 are safe.

### 6.3 CVE-2026-39861 — Claude Code RCE via symlink manipulation

- **Attack:** Sandbox escape through symlink manipulation allowing remote code execution.
- **Status:** Patched; exact fixed version not confirmed in available sources. Any developer on the current v2.1.239 is safe.

**Cumulative note:** Claude Code has now accumulated 28 CVEs, with 2 rated CVSS 10.0 and four more rated 9.1 or higher. This is a meaningful attack surface for a tool with broad filesystem and network access. The **code-reviewer agent's checklist should include a standing item:** verify `.claude/settings.json`, `.claude/hooks/`, and any files that influence Claude Code session trust are not modified by incoming PRs without explicit security review.

Sources: [SentinelOne CVE-2026-39861](https://www.sentinelone.com/vulnerability-database/cve-2026-39861/) / [SentinelOne CVE-2026-40068](https://www.sentinelone.com/vulnerability-database/cve-2026-40068/) / [Pulse/Adyog — 28 CVEs](https://pulse.adyog.com/insights/claude-code-28-cves-ai-coding-tools-attack-surface-cve-2026-46406)

### 6.4 MCP cacheScope: "public" on financial data — new structural risk

Since the MCP 2026-07-28 spec introduced `cacheScope` as a response field, any MCP server that returns financial data (Plaid accounts, Flinks transactions, Equifax credit) with the default or wrong `cacheScope` value could allow a shared intermediary (API gateway, CDN, load balancer) to serve one user's financial data to another user. This is a new architectural risk introduced by the spec update, distinct from the prior prompt-injection and auth-bypass CVEs.

**Add to the MCP vetting checklist:** "Does this server set `cacheScope: 'private'` on all responses containing personal financial data?"

Source: [MCP changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) / [Equixly — stateless MCP security](https://equixly.com/blog/2026/08/05/stateless-mcp/)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 URGENT: CDBA consultation closes August 26 — two days

**Status changed from "timeline slipping" (June 24 report) to "proposed regulations published, consultation closing."**

The Department of Finance published proposed Consumer-Driven Banking Regulations in the Canada Gazette, Part 1, Volume 160, Number 26 on June 27, 2026. The 60-day consultation closes **August 26, 2026** — two days from today's report date.

Key provisions in the proposed regulations relevant to PerFiApp's architecture:

- **Accreditation process:** Applicants submit prescribed information to the Bank of Canada through its electronic system and pay an application fee of C$2,500 (subject to annual adjustment). This confirms the Bank of Canada as the accreditation authority.
- **"Share core data at no cost":** Financial institutions must share core financial data (accounts, balances, transactions) at no cost when customer-directed. This is the basis for the "data aggregation for free" assumption in PerFiApp's business model.
- **Security and consent requirements:** Proposed regulations set detailed requirements for data security, consent management, record-keeping, and annual reporting. These form the compliance baseline any accredited service provider — including PerFiApp — must meet.
- **Phase 1 scope:** Read-access only. Phase 2 (write-access/payment initiation) remains targeted for mid-2027.

**For PerFiApp:** The spec-lead and architect should read the full proposed regulations (Canada Gazette link below) before August 26. Even if PerFiApp cannot formally submit a comment as a company yet, understanding the final shape of the accreditation requirements now informs the system design: consent flow UX, data retention policies, breach reporting triggers, and annual reporting infrastructure all have implementation costs that should be in the architectural plan before first-feature development begins.

Sources: [Canada Gazette regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Bennett Jones analysis](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations) / [Norton Rose Fulbright analysis](https://www.nortonrosefulbright.com/en-ca/knowledge/publications/37d88caf/open-banking-in-canada)

### 7.2 RTR By-law in force August 24, 2026 — Q4 launch confirmed

**Status changed from "Q4 2026 phased launch" (June 24 report) to "legal framework active."**

Both the RTR By-law and RTR Rules received all necessary approvals and came into force on August 24, 2026 — today. This is the final legal prerequisite for system launch. Payments Canada confirmed a Q4 2026 phased launch, with banks required to receive RTR payments from launch day; consumer-facing sending services initially optional.

**For PerFiApp:** No immediate design change. The Phase 2 write-access / payment initiation timeline (mid-2027) remains appropriate. However, the fact that the legal framework is active today means banks have begun their final technical onboarding work. PerFiApp should plan for RTR-based payment initiation features to be architecturally scoped in the next 3–6 months (even if implemented in 2027).

Sources: [Payments Canada — By-law milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [Payment Expert](https://paymentexpert.com/2026/08/10/rtr-canada-payments-modernisation)

### 7.3 Quebec Law 25 — 2026 amendments materially raise penalty exposure

The 2026 amendments to Quebec's Law 25 (Act respecting the protection of personal information in the private sector) include:

- **Maximum administrative penalties raised to 4% of worldwide turnover.** This is now commensurate with GDPR. A fintech with even $5M in annual revenue could face $200,000 in penalties per violation.
- **Cross-border transfer documentation tightened.** Every transfer of personal information out of Quebec now requires a documented privacy impact assessment (PIA). The 2026 amendments did not add a flat prohibition, but every transfer involving Quebec user data to an out-of-province data centre or third-party processor (Plaid is US-based; Equifax Canada processes in Canada but shares data with Equifax USA) must have a documented PIA on file.
- **Breach notification threshold:** Risk of "serious injury" (Quebec standard) vs. "real risk of significant harm" (PIPEDA standard) — different definitions, may catch slightly different incidents.

**For PerFiApp:** Two actions needed before first user data is processed:
1. If any Quebec users are served, document which personal financial data crosses provincial or national boundaries (Plaid API calls, Equifax credit pull, analytics SDKs) and complete a PIA for each transfer.
2. Update the security-reviewer agent's checklist to include "Does this change create a new Quebec-crossing personal data flow without a corresponding PIA?"

Sources: [Sherlock Forensics — Law 25 2026 amendments](https://www.sherlockforensics.com/blog/quebec-law-25-2026-amendments-canadian-organizations.html) / [SiLaw — AI & privacy 2026](https://silaws.com/2026/05/31/ai-privacy-data-compliance-2026-en/)

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO banking license — OSFI fast-track framework changes timeline

**Status changed from "license application imminent" (June 24 report) to "regulatory fast-track active; approval possible this year."**

In June 2026, OSFI introduced a "Targeted Fast-Track Framework" for new Schedule 1 bank applicants. Key terms:

- Initial feedback: within 4 weeks of submission
- OSFI risk-based review: within 12 months
- Federal government decision: within 3 months of OSFI recommendation

KOHO has been in the OSFI process since 2021 and entered Phase 2 of licensing in 2024. With the fast-track framework now active, KOHO's CEO has publicly indicated approval could come "as early as this year."

**For PerFiApp:** A federally licensed KOHO becomes a full-stack competitor: deposits, lending, and investing under one app with CDIC insurance. This accelerates the competitive threat from the prior "Monitor" posture. The spec-lead should assess whether PerFiApp's differentiation narrative (AI coaching, bilingual, aggregation-first) holds when KOHO has a banking license — or whether the PDR needs to sharpen positioning against a licensed competitor.

Sources: [Fintech Observer — KOHO](https://fintechobserver.substack.com/p/koho-canadas-most-used-neobank-app) / [Yahoo Finance](https://ca.finance.yahoo.com/news/2-5-million-canadians-already-111500202.html)

### 8.2 Wealthsimple — $100B AUM, AI-first expansion into everyday banking

Wealthsimple has surpassed $100B in assets under management and is accelerating its expansion beyond investing:

- **AI assistant "Willow"** handles account inquiries and portfolio optimization for Canadian tax efficiency (Canadian-native AI, not a US-model AI layer)
- **AI-powered research and trading dashboard** with natural language stock lookup and performance analysis
- **Everyday banking expansion:** No-fee Cash account with Interac e-Transfer, ATM access, and mobile cheque deposits now widely available
- **USD chequing account:** Targeted for fall 2026 — gives Wealthsimple users simultaneous access to US and Canadian payment rails from a single account
- **Family account management:** Kids and teen accounts with cross-family permission controls (summer 2026)

Wealthsimple's "Spend Insights" (free transaction tracker) is available at no cost to existing Wealthsimple customers — a growing threat to paid aggregation apps including PerFiApp.

**For PerFiApp:** Wealthsimple is a more dangerous competitor than the June 24 report indicated. It is no longer just an investing app — it is building toward a comprehensive financial operating system with a Canadian-native AI layer. PerFiApp's key remaining differentiators: deep bilingual (EN/FR) parity, multi-institution aggregation (Wealthsimple only sees Wealthsimple accounts), and the breadth of advisory modules (rewards, credit coaching, cash safety, due-date, FX). The spec-lead should review the PDR competitor section to reflect Wealthsimple's current scope.

Sources: [Wealthsimple — $100B milestone](https://betakit.com/wealthsimple-hits-100-billion-milestone-unveils-new-suite-of-advanced-investing-tools/) / [Strataigize — Wealthsimple AI](https://www.strataigize.com/blog/wealthsimples-ai-assistant-canada)

### 8.3 Monarch Money — no major Canada-specific developments

No significant new Canada-specific features since the June 24 report. The USD-only billing and uneven Canadian bank coverage via Plaid remain friction points for Canadian users. Monarch Money is showing signs of stagnation in Canadian bank integration while Wealthsimple accelerates. No verdict change from "Monitor."

---

## Recommended Next Steps

### Immediate (this week)

1. **Read the CDBA proposed regulations before August 26.** The consultation closes in two days. Even without a formal submission, the spec-lead and architect must read the accreditation criteria, data security requirements, and consent standards. These will shape the compliance architecture for Phase 1. [Canada Gazette](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html)

2. **Verify every developer and CI runner is past Claude Code v2.1.163** (CVE-2026-54316 API key exfiltration fix). Run `claude --version`. Given developers may have Plaid, Flinks, or Equifax API credentials in their shell, this is the highest-urgency security item. Current latest is v2.1.239.

3. **Update agent model references.** Three concurrent changes: (a) `claude-opus-4-1-20250805` is now retired — confirm no residual calls. (b) Update spec-lead and architect to `claude-opus-5`. (c) Update implementer, test-engineer, and code-reviewer to `claude-sonnet-5`. Also add `stop_reason: "refusal"` handling to any code that calls `claude-fable-5` — refusals return HTTP 200, not an error.

4. **Assess Agent SDK credit pool sustainability.** Estimate how many tokens the weekly researcher and PR review workflows consume. If the maintainer's Max subscription credit pool ($100–$200/month) is insufficient, set `ANTHROPIC_API_KEY` in the CI secrets and switch to direct pay-as-you-go billing. Document this decision in `docs/AGENT_TEAM.md`.

### Short-term (this sprint)

5. **Add `cacheScope: "private"` to the MCP vetting checklist.** Before adopting any finance-relevant MCP server (Plaid, Flinks, Equifax), confirm it sets `cacheScope: "private"` on all responses containing personal financial data. This is a new requirement from the MCP 2026-07-28 final spec. Existing checklist items (authentication, RCE risk) remain unchanged.

6. **Upgrade Spec Kit from v0.11.6 to v0.16.2.** Note that v0.16.0 moved the default skills storage path — test that the spec-lead agent's file references still resolve correctly after upgrade. Run `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.16.2`.

7. **Update the Quebec Law 25 cross-border data transfer register.** For every planned data flow that involves Quebec user data crossing provincial or national boundaries (Plaid API, Equifax credit pull, analytics), assign a privacy impact assessment. Update the security-reviewer agent checklist accordingly.

8. **Evaluate Plaid MCP server** against the full MCP vetting checklist before adopting. The potential value is high (implementer can query test accounts without writing Plaid wrapper code first), but cacheScope defaults and authentication model must be verified. Check against: authentication required? cacheScope "private" on account data? No unsanitized exec() calls?

### Medium-term (next 4–6 weeks)

9. **Refactor any planned custom MCP server (Flinks adapter) to MCP 2026-07-28 spec.** Session state (Mcp-Session-Id) is gone. Implement stateless operation, required Mcp-Method and Mcp-Name headers, and private cacheScope on all transaction/balance responses. SDK betas for Python and TypeScript are available. Design review by the architect against the new spec should happen before any implementation starts.

10. **Plan the RTR integration architecture for Phase 2.** With the RTR By-law now legally active and Q4 2026 launch confirmed, the window to scope RTR-based payment initiation in the architectural plan before implementation begins is now. The architect should define the payment initiation module's interface against RTR in the next planning cycle (Phase 2 target: mid-2027).

11. **Reassess PDR competitor positioning.** Both KOHO (potential banking license by year-end) and Wealthsimple (AI-first, $100B AUM, everyday banking, USD chequing fall 2026) have materially increased their threat level since the PDR was last reviewed. The spec-lead should update the competitor matrix and assess whether any PerFiApp modules need prioritization changes.

12. **Evaluate Expo SDK 57 as the target for `apps/mobile` initialization.** Since the Hermes memory regression in SDK 56 is fixed in SDK 57.0.9, and PerFiApp has not started implementation, targeting SDK 57 from first commit avoids carrying the regression at all. Coordinate with the architect to update the tech stack specification.

---

*Report generated 2026-08-24. All findings verified against primary sources where reachable. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*

*Key sources: [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) / [Anthropic — Fable 5 restored](https://www.anthropic.com/news/redeploying-fable-5) / [Anthropic — Opus 5](https://www.anthropic.com/news/claude-opus-5) / [Anthropic — Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5) / [Claude Code changelog](https://code.claude.com/docs/en/whats-new) / [MCP 2026-07-28 final spec](https://blog.modelcontextprotocol.io/posts/2026-07-28/) / [Canada Gazette CDBA regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Payments Canada — RTR By-law](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [The Hacker News — CVE-2026-54316](https://thehackernews.com/2026/08/claude-code-and-gemini-cli-flaws-let.html) / [Spec Kit releases](https://github.com/github/spec-kit/releases) / [Expo SDK 57](https://expo.dev/changelog/sdk-57) / [DeepEval changelog](https://deepeval.com/changelog/changelog-2026)*
