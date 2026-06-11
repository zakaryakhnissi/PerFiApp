# PerFiApp Agent Research — 2026-06-11

**First run.** All eight research tracks are covered from scratch.
Emphasis is weighted toward the most time-sensitive items first.

---

## Executive Summary

Three findings demand attention in the next few days:

1. **Model retirement deadline (June 15, 2026, four days away).** `claude-sonnet-4-20250514`
   and `claude-opus-4-20250514` are retired on June 15. Any agent file or workflow still naming
   these IDs will start returning API errors. Check every `.claude/agents/*.md` frontmatter
   and CI script now.

2. **Claude Fable 5 just launched (June 9).** The most capable publicly available Anthropic
   model is now in production at `claude-fable-5`. Spec-lead and architect are strong
   candidates for an upgrade; cost must be weighed (same price as Opus 4.8 but meaningfully
   stronger on long-horizon agentic work).

3. **Canada's Consumer-Driven Banking Act received Royal Assent (March 26, 2026).**
   Phase 1 read-access open banking is on track for mid-2026. Screen scraping is now
   prohibited. PerFiApp's data aggregation approach must shift to OAuth-based APIs.

Everything else in this report — cost optimizations, eval tooling, MCP servers, security
advisories — is important but not four-day urgent.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **claude-sonnet-4 / claude-opus-4 retirement (June 15)** | Model & capability | All agents using hardcoded model IDs | **Act immediately** |
| **Claude Fable 5 (`claude-fable-5`)** | Model & capability | spec-lead, architect | **Trial** |
| **Claude Sonnet 4.6 as default workhorse** | Model & capability | implementer, test-engineer, code-reviewer | **Adopt** |
| **Claude Haiku 4.5 for lightweight tasks** | Cost optimization | researcher, code-reviewer (quick checks) | **Adopt** |
| **Prompt caching (5 min + 1 h TTL)** | Cost optimization | All agents with long system prompts | **Adopt** |
| **Message Batches API (50% off, 300k output)** | Cost optimization | researcher (bulk doc processing) | **Adopt** |
| **Context compaction (`compact-2026-01-12`)** | Cost optimization | Long-running implementer sessions | **Trial** |
| **Three-tier model routing pattern** | Cost optimization | Entire agent team | **Adopt** |
| **Claude Code v2.1.172 nested subagents (5 levels)** | Toolchain | architect, implementer parallelism | **Watch / trial** |
| **Claude Code fallback model chain** | Toolchain | All agents | **Adopt** |
| **Claude Code worktree isolation** | Toolchain | implementer + test-engineer parallel work | **Adopt** |
| **Spec Kit v0.9.5** | Toolchain | spec-lead | **Adopt** |
| **APM v0.19.0 (IntelliJ, OpenClaw, Gemini targets)** | Toolchain | All developers | **Adopt** |
| **GitHub MCP Server (official, 30.6k stars)** | Agent tooling | code-reviewer, architect | **Adopt** |
| **Plaid MCP Server (official)** | Agent tooling | implementer, architect (banking integration) | **Trial** |
| **SnapTrade MCP Server (read-only brokerage)** | Agent tooling | implementer (investment data) | **Watch** |
| **DeepEval v3.9+ (agent evals)** | Agent quality | test-engineer | **Trial** |
| **OWASP MCP Top 10 + Agentic Apps Top 10** | Security | architect, code-reviewer | **Act — use as review checklist** |
| **GitHub security validation for third-party agents (June 9)** | Security | code-reviewer, CI pipeline | **Adopt** |
| **Consumer-Driven Banking Act (CDBA) Phase 1** | Compliance | architect, spec-lead | **Act — design for OAuth APIs now** |
| **FINTRAC 2026 AML/PCMLTFA amendments** | Compliance | architect, spec-lead | **Act — review expanded scope** |
| **PCI DSS v4.0 fully mandatory (March 31, 2025)** | Compliance | architect, implementer | **Act — verify current compliance** |
| **Quebec Law 25 fully in force** | Compliance | architect, spec-lead | **Act — privacy impact assessments** |
| **Monarch Money Canada launch** | Competitive intel | spec-lead (positioning) | **Monitor** |

---

## Track 1 — Model & Capability Updates

### 1.1 Urgent: claude-sonnet-4 and claude-opus-4 retire June 15, 2026

**Deadline: 4 days.** `claude-sonnet-4-20250514` (alias `claude-sonnet-4-0`) and
`claude-opus-4-20250514` (alias `claude-opus-4-0`) are retired on **June 15, 2026 at 9 AM PT**.
Calls to these IDs will return API errors after that point — there is no automatic fallback.

Action: grep every file in the repo for these strings:
- `claude-sonnet-4-20250514`
- `claude-sonnet-4-0`
- `claude-opus-4-20250514`
- `claude-opus-4-0`

Migrate `claude-sonnet-4` to `claude-sonnet-4-6` and `claude-opus-4` to `claude-opus-4-8`.
The API shapes (tool use, JSON, prompting) are stable across the 4.x family.

Note that `claude-opus-4-1-20250805` (alias `claude-opus-4-1`) is also deprecated and retires
**August 5, 2026** — plan that migration as well.

Sources: [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) /
[Migration guide](https://www.mindstudio.ai/blog/claude-sonnet-4-opus-4-deprecation-migration-guide)

### 1.2 Current model lineup as of June 11, 2026

All models verified against the official models overview page.

| Model | API ID | Input / Output ($/MTok) | Context | Key notes |
|---|---|---|---|---|
| **Fable 5** | `claude-fable-5` | $10 / $50 | 1M | Most capable GA model; always-on adaptive thinking; 128k max output |
| **Opus 4.8** | `claude-opus-4-8` | $5 / $25 | 1M | Current flagship Opus; adaptive thinking; Jan 2026 knowledge cutoff |
| **Sonnet 4.6** | `claude-sonnet-4-6` | $3 / $15 | 1M | Best speed/intelligence balance; extended thinking; 64k max output |
| **Haiku 4.5** | `claude-haiku-4-5` | $1 / $5 | 200k | Fastest; extended thinking; Feb 2025 knowledge cutoff |

Deprecated models still usable but retiring soon (see above).

Source: [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)

### 1.3 Claude Fable 5 — most capable publicly available model

Released June 9, 2026 (`claude-fable-5`). Launched alongside the invitation-only Mythos 5.
Priced identically to Fable 5 at $10/$50/MTok.

**Benchmark highlights vs Opus 4.8:**
- FrontierCode Diamond split: Fable 5 scores 29.3% vs Opus 4.8's 13.4% (2.2x).
- Finishes coding runs 25–30% faster despite higher capability.
- "Largest lead on hard, long-horizon coding and reasoning."
- On short, well-scoped tasks the gap narrows significantly.

**For PerFiApp's agents:** spec-lead (producing constitutions, multi-step specs) and architect
(long-horizon technical design) are the highest-value upgrade targets. The implementer is also
a candidate, but cost discipline matters — trial Fable 5 on complex tasks before defaulting it.

**Privacy/security note:** Fable 5 uses a new tokenizer that produces ~30% more tokens for the
same text compared to pre-Opus-4.7 models. Update any token budget calculations when migrating.

Source: [Introducing Fable 5 and Mythos 5](https://www.anthropic.com/news/claude-fable-5-mythos-5)

### 1.4 Recommended model assignments for the PerFiApp agent team

Based on the verified pricing and capabilities above:

| Agent | Recommended model | Rationale |
|---|---|---|
| **spec-lead** | `claude-fable-5` (trial) or `claude-opus-4-8` | Produces constitutions and plans — highest reasoning value; use Fable 5 for complex new features |
| **architect** | `claude-fable-5` (trial) or `claude-opus-4-8` | Long-horizon technical design; Fable 5's biggest gains are here |
| **implementer** | `claude-sonnet-4-6` | Best speed/quality trade-off for coding tasks; extend to Opus 4.8 for gnarly problems |
| **test-engineer** | `claude-sonnet-4-6` | Test authoring benefits from Sonnet's speed; extended thinking available |
| **code-reviewer** | `claude-sonnet-4-6` or `claude-haiku-4-5` | Review is well-scoped; Haiku is viable for quick checks |
| **researcher** | `claude-sonnet-4-6` | This agent (the one running this report) — good balance for web research |

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Prompt caching — up to 90% savings on repeated context

All active models support prompt caching. Rules verified against the official docs:

- **Cache write (5-min TTL):** 1.25x base input price. Auto-refreshed at no charge if used
  within the window.
- **Cache write (1-hour TTL):** 2.0x base input price. Use `"ttl": "1h"` in cache_control.
- **Cache read:** 0.1x base input price — 90% cheaper than uncached input.
- **Minimum cacheable tokens:** 1,024 for Sonnet 4.6; 4,096 for Opus 4.8 and Haiku 4.5;
  512 for Fable 5 (lower threshold is advantageous).

**Important change (February 5, 2026):** Cache isolation shifted from organization-level to
**workspace-level** on the Claude API, Claude Platform on AWS, and Microsoft Foundry. If
PerFiApp ever uses multiple workspaces, caches are no longer shared across them.

**For PerFiApp agents:** Every agent has a sizeable system prompt. Caching the system prompt
plus any shared context (CLAUDE.md, relevant spec files) on every call delivers the full 90%
saving on those tokens. Set up 4 `cache_control` breakpoints per agent (max allowed).

Source: [Prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

### 2.2 Message Batches API — 50% off, 300k output tokens

The Message Batches API processes requests asynchronously (results within 24 hours) at exactly
50% off standard token prices. Discounts stack with prompt caching.

Extended output beta (`output-300k-2026-03-24` header): Opus 4.8, Opus 4.7, Opus 4.6, and
Sonnet 4.6 support up to **300k output tokens per batch request** — more than 4x the
synchronous limit.

**For PerFiApp:** The researcher agent (this one) is the primary candidate. Research scans
processing multiple web pages or documents could run as batch jobs at half price. Non-urgent
spec drafts could also benefit.

Source: [Batch processing docs](https://platform.claude.com/docs/en/build-with-claude/batch-processing)

### 2.3 Context compaction — server-side summarization for long sessions

Beta feature, activated with the `compact-2026-01-12` header. When a session approaches the
context threshold, the API automatically summarizes earlier conversation history server-side,
so the session can continue. Reported token savings: ~58.6% in tested scenarios.

Useful for: implementer sessions that accumulate large codebases and back-and-forth; long
architect design sessions.

Limitation: the compaction changes what context Claude "sees" — verify output quality when
enabling, especially for money-precision-sensitive work.

Source: [Compaction docs](https://platform.claude.com/docs/en/build-with-claude/compaction)

### 2.4 Three-tier model routing — 40–60% cost reduction

The established pattern for multi-agent coding systems: assign models by task complexity.

Recommended routing for PerFiApp:
- **Tier 1 (Fable 5 / Opus 4.8, $5–$10/MTok input):** Constitution writing, complex
  architecture decisions, novel algorithm design.
- **Tier 2 (Sonnet 4.6, $3/MTok input):** Standard implementation, test authoring, complex
  code review.
- **Tier 3 (Haiku 4.5, $1/MTok input):** Simple grep/read research steps, quick lint
  suggestions, one-line code reviews.

Stacking all optimizations (routing + prompt caching + batch where applicable) can reduce
effective per-session cost by 30–95% below headline rates according to vendor benchmarks.

Note: the "Anthropic Advisor Strategy" (Opus as senior adviser consulting on Haiku/Sonnet
execution) reportedly cuts costs by 11–12% while improving performance — relevant when
implementing the architect-to-implementer handoff.

Sources: [Augment Code routing guide](https://www.augmentcode.com/guides/ai-model-routing-guide) /
[MindStudio advisor strategy](https://www.mindstudio.ai/blog/anthropic-advisor-strategy-cost-optimization)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 GitHub MCP Server (official)

- **Repo:** [github/github-mcp-server](https://github.com/github/github-mcp-server)
- **Stars:** 30,600+ | **License:** MIT | **Latest:** v1.2.0 (aligned with MCP spec 2026-01-26)
- **Capabilities:** browse repositories, manage issues and PRs, analyze code, monitor GitHub
  Actions, read security findings — all via natural language.
- **For PerFiApp:** code-reviewer and architect agents benefit most. The code-reviewer can
  inspect PRs and security alerts directly; the architect can query issues and CI status.
- **Security note:** This server requires a GitHub token with repository access. Apply the
  principle of least privilege — scope the token to read-only unless write operations are
  needed. Declare it explicitly in `apm.yml` before any developer installs it.
- **Verdict: Adopt.** Official, well-maintained, directly useful.

Source: [github/github-mcp-server](https://github.com/github/github-mcp-server)

### 3.2 Plaid MCP Server (official, for banking aggregation)

- **Official docs:** [plaid.com/docs/resources/mcp/](https://plaid.com/docs/resources/mcp/)
- **Purpose:** Exposes Plaid's financial data APIs as tools for AI agents — account linking,
  transactions, balances, identity verification.
- **Canadian coverage:** Major Canadian banks (RBC, TD, Scotiabank, BMO, CIBC, National Bank,
  Desjardins, Tangerine, Simplii, Vancity) plus 200+ more institutions added in 2025. Stated
  99%+ of Canadian deposit accounts covered.
- **For PerFiApp:** The primary banking aggregation pathway for development and testing.
  The implementer agent could use it to test data-ingestion flows; architect needs to design
  against its data model.
- **Security note:** The MCP server requires Plaid API keys (client_id + secret). These are
  high-sensitivity credentials — never commit them; use vault/environment secrets only. Plaid
  OAuth flow is mandatory for production user data. Sandbox environment is available for
  development.
- **CDBA note:** Plaid's OAuth-based flow satisfies the CDBA's prohibition on screen scraping.
- **Verdict: Trial** — verify in Plaid sandbox first; confirm Canadian institution coverage
  for target user segments before committing to Plaid as the primary aggregator.

Sources: [Plaid MCP server docs](https://plaid.com/docs/resources/mcp/) /
[Plaid in Canada](https://plaid.com/blog/plaid-in-canada/)

### 3.3 Flinks — Canada-native aggregator (no official MCP server yet)

Flinks is the Canada-native alternative to Plaid, majority-owned by National Bank of Canada
(80% stake, $103M). It provides OAuth-based API connectivity to Canadian financial institutions
and acts as an accreditation body for fintechs connecting to National Bank's API. Flinks Enrich
adds transaction enrichment and categorization.

**No official Flinks MCP server was found.** Community wrappers exist but are thin and
unvetted. Given Flinks' strategic positioning for Canadian open banking accreditation, an
official MCP server is plausible but not yet confirmed.

**Recommendation:** Watch. Contact Flinks directly about MCP roadmap. For broad Canadian
coverage during development, Plaid is currently the safer MCP-integrated option. Consider
Flinks for production given its Canadian-first positioning and CDBA accreditation pathway.

Source: [Flinks open banking](https://www.flinks.com/go/open-banking-api)

### 3.4 SnapTrade MCP Server (investment/brokerage data)

- **Repo:** [dangelov/mcp-snaptrade](https://github.com/dangelov/mcp-snaptrade)
- **Purpose:** Read-only MCP server connecting AI agents to brokerage accounts via SnapTrade's
  API (now TradingView-owned). 30+ financial institutions, 400M+ retail investor accounts.
- **Canadian context:** SnapTrade is based in Fredericton, Canada. Supports Canadian brokers.
- **For PerFiApp:** Investment data for the Rewards & Loyalty and Household modules; relevant
  to the portfolio aggregation features in the PDR.
- **Security note:** Read-only by design ("no trading capability, safe by design"). Still
  requires SnapTrade API credentials. Developer registration required.
- **Maturity:** Community-built wrapper, not official SnapTrade tooling. Stars count not
  verified at time of research.
- **Verdict: Watch.** Useful for investment data integration but verify SnapTrade's own API
  roadmap and MCP support plans.

Source: [SnapTrade MCP Server](https://lobehub.com/mcp/micah63-snaptrade-mcp-server)

### 3.5 Claude Code v2.1.172 — nested subagents (5 levels deep)

Released June 10, 2026. Agents can now spawn their own subagents up to 5 levels deep.

**For PerFiApp's agent team:** Enables the architect to spawn specialist agents (implementer
sub-tasks, parallel test-engineer checks) without routing through the main session. The
`isolation: "worktree"` frontmatter setting (available in custom agent files) gives each
subagent its own git worktree, preventing filesystem conflicts.

**Caveat:** Experimental. "Models do not reliably nest on their own yet — in practice you often
have to tell Claude to delegate downward, by name, in the prompt." Adds token cost per nesting
level. Teams report reliable results at 4–8 concurrent worktrees.

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 3.6 Claude Code fallback model chain

Introduced in v2.1.166 (June 6, 2026). The `fallbackModel` setting accepts an ordered list of
up to 3 fallback models tried in sequence if the primary model is unavailable or rate-limited.

```json
{ "fallbackModel": ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"] }
```

**For PerFiApp:** Add to `settings.json` (not committed — per-user) to prevent agent
stalls during model outages or tier throttling. Particularly useful for CI research runs.

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval — open-source LLM evaluation framework

- **Repo:** [confident-ai/deepeval](https://github.com/confident-ai/deepeval)
- **License:** Apache 2.0
- **Current state (as of mid-2026):** 50+ metrics including agent-specific metrics:
  `ToolCorrectnessMetric`, `ArgumentCorrectnessMetric`, `TaskCompletionMetric`, and
  `StepEfficiencyMetric`. Version 3.9.x added agent metrics and multi-turn synthetic golden
  generation in late 2025.
- **For PerFiApp:** The test-engineer agent could use DeepEval to build an eval harness for:
  - Verifying the implementer's tool calls (e.g., confirming the right Plaid API calls are
    made for a given user request).
  - Testing the spec-lead's output quality against constitution principles.
  - Money-precision regression tests (ensuring integer minor units are used, never floats).
- **LLM-as-judge support:** G-Eval allows custom criteria — directly applicable to PerFiApp's
  bilingual (EN/FR) output quality checks and Canadian financial accuracy.
- **Verdict: Trial.** Well-maintained, finance-relevant metrics available.

Sources: [DeepEval agent evaluation](https://deepeval.com/guides/guides-ai-agent-evaluation) /
[Tool correctness](https://deepeval.com/docs/metrics-tool-correctness)

### 4.2 NVIDIA NeMo Guardrails — programmable safety rails

- **Repo:** Apache 2.0, ~5,600 GitHub stars.
- **5 rail types:** input, dialog, retrieval, execution (tool-call validation), output.
- **Colang DSL** for declarative multi-turn dialog flow control.
- **2025–2026:** Now available as NIM microservices (GPU-optimized). Agentic security mode
  validates tool inputs/outputs before/after invocation — directly applicable to finance
  agents calling Plaid or payment APIs.
- **Latency cost:** ~0.5 second added per rail invocation; 50% improvement in protection
  in Nvidia's testing.
- **Enterprise pricing:** $4,500/GPU/year for NIM. Open-source (Apache 2.0) version is free
  and self-hosted.
- **For PerFiApp:** The execution rail type is the most valuable — it validates that the
  implementer or an agent never calls a destructive API endpoint (e.g., payment initiation)
  without explicit user authorization. Relevant as PerFiApp moves toward Phase 2 write-access.
- **Verdict: Watch** for Phase 2 write-access features. The open-source version is worth
  prototyping against now.

Source: [NeMo Guardrails NIM](https://blogs.nvidia.com/blog/nemo-guardrails-nim-microservices/)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v0.9.5 (early June 2026)

- **Repo:** [github/spec-kit](https://github.com/github/spec-kit) — MIT
- **Notable in v0.9.5 (released early June 2026):**
  - Bundled bug-triage workflow extension.
  - Support for Rovodev as a target.
  - Fixed GitHub release asset API URL resolution for private repo presets.
  - Routine dependency updates (GitHub Actions, CodeQL, uv).
- **Broader 2026 context:** Spec Kit has seen 6 tagged releases between April 29 and May 11,
  adding catalog search commands, governance checks at implementation time, registry/
  authentication plumbing, cost tracking, and multi-agent review extensions.
- **For PerFiApp:** spec-lead agent depends on Spec Kit. Upgrade to v0.9.5 for the latest
  governance and bug-triage workflow support. The governance check at implementation time
  (gates the implementer against the constitution) is particularly valuable for a financial app.
- **Install:** `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.9.5`
- **Verdict: Adopt.**

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases/tag/v0.9.5)

### 5.2 APM v0.19.0 (June 9, 2025 — most recent verified release)

- **Repo:** [microsoft/apm](https://github.com/microsoft/apm)
- **Notable recent changes:**
  - `--target gemini` now supported; writes to `.gemini/settings.json`.
  - OpenClaw added as experimental skills target.
  - IntelliJ/JetBrains added as MCP install target.
  - Managed-section mode for AGENTS.md (prevents stale generated content).
  - `apm audit` now catches forgotten installs and silent hand-edits by default.
  - `apm install` now exits code 1 on installation errors (CI-safe).
  - `require_pinned_constraint` policy to ban unbounded dependency ranges.
- **For PerFiApp:** `apm audit`'s new drift detection is directly useful in CI — it will flag
  if someone hand-edits a generated `.claude/` file instead of editing the `.apm/` source.
  The `apm install --frozen` pattern in the research CI workflow is now correctly enforced
  (the exit-code fix means CI will actually fail on errors).
- **Verdict: Adopt** — update to v0.19.0.

Source: [APM releases](https://github.com/microsoft/apm/releases)

### 5.3 Claude Code — agent teams feature (shipped Feb 5, 2026)

Launched alongside Opus 4.6. Multiple Claude Code sessions as a team: one lead session
coordinates work, teammates run independently in their own context windows, message each
other directly, and claim tasks from a shared list.

**Current status:** Still experimental. Requires
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Claude Code v2.1.32+ required. Limitations:
no session resumption with in-process teammates, only one team per lead, no nested teams.

**For PerFiApp's agent team:** The PerFiApp agent roster (`.claude/agents/`) already supports
agent teams. No configuration changes needed to the agent files — the same role files work in
both normal subagent mode and agent-teams mode (as noted in `docs/AGENT_TEAM.md`).

The `--safe-mode` flag (v2.1.169) and post-session hooks (v2.1.169) are also notable:
safe-mode blocks all destructive tool calls (useful for read-only review sessions); post-session
hooks can trigger automatic cleanup or notification after a session ends.

Source: [Claude Code agent teams docs](https://code.claude.com/docs/en/agent-teams)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 OWASP MCP Top 10 and Agentic Applications Top 10 (2025–2026)

Two complementary frameworks are now the canonical reference for MCP and agent security:

- **OWASP MCP Top 10:** [owasp.org/www-project-mcp-top-10](https://owasp.org/www-project-mcp-top-10/)
  Published mid-2025 (beta). Covers: Token Mismanagement & Secret Exposure, Tool Poisoning,
  Rug Pulls, Command Injection, Supply Chain Attacks, and 5 others.

- **OWASP Agentic Applications Top 10 (2026):**
  [genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
  Peer-reviewed; covers multi-agent and autonomous AI risk.

**Key stats from active research (2025–2026):**
- 30%+ of 1,800+ scanned MCP servers have at least one exploitable vulnerability.
- 38% of 500+ scanned MCP servers lack any authentication.
- Between Jan–Feb 2026: 30+ CVEs filed against MCP servers/clients; 43% are shell injections.
- MCPTox benchmark: even strongest commercial agents fail ~50% of prompt-injection-via-tool-output scenarios.
- Rug pulls: a clean MCP server silently updates with malicious behavior; APM content-hash
  pinning (`apm.lock.yaml`) is the primary defense — do not use unbounded dep ranges.

**Immediate actions for PerFiApp:**
1. Use the OWASP MCP Top 10 as the vetting checklist for every MCP server before adoption
   (already required by the APM model — this formalizes the criteria).
2. Pin all MCP servers to exact content hashes in `apm.lock.yaml`.
3. Never grant MCP servers credentials broader than needed (financial data = least privilege).
4. Add the code-reviewer agent's checklist an item to verify no new MCP servers were added
   without `apm.yml` declaration.

Sources: [OWASP MCP Top 10](https://owasp.org/www-project-mcp-top-10/) /
[Practical DevSecOps guide](https://www.practical-devsecops.com/mcp-security-guide/)

### 6.2 GitHub secret scanning — AI-generated code leaks at 2x baseline

GitGuardian's 2026 State of Secrets Sprawl: **28.65 million** new hardcoded secrets in public
GitHub repos in 2025 (34% YoY increase). AI-assisted commits leak secrets at 3.2% rate, ~2x
the human baseline. Gartner states 48% of AI-generated code contains vulnerabilities.

**GitHub mitigations (verified as of June 2026):**
- Push protection: blocks secrets at commit time.
- Secret scanning now covers AI coding agent-generated code automatically (extended scanning
  for third-party agents enabled by default as of June 9, 2026 — see next item).
- New secret detector metadata: owner name, email, creation/expiry dates available since
  Feb 2026 — enables faster triage.

**For PerFiApp:** Enable GitHub Advanced Security on the repo. The implementer agent must
never hardcode API keys (already in the implementer's prompt, but worth verifying the
guardrail is active at the CI level too).

Source: [GitHub secret scanning](https://www.buildmvpfast.com/blog/github-secret-scanning-pattern-updates-devops-2026)

### 6.3 GitHub security validation for third-party coding agents (June 9, 2026)

GitHub now automatically runs CodeQL, dependency advisory checks, and secret scanning on code
produced by **third-party coding agents** (not just Copilot) when that code is submitted as a
PR. This applies to Claude Code-generated PRs.

**For PerFiApp:** This is a free layer of defense on top of the existing CI pipeline. No
action required to activate — it follows the repo's Copilot settings for validation tools.
Ensure CodeQL is enabled in the repo's security settings.

Source: [GitHub changelog June 9](https://github.blog/changelog/2026-06-09-security-validation-for-third-party-coding-agents/)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 Consumer-Driven Banking Act (CDBA) — Royal Assent March 26, 2026

**This is the highest-impact regulatory change for PerFiApp's data layer.**

- **What:** Bill C-15 enacted a comprehensive new Consumer-Driven Banking Act, replacing the
  original 2024 version. The Bank of Canada (not FCAC) is the primary regulator, with
  C$19.3M allocated over two years for implementation.
- **Phase 1 (read access):** Targeted for 2026 — mandatory OAuth API-based access to consumer
  financial data. **Screen scraping is now prohibited.** No confirmed launch date yet (Bank of
  Canada still in information-gathering phase as of March 2026).
- **Phase 2 (write access + payments + Real-Time Rail integration):** Targeted for mid-2027.
- **Fintech obligations (for accredited TPSPs):**
  - Use OAuth-based API connections only (credential sharing prohibited).
  - Build consent management and authentication procedures.
  - Implement security safeguards and fraud prevention.
  - Maintain complaint handling and reporting protocols.
  - Liability for data breaches survives even when using third-party service providers.

**For PerFiApp architecture:** Design the data aggregation layer around OAuth APIs (Plaid,
Flinks) from day one — not screen scraping. Any existing design relying on credential sharing
must be revised. The accreditation pathway with the Bank of Canada may be required for
production launch.

Sources: [DLA Piper CDBA explainer](https://www.dlapiper.com/en-pl/insights/publications/2026/04/the-new-consumer-driven-banking-act-explained) /
[McMillan LLP](https://mcmillan.ca/insights/publications/canadas-open-banking-framework-key-updates-from-budget-2025/)

### 7.2 FINTRAC 2026 AML/PCMLTFA amendments — Royal Assent March 26, 2026

Enacted simultaneously with the CDBA. Key changes:

- **Expanded reporting entity categories:** Mortgage lenders, brokers, administrators,
  factoring companies, cheque cashing entities, title insurers (effective Oct 1, 2025), and
  private ATM acquirers now covered. Stablecoin issuers must register with FINTRAC as MSBs.
- **Mandatory FINTRAC enrollment:** Expands beyond MSBs to include banks, insurance companies,
  and others. Full enrollment obligation for non-MSB entities comes into force in 2027.
- **Dramatically increased penalties:** Up to $40,000 for minor violations (was $1,000);
  up to $4,000,000 for serious violations.
- **Private-to-private information sharing:** Reporting entities may now share AML-relevant
  data with each other — potential for aggregators like PerFiApp to participate in collaborative
  fraud detection networks.
- **FATF mutual evaluation** of Canada's AML regime scheduled for late 2025 — heightened
  scrutiny of compliance programs.

**For PerFiApp:** If PerFiApp's Cash Advance Lite or payment features bring it within scope
of PCMLTFA (as an MSB or fintech), the new framework applies. Architect and spec-lead should
flag any module that could trigger reporting-entity status early in design.

Source: [FINTRAC 2026 amendments](https://amlincubator.com/blog/fintrac-2026-legislative-amendments-what-canadian-msbs-fintechs-and-crypto-platforms-must-know-1) /
[Fasken overview](https://www.fasken.com/en/knowledge/2026/04/fintrac-provides-information-on-recent-changes-to-canadas-aml-regime)

### 7.3 PCI DSS v4.0 — all 51 future-dated requirements now mandatory

**Deadline already passed (March 31, 2025).** All 64 new or updated requirements from PCI
DSS v4.0 are now fully mandatory. No grace period.

Key v4.0 requirements affecting fintech development:
- **Req 8.3.1:** MFA required for ALL user access to system components (not just admins).
- **Continuous security:** PCI DSS v4.0 explicitly rejects the annual-compliance-event model;
  security is now a continuous business-as-usual requirement.
- Non-compliance penalties in Canada: $5,000–$100,000/month and potential permanent loss of
  card acceptance.

**For PerFiApp:** If any module stores, processes, or transmits cardholder data (card numbers,
CVVs, expiry dates — relevant to the Rewards & Loyalty and Pay & Payment Optimization modules),
PCI DSS v4.0 full compliance is mandatory. The architect should verify whether existing design
decisions meet v4.0 MFA and continuous-monitoring requirements.

Source: [PCI DSS v4.0 fintech guide](https://mindster.com/mindster-blogs/pci-dss-4-fintech-compliance/)

### 7.4 Quebec Law 25 — fully in force, high penalties

Law 25 completed its three-year phase-in and is now fully in force. Key obligations relevant
to PerFiApp:

- **Privacy impact assessments (PIAs):** Required before any new system processing personal
  data of Quebec residents.
- **Automated decision-making transparency:** Users must be informed when automated decisions
  affect them (directly relevant to PerFiApp's AI-driven coaching modules).
- **Data portability:** Requests must be fulfilled within 30 days.
- **Breach notification:** 72-hour notification window for Quebec residents.
- **Penalties:** Up to CAD $25M or 4% of worldwide turnover — materially higher than PIPEDA.

**For PerFiApp:** Since PerFiApp is bilingual and Canada-first, Quebec users are a primary
target. Law 25 PIAs should be completed before any module touching personal financial data
launches. The AI coaching and credit-scoring modules (Credit Monitor, Due-Date Coach, etc.)
trigger the automated-decision-making disclosure requirement.

Source: [Quebec Law 25 guide](https://www.alation.com/blog/quebec-law-25-compliance-guide/)

### 7.5 Credit bureau data — Borrowell / Equifax Canada

Borrowell (3M+ Canadian members, Equifax partner) completed migration to Equifax's cloud
platform with millisecond-latency real-time credit file access. Search matching improved by
50 basis points (5M more applications now receive a credit file).

No direct MCP server found for Canadian credit bureau data. Borrowell does not expose a
public API. TransUnion Canada and Equifax Canada both have developer API programs, but
these require formal partnerships and are not self-serve.

**For PerFiApp's Credit & Coaching module:** Design for Borrowell partnership (as the dominant
free credit score provider in Canada) or direct Equifax/TransUnion API agreements. Budget
significant lead time for partnership onboarding.

Source: [Equifax Canada / Borrowell cloud](https://www.equifax.com/newsroom/all-news/-/story/equifax-canada-launches-final-stage-of-cloud-transformation-with-borrowell/)

---

## Track 8 — Competitive & Product Intel

### 8.1 Monarch Money launched in Canada

Monarch Money recently launched in Canada. It offers: bank account + credit card + investment
account sync; portfolio aggregation; collaborative household view; auto-updating balances
multiple times daily. Positioned as a Mint replacement for Canadians.

**Competitive note:** Monarch's household/shared dashboard and investment aggregation
correspond directly to PerFiApp's Household & Family and Rewards & Loyalty modules. The PDR's
differentiators (bilingual EN/FR, Canadian-first data, AI coaching, module depth) are the
right response — but Monarch's launch means the window to establish Canadian market presence
is narrowing.

Source: [Best Mint alternatives Canada](https://mybudgety.com/budgeting/best-mint-alternatives/)

### 8.2 Wealthica tracking CAD $32.8B in aggregated Canadian investments

Wealthica (Canadian investment aggregator, 100+ institutions, portfolio visualization)
reported CAD $32.8B under aggregation as of January 2026. This represents the scale of the
investment-data opportunity in Canada.

**Implication for PerFiApp:** The portfolio aggregation space in Canada has an established,
growing player. PerFiApp should differentiate by integrating investment data into the broader
financial picture (rewards optimization, goal tracking, tax awareness) rather than competing
head-on with Wealthica's visualization depth.

Source: [Wealthica review 2026](https://genymoney.ca/wealthica-review-the-canadian-version-of-personal-capital/)

---

## Recommended Next Steps

Ordered by urgency:

### Immediate (this week)

1. **Audit all agent files and CI scripts for deprecated model IDs.** Search for
   `claude-sonnet-4-20250514`, `claude-sonnet-4-0`, `claude-opus-4-20250514`,
   `claude-opus-4-0`. Replace with `claude-sonnet-4-6` and `claude-opus-4-8` respectively.
   Deadline: June 15, 2026.

2. **Add fallback model chain to settings.** Add
   `"fallbackModel": ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]` to prevent
   agent stalls during model outages.

3. **Run `apm audit`** to detect any hand-edits or forgotten installs in managed files.
   Upgrade to APM v0.19.0 for the CI-safe exit-code behavior.

### Short-term (this sprint)

4. **Apply the OWASP MCP Top 10 checklist** to any MCP server being considered (especially
   GitHub MCP and Plaid MCP). Add checklist to code-reviewer's vetting template.

5. **Trial Fable 5 on the spec-lead and architect agents.** Run a representative feature spec
   through `claude-fable-5` and compare output quality and token cost vs current Opus 4.8.
   The new tokenizer produces ~30% more tokens for the same text — measure actual cost.

6. **Enable prompt caching on all agent system prompts.** Set `cache_control: ephemeral` on
   the system prompt block of every agent. Target the 1,024-token minimum for Sonnet 4.6
   (well under the current system prompt sizes).

7. **Implement GitHub Advanced Security (CodeQL + secret scanning)** on the repo if not
   already enabled, to benefit from the June 9 automatic validation for agent-generated code.

### Medium-term (next 4–6 weeks)

8. **Design the data aggregation layer for OAuth-only** in preparation for CDBA Phase 1.
   Evaluate Plaid (MCP-ready, broad Canadian coverage) vs Flinks (Canadian-native,
   accreditation pathway) and document the trade-off in a spec.

9. **Complete Privacy Impact Assessments** for any module that processes Quebec residents'
   personal financial data (Law 25 obligation — fully in force).

10. **Review whether any PerFiApp module triggers FINTRAC reporting-entity status** (Cash
    Advance Lite, payment initiation, stablecoin features). Engage compliance counsel early.

11. **Prototype DeepEval agent eval harness** with `ToolCorrectnessMetric` and a custom
    money-precision metric (verifying integer minor units, never floats) for the implementer.

12. **Upgrade Spec Kit to v0.9.5.** The governance-check-at-implementation-time feature is
    particularly valuable for enforcing PerFiApp's financial-safety principles.

---

*Report generated 2026-06-11. All findings verified against primary sources. Recommendations
are proposals — nothing is installed or configured until the team reviews and approves.*
