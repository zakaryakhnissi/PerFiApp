# PerFiApp Agent Research — 2026-10-19

**Third run. Delta report vs 2026-06-24.** Rotation emphasis: Fable 5 export-control resolution, `claude-opus-4-1` retirement confirmation, MCP stateless spec landing, CDBA update, Claude Code post-v2.1.187 changelog, and the entire new Claude 5.5 model family.

---

## Executive Summary

Five findings are most time-sensitive:

1. **The entire active model generation is now the Claude 5.5 family.** Since June 24, Anthropic shipped Claude Sonnet 5 (June 30), Claude Opus 5 (July 24), Claude Opus 5.5 (Sept 22), Claude Sonnet 5.5 (Sept 28), and Claude Haiku 5.5 (Oct 7). The current official lineup is `claude-fable-5-1`, `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`. Every agent file referencing models from the 4.x series or the first-generation 5.x names should be evaluated for upgrade. **Sonnet 5.5 introduces a breaking change: forced tool use now returns a 400 error** — any agent using `tool_choice: { type: "tool" }` must be updated.

2. **Claude Fable 5 export-control suspension was lifted July 1, 2026 (RESOLVED).** Fable 5 returned with additional cybersecurity guardrails. The fallback chain mandated by the last report can be relaxed. The current flagship is `claude-fable-5-1` (a point release), not `claude-fable-5`. Trial for spec-lead and architect is now unblocked.

3. **`claude-opus-4-1-20250805` confirmed retired August 5, 2026.** Any remaining references return API errors. This is no longer a warning — it is a live breakage.

4. **MCP 2026-07-28 stateless specification shipped and is now the default in Claude Code.** As of v2.1.299 (Oct 14), cloud sessions and remote control default to MCP protocol version `2026-07-28`. Any custom MCP server (e.g., a Flinks adapter) must be designed for stateless operation, with no `Mcp-Session-Id` dependency.

5. **Canada RTR by-law is in force (Aug 24) and Q4 2026 launch of first Direct-to-Exchange participants is imminent.** Industry solution assurance testing completed in Q3. The RTR is closer to live than any prior report indicated. Phase 2 write-access architecture planning now has a firmer horizon.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| Claude 5.5 family live — Opus 5.5, Sonnet 5.5, Haiku 5.5 | Model | All agents | **Act — audit and migrate agent model IDs** |
| Claude Fable 5.1 restored, export controls lifted | Model | spec-lead, architect | **Act — trial now unblocked** |
| `claude-opus-4-1` confirmed retired | Model | Any config referencing this ID | **Act — live breakage, fix immediately** |
| Sonnet 5.5 breaking change: forced tool use returns 400 | Model | implementer, any agent using tool_choice | **Act — audit all agents for tool_choice: tool** |
| Sonnet 5.5 thinking cannot be disabled (400 on type: "disabled") | Model | implementer, code-reviewer | **Act — remove thinking.type: "disabled" for 5.5 models** |
| Sonnet 5.5 cache-read price dropped to $0.10/MTok in v2.1.296 | Cost | All agents | **Adopt — free 50% savings on cache hits** |
| `promptCacheTtl` / `subagentPromptCacheTtl` configurable (v2.1.243) | Cost | All agents | **Adopt — tune to workload profile** |
| Idle compaction: 200K+ token sessions auto-compact after 54 min idle (v2.1.299) | Cost | Long-running implementer sessions | **Adopt — default-on, review threshold** |
| `modelPicker` setting for per-org model list (v2.1.243) | Tooling | All agents, CI governance | **Adopt — lock agents to approved models** |
| Fork subagents on by default in `-p` and Agent SDK (v2.1.302) | Tooling | implementer, CI | **Monitor — behavior change, test workflows** |
| MCP 2026-07-28 spec finalized and active in Claude Code (v2.1.299) | Tooling | architect, any MCP server build | **Act — design any custom MCP server stateless** |
| DeepEval v4.2.0 breaking: scoring-direction flip on Bias/Hallucination/Misuse/Toxicity | Agent quality | test-engineer | **Act — update thresholds if DeepEval adopted** |
| DeepEval v4.1.8: official MCP server support | Agent quality | test-engineer | **Adopt — enables eval of MCP tool calls** |
| DeepEval v4.0.8: deterministic AgentLoopDetectionMetric, ToolPermissionMetric | Agent quality | test-engineer | **Adopt — no LLM needed; zero API cost** |
| APM v0.34.0 (Oct 19) — corporate CA bundle, path-traversal rejection, CodeQL hardening | Security | All developers | **Adopt — 8 major security releases since v0.21.0** |
| CVE-2026-24887 (CVSS 8.8) — Claude Code `find` command injection, patched v2.0.72 | Security | All developers | **Act — verify installed version is post-2.0.72** |
| v2.1.294: hooks `onFailure: "block"` (failure-open hook fix) | Security | implementer, hook authors | **Adopt — closes hooks-allow-by-default gap** |
| Expo SDK 55 (Feb 2026) — New Architecture mandatory, Expo MCP, AES-GCM | Toolchain | implementer, architect | **Act — plan migration; legacy arch support dropped** |
| Spec Kit v0.12.15 — HTTPS-only catalog URL validation | Toolchain | spec-lead | **Adopt — upgrade from v0.11.6** |
| RTR by-law in force (Aug 24), Q4 2026 Direct-to-Exchange launch | Compliance | architect, spec-lead | **Act — firm up Phase 2 write-access architecture** |
| CDBA legislative framework complete (Bill C-15 Royal Assent March 26) | Compliance | architect, spec-lead | **Monitor — statute complete; implementation still TBD** |
| Quebec Law 25 AI automated-decision disclosure obligations | Compliance | architect, security-reviewer | **Act — any automated-decision feature needs disclosure mechanism** |
| KOHO in phase 2 of banking license, Schedule 1 approval still pending | Competitive | spec-lead | **Monitor — imminent license would reshape neobank landscape** |
| Flinks: no MCP server found; open banking environment live with National Bank, Central 1 | Tooling / Compliance | architect | **Watch — direct inquiry to Flinks recommended** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGE: Fable 5 export-control suspension — RESOLVED July 1, 2026

**Prior status: Suspended (export control). New status: Restored with guardrails.**

The US Commerce Department lifted the export-control directive on June 30, 2026. Anthropic confirmed the same day. Fable 5 returned globally on July 1 with added cybersecurity guardrails: some security-related queries are blocked at the model layer and routed to Claude Opus 4.8 instead. Anthropic added these guardrails as part of its agreement with the US government.

The trigger for the original suspension was a jailbreak reportedly surfaced by Amazon researchers that could produce exploit code. Anthropic disputed the severity assessment. Partial US-organization access to Mythos 5 resumed June 26; full Fable 5 access resumed July 1. Mythos 5 access remains restricted to organizations in Anthropic's Glasswing program.

Important: The current production flagship is `claude-fable-5-1` (a point release with the cybersecurity guardrails baked in), not `claude-fable-5`. Use `claude-fable-5-1` if trialing the Fable tier. Pricing: $10/input MTok, $50/output MTok. Cache reads at 2.5% of input price.

**For PerFiApp:** Trial for spec-lead and architect is now unblocked. Given the cybersecurity query blocking, verify that the security-reviewer agent's analysis queries are not silently degraded to Opus 4.8. Test security-review prompts against both models before committing.

Sources: [Shacknews restoration report](https://www.shacknews.com/article/149860/anthropic-restore-access-fable-5-mythos-5) / [The Next Web](https://thenextweb.com/news/anthropic-fable-5-export-controls-lifted) / [Anthropic model overview](https://platform.claude.com/docs/en/about-claude/models/overview)

### 1.2 STATUS CHANGE: claude-opus-4-1 — CONFIRMED RETIRED August 5, 2026

**Prior status: Deprecated, retirement August 5. New status: Retired.**

The retirement date passed. API calls to `claude-opus-4-1-20250805` or `claude-opus-4-1` now return errors. This is no longer a warning — it is a live breakage. Run a search across all agent files, CI scripts, `.claude/agents/*.md` frontmatter, and any API wrappers for these strings. Migrate to `claude-opus-5-5` (or `claude-sonnet-5-5` for cost-sensitive roles).

Sources: [Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations) / [endoflife.ai](https://endoflife.ai/article-claude-model-retirements-2026)

### 1.3 NEW: Claude 5.5 model family — complete lineup now live

**This is the most significant model development since the last report.**

Anthropic has shipped a full 5.5 family. The current official model lineup from the Anthropic API (verified against [platform.claude.com](https://platform.claude.com/docs/en/about-claude/models/overview)):

| Model | API ID | Released | Input $/MTok | Output $/MTok | Cache Read | Context | Retire no sooner than |
|---|---|---|---|---|---|---|---|
| Claude Fable 5.1 | `claude-fable-5-1` | ~Sep 2026 | $10 | $50 | 2.5% of input | 1M | Sep 1, 2027 |
| Claude Opus 5.5 | `claude-opus-5-5` | Sep 22, 2026 | $4 | $20 | 5% of input | 1M | Sep 22, 2027 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Sep 28, 2026 | $2 | $10 | 5% of input | 1M | Sep 28, 2027 |
| Claude Haiku 5.5 | `claude-haiku-5-5` | Oct 7, 2026 | $0.10 | $0.50 | — | 1M | Oct 7, 2027 |

Legacy available (still on API): `claude-fable-5`, `claude-opus-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-5`, `claude-sonnet-4-6`, `claude-haiku-4-5`.

**Key behavior changes in the 5.5 generation:**

- **Thinking is always on** for Opus 5.5 and Fable 5.1 (adaptive, always enabled). `thinking.type: "disabled"` returns a 400 error. Sonnet 5.5 supports adaptive thinking with `effort` parameter control.
- **Forced tool use returns 400 on Sonnet 5.5.** Any agent using `tool_choice: { type: "tool" }` will break on Sonnet 5.5. This is a new breaking change not present in prior Sonnet generations. Migrate to `tool_choice: { type: "auto" }` with strong system-prompt guidance.
- **Extended thinking is deprecated** on Opus 4.6 and Sonnet 4.6 and not accepted on later models. Use the `effort` parameter instead.
- Haiku 5.5 is the first Haiku with adjustable effort levels (Low/Medium/High/Xhigh/Max).

**Agent tiering recommendation for PerFiApp:**

| Agent | Current model | Recommended upgrade | Rationale |
|---|---|---|---|
| spec-lead | `claude-opus-4-8` | `claude-fable-5-1` (trial) | Restored access; best reasoning for spec work |
| architect | `claude-opus-4-8` | `claude-opus-5-5` | Strong coding+reasoning, 40% cheaper than Opus 5 |
| implementer | `claude-sonnet-4-6` | `claude-sonnet-5-5` | Speed + cost, but audit for forced tool use usage |
| test-engineer | `claude-sonnet-4-6` | `claude-sonnet-5-5` | Same |
| code-reviewer | `claude-opus-4-8` | `claude-opus-5-5` | Deep analysis needed |
| security-reviewer | `claude-opus-4-8` | `claude-opus-5-5` | Verify cybersecurity queries not routed to Opus 4.8 by Fable guardrails |
| debugger | `claude-sonnet-4-6` | `claude-sonnet-5-5` | Cost-sensitive, agentic debugger work |
| researcher (this agent) | `claude-sonnet-4-6` | `claude-sonnet-5-5` | Research quality at cost |

Sources: [Anthropic model overview (primary source)](https://platform.claude.com/docs/en/about-claude/models/overview) / [Sonnet 5 launch](https://pulse2.com/anthropic-launches-claude-sonnet-5) / [Opus 5.5 release](https://technews.tw/2026/09/23/anthropic-upgrades-claude-with-new-opus-5-5-model/) / [Haiku 5.5 release](https://docs.apiyi.com/en/live/2026-10/claude-haiku-5-5) / [Claude 5.5 family overview](https://blog.memoryplugin.com/claude-new-features-october-2026/)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 NEW: Sonnet 5.5 cache-read pricing cut in half — Claude Code v2.1.296

As of v2.1.296 (Oct 9, 2026), Sonnet 5.5 cache-read pricing is **$0.10 per million tokens** (was $0.20 at launch on Sept 28). This is confirmed in the official Claude Code changelog. Combined with the 5% cache-read rate in the general pricing table, this means a cached system prompt for Sonnet 5.5 costs $0.10/MTok rather than $2/MTok for uncached input — a 95% reduction on tokens that stay in cache.

**For PerFiApp:** The implementer and researcher agents, which have long system prompts and run multiple-turn sessions, benefit most. Ensure system prompts are structured to maximize cache hits (static prefix, dynamic suffix).

Source: [Claude Code changelog v2.1.296](https://code.claude.com/docs/en/changelog)

### 2.2 NEW: `promptCacheTtl` and `subagentPromptCacheTtl` configurable — v2.1.243

A new `promptCacheTtl` setting in `settings.json` controls prompt cache duration. `subagentPromptCacheTtl` lets subagents use a shorter cache (e.g., 5 minutes for ephemeral tool-call subagents vs. 1 hour for main sessions). This was previously fixed at 5 minutes; API and cloud provider users can now set up to 1 hour.

**For PerFiApp:** Set `promptCacheTtl: "1h"` for long-running interactive sessions (spec-lead, architect) and `subagentPromptCacheTtl: "5m"` for short implementer subagents to balance cost and freshness.

Source: [Claude Code changelog v2.1.243 via dev.classmethod.jp](https://dev.classmethod.jp/en/articles/20260825-cc-updates-v2-1-245/)

### 2.3 NEW: Idle compaction — 200K+ tokens auto-compact before cache expiry — v2.1.299

As of v2.1.299 (Oct 14, 2026), any session with 200K+ tokens left idle for ~54 minutes is automatically compacted before the 1-hour prompt cache expires. This prevents the common pattern of paying full (uncached) token prices after a lunch break or overnight session. The threshold is configurable via `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`; disable with `"idleCompaction": false` in `settings.json`.

**For PerFiApp:** This is on by default. For the implementer agent running long spec-implementation sessions, this is a meaningful passive cost saver. Test the compaction output for context loss before relying on it for financially-critical code generation sessions.

Source: [Claude Code changelog v2.1.299 via dev.classmethod.jp](https://dev.classmethod.jp/en/articles/20261014-cc-updates-v2-1-299/)

### 2.4 Agent SDK billing split — still paused (no change)

No update since the June 24 report. The paused billing split has not been rescheduled. Agent SDK usage still draws from subscription quota.

---

## Track 3 — Agent Tooling

### 3.1 STATUS CHANGE: MCP 2026-07-28 specification — FINALIZED and ACTIVE IN CLAUDE CODE

**Prior status: Scheduled for July 28. New status: Shipped July 28, now default in Claude Code v2.1.299.**

The 2026-07-28 MCP specification finalized on schedule. The changes confirmed:

- **Protocol sessions removed.** The initialize/initialized handshake is gone. `Mcp-Session-Id` header removed. Each request carries protocol metadata in `_meta`. Load balancers no longer need sticky routing.
- **Authorization aligned with OAuth/OpenID Connect.** This is the most security-relevant change for PerFiApp.
- **`@modelcontextprotocol/server` v2 SDK** ships alongside the v1 line. Existing servers can continue on v1; new servers should target v2.
- **Deprecations** (12-month removal window per secondary sources, unverified against official spec): Roots, Sampling, Logging.

Claude Code v2.1.299 (Oct 14) made `2026-07-28` the **default MCP protocol version** for cloud sessions and remote control. Set `MCP_PROTOCOL_NEGOTIATION=legacy` to opt out.

**For PerFiApp:** Any Flinks MCP adapter or custom financial data MCP server must be designed stateless from the start — no session ID, no sticky routing. The OAuth alignment in the spec is directly relevant to open banking: MCP auth should reuse the same OAuth flow as the CDBA consumer-consent flow rather than implementing a parallel auth system.

Sources: [MCP 2026-07-28 RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [Blog mcpservers.org spec analysis](https://blog.mcpservers.org/posts/mcp-spec-2026-07-28) / [Claude Code changelog v2.1.299](https://code.claude.com/docs/en/changelog)

### 3.2 NEW: Claude Code v2.1.188 through v2.1.303 — key additions after June 23

Approximately 116 versions shipped between June 23 and October 18, 2026. The most impactful for PerFiApp:

**v2.1.198 (early July) — Sonnet 5 default, background agents auto-PR**
Claude Sonnet 5 became the default model (1M context). Background agents now automatically commit, push, and open a draft PR after finishing work in a worktree. This is directly relevant to the implementer agent: auto-PR means completed feature branches can surface without human coordination.

**v2.1.221 (Aug 3) — Permission check bypass fixes (security)**
Two security fixes related to permission checks — no further detail in available sources. Combined with prior findings, developers should stay current.

**v2.1.240–245 (Aug 22–25) — `modelPicker`, `promptCacheTtl`, keyless sign-in**
See Tracks 2.2 and 1.3. `modelPicker` is particularly useful for locking the PerFiApp agent team to the approved model allowlist.

**v2.1.293 (Oct 7) — Haiku 5.5 default**
`claude-haiku-5-5` is now the default Haiku model (1M context, $0.10/$0.50 per MTok).

**v2.1.294 (Oct 8) — Hooks failure-open fix (security)**
Hooks that were written as instructions (rather than as blocking rules) could allow actions they should block. Fixed. `prompt` and `agent` hook inputs are now validated. Stop and SubagentStop hooks are judged more accurately.

**v2.1.295 (Oct 8) — `onFailure: "block"` for hooks**
Hooks now accept `onFailure: "block"`: a command or HTTP hook that fails, times out, or exits unexpectedly **blocks** the action instead of letting it through (prior behavior: fail-open). This is a critical financial-app safety improvement — a failing secret-leak hook previously let the action proceed.

**v2.1.296 (Oct 9) — Sonnet 5.5 cache pricing, `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`**
New `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` environment variable routes all workflow agents to one model. Useful for CI: set all researcher workflow agents to `claude-sonnet-5-5` without editing each agent file.

**v2.1.299 (Oct 14) — Idle compaction, MCP 2026-07-28 default, MCP allow-rule fix**
See Tracks 2.3 and 3.1. Also: **MCP allow rules tightened** — `mcp__a` no longer matches servers named `a__b` or `a_`. If PerFiApp uses MCP allow rules in `settings.json`, audit them against the new matching semantics.

**v2.1.300 (Oct 14) — `/advisor` on Claude Platform on AWS, OpenTelemetry GenAI attributes**
OpenTelemetry trace spans now include GenAI semantic-convention attributes. Useful for cost and latency observability across the agent team.

**v2.1.302 (Oct 16) — Fork subagents on by default in `-p` / Agent SDK**
Fork subagents are now on by default in `claude -p`, Agent SDK, desktop app, and VS Code. Set `CLAUDE_CODE_FORK_SUBAGENT=0` to disable. This changes the execution model for CI automation (the research workflow and PR review workflow) — test before upgrading CI runners.

Sources: [Official Claude Code changelog](https://code.claude.com/docs/en/changelog) / [dev.classmethod.jp v2.1.299](https://dev.classmethod.jp/en/articles/20261014-cc-updates-v2-1-299/) / [dev.classmethod.jp v2.1.245](https://dev.classmethod.jp/en/articles/20260825-cc-updates-v2-1-245/)

### 3.3 NEW: Expo SDK 55 — Expo MCP can query EAS builds

Expo SDK 55 (released February 25, 2026) added `expo-crypto` AES-GCM encryption, Hermes v1 opt-in (faster JS, 75% smaller EAS Update downloads), and — most relevant for the agent team — **Expo MCP can now query EAS builds and TestFlight crashes and feedback**. This means the test-engineer and debugger agents can use an Expo MCP server to fetch build logs, crash reports, and TestFlight feedback directly without leaving Claude Code.

Also significant: SDK 55 drops Legacy Architecture support entirely. If PerFiApp starts mobile app development on SDK 55 or later, `newArchEnabled` is removed and the New Architecture is mandatory.

Source: [Expo SDK 55 changelog](https://expo.dev/changelog/sdk-55)

### 3.4 Flinks MCP server — still not confirmed

A search found no official Flinks MCP server as of this report. Flinks' open banking environment is live with National Bank, EQ Bank, and Central 1 (credit unions). The prior report's recommendation stands: contact Flinks directly about their MCP roadmap. If no server materializes by the time PerFiApp begins Phase 1 integration, a custom stateless MCP adapter built on Flinks' OAuth API is the path forward.

---

## Track 4 — Agent Quality & Evaluation

### 4.1 STATUS CHANGE: DeepEval v4.2.0 — BREAKING scoring-direction change

**Prior status: Adopt v4.0. New status: Adopt v4.2.0, but update thresholds first.**

DeepEval released v4.2.0 in August 2026 with a breaking change: **Bias, Hallucination, Misuse, and Toxicity metrics now score so that higher is better (0–1 scale, 1 = best).** Previously they scored so that lower was better. Any threshold comparison code or CI gate using these metrics in the old direction will now produce the opposite result — a previously "failing" test may now pass, and vice versa.

Before upgrading from v4.0.x to v4.2.0, audit all threshold values for these four metrics and invert them.

Other high-value additions since v4.0 (June 24 report):

- **v4.0.7 (June): TypeScript support** for multi-turn, arena, and multimodal metrics. PerFiApp's TypeScript monorepo can now use DeepEval natively from the same codebase.
- **v4.0.8 (July): Deterministic `AgentLoopDetectionMetric` and `ToolPermissionMetric`** — no LLM call required, zero API cost. `AgentLoopDetectionMetric` catches infinite tool-call loops in the implementer. `ToolPermissionMetric` verifies that an agent only uses tools it was permitted to use — directly relevant to verifying the security-reviewer agent's read-only behavior.
- **v4.1.8 (August): Official MCP server support** — DeepEval can now evaluate MCP tool calls. This enables evals on the Flinks MCP adapter before it is deployed.

Sources: [DeepEval 2026 changelog](https://deepeval.com/changelog/changelog-2026) / [DeepEval v4.0 announcement](https://deepeval.com/blog/introducing-deepeval-4)

---

## Track 5 — Toolchain Releases

### 5.1 STATUS CHANGE: Spec Kit — upgraded to v0.12.15 (from v0.11.6)

**Prior status: v0.11.6. New status: v0.12.15 as of July 15, 2026 (per AUR package).**

Key v0.12.x changes:

- **v0.12.0: Removed agent-context auto-update compatibility fallback.** From this version on, `agent-context` auto-updates require explicit enable and configuration. Projects that relied on the fallback (which v0.9.5 warned about) will silently stop updating CLAUDE.md context sections. PerFiApp uses the agent-context extension for the "Spec Kit managed context" section in CLAUDE.md — verify this still works after upgrading.
- **v0.12.6: HTTPS-only catalog URL validation.** The `catalog add` command now enforces HTTPS and requires a hostname. This prevents accidentally registering an HTTP endpoint (which would expose agent skill installations to MITM attacks).
- **v0.12.6: Charter extension added** to the community catalog. Potentially useful for governance documentation.
- **v0.12.6: Python prerequisites check PoC** — signals Python-based extension support is expanding.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.12.15`

Sources: [newreleases.io Spec Kit v0.12.6](https://newreleases.io/project/github/github/spec-kit/release/v0.12.6) / [Spec Kit AUR package](https://aur.archlinux.org/packages/specify-cli-bin)

### 5.2 STATUS CHANGE: APM — v0.34.0 (Oct 19, 2026), major security hardening since v0.21.0

**Prior status: v0.21.0. New status: v0.34.0 (released today, Oct 19).**

Eight significant releases since the last report. Security-relevant highlights:

- **v0.26.0 (Jul 18): TLS OS trust store by default.** MCP server HTTPS connections now validate against the system trust store rather than a bundled CA. This closes a gap where a malicious CA in a custom APM pack could intercept financial API traffic.
- **v0.29.0 (Aug 30): `--trust-bin` consent for plugin `bin/` directories.** Plugins that ship executables require explicit `--trust-bin` consent before APM activates them. Complements the v0.21.0 `allowExecutables` gate with a finer-grained per-invocation consent.
- **v0.30.0 (Sep 7): Archive checksum verification before extraction.** Prevents a malicious APM pack from executing a planted script via archive extraction.
- **v0.31.0 (Sep 15): 11 CodeQL sensitive-data alerts remediated** in the APM codebase itself. `gh-aw` target handling hardened.
- **v0.32.0 (Sep 25): Rejects path-traversing dependency aliases.** An APM dependency whose alias includes `../` segments is now rejected. Closes a path-traversal attack on dependency resolution. Also bumped `setuptools` to 83.0.0 (Unicode MANIFEST exclusion bypass fix).
- **v0.33.0 (Oct 2): `apm auth` command.** Git host credentials can now be managed with `apm auth` — relevant for authenticated MCP server registries. Also: insecure transport policy documented explicitly.
- **v0.34.0 (Oct 19): Corporate CA bundle support.** Enterprises with internal CAs can now inject them into APM's HTTPS stack. `--frozen` installs no longer rewrite the lockfile. GitHub Copilot marketplace output added.

Upgrade with: `npm install -g @microsoft/apm@latest` (or equivalent per APM install method).

Source: [APM releases on GitHub](https://github.com/microsoft/apm/releases)

### 5.3 NestJS — still v11, no v12 release

NestJS 11 (January 2025) is the current major version. Active v11.x maintenance continues; no v12 announcement found. NestJS/swagger v11.4.6 released July 17, 2026. No action required.

### 5.4 Expo SDK 55 migration note — New Architecture mandatory

Covered in Track 3.3. Note for architect: when PerFiApp begins mobile development, SDK 55 (or later) should be the baseline, which means New Architecture support is mandatory from day one. Third-party libraries must be vetted for New Architecture compatibility before adoption.

---

## Track 6 — AI & Supply-Chain Security

### 6.1 NEW: CVE-2026-24887 (CVSS 8.8) — Claude Code `find` command injection

- **CVE:** CVE-2026-24887
- **CVSS:** 8.8 (High)
- **Disclosed:** February 3, 2026 (HackerOne researcher)
- **Patched in:** Claude Code v2.0.72
- **Current latest:** v2.1.303 (safe)

A parsing error in the `find` command allowed attackers to bypass Claude Code's confirmation prompt and run untrusted commands. Exploitation required getting malicious content into the context window — e.g., through a malicious repository, file, or MCP tool output. Since Claude Code auto-updates by default, most developers received the patch automatically. Manually-updated installs should verify they are on v2.0.72 or later.

**For PerFiApp:** Add to code-reviewer checklist: flag any PR that passes user-controlled strings directly into file-system tool calls without sanitization. The attack surface is expanded when the implementer processes third-party financial data (Flinks responses, Plaid webhooks) inside Claude Code sessions.

Sources: [Wiz CVE-2026-24887](https://www.wiz.io/vulnerability-database/cve/cve-2026-24887) / [GitLab advisory](https://advisories.gitlab.com/pkg/npm/@anthropic-ai/claude-code/CVE-2026-24887/) / [Endor Labs](https://www.endorlabs.com/vulnerability/cve-2026-24887)

### 6.2 NEW: Claude Code v2.1.294 — hooks failure-open bug fixed

Prior to v2.1.294 (Oct 8, 2026), `prompt` and `agent` hooks written as instruction blocks (rather than as blocking rules) could allow actions they were intended to block. This was a logic error in the hook evaluation path: if a hook failed, timed out, or had an unexpected exit code, the action proceeded. v2.1.295 added `onFailure: "block"` to close this gap explicitly.

**For PerFiApp:** Any custom hooks in `.claude/hooks/` (e.g., secret-leak hooks from the cc-safe-setup evaluation recommended in the prior report) should be audited:
1. Ensure they are on Claude Code v2.1.295+.
2. Add `onFailure: "block"` to any hook that should block on failure.

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 6.3 NEW: Claude Code v2.1.265 — plugin path containment bypass (macOS/Linux)

In v2.1.265 (Sept 6–8, 2026), backslashes in plugin paths could bypass symlink containment checks on macOS and Linux. Fixed in the same release. If PerFiApp loads externally sourced plugins (e.g., from APM), ensure the installed Claude Code version is v2.1.266 or later.

Source: [dev.classmethod.jp v2.1.263–266](https://dev.classmethod.jp/en/articles/20260909-cc-updates-v2-1-266/)

### 6.4 NEW: CVE-2026-35022/35021/35020 — Claude Code command injection (April 2026) [unverified]

Three command-injection CVEs attributed to Claude Code and the Agent SDK were published April 6, 2026, per a third-party aggregator. CVSS scores: CVE-2026-35022 (9.8, auth helper), CVE-2026-35021 (7.8, promptEditor.ts), CVE-2026-35020 (8.4, TERMINAL env var). These could not be verified against the NVD or Anthropic's GitHub Security Advisories at time of writing. Mark `[unverified]` until confirmed. If confirmed, they would represent a critical (9.8) RCE via the authentication helper — the same pattern as CVE-2026-32211 in the Azure MCP server.

Source: [cve.imfht.com Claude Code CVE list](https://cve.imfht.com/product/Claude%20Code) — treat as unverified

### 6.5 APM supply-chain hardening (summary)

APM v0.26.0–v0.34.0 collectively represent the most significant supply-chain hardening to the agent toolchain since the last report. The three highest-impact changes for a financial app:

1. **Archive checksum verification** (v0.30.0): Prevents extraction-time code execution from a tampered APM pack.
2. **Path-traversal dependency alias rejection** (v0.32.0): Blocks a class of dependency-confusion attacks.
3. **`--trust-bin` explicit consent** (v0.29.0): Ensures no MCP server executable runs without a human click.

Upgrade APM before installing any new MCP server or agent skill. With the prior `allowExecutables` gate and now `--trust-bin`, every MCP executable in the PerFiApp toolchain has two explicit human approval checkpoints.

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS CHANGE: CDBA — legislative framework complete; implementation still open

**Prior status: Timeline slipping, Bill C-15 before Parliament. New status: Bill C-15 received Royal Assent March 26, 2026. Legislative framework now complete.**

Bill C-15, the Budget Implementation Act 2025 No. 1, received Royal Assent March 26, 2026. This completes the consumer-driven banking legislative framework, including an express prohibition on screen scraping once the framework is "fully operational." The Bank of Canada replaces the FCAC as primary supervisory authority.

However, no implementation date has been announced. As of March 2026, Bank of Canada payments head Ron Morrow described setting a launch date as "premature and ill-advised." The statute is in place but the technical standards, accreditation criteria, and consumer liability mechanics remain unpublished.

**For PerFiApp:** The screen-scraping ban is now legally in force "once fully operational" — design architecture around OAuth-only from day one. The statute's completion means that CDBA compliance is now a matter of when, not if. Flinks' existing live OAuth programs (National Bank, EQ Bank, FirstOntario, Central 1) remain the practical path for early testing.

Sources: [Open Banking Tracker Canada](https://openbankingtracker.com/country/ca) / [McMondie Canada moves forward](https://webiis10.mondaq.com/canada/financial-services/1739572/canada-moves-forward-on-its-consumer-driven-banking-framework) / [Gowling 2026 preview](https://gowlingwlg.com/en/insights-resources/articles/2026/2026-will-be-make-or-break-for-financial-innovation-in-canada)

### 7.2 STATUS CHANGE: Canada RTR — by-law in force August 24, 2026; Q4 2026 phased launch imminent

**Prior status: Q4 2026 target. New status: By-law effective Aug 24; ISA testing completed Q3; first participants going live Q4 2026.**

Major milestones since June 24:

- **July 1, 2026:** Federal government published RTR By-law No. 10 in Canada Gazette Part II.
- **August 24, 2026:** RTR By-law and rules came into force.
- **Q3 2026:** Industry Solution Assurance (ISA) testing — first time participants connected to the live system with their own workflows and transactions. Mandatory Centralized Fraud Services tested in real time.
- **Q4 2026 (imminent):** First Direct-to-Exchange participants go live. Two subsequent migration phases will move existing Interac e-Transfer volumes onto RTR.

**For PerFiApp:** The RTR is no longer a planning horizon — it is arriving in weeks. The architect should finalize Phase 2 payment-initiation design (Pay & Payment Optimization module, Cash Safety module) now. The 24/7/365 settlement model changes cash-flow detection logic: same-day settlement assumptions must be replaced with sub-second settlement assumptions for RTR-eligible transactions.

Sources: [Payments Canada Q3 2026 RTR update](https://www.payments.ca/canadas-real-time-rail-quarterly-update-jude-pinto-2026-q3) / [McCarthy RTR by-law](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published)

### 7.3 Quebec Law 25 — AI automated-decision disclosure obligations

No new legislation since the last report. Federal Bill C-27 (the proposed AI Act + PIPEDA replacement) died when Parliament prorogued January 2025 and has not been reintroduced. PIPEDA remains federal law. Quebec Law 25 is the stricter regime, with penalties up to the greater of $25M CAD or 4% of global annual revenue.

**The AI-specific obligation most relevant to PerFiApp:** Law 25 requires that before collecting personal information by automated means (profiling) or using it to render decisions with no human oversight, a business must inform the individual. Any PerFiApp module that makes automated credit-risk assessments, spending predictions, or savings recommendations without a human review step triggers this disclosure obligation.

**For PerFiApp design:** Every module that produces automated financial recommendations (Credit Coaching, Cash Safety, Due-Date Coach) must include a disclosure mechanism explaining: what data was collected, that automated processing occurred, and what the basis for the recommendation was. This should be a first-class design requirement, not an afterthought.

Sources: [silaws.com Law 25 + PIPEDA guide](https://silaws.com/ai-privacy-data-compliance-2026-en/) / [Concentric AI Canadian privacy](https://concentric.ai/canadian-data-privacy-laws/)

### 7.4 KOHO — Phase 2 of banking license, $130M round (June 2026); no final approval yet

KOHO raised $130M in June 2026 at a $1.33B valuation and moved into Phase 2 of its OSFI Schedule 1 banking license application. CEO Daniel Eberhard described the license as "the last piece of the puzzle." Phase 2 requires OSFI approval and sign-off from the federal Finance Minister. No final approval date has been confirmed.

**For PerFiApp:** A KOHO Schedule 1 license would give it deposit insurance, direct payment clearing, and the ability to offer GIC-backed savings — capabilities PerFiApp explicitly does not plan to build. However, it would also make KOHO a federally-regulated bank competing on the same aggregation-and-advice surface PerFiApp occupies. PerFiApp's bilingual depth, aggregation-first architecture, and independence from proprietary banking infrastructure remain the clearest points of differentiation.

Sources: [BetaKit KOHO banking license coverage](https://betakit.com/?p=368795) / [Money.ca KOHO license](https://money.ca/banking/koho-schedule-1-bank-licence)

---

## Recommended Next Steps

### Immediate (this week)

1. **Audit all agent files for broken model IDs.** Search `.claude/agents/*.md`, `settings.json`, CI scripts, and any API wrappers for: `claude-opus-4-1`, `claude-opus-4-1-20250805` (retired, returns errors), `claude-fable-5` (legacy, available but superseded), `claude-sonnet-4-6` (still available but two generations behind). Migrate to the 5.5 family per the tiering table in Track 1.3.

2. **Audit all agent configurations for `tool_choice: { type: "tool" }` on any Sonnet 5.5 target.** This returns a 400 error on Sonnet 5.5. If any implementer or test-engineer agent passes forced tool use, change to `tool_choice: { type: "auto" }` with system-prompt reinforcement.

3. **Audit all agent configurations for `thinking.type: "disabled"` on Opus 5.5 or Fable 5.1 targets.** These models have thinking always on; `thinking.type: "disabled"` returns a 400. Remove the field or replace with `effort: "low"` if cost reduction is the goal.

4. **Update Claude Code to v2.1.303** (latest as of Oct 18). Picks up: hooks `onFailure: "block"` (v2.1.295), Sonnet 5.5 cache pricing fix (v2.1.296), idle compaction (v2.1.299), MCP allow-rule tightening (v2.1.299), and the v2.1.294 hooks-failure-open fix.

5. **Verify Claude Code version is post-2.0.72.** CVE-2026-24887 (CVSS 8.8, `find` command injection) is patched in v2.0.72. Current v2.1.303 is safe, but any CI runner or developer environment on a pinned older version may be vulnerable.

6. **Add `onFailure: "block"` to all custom hooks** in `.claude/hooks/`. Review each hook's prior fail-open behavior and confirm the intended blocking logic is preserved.

### Short-term (this sprint)

7. **Trial `claude-fable-5-1` for spec-lead and architect.** The export-control suspension is resolved. Configure a fallback to `claude-opus-5-5` for any cybersecurity-adjacent query that Fable's guardrails may route away. Document the trial results in the next research report.

8. **Upgrade APM to v0.34.0.** Eight security-significant releases since v0.21.0, including archive checksum verification (v0.30.0), path-traversal alias rejection (v0.32.0), and `--trust-bin` consent (v0.29.0). Run `apm audit` post-upgrade to surface any unmanaged artifacts.

9. **Upgrade Spec Kit to v0.12.15.** Verify the `agent-context` auto-update extension still works after the v0.12.0 compatibility fallback removal — the CLAUDE.md "Spec Kit managed context" section depends on it. Fix: explicitly enable the extension in the Spec Kit configuration if auto-updates stopped silently.

10. **Update DeepEval thresholds before upgrading to v4.2.0.** If the test-engineer agent is running DeepEval with Bias, Hallucination, Misuse, or Toxicity metrics, invert all threshold values (e.g., `threshold < 0.3` becomes `threshold > 0.7`) before upgrading. The `AgentLoopDetectionMetric` and `ToolPermissionMetric` from v4.0.8 are zero-cost (no LLM) and should be added to the test-engineer's default eval suite immediately.

11. **Add `modelPicker` and `promptCacheTtl` to project `settings.json`** (v2.1.243). Lock the model picker to the approved 5.5 family. Set `promptCacheTtl: "1h"` for main sessions, `subagentPromptCacheTtl: "5m"` for tool-call subagents.

12. **Review fork-subagent behavior change** (v2.1.302). Fork subagents are now on by default in `claude -p` and Agent SDK — this affects both the PR review automation and the weekly research workflow. Test both workflows before updating CI runners to v2.1.302+. If context isolation is undesirable (e.g., the researcher needs a long shared context), set `CLAUDE_CODE_FORK_SUBAGENT=0` in the workflow environment.

### Medium-term (next 4–6 weeks)

13. **Begin Phase 2 architecture design for RTR payment initiation.** The by-law is in force (Aug 24), ISA testing is complete, and Q4 2026 live participants are imminent. The Cash Safety and Pay & Payment Optimization modules should be designed against RTR's sub-second settlement model now, not against Interac e-Transfer's overnight settlement assumptions.

14. **Add Quebec Law 25 automated-decision disclosure to the spec-lead's compliance checklist.** Every feature spec for Credit Coaching, Cash Safety, Due-Date Coach, and any AI-recommendation module must include a disclosure design requirement. This should block merge if absent, the same way the security-reviewer pass blocks PRs touching financial data flows.

15. **Design any custom MCP server (e.g., Flinks adapter) to the 2026-07-28 spec from day one.** The spec is finalized and Claude Code now defaults to it. Build stateless — no `Mcp-Session-Id`, OAuth-aligned auth, each request self-contained. Consult DeepEval v4.1.8's MCP eval support to build an eval harness for the adapter before its first deployment.

16. **Evaluate Expo SDK 55 for the mobile app baseline.** New Architecture is mandatory in SDK 55+; any library that is not New Architecture compatible will block development. Run a compatibility audit against the planned React Native library stack (react-i18next, expo-localization, money primitive libraries) before committing to SDK 55 as the project baseline. The `expo-crypto` AES-GCM addition in SDK 55 may be useful for local token storage.

17. **Contact Flinks about MCP roadmap and pilot access.** No official MCP server has been found. As Phase 1 CDBA approaches (indeterminate but legislatively mandated), an official Flinks MCP server would be the highest-value toolchain addition. A pilot agreement via the Flinks developer program could provide early access to their OAuth APIs for PerFiApp integration testing.

---

*Report generated 2026-10-19. All findings verified against primary sources where possible; two items marked [unverified]. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
