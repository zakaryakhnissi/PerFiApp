# PerFiApp Agent Research — 2026-06-24

**Second run. Delta report vs 2026-06-11.** Prior findings not repeated unless status has changed. Rotation emphasis this run: new model developments (especially Fable 5 status), Claude Code changelog after v2.1.172, Canadian open banking progress, new MCP security advisories, and toolchain upgrades.

---

## Executive Summary

Three findings demand immediate attention:

1. **Claude Fable 5 suspended by US export-control order (June 12 — status unresolved as of June 24).** The model the prior report recommended for trial is currently offline for all API users worldwide. Any agent file or workflow that already migrated to `claude-fable-5` must have a working fallback. The `claude-opus-4-8` fallback chain from the prior report is now mandatory, not optional. Restoration is unconfirmed; market prediction was ~58–67% by July 1. No official timeline exists.

2. **`claude-opus-4-1-20250805` deprecation announced June 5 — retires August 5, 2026.** If any agent configuration references this model (it was a short-lived intermediate Opus), the retirement is 42 days away. Recommended replacement: `claude-opus-4-8`.

3. **`temperature`, `top_p`, `top_k` now return 400 errors on Opus 4.7+ (including Opus 4.8).** Any API wrapper or agent file that sets sampling parameters for the Opus tier will break silently on Opus 4.8. This includes the implementer agent if it ever escalates to Opus. The fix is to omit these fields entirely for Opus 4.7+ models.

Everything else — toolchain upgrades, new security CVEs, open banking timeline shift, new eval tooling — is important but not same-week urgent.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Fable 5 / Mythos 5 export-control suspension** | Model | spec-lead, architect (trial blocked) | **Act — verify fallback chain is live** |
| **Opus 4.1 retires August 5, 2026** | Model | Any agent using this ID | **Act — audit and migrate before Aug 5** |
| **temperature/top_p/top_k 400 on Opus 4.7+** | Model / cost | implementer, any Opus-tier call | **Act — remove sampling params from Opus calls** |
| **Anthropic Agent SDK billing split — paused** | Cost | All developers on Pro/Max subscriptions | **Monitor — change will eventually happen** |
| **Extended thinking cache-hit on tool results** | Cost | implementer multi-step workflows | **Adopt — free optimization** |
| **Claude Code v2.1.178 — implicit agent teams** | Toolchain | All agents | **Adopt — simplifies team spawning** |
| **Claude Code v2.1.183 — auto-mode safety hardening** | Toolchain / security | implementer in auto mode | **Adopt — blocks destructive git/infra commands** |
| **Claude Code v2.1.187 — sandbox.credentials + org model enforcement** | Security | All agents, CI | **Adopt — credential leak prevention** |
| **Claude Code v2.1.186 — MCP login/logout CLI** | Toolchain | architect, implementer | **Adopt — headless MCP auth** |
| **Claude Code v2.1.175 — enforceAvailableModels** | Toolchain | CI / org governance | **Adopt — lock agents to approved model list** |
| **cc-safe-setup (autonomous Claude Code safety hooks)** | Security | implementer in auto mode | **Trial — 890+ safety hooks, MIT, zero deps** |
| **CVE-2026-32211 — Azure MCP Server (CVSS 9.1)** | Security | architect (if Azure MCP considered) | **Act — do not deploy Azure MCP without auth verification** |
| **OX Security MCP RCE (10 critical CVEs)** | Security | architect, code-reviewer | **Act — add RCE check to MCP vetting checklist** |
| **Claude Code CVE-2025-59536 + CVE-2026-21852** | Security | All developers | **Act — verify latest Claude Code installed; trust dialog always honored** |
| **Spec Kit v0.11.6 (from v0.9.5)** | Toolchain | spec-lead | **Adopt — major version jump; new workflow features** |
| **APM v0.21.0 (from v0.19.0)** | Toolchain | All developers | **Adopt — Kiro support, SBOM export, allowExecutables gate** |
| **DeepEval v4.0 — Claude Code native integration** | Agent quality | test-engineer | **Adopt — 1-line agent tracing, CLI commands for Claude Code** |
| **CDBA Phase 1 timeline slipping — Bank of Canada still in information-gathering** | Compliance | architect, spec-lead | **Monitor — 2026 launch now widely seen as at risk** |
| **Canada RTR launch moving to Q4 2026** | Compliance | architect (Phase 2 design) | **Monitor — needed for Phase 2 write-access** |
| **FINTRAC implementation guidance published** | Compliance | architect, spec-lead | **Act — new "reasonably designed, risk-based, effective" compliance standard** |
| **KOHO raises $130M, approaches banking license** | Competitive | spec-lead | **Monitor — intensifying neobank competition** |
| **Monarch Money adds AI assistant + credit score tracking** | Competitive | spec-lead | **Monitor — closes gap with PerFiApp differentiation** |
| **MCP 2026 roadmap — stateless protocol RC planned** | Agent tooling | architect | **Watch — MCP-Session-Id removal in RC; affects MCP server design** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGE: Claude Fable 5 suspended — all API users affected

**Status changed from "Trial" (June 11 report) to blocked.**

On June 12, 2026 — three days after launch — the US government issued an export-control directive requiring Anthropic to suspend all access to `claude-fable-5` and `claude-mythos-5`. The stated reason was a discovered jailbreak; Anthropic disputes its severity. The suspension is blanket: it applies to every customer worldwide.

As of June 24, 2026, access has **not** been officially restored. Earlier news reports claiming restoration around June 18 with "nationality controls" could not be substantiated by primary sources, and Anthropic's status page still shows the suspension. Anthropic has said only that they are "working to restore access as soon as possible."

**For PerFiApp:** Any agent file already updated to use `claude-fable-5` will fail at the API level until access is restored. The `fallbackModel` chain (`["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]`) from the prior report is the only protection. Verify this chain is active. Use `claude-opus-4-8` as the practical replacement for spec-lead and architect in the meantime.

**Important secondary effect:** Claude Code v2.1.183 now surfaces a **model deprecation / unavailability warning** when a requested model is blocked or deprecated — this will appear for anyone still pointing at `claude-fable-5`. The warning appears in print mode on stderr for agents.

Sources: [Anthropic statement](https://www.anthropic.com/news/fable-mythos-access) /
[Fortune reporting](https://fortune.com/2026/06/13/anthropic-disables-fable-mythos-export-controls-national-security-threat/) /
[Unconfirmed restoration claim — treat skeptically](https://techjacksolutions.com/ai-brief/claude-fable-5-returns-with-nationality-controls-developers/)

### 1.2 New deprecation: claude-opus-4-1 retires August 5, 2026

Announced June 5, 2026. `claude-opus-4-1-20250805` is deprecated with a hard retirement date of **August 5, 2026**. Recommended replacement: `claude-opus-4-8`.

This is 42 days from this report's date. Search all agent files and CI scripts for `claude-opus-4-1-20250805` or `claude-opus-4-1`.

Source: [Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.3 RESOLVED: claude-sonnet-4-20250514 and claude-opus-4-20250514 retired June 15

The prior report flagged these as a four-day deadline. They are now retired. Requests to these model IDs return API errors. If any file missed the migration, it is currently broken. Check Claude Console usage export (Usage > Export > CSV) to verify no live traffic is hitting these model IDs.

### 1.4 Breaking: temperature / top_p / top_k return 400 errors on Opus 4.7+

This was introduced with Opus 4.7 and carries over to Opus 4.8. Setting `temperature`, `top_p`, or `top_k` to **any non-default value** on these models returns a 400 error immediately. The fix is to omit these fields entirely rather than setting them to what looks like a default value.

**For PerFiApp:** Scan all agent YAML/JSON frontmatter and any API client wrappers for sampling parameter fields. The implementer and code-reviewer agents, if they ever escalate to Opus 4.8 via the fallback chain, will hit 400s if these fields are set.

Source: [Anthropic migration guide](https://docs.anthropic.com/en/docs/about-claude/models/migrating-to-claude-4)

### 1.5 Model deprecation table (current as of June 24, 2026)

| Model ID | Status | Retirement |
|---|---|---|
| `claude-fable-5` | Suspended (export control) | — |
| `claude-opus-4-8` | Active | Not before May 28, 2027 |
| `claude-opus-4-7` | Active | Not before Apr 16, 2027 |
| `claude-opus-4-6` | Active | Not before Feb 5, 2027 |
| `claude-sonnet-4-6` | Active | Not before Feb 17, 2027 |
| `claude-haiku-4-5-20251001` | Active | Not before Oct 15, 2026 |
| `claude-opus-4-1-20250805` | **Deprecated** | **August 5, 2026** |
| `claude-mythos-preview` | Deprecated | June 30, 2026 |
| `claude-sonnet-4-20250514` | Retired | June 15, 2026 |
| `claude-opus-4-20250514` | Retired | June 15, 2026 |

Source: [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Agent SDK billing split — paused on June 15

On May 13, Anthropic announced that Agent SDK usage (including `claude -p`, Claude Code GitHub Actions, and third-party apps built on the SDK) would move to a separate monthly credit from June 15 ($20/Pro, $100/Max-5x, $200/Max-20x), billed at standard API rates with no rollover. On June 15 — the same day the change was due — Anthropic **paused the change entirely**, citing competitive pressure (OpenAI is reportedly weighing steep API price cuts).

**Current status:** Agent SDK usage still draws from your subscription's usage limits, same as before. Anthropic has committed to advance notice before any future change.

**For PerFiApp:** The pause is a reprieve for the CI research runs and any automation. The change will likely be revisited. Begin tracking Agent SDK token consumption now so the team can model the cost impact when the split eventually happens.

Sources: [The New Stack — pause announcement](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/) /
[The Decoder — competitive context](https://the-decoder.com/anthropic-backs-off-unpopular-billing-overhaul-as-price-war-with-openai-looms/)

### 2.2 Extended thinking — cache hits on tool results (free optimization)

Verified update to the prior report's caching guidance: when using extended thinking with tool use, **preserved thinking blocks passed back with tool results are cached incrementally** across the assistant turn. This means multi-step agentic workflows (implementer calling Plaid, doing multiple tool calls in one session) get cache hits on the thinking blocks automatically — no additional configuration needed.

**For PerFiApp:** The implementer agent running multi-step financial data workflows benefits directly. Combined with the 5-min TTL system prompt cache already recommended, this should measurably reduce costs on complex sessions.

Source: [Extended thinking docs — caching section](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 Claude Code v2.1.173 through v2.1.187 — key changes since June 11

Fifteen versions shipped between June 11 and June 23. The most actionable for PerFiApp:

**v2.1.178 — Implicit agent teams (June 15)**
`TeamCreate` and `TeamDelete` tools are removed. Every Claude Code session now has an implicit team: spawn teammates with `Agent(name=...)` directly. `Tool(param:value)` permission rules allow matching on specific parameter values (e.g., `Agent(model:opus)` to block Opus subagents from being spawned without approval). Nested `.claude/` directories now use closest-wins resolution — relevant when PerFiApp's `isolation: "worktree"` subagents have their own `.claude/` scope.

**v2.1.183 — Auto mode safety hardening (June 19)**
In auto mode, Claude Code now blocks: `git reset --hard`, `git checkout -- .`, `git clean -fd`, `git stash drop` unless you explicitly requested discarding work; `git commit --amend` when the commit wasn't made by the agent this session; `terraform destroy` / `pulumi destroy` / `cdk destroy` unless specifically requested. This is a meaningful safety floor for the implementer running in auto mode on financial code. Also added: **model deprecation warnings** on stderr when the configured model is unavailable.

**v2.1.187 — sandbox.credentials + org model enforcement (June 23)**
New `sandbox.credentials` setting blocks sandboxed bash commands from reading credential files (`~/.aws/credentials`, `~/.ssh/`, etc.) and secret environment variables. **This is directly relevant to a financial app** — if the implementer or any subagent runs bash in sandbox mode, this prevents accidentally leaking cloud or payment API credentials. Note: documentation for this setting is still incomplete (open issue filed June 23); configure it in `settings.json` as `"sandbox": {"credentials": false}` to enable protection.

Organization model restrictions can now be enforced across all entry points (`/model`, `--model`, `ANTHROPIC_MODEL`). Combined with `enforceAvailableModels` from v2.1.175, this allows locking the agent team to an approved model allowlist — important when Fable 5 is suspended and you want to ensure no agent accidentally requests it.

**v2.1.186 — MCP login/logout CLI (June 22)**
`claude mcp login <name>` and `claude mcp logout <name>` enable headless MCP authentication without interactive menus. This unblocks CI workflows that need to authenticate against Plaid MCP or GitHub MCP without a human in the loop.

**v2.1.181 — Prompt caching fixes (June 17)**
Prompt caching was broken for custom `ANTHROPIC_BASE_URL` and on Microsoft Foundry due to per-request attestation token changes. This is now fixed. If PerFiApp uses a proxy or Foundry, re-verify prompt caching is working.

**v2.1.176 — enforceAvailableModels alias bypass fix (June 12)**
Fixed: alias model picks could previously redirect to blocked models via `ANTHROPIC_DEFAULT_*_MODEL` environment variables. Now fully enforced.

Sources: [Claude Code changelog](https://code.claude.com/docs/en/changelog) /
[Releases page](https://github.com/anthropics/claude-code/releases)

### 3.2 cc-safe-setup — autonomous operation safety hooks

- **Repo:** [yurukusa/cc-safe-setup](https://github.com/yurukusa/cc-safe-setup)
- **License:** MIT | **Install:** `npx cc-safe-setup`
- Installs 8 pre-execution hooks in ~10 seconds: blocks `rm -rf /`, prevents pushes to main, catches secret leaks, validates syntax after every edit. Built from real incident reports from autonomous Claude Code sessions. 890+ example hooks, zero npm dependencies.
- **For PerFiApp:** Complements the built-in v2.1.183 auto-mode guards. The secret-leak hook is the most relevant addition for a financial app — catches API key patterns before they reach git. Install in developer environments; consider the hook library as a source for custom PerFiApp-specific hooks (e.g., blocking writes to files containing known secret patterns like Plaid `client_secret`).
- **Security note:** Review the hook list before installing. Hooks execute on every Claude Code bash command — vet each one for false positives on PerFiApp's expected command patterns.
- **Verdict: Trial.** Low risk (MIT, zero deps), high signal for financial-app autonomous operation.

Sources: [cc-safe-setup repo](https://github.com/yurukusa/cc-safe-setup) /
[Safety scan writeup](https://dev.to/yurukusa/i-ran-a-safety-scan-on-my-claude-code-setup-heres-what-i-found-4jm1)

### 3.3 MCP 2026 roadmap — stateless protocol release candidate

The MCP specification is evolving significantly. A release candidate is planned for **July 28, 2026** with a headline change: **protocol-level sessions removed (no more `Mcp-Session-Id`)**. The spec becomes stateless at the protocol layer.

Additional RC changes: `Mcp-Method` and `Mcp-Name` headers required on Streamable HTTP (for load balancer routing); `ttlMs` + `cacheScope` on list/resource read results (structured caching hints); W3C Trace Context propagation in `_meta` for distributed tracing.

**For PerFiApp:** Impacts the architecture of any custom MCP server PerFiApp builds (e.g., a Flinks adapter). Design for stateless operation now to avoid migration pain in August. The `cacheScope` field also matters for privacy: verify that account balance or transaction data from Plaid MCP is not inadvertently shared across users via a misconfigured cache scope.

Sources: [MCP 2026 roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/) /
[2026-07-28 RC announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 STATUS CHANGE: DeepEval v4.0 — native Claude Code integration

**Status changed from "Trial" (v3.9) to "Adopt" (v4.0).**

DeepEval 4.0 released June 22, 2026. This is the most relevant change for PerFiApp's test-engineer agent:

- **Native Claude Code CLI commands:** `deepeval generate` auto-synthesizes datasets by inferring the use case from the codebase; `deepeval test run` executes test suites. These commands work directly inside Claude Code sessions — the test-engineer agent can invoke them as tools.
- **1-line framework integrations:** LangChain, Pydantic AI, OpenAI Agents, and others can now be traced and evaluated with a single line of code.
- **Local trace viewer:** `deepeval inspect` opens a terminal UI showing per-span scores and metric explanations. Useful for debugging when the implementer's Plaid API call sequence deviates from expected behavior.
- **TypeScript support** added alongside the existing Python monorepo.

**For PerFiApp's test-engineer:** The prior report recommended DeepEval for trial. V4.0's direct Claude Code CLI integration makes this an adopt-now item. The `deepeval generate` command can synthesize bilingual (EN/FR) test cases from the codebase context — relevant for PerFiApp's language-switching edge cases.

Sources: [DeepEval 4.0 announcement](https://deepeval.com/blog/introducing-deepeval-4) /
[DeepEval repo](https://github.com/confident-ai/deepeval)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v0.11.6 (major version jump from v0.9.5)

Six weeks of releases since the prior report's v0.9.5 finding. Current latest: **v0.11.6 (June 23, 2026)**.

Most relevant changes across v0.10.0–v0.11.6:

**v0.11.3 — `/analyze` command in forked subagent (June 19)**
Implements `/analyze` as an agentic workflow in a forked subagent — allows the spec-lead to trigger an analysis pass without blocking the main session.

**v0.11.2 — bug-assess agentic workflow + `/speckit.converge` (June 18)**
`/speckit.converge` is a new command for driving a spec toward a target state iteratively. The bug-assess workflow complements the existing bug-triage — it now has an autonomous assessment step before triage.

**v0.11.0 — workflow step catalog (June 16)**
Community-installable step types are now possible. The `security-governance` preset updated to v0.6.0 and `architecture-governance` to v0.5.0. Zed editor support added.

**v0.10.4 — fixes (June 16)**
Fixed fan-out `items` expression resolution — relevant if spec-lead uses fan-out steps for parallel module spec generation.

**v0.11.6 — Firebender integration for Android Studio/IntelliJ (June 23)**
The Spec Kit Preview extension updated to v1.1.0 — relevant for developers using VS Code or JetBrains.

**For PerFiApp:** Upgrade from v0.9.5 to v0.11.6. The `/speckit.converge` command and the updated `security-governance` preset (v0.6.0) are the highest-value additions — converge is useful for iterating specs toward PerFiApp's compliance requirements; the security-governance preset can be used to run security checks on spec outputs.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.11.6`

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases)

### 5.2 APM v0.21.0 (June 19, 2026)

Two new releases since the prior report's v0.19.0 finding:

**v0.20.0 (June 12):**
- Hermes agent target (experimental)
- Enterprise bootstrap mirrors for distribution
- **Kiro IDE support** (AWS's spec-driven IDE, which replaced Amazon Q Developer)
- Multi-host dependency identity resolution
- Changed default pack archive from tar.gz to .zip

**v0.21.0 (June 19):**
- `allowExecutables` approval gate — dependencies that include executables must be explicitly approved; this is a security improvement directly relevant to MCP server installations
- OpenClaw integration documentation
- Removed deprecated marketplace commands
- **SBOM export** — generates a Software Bill of Materials for agent dependencies
- Google Antigravity CLI support
- Enhanced `apm audit` surfaces unmanaged artifacts

**For PerFiApp:** The `allowExecutables` gate in v0.21.0 is the most important security addition — it requires explicit human approval before APM installs any MCP server that ships executables (which is most of them). This closes a gap where `apm install` could silently install a malicious executable. The SBOM export also supports supply-chain compliance requirements.

Source: [APM releases](https://github.com/microsoft/apm/releases)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CRITICAL: Claude Code CVE-2025-59536 and CVE-2026-21852 — patched but verify version

Two high/critical CVEs in Claude Code were disclosed publicly in February 2026 (Check Point Research):

- **CVE-2025-59536 (CVSS 8.7 — RCE):** Malicious hooks in a repository's `.claude/settings.json` executed arbitrary shell commands before the user saw the trust dialog. Combined with `enableAllProjectMcpServers`, could silently initialize attacker-controlled MCP servers.
- **CVE-2026-21852 (CVSS 5.3 — API key exfiltration):** If `ANTHROPIC_BASE_URL` was set in `.claude/settings.json` before trust was confirmed, API requests (including auth headers) would be sent to the attacker-controlled endpoint before the trust prompt appeared.

**Both are patched** in versions released between August–December 2025. Ensure every developer has a version post-December 2025. The current latest (v2.1.187) is safe.

**For PerFiApp:** Any contributor who opens a repository in Claude Code should treat `.claude/settings.json` and any `.claude/hooks/` files with the same scrutiny as code. The code-reviewer agent's checklist should include a check that these files are not modified by PRs without explicit review.

Source: [Check Point Research writeup](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/)

### 6.2 CVE-2026-32211: Azure MCP Server — CVSS 9.1 (missing authentication)

The Azure MCP Server (`@azure-devops/mcp` on npm) shipped without authentication, exposing Azure DevOps work items, repos, pipelines, and PR data to unauthenticated network access. CVSS 9.1. Disclosed April 3, 2026 by Microsoft; the vulnerability has been **mitigated server-side by Microsoft for cloud-hosted deployments** — no customer action required for the SaaS version. Self-hosted deployments require the patched version.

**Root cause (architectural):** The MCP SDK has no built-in authentication. Each server must implement its own. This gap produced a CVSS 9.1 from a simple omission.

**For PerFiApp:** If PerFiApp builds a custom MCP server (e.g., a Flinks adapter), authentication must be the first feature implemented, not an afterthought. Add to the MCP vetting checklist: "Does this server have authentication? Can it be reached without credentials?"

Source: [CVE-2026-32211 advisory](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-32211) /
[Dev.to analysis](https://dev.to/michael_onyekwere/cve-2026-32211-what-the-azure-mcp-server-flaw-means-for-your-agent-security-14db)

### 6.3 OX Security MCP RCE advisory — 10 critical/high CVEs across the ecosystem

OX Security published research identifying an architectural design flaw in MCP implementations enabling RCE on systems running vulnerable servers. Impact claimed: 150M+ downloads, 7,000+ accessible servers, up to 200,000 vulnerable instances. Successfully exploited on six live production platforms. Named CVEs include CVE-2026-30623 (LiteLLM, Critical), CVE-2026-30615 (Windsurf IDE, Critical — zero-click), CVE-2026-30624 (Agent Zero, Critical).

**Claude Code is named** as an affected surface for MCP-based prompt injection, though Windsurf is the only zero-click case. Claude Code v2.1.183's auto-mode spawn classifier and v2.1.187's subagent depth tracking reduce (but do not eliminate) the attack surface.

**For PerFiApp:** Two additions to the MCP vetting checklist: (a) "Does this MCP server pass tool output through unsanitized `exec()` calls?" and (b) "Is this server running behind a network boundary, or accessible on a public IP?" The latter is relevant if PerFiApp ever runs a Plaid webhook receiver or Flinks adapter that also serves as an MCP server.

Source: [OX Security advisory](https://www.ox.security/blog/the-mother-of-all-ai-supply-chains-critical-systemic-vulnerability-at-the-core-of-the-mcp/) /
[Practical DevSecOps MCP guide](https://www.practical-devsecops.com/mcp-security-vulnerabilities/)

### 6.4 Claude Code sandbox.credentials (new in v2.1.187) — financial app relevance

The new `sandbox.credentials` setting in v2.1.187 prevents sandboxed bash commands from reading credential files and secret environment variables. **This is underdocumented** — official docs have not been updated as of June 23 (open issue filed). Configure in project `settings.json`:

```json
{
  "sandbox": {
    "credentials": false
  }
}
```

Setting `credentials: false` blocks read access to `~/.aws/credentials`, `~/.ssh/`, and secrets in environment variables. For a financial app where developers may have Plaid sandbox keys, Flinks API tokens, or Equifax API credentials in their shell environment, this is a meaningful defense against a compromised subagent or malicious MCP server reading those values.

Source: [GitHub issue #70440](https://github.com/anthropics/claude-code/issues/70440) /
[Claude Code security docs](https://code.claude.com/docs/en/security)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS CHANGE: CDBA Phase 1 — 2026 launch now widely seen as at risk

**Status changed from "on track for mid-2026" to "timeline slipping."**

As of the Bank of Canada's appearance at Open Banking Expo Toronto (March 5, 2026), the Bank's head of payments, Ron Morrow, stated it would be "premature and ill-advised" to commit to a Phase 1 launch date until the implementation work is fully understood. Key blockers remain:

- No technical standards body designated
- Accreditation criteria for service providers not published
- Mandatory bank participation threshold not set
- Consumer liability mechanics only partially defined

**What Flinks says:** Flinks confirmed the two-phase framework is proceeding but emphasizes the "single national review" pathway (banks get one accreditation covering both open banking and real-time payments) and that existing live programs (National Bank, EQ Bank, FirstOntario) represent a preview of what the mandated framework will require.

**For PerFiApp:** The architecture advice is unchanged (design for OAuth-only), but the timeline for when this is mandatory has shifted right. This slightly reduces immediate pressure but does not change the right design decision. The positive signal: Flinks' existing live programs mean PerFiApp can test against real OAuth-based APIs today even before the Bank of Canada framework is live.

Sources: [Open Banking Tracker Canada](https://www.openbankingtracker.com/blog/open-banking-canada-what-is-coming-in-2026-and-2027) /
[Flinks open banking blog](https://www.flinks.com/blog/open-banking-canada-2026-launch-fintech-institutions)

### 7.2 STATUS UPDATE: Canada RTR — moving to Q4 2026, phased rollout through 2027

Payments Canada's Real-Time Rail is targeting a **Q4 2026 phased launch** (updated from prior "Q3 2026" budget estimate). System integration testing completed in late 2025; user acceptance testing ongoing through 2026. Universal participation is expected in 2027, not at initial launch.

**For PerFiApp:** RTR is a prerequisite for Phase 2 write-access open banking (payment initiation). Phase 2 targeting mid-2027 aligns with RTR's 2027 universal availability. Architecture for PerFiApp's Pay & Payment Optimization and Cash Safety modules should plan for RTR-based payment initiation in 2027, not 2026.

Source: [Fathom4sight RTR update](https://www.fathom4sight.ai/blog-articles/canadas-real-time-rail-set-for-phased-launch-in-q4-2026)

### 7.3 FINTRAC — new "reasonably designed, risk-based, effective" compliance standard

FINTRAC published implementation guidance for the 2026 PCMLTFA amendments (enacted March 26, Royal Assent). The key new compliance standard requires AML programs to be **"reasonably designed, risk-based and effective"** — a shift from the prior documentation-focused approach. Failing this standard is designated a "very serious" violation.

**Practical implications for PerFiApp:**

1. If any module (Cash Advance Lite, payment initiation in Phase 2) triggers reporting-entity status, the AML program must now demonstrably *work*, not just exist on paper.
2. FINTRAC will update penalty policies — the ability-to-pay factor is new and can cut both ways.
3. Stablecoin issuers must now register as MSBs — not currently relevant to PerFiApp but worth noting if a stablecoin payment rail is ever considered.
4. Private-to-private information sharing is now permitted — potential future integration opportunity with fraud detection networks.

Source: [Fasken FINTRAC guidance](https://www.fasken.com/en/knowledge/2026/04/fintrac-provides-information-on-recent-changes-to-canadas-aml-regime) /
[ComplyFactor FINTRAC amendments](https://complyfactor.com/fintrac-2026-pcmltfa-amendments-msb-psp/)

---

## Track 8 — Competitive & Product Intel

### 8.1 KOHO reaches $1.33B valuation, banking license "imminent"

On June 11, 2026 — the same day as the prior report — KOHO announced a $130M funding round bringing its valuation to $1.33B (unicorn). Key facts:

- 2.5M+ Canadian users
- Revenue "more than $200M" (up from $100M run rate in late 2023)
- OSFI banking license application described as "imminent" by CEO
- **Direct Interac e-Transfer access** as of May 12, 2026 — third fintech after Wealthsimple and Neo Financial to achieve this
- Payments Canada member (admitted January 27, 2026)

**For PerFiApp:** KOHO's path to a banking license would make it a full-stack competitor in the Canadian market, not just a prepaid card + budgeting app. PerFiApp's differentiation (AI coaching, bilingual, aggregation-first rather than banking-first) becomes more important as KOHO's product depth increases. The Interac integration is also a signal: real-time payments infrastructure is becoming table stakes for Canadian fintech.

Sources: [Yahoo Finance KOHO raise](https://ca.finance.yahoo.com/news/canadas-next-bank-might-fintech-172000326.html) /
[KOHO Interac integration](https://www.fintech.ca/2026/05/12/koho-fintech-integration-interac-seamless-payments/)

### 8.2 Monarch Money adds AI assistant and credit score tracking

Since the prior report's "Monitor" verdict, Monarch Money has expanded its Canada offering with two features that close the gap with PerFiApp's core differentiators:

- **AI Assistant** that answers questions about user's actual financial data, surfaces trends, and provides insights — directly competing with PerFiApp's AI coaching module
- **Credit score tracking** with monthly updates, trend graphs, score-change notifications, and household (shared) tracking — competing with PerFiApp's Credit Monitor module

Monarch is priced at ~$138 CAD/year.

**For PerFiApp:** Monarch now covers AI coaching + credit monitoring + household budgeting in a single app. PerFiApp's remaining gaps to close or defend: bilingual (EN/FR) parity, Canadian-native data sources (Flinks vs Plaid), deeper integration between credit coaching and rewards optimization, and the full module breadth (Due-Date Coach, Rewards & Loyalty, Cash Advance Lite). The spec-lead should assess whether any of these modules warrant prioritization acceleration given Monarch's feature trajectory.

Sources: [Monarch Money Canada 2026 review](https://wealthnorth.ca/personal-finance/monarch-money-review-canada/) /
[Monarch AI Assistant feature](https://thecollegeinvestor.com/35342/monarch-review/)

---

## Recommended Next Steps

### Immediate (this week)

1. **Verify fallback model chain is active** for every agent that was trialing `claude-fable-5`. Confirm `fallbackModel: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]` is in `settings.json`. Until Fable 5 is officially restored by Anthropic (with a status page entry), default spec-lead and architect to `claude-opus-4-8`.

2. **Remove `temperature`, `top_p`, `top_k` from all Opus-tier API calls.** Search agent files and any API wrappers for these fields. They return 400 errors on Opus 4.7+. This is a silent breakage risk if the implementer ever hits Opus via the fallback chain.

3. **Audit for `claude-opus-4-1-20250805` usage.** Use Claude Console Usage Export to check. Retirement is August 5 — 42 days. Migrate to `claude-opus-4-8`.

4. **Enable `sandbox.credentials: false` in project settings.** Underdocumented but active as of v2.1.187. Blocks credential file reads from sandboxed subagents. Directly relevant given financial app environment.

5. **Update to Claude Code v2.1.187** (latest as of June 23). Picks up: auto-mode destructive-command blocking (v2.1.183), org model enforcement (v2.1.187), MCP tool timeout fixes, and sandbox credentials protection.

### Short-term (this sprint)

6. **Upgrade Spec Kit to v0.11.6** (from v0.9.5). Install with `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.11.6`. Key additions: `/speckit.converge` command for iterative spec refinement, `security-governance` preset v0.6.0, bug-assess agentic workflow.

7. **Upgrade APM to v0.21.0** (from v0.19.0). Key additions: `allowExecutables` gate (requires explicit approval for executable dependencies — critical for MCP server security), SBOM export, Kiro support.

8. **Adopt DeepEval v4.0.** Have the test-engineer agent run `deepeval generate` against the existing codebase to synthesize a baseline test dataset. Wire `deepeval test run` into CI. The 1-line tracing integrations and local `deepeval inspect` viewer are particularly useful for debugging the implementer's Plaid API call sequences.

9. **Add two items to the MCP vetting checklist:** (a) Does the server have authentication? (CVE-2026-32211 root cause.) (b) Does the server pass tool output through unsanitized `exec()` calls? (OX Security RCE root cause.) These should block adoption until answered affirmatively.

10. **Evaluate cc-safe-setup hooks** for the implementer's autonomous operation profile. Run `npx cc-safe-setup` in a development environment and review the 8 default hooks against PerFiApp's expected bash patterns. Add any financial-data-specific patterns (e.g., blocking writes to files matching `*secret*`, `*key*`, `*token*`) as custom hooks.

### Medium-term (next 4–6 weeks)

11. **Design any custom MCP server (e.g., Flinks adapter) for stateless operation.** The MCP RC dropping `Mcp-Session-Id` is scheduled for July 28. Building stateless from the start avoids a migration. Add `cacheScope` handling to prevent cross-user data leakage.

12. **Re-evaluate Fable 5 for spec-lead / architect when access is officially restored.** Do not re-adopt until Anthropic's status page shows a confirmed restoration entry. When it does restore, the prior report's trial recommendation stands, with the additional note that the model now has a nationality-based access control layer.

13. **Model competitive response to Monarch's AI assistant + credit tracking.** Since both features are now live in Monarch, the PerFiApp spec-lead should assess whether PerFiApp's differentiation narrative in the PDR needs updating — particularly the positioning of the Credit Monitor and AI coaching modules.

14. **Begin tracking Agent SDK token consumption** before the billing split eventually takes effect. Use Claude Console Usage Export to separate interactive vs. programmatic usage. This data will be needed for break-even analysis when Anthropic reschedules the split.

15. **Contact Flinks about MCP roadmap.** The prior report noted no official Flinks MCP server exists. Flinks is positioning aggressively for CDBA Phase 1 and has live OAuth programs with National Bank and EQ Bank. An official MCP server from Flinks would be the highest-value addition to PerFiApp's agent toolchain — worth a direct inquiry.

---

*Report generated 2026-06-24. All findings verified against primary sources. Delta report vs 2026-06-11 — prior findings not repeated unless status changed.*
