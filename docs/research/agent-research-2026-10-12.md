# PerFiApp Agent Research — 2026-10-12

**Delta report vs 2026-06-24. Rotation emphasis: Canadian open-banking & compliance, model updates.**

---

## Executive Summary

Five findings demand immediate attention over the next two weeks:

1. **Claude Haiku 5.5 is now the Claude Code default model (v2.1.293, Oct 7).** At ~$0.10/$0.50 per million tokens — roughly 90% cheaper than Haiku 4.5 — this is the single largest cost-reduction opportunity available right now. The implementer, test-engineer, and code-reviewer agents should evaluate Haiku 5.5 as their primary tier. Verify capability before committing, as third-party sources are not authoritative.

2. **MCP 2026-07-28 spec shipped — stateless protocol is a breaking change that affects any custom MCP server PerFiApp designs.** The `Mcp-Session-Id` header and the `initialize`/`initialized` handshake are gone. Any Flinks adapter or financial data MCP server must be designed stateless-first or face a mandatory migration. The spec is now final.

3. **Canada RTR By-law in force August 24, 2026 — RTR entering production Q4 2026.** This is faster than the prior report expected. Industry Solution Assurance testing began Q3 2026. The RTR payment rail is arriving in 2026, not 2027. This accelerates the timeline for PerFiApp's Phase 2 payment initiation architecture work.

4. **FINTRAC penalties up to 40× — universal enrolment now mandatory.** Bill C-12 Royal Assent March 26, 2026. New mandatory compliance agreements, compliance orders, and 40× penalty ceiling apply to violations from that date. The October 2025 $176.9M penalty signals active enforcement. Any PerFiApp module that triggers reporting-entity status faces a materially higher compliance bar.

5. **Spec Kit reached v1.1.3 (Oct 9, 2026)** — a major version jump from the v0.11.6 in the last report. The v1.0.0 milestone (August 2026) brought stability guarantees. New in v1.1.x: MCP tools for Spec Kit itself, community extension catalog, and an experimental stdio MCP server mode. The `speckit.taskstoissues` command is deprecated.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| Claude Haiku 5.5 as Claude Code default — ~90% cost reduction | Model / Cost | implementer, test-engineer, code-reviewer | **Adopt after capability verification** |
| Claude Sonnet 5 — intro pricing $2/$10, 1M context | Model / Cost | spec-lead, architect | **Adopt — migrate from Sonnet 4.6** |
| Claude Opus 5 — same $5/$25 pricing, top benchmark | Model | spec-lead (top tasks) | **Watch — no clear upgrade trigger over Opus 4.8 until verified** |
| claude-opus-4-1 retired August 5, 2026 | Model | Any agent using this ID | **RESOLVED — confirm no live traffic** |
| claude-fable-5 export controls LIFTED July 1, 2026 | Model | spec-lead, architect | **STATUS CHANGE: Adopt on trial — now metered, not bundled** |
| MCP 2026-07-28 spec final — stateless, breaking | Agent tooling | architect | **Act — design Flinks adapter stateless now** |
| Flinks docs MCP server (not data access) | Agent tooling | implementer | **Adopt — free, no auth, useful for Flinks API coding** |
| Claude Code v2.1.296 (Oct 9) | Toolchain | All agents | **Adopt — update immediately** |
| Claude Code v2.1.287–v2.1.296 key features | Toolchain | All agents | **Adopt — Claude Mods, hooks blocking, settings sync** |
| cc-safe-setup v29.8.0 — 675+ hooks | Security | implementer | **Adopt — significant expansion from June's 8-hook default** |
| CVE-2026-5058: aws-mcp-server CVSS 9.8 | Security | architect, code-reviewer | **Act — add no-auth check to MCP vetting checklist** |
| CSA / OWASP MCP Top 10 (May 2026) | Security | architect, security-reviewer | **Act — adopt OWASP MCP Top 10 as vetting baseline** |
| Spec Kit v1.1.3 (Oct 9, 2026) | Toolchain | spec-lead | **Adopt — major jump from v0.11.6, MCP tools, stable API** |
| APM v0.23.x (est.) | Toolchain | All developers | **Adopt — upgrade from v0.21.0** |
| NestJS v12 (Aug 2026) — ESM, Vitest, Node 20.19+ | Toolchain | architect, implementer | **Watch — migration is substantial; plan before first backend sprint** |
| Expo SDK 57 (June 30, 2026) — React Native 0.86 | Toolchain | implementer | **Adopt when mobile sprint begins** |
| DeepEval v4.1.3 (July 2026) | Agent quality | test-engineer | **Adopt — incremental improvements on v4.0** |
| Canada RTR By-law in force Aug 24, accelerating Q4 launch | Compliance | architect, spec-lead | **STATUS CHANGE: Act — Phase 2 payment architecture timeline moves left** |
| FINTRAC 40× penalty ceiling, Bill C-12 in force | Compliance | spec-lead, architect | **Act — AML compliance bar materially higher; update risk model** |
| CDBA still without Phase 1 launch date | Compliance | architect | **STATUS: Unchanged — still 2026 launch at risk** |
| Bill C-27 (federal privacy law) is dead | Compliance | spec-lead, architect | **STATUS CHANGE: Monitor — Quebec Law 25 is now sole strict benchmark** |
| KOHO banking license — still pending | Competitive | spec-lead | **STATUS: Unchanged — no approval yet** |
| Monarch Money Plus tier ($199/yr, Morningstar, forecasting) | Competitive | spec-lead | **Monitor — closes gap further on PerFiApp differentiation** |
| Wealthsimple Family/Business products + AI trading dashboard | Competitive | spec-lead | **Monitor — Wealthsimple expanding household and AI features** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGE (RESOLVED): Claude Fable 5 export controls lifted July 1, 2026

**Status changed from "suspended" (June 24 report) to "available, metered."**

On June 30, 2026, the US Department of Commerce lifted the export controls on Claude Fable 5 (and Mythos 5) following Anthropic shipping a hardened safety classifier and agreeing to proactive security monitoring commitments. Access was restored globally on July 1, 2026. The original suspension lasted approximately 19 days (June 12 – July 1).

Current access model:
- Available in Claude.ai, the API, and Claude Code globally.
- Through July 7, access was bundled into subscriptions. From July 8 onward, it moved to **metered usage** (separate credit consumption), which is a relevant cost-planning change for the CI research runs and any agent team member using this model.
- A new cybersecurity classifier routes some requests — including routine coding tasks — to Claude Opus 4.8 automatically, potentially capping throughput for code-heavy agent tasks.
- **Mythos 5 remains in limited availability** via Project Glasswing (approved customers only). This is unchanged.

**For PerFiApp:** The prior report's trial recommendation for spec-lead and architect now stands again. However, metered pricing means cost tracking is essential before committing spec-lead's deep reasoning tasks to Fable 5. Run the trial with Console usage export active and compare cost vs. Opus 5 for the same task profile.

Sources: [US lifts ban on foreign access to Claude Fable 5 (ProPakistani)](https://propakistani.pk/2026/07/01/us-lifts-ban-on-foreign-access-to-claude-fable-5/) / [Anthropic redeploys Claude Fable 5 (Shanghai NYU RITS)](https://rits.shanghai.nyu.edu/ai/anthropic-redeploys-claude-fable-5-as-u-s-lifts-export-controls/) / [Agentpedia — July 7 status](https://agentpedia.codes/blog/claude-fable-5-is-back-july-7)

---

### 1.2 RESOLVED: claude-opus-4-1 retired August 5, 2026

**Status: retired.** The retirement date has passed. Requests to `claude-opus-4-1-20250805` and `claude-opus-4-1` should now return API errors. Verify via Claude Console Usage Export (Usage → Export CSV) that no live agent traffic is still hitting these model IDs. Recommended replacement was and remains `claude-opus-4-8`.

Source: [Anthropic model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

### 1.3 NEW: Claude Sonnet 5 launched ~June 30–July 1, 2026

A new mid-tier model launched at the same time Fable 5 was restored. Key attributes (from secondary sources — verify against Anthropic's official page):

- **Context window:** 1M tokens (double Sonnet 4.6's reported 200K).
- **Intro pricing:** $2 input / $10 output per million tokens through August 31, 2026.
- **Standard pricing from September 1, 2026:** $3 / $15 — identical to Sonnet 4.6's rate.
- Positioned as "most agentic Sonnet yet" — stronger at multi-step tool use than Sonnet 4.6.

**For PerFiApp:** If the pricing and context claims are accurate, Sonnet 5 is a drop-in upgrade for spec-lead and architect mid-weight tasks: same September cost as Sonnet 4.6, more context, better agentic performance. The 1M context window is relevant for spec-lead when processing long Spec Kit artifacts and the full codebase at once. Verify against [Anthropic's model page](https://platform.claude.com/docs/en/about-claude/models/overview) before migrating agent files.

Sources: [Anthropic launches Claude Sonnet 5 (Shanghai NYU RITS)](https://rits.shanghai.nyu.edu/ai/anthropic-launches-claude-sonnet-5-closing-the-gap-with-opus/) / [Claude Sonnet 5 vs Opus 5 (CosmicJS)](https://www.cosmicjs.com/blog/claude-sonnet-5-vs-opus-5)

---

### 1.4 NEW: Claude Opus 5 — same $5/$25 pricing as Opus 4.8

Claude Opus 5 was released alongside or shortly after Sonnet 5 (July 2026, exact date unconfirmed from primary sources). Reported pricing: $5 input / $25 output per million tokens, unchanged from Opus 4.8. No SWE-bench Verified score published at launch per one source.

**For PerFiApp:** No clear immediate upgrade trigger over Opus 4.8 unless benchmarks or real task performance demonstrate a meaningful improvement for spec-lead / architect deep reasoning. Watch for primary-source capability evidence before migrating.

---

### 1.5 NEW [PARTIAL VERIFICATION]: Claude Haiku 5.5 — ~90% cheaper, 1M context, now Claude Code default

Multiple sources report Claude Haiku 5.5 launched approximately October 7, 2026. Claude Code v2.1.293 (Oct 7) set it as the **default model** with this description: "faster and cheaper, 1M context window." Reported pricing: ~$0.10 input / $0.50 output per million tokens (vs Haiku 4.5 at $1/$5).

This is the most significant cost-reduction opportunity in this report cycle. If the pricing holds, Haiku 5.5 reduces per-token cost for lightweight agent tasks by approximately 90%. Claude Code defaulting to it means the implementer, test-engineer, and code-reviewer agents — which should be running on the cheapest capable model — would benefit immediately.

**Caution:** Sources are third-party aggregators. The 1M context claim and exact model ID (`claude-haiku-5-5`) should be verified on Anthropic's official API pricing and models pages before updating agent configurations.

Sources: [Claude Haiku 5.5 pricing (braindetox.kr)](https://braindetox.kr/en/posts/claude_haiku_5_5_release_pricing_2026.html) / [Claude Code Oct releases (havoptic.com)](https://www.havoptic.com/releases/claude-code/2026/10)

---

### 1.6 NEW [SINGLE SOURCE, LOW CONFIDENCE]: Claude Sonnet 5.5 and Opus 5.5

A single guide reports Claude Sonnet 5.5 launched September 28, 2026, with 30% speed improvement at no additional cost vs. Sonnet 5, and Claude Opus 5.5 launched September 22, 2026. These claims could not be verified against any primary or secondary source. Treat as [UNVERIFIED] — check Anthropic's release notes.

---

### 1.7 Model deprecation floor alerts — Haiku 4.5 and Sonnet 4.5

The Anthropic deprecations page shows:
- `claude-haiku-4-5`: Active, retirement "not sooner than October 15, 2026" — this date is **this week**. This is a floor date, not a scheduled retirement; Anthropic has not announced an actual retirement. Monitor for an announcement.
- `claude-sonnet-4-5`: Active, retirement "not sooner than September 29, 2026" — floor date has passed, still no announced retirement.

**For PerFiApp:** If any agent file targets `claude-haiku-4-5` or `claude-sonnet-4-5`, check the deprecations page this week to confirm no retirement was announced after the June report.

Source: [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Claude Haiku 5.5 — routing opportunity for cheapest agents

As noted in Track 1: Haiku 5.5 at ~$0.10/$0.50/MTok represents a ~90% reduction. For PerFiApp's cost structure:

- **implementer** (most token-intensive): Use Sonnet 5 as primary; Haiku 5.5 for first-pass scaffolding and simple file edits.
- **test-engineer**: Haiku 5.5 is likely sufficient for generating test boilerplate and running `deepeval generate`.
- **code-reviewer**: Haiku 5.5 for style/lint; Sonnet 5 for money-precision and security logic review.
- **debugger**: Sonnet 5 (reasoning-heavy).
- **spec-lead / architect**: Sonnet 5 standard; Fable 5 for complex architecture decisions (now metered, so track costs).

### 2.2 Batch API — no confirmed changes

No confirmed 2026 changes to the Anthropic Batch API. The 50% discount, 24-hour turnaround, and combination with prompt caching remain unchanged from prior reports. The prior report's recommendation (use Batch API for the weekly research runs and any eval dataset generation) still stands.

### 2.3 Claude Agent SDK billing split — still paused, no rescheduling confirmed

The June 24 report noted Anthropic paused this change on June 15 under competitive pressure. No rescheduling announcement has been found in public sources through October 2026. The automation (weekly researcher CI, automated PR review) continues to draw from subscription quota.

**For PerFiApp:** Continue tracking Agent SDK token consumption via Console Usage Export. The split will eventually arrive.

---

## Track 3 — Agent Tooling

### 3.1 Claude Code v2.1.187 → v2.1.296: key changes across 4 months

Claude Code shipped approximately 109 versions between June 23 and October 9, 2026. The most actionable changes for PerFiApp (from havoptic.com aggregator — verify against official changelog before acting):

**July 2026 (v2.1.188–v2.1.219):**
- **v2.1.198 (July 1) — Chrome integration GA.** The browser automation feature left beta. Relevant for test-engineer running E2E tests against a React Native web target.
- **v2.1.206 (July 9) — Auto-approve git pushes.** Configurable automatic approval for pushes to a designated remote. Useful for the implementer in CI contexts, but verify it respects PerFiApp's "no direct push to main" rule before enabling.
- **v2.1.218 (July 22) — Background code reviews.** Code review runs move to background, freeing the main session. Directly relevant for the code-reviewer agent workflow.
- **v2.1.219 (July 24) — Claude Opus 5 as new default model** [third-party source, verify].

**August 2026 (v2.1.220–v2.1.259):**
- **v2.1.240–v2.1.245 — `modelPicker` and `promptCacheTtl` configuration.** `promptCacheTtl` is now configurable per project, allowing longer cache windows for expensive system prompts (security-reviewer's long instruction set, for example).

**September 2026 (v2.1.260–v2.1.286):**
- **v2.1.269 (Sep 11) — Plugin scored evaluation.** Plugins can be evaluated with scored results.
- **v2.1.271 (Sep 14) — Fast mode for remote/self-hosted.** Reduced latency for remote sessions.
- **v2.1.277 (Sep 18) — AGENTS.md as fallback for CLAUDE.md.** If `CLAUDE.md` is absent, `AGENTS.md` is read as project instructions. For PerFiApp this is fine (CLAUDE.md exists) but worth knowing if contributors use other agents.
- **v2.1.278 (Sep 19) — Auto mode server-side processing.** Auto mode shifts to server-side processing. Could affect latency and cost model for the implementer running long autonomous sessions.

**October 2026 (v2.1.287–v2.1.296):**
- **v2.1.287 (Oct 1) — Claude Mods.** Plugins can now modify deeper Claude Code behavior via "Claude Mods." Relevant for APM-managed skills that need to override default agent behavior.
- **v2.1.287 (Oct 1) — "You Should Know" agent.** Opt-in agent that monitors your work and surfaces relevant information. Potentially useful as a compliance-reminder layer for the implementer.
- **v2.1.288 (Oct 2) — One-keystroke work recovery.** Recovers lost work from session interruptions.
- **v2.1.290 (Oct 5) — `serverToolUses` tracking.** Tracks which tools the API calls internally. Useful for debugging implementer sessions where tool call sequences are unexpectedly expensive.
- **v2.1.291 (Oct 6) — Disappearing messages and ignored permission prompts fixed.** Security/reliability fix.
- **v2.1.292 (Oct 6) — Plugin marketplace install + sub-agent effort control.** Plugins installable directly from marketplaces; control over how hard sub-agents work (effort budget).
- **v2.1.293 (Oct 7) — Haiku 5.5 as default model.** 1M context, faster, cheaper.
- **v2.1.294 (Oct 8) — Instruction-based hook interpretation fix.** Blocking rules in hooks now work as intended — this was a regression from earlier hook work.
- **v2.1.295 (Oct 8) — Hooks can block actions when they fail.** Hooks now have hard-blocking capability, not just logging.
- **v2.1.296 (Oct 9) — Code settings sync with Claude Desktop.** Settings synchronize across Claude Desktop and the gateway.

**Recommendation:** Update to v2.1.296. The hook blocking fix (v2.1.294–295), `serverToolUses` tracking, and background code reviews are the highest-value items for PerFiApp's agent team.

Sources: [Claude Code Oct 2026 (havoptic.com)](https://www.havoptic.com/releases/claude-code/2026/10) / [Claude Code Jul 2026 (havoptic.com)](https://www.havoptic.com/releases/claude-code/2026/7) / [Claude Code Sep 2026 (havoptic.com)](https://www.havoptic.com/releases/claude-code/2026/9) / [v2.1.245 detailed notes (dev.classmethod.jp)](https://dev.classmethod.jp/en/articles/20260825-cc-updates-v2-1-245/)

---

### 3.2 STATUS CHANGE: MCP 2026-07-28 specification — final and in force

**Status changed from "RC planned" to "released and final."**

The MCP 2026-07-28 specification shipped on or around July 28, 2026, as planned. Key changes confirmed from the official MCP blog post:

**Breaking changes requiring migration:**
- `initialize` / `initialized` handshake **removed** — protocol version, client info, and capabilities now travel in `_meta` on every request.
- `Mcp-Session-Id` header **removed** — any MCP server designed around sticky sessions must refactor.
- `Mcp-Method` and `Mcp-Name` headers now **required** on Streamable HTTP — mismatches with the body are rejected.
- Tool schemas now use **full JSON Schema 2020-12** — implementations must not auto-dereference external `$ref` URIs.
- Error code change: missing resource now returns `-32602` instead of `-32002`.

**New features:**
- `server/discover` method for on-demand capability fetching.
- `ttlMs` and `cacheScope` on list/resource results — structured cache hints. (Note: `cacheScope` misconfiguration can leak financial data across users — see Track 6.)
- Multi Round-Trip Requests (input_required result + requestState echo) replace held SSE streams.
- MCP Apps extension (SEP-1865): servers can ship sandboxed HTML interfaces.
- Tasks extension: moved from core experimental to a first-class extension with `tasks/get`, `tasks/update`, `tasks/cancel`.
- Authorization hardening: `iss` parameter validation required per RFC 9207.

**Deprecations (still work for 1 year):** Roots, Sampling, and Logging.

**For PerFiApp:** Any custom MCP server (Flinks adapter, Plaid adapter, internal tools server) designed against the pre-2026-07-28 spec needs migration. Design new servers stateless from the start. The `cacheScope` field requires explicit configuration to avoid cross-user data leakage on financial data endpoints.

Sources: [MCP blog 2026-07-28 RC post](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [CData stateless MCP explainer](https://www.cdata.com/blog/stateless-mcp) / [AAIF migration guide](https://aaif.io/blog/mcp-2026-07-28-whats-changing-and-how-to-migrate)

---

### 3.3 NEW: Flinks docs MCP server — live, no auth, documentation-only

Flinks published a developer-documentation MCP server at `https://docs.flinks.com/mcp`. This gives AI coding assistants (Claude Code, Cursor, Copilot) direct query access to Flinks API documentation.

- **What it does:** Documentation access only. It is NOT a financial data server — it does not pull bank account data, transactions, or balances. It lets the implementer agent query Flinks API docs in-context.
- **Setup:** `claude mcp add flinks --transport http https://docs.flinks.com/mcp`
- **Authentication:** None required for the documentation server.
- **Prior recommendation:** The June 24 report recommended contacting Flinks directly about a data-access MCP server. This docs-only server exists as of the current search — the data-access server does not appear to exist yet.

**For PerFiApp:** Adopt the documentation MCP server for the implementer and architect agents. When building the Flinks integration, having docs in-context reduces hallucinated API calls. The financial data MCP server (the one that would actually matter) is still not available — continue monitoring Flinks' developer roadmap.

Source: [Flinks MCP server setup guide](https://docs.flinks.com/guides/ai/mcp-server-setup)

---

### 3.4 cc-safe-setup — v29.8.0 (major hook expansion since June)

cc-safe-setup has expanded dramatically since the June report's "8 hooks" characterization. Version 29.8.0 (current) offers:

- **675–701 example hooks** across categories: destructive command prevention, data protection, git safety, auto-approve patterns.
- `--shield` option installs a recommended set beyond the 8 defaults.
- Default install still installs 8 hooks in ~10 seconds (zero dependencies unchanged).
- `jq` is a runtime requirement for hooks.

**For PerFiApp:** The June report recommended evaluating the 8 default hooks. With 675+ hooks available, the implementer's autonomous operation profile can be much more precisely constrained. Specifically relevant hook categories for a financial app: data protection (block API key patterns in file writes), git safety (no force push, no main branch direct commits), and custom patterns for Plaid/Flinks credential strings.

Sources: [cc-safe-setup npm (socket.dev)](https://socket.dev/npm/package/cc-safe-setup) / [cc-safe-setup README (jsDelivr CDN)](https://cdn.jsdelivr.net/npm/cc-safe-setup@29.8.0/README.md)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 STATUS UPDATE: DeepEval v4.1.3 (July 22, 2026)

**Status: incremental update on v4.0 "Adopt" recommendation — maintain "Adopt."**

DeepEval 4.1.x (latest: 4.1.3, July 22, 2026) adds:
- Richer trace fields and improved OpenTelemetry exports.
- Better conversation simulation with controller APIs.
- Support for newer Claude model IDs (Opus 4.7 added in v3.9.8).

No architectural changes from v4.0. The June report's "adopt now" verdict stands. The `deepeval generate` command and Claude Code CLI integration from v4.0 remain the primary value adds for PerFiApp.

Sources: [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026) / [DeepEval on piwheels](https://www.piwheels.org/project/deepeval/)

---

## Track 5 — Toolchain Releases

### 5.1 STATUS CHANGE: Spec Kit v1.1.3 (Oct 9, 2026) — major version reached 1.0

**Status changed from "Adopt v0.11.6" to "Adopt v1.1.3" — this is a major version milestone.**

Spec Kit shipped v1.0.0 in August 2026 (described as "one year of Spec Kit"), signifying a stable API commitment. Current latest is **v1.1.3 (October 9, 2026)**, representing substantial changes since v0.11.6.

Key changes across v0.12.x through v1.1.3:

**v1.0.0 (August 2026) — stability milestone:**
- Stable public API and command set. Changes from here on should follow semver.
- Community workflow step catalog: installable step types from the community.

**v1.0.9 (Sep 21) — first-party bugfix and assess bundles:**
- Bundled bugfix and assess workflows for the spec-lead's bug triage path.
- Amp dispatch switched to execute mode.

**v1.0.13 (Sep 29) — MiniMax Code integration, openspec extension:**
- Added community bundles including openspec and MiniMax Code.

**v1.1.0 (Oct 2) — `speckit.taskstoissues` deprecated, local custom step installs:**
- `speckit.taskstoissues` command deprecated in favor of the new `github` extension. Update any CI scripts using this command.
- Workflow custom step types can now be installed from local directories and archives — relevant for PerFiApp-specific spec workflow extensions.
- Unicode feature names supported.

**v1.1.1 (Oct 6) — experimental MCP server:**
- Experimental version-only stdio MCP server. Spec Kit itself now exposes an MCP interface. Allows the implementer agent to query Spec Kit artifact state during a session.
- Workflow expression filters added: `upper`, `lower`, `split`, `length`, `to_json`.

**v1.1.2 (Oct 7) — first-class MCP tools:**
- MCP tools for listing artifacts and reporting the version — promotes the experimental interface.
- `--json` output added to `preset info` and `extension info`.

**v1.1.3 (Oct 9) — governance presets, community catalog, lifecycle hooks:**
- Updated Intake Sequencing Governance preset and Applied Epistemic Engineering extension.
- Epic and OpenProject Integration extensions added to community catalog.
- Lifecycle hooks added to the bug workflow.
- `taskstoissues` core command formally deprecated (use `github` extension).

**For PerFiApp:** Upgrade from v0.11.6 to v1.1.3. Priority items:
1. The Spec Kit MCP server (v1.1.1–1.1.2) is directly relevant — the spec-lead agent can query Spec Kit state during Claude Code sessions via the MCP interface.
2. Replace any use of `/speckit.taskstoissues` with the `github` extension before it is removed.
3. The community catalog now has governance presets worth reviewing for PerFiApp's compliance workflow.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.1.3`

Source: [Spec Kit releases (github.com)](https://github.com/github/spec-kit/releases) / [v1.1.3 release notes (newreleases.io)](https://newreleases.io/project/github/github/spec-kit/release/v0.13.4)

---

### 5.2 APM — estimated v0.23.x (June 2026); verify current version

A Japanese tech article from June 2026 references APM in the v0.23 series. The last confirmed release from the June 24 report was v0.21.0 (June 19, 2026). A conference slide deck from an Open Source Festival in London 2026 cites v0.21 as the version presented.

**Caveat:** The v0.23 reference comes from a single secondary source. The APM GitHub releases page is authoritative.

**For PerFiApp:** Verify APM's current version at [github.com/microsoft/apm/releases](https://github.com/microsoft/apm/releases). If v0.22 or v0.23 shipped, review for security or feature changes before upgrading from v0.21.0.

Sources: [APM releases tracker (releasealert.dev)](https://releasealert.dev/github/microsoft/apm?page=3) / [APM OSSFS London 2026 slides](https://hosted-files.sched.co/osfflondon2026/2f/OSSFS-2026-London-Manage-Agent-Primitives-with-Agent-Package-Manager-APM%20%281%29.pdf)

---

### 5.3 NEW: NestJS v12 — ESM migration, Node.js 20.19+ required

NestJS v12 released approximately late August 2026. This is a **major breaking change** that directly affects PerFiApp's `apps/api` backend:

- **ESM core packages.** The `@nestjs/*` packages ship as ESM. `require(esm)` on Node 20.19+/22.12+ means CJS apps can still import them, but the module graph changes.
- **Node.js minimum: 20.19 or 22.12+.** Node 21 and below are unsupported.
- **Vitest replaces Jest** as the recommended test runner — but the `nest upgrade` command does NOT migrate tests automatically. This is a manual migration step. Important for test-engineer: DeepEval's TypeScript integration should be confirmed compatible with Vitest.
- **ESLint replaced by oxlint** (recommended, not forced).
- **Webpack replaced by Rspack** (recommended).
- **Breaking lifecycle hook change:** Hooks run by component hierarchy level — ordering assumptions in test setup/teardown may break.
- **`@nestjs/config` v12:** ESM-only, validation error formatting changed, `lodash` replaced with `es-toolkit`. Deep imports into build internals no longer work.
- **`@nestjs/terminus` v12:** ESM-only, deprecated `HealthIndicator` base class removed.

**For PerFiApp:** PerFiApp has not started backend implementation yet (early stage). This is the right time to target NestJS v12 as the baseline for `apps/api`, not v10 or v11. The architect should include Node 22.12+, NestJS v12, and Vitest in the approved technology stack before the first backend sprint. Migrating from NestJS 11→12 mid-project would be costly.

Sources: [NestJS 12 roadmap (InfoQ)](https://infoq.com/news/2026/04/nestjs-12-roadmap-esm) / [NestJS 12 features (besthub.dev)](https://www.besthub.dev/articles/nestjs-12-esm-core-packages-cjs-compatibility-new-toolchain-defaults-14ba62ea8842) / [nestjs/nest v12.0.0 (newreleases.io)](https://newreleases.io/project/github/nestjs/nest/release/v12.0.0)

---

### 5.4 NEW: Expo SDK 57 (June 30, 2026) — React Native 0.86

Expo SDK 57 shipped June 30, 2026, bringing React Native 0.86. Since PerFiApp has not started mobile implementation yet, targeting SDK 57 as the baseline is the right approach.

**For PerFiApp:** The architect should confirm SDK 57 / React Native 0.86 as the mobile target. No migration cost from prior versions given the early-stage status.

Source: [Expo SDK 57 GitHub issue reference](https://github.com/nrwl/nx/issues/36443)

---

### 5.5 NEW: pnpm 11.11–11.14 — native workspace release management

pnpm added `pnpm change`, `pnpm lane`, and `pnpm version -r` commands for native workspace release management in the week of July 13. This provides a built-in alternative to Changesets or similar tools for PerFiApp's monorepo.

**For PerFiApp:** Relevant for managing version bumps across `apps/mobile`, `apps/api`, and `packages/*`. Worth evaluating when the first publishable package is ready.

Source: [releases.sh pnpm digest](https://releases.sh/collections/js-toolchain/digest.md)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 ONGOING: MCP ecosystem — 30+ CVEs in first half of 2026, OWASP Top 10 published

The Cloud Security Alliance published a research note in May 2026 identifying prompt injection as a structural risk in MCP's design, with a single malicious server potentially weaponizing trusted servers through cross-server tool shadowing. Key findings:

- **30+ CVEs** filed against MCP implementations in the first months of 2026 (per CSA May 2026).
- **Shell injection: ~43%** of the CVE volume.
- **CVE-2026-5058 (CVSS 9.8):** `aws-mcp-server` — RCE through crafted input with no authentication required. Disclosed April 2026.
- **OWASP MCP Top 10** published in 2026, covering tool poisoning, prompt injection, cross-server shadowing, and supply-chain issues.

**For PerFiApp:** Adopt the OWASP MCP Top 10 as the baseline vetting checklist for all MCP servers, adding to the existing checklist from the June report. CVE-2026-5058's root cause — no authentication on aws-mcp-server — is identical to CVE-2026-32211 from the June report (Azure MCP). The pattern is consistent: most MCP servers ship without auth. Any custom Flinks adapter must treat authentication as requirement zero.

Sources: [CSA MCP security note (May 2026)](https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/05/CSA_research_note_MCP_security_crisis_20260504-csa-styled.pdf) / [OWASP MCP Top 10 overview (mcpplaygroundonline.com)](https://mcpplaygroundonline.com/blog/mcp-security-tool-poisoning-owasp-top-10-mcp-scan.md) / [MCP 30 CVEs in 60 days (noqta.tn)](https://www.noqta.tn/en/blog/securite-serveurs-mcp-vulnerabilites-protection-guide-2026)

---

### 6.2 MCP `cacheScope` — cross-user data leakage risk

The new `cacheScope` field in the MCP 2026-07-28 spec (see Track 3) controls whether cached tool results are scoped to a single user session or shared across sessions. Default behavior when this field is omitted or misconfigured could allow a cached response containing User A's bank balance to be served to User B.

**For PerFiApp:** When any Flinks or Plaid MCP adapter is built, `cacheScope` must be set to `user` or `session` (not `global`) for any tool that returns user-specific financial data. This should be a mandatory item in the security-reviewer's checklist for MCP server PRs.

Source: [MCP 2026-07-28 RC post (MCP blog)](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)

---

### 6.3 Claude Code hook security — v2.1.294/295 blocking fix is important

The v2.1.294 (Oct 8) "fix how instruction-based hooks are interpreted so blocking rules work as intended" and v2.1.295 "hooks can now block actions when they fail" are **security-relevant**. Prior to these versions, cc-safe-setup hooks set to block destructive commands may not have blocked correctly. Updating to v2.1.296 and re-verifying that blocking hooks are active and working is important for any developer running the implementer agent in autonomous mode.

Source: [Claude Code Oct 2026 (havoptic.com)](https://www.havoptic.com/releases/claude-code/2026/10)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS CHANGE: Canada RTR — By-law in force August 24, Q4 2026 production launch

**Status changed from "targeting Q4 2026 phased launch" to "in force with first participants live Q4 2026."**

This is a material acceleration. Key milestones confirmed:

- **RTR By-law published July 1, 2026** in the Canada Gazette — the formal legal authority for the payment system.
- **By-law and RTR Rules in force August 24, 2026** — legally effective.
- **Industry Solution Assurance (ISA) testing** began Q3 2026 — participants connecting with production workflows.
- **Q4 2026:** First Direct-to-Exchange participants going live (targeted, not guaranteed — testing-dependent).
- Universal participation expected to continue through 2027.

**For PerFiApp:** The Phase 2 write-access open banking timeline (payment initiation) moves left. The prior report's "plan for RTR-based payment initiation in 2027, not 2026" guidance is now partially obsolete. While universal RTR is still a 2027 story, PerFiApp's architect should now plan for a late-2026 or early-2027 initial payment initiation capability via RTR. This affects the Pay & Payment Optimization and Cash Safety module timelines. The architect should factor this into the first Phase 2 spec.

Sources: [Canada's RTR moves closer to launch (McCarthy.ca)](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published) / [Payments Canada RTR quarterly update Q3 2026](https://www.payments.ca/canadas-real-time-rail-quarterly-update-jude-pinto-2026-q3) / [NCFA RTR rules updated July 2026](https://ncfacanada.org/canada-real-time-rail-rules-access/)

---

### 7.2 STATUS UPDATE: CDBA — Bill C-15 received Royal Assent March 26, 2026; Phase 1 launch still without date

**Status unchanged from June report: 2026 Phase 1 launch widely seen as at risk.**

What changed since June 24:

- **Bill C-15 (March 26, 2026 Royal Assent):** Division 9 of Part 5 replaced the original 2024 Consumer-Driven Banking Act with a revised version. This completes the legislative framework. The updated CDBA is now law.
- **No implementation date committed:** As of the latest sources, the Bank of Canada has not committed to a Phase 1 launch date. The "premature and ill-advised" language from the Bank's payments head remains the operative public stance.
- **Missing technical pillars:** No technical standards body designated, no accreditation criteria published, consumer liability mechanics only partially defined.

**For PerFiApp:** Architecture advice unchanged — design read-only data access via OAuth. The positive signal: Flinks' existing live OAuth programs (National Bank, EQ Bank, FirstOntario) allow PerFiApp to integrate and test before the mandated framework exists.

Sources: [CDBA key updates (Mondaq, McMillan)](https://www.mondaq.com/canada/financial-services/1770968/consumer-driven-banking-in-canada-key-updates-and-issues) / [New CDBA explained (DLA Piper, April 2026)](https://www.dlapiper.com/en/insights/publications/2026/04/the-new-consumer-driven-banking-act-explained) / [Open Banking Tracker Canada](https://openbankingtracker.com/country/ca)

---

### 7.3 STATUS CHANGE: FINTRAC enforcement — materially stricter as of March 26, 2026

**Status changed from "new standard published" (June report) to "in force with substantially higher penalties."**

Bill C-12 received Royal Assent March 26, 2026. Effective immediately for violations from that date:

- **Penalty ceiling: up to 40× current limits.** The largest FINTRAC penalty in history — $176.9M against a virtual currency business — was imposed October 22, 2025 under the old regime. Under the new framework, equivalent violations could carry penalties 40× higher.
- **Mandatory compliance agreements:** Entities that commit prescribed violations must enter compliance agreements with FINTRAC.
- **Compliance orders:** A new tool allowing FINTRAC to order specific compliance actions.
- **Universal enrolment:** All reporting entities subject to PCMLTFA must register with FINTRAC. Previously optional enrollment categories are now mandatory.
- **Ability-to-pay factor:** FINTRAC can consider ability to pay when setting penalty amounts (can be mitigating for a startup).
- **FINTRAC updating its AMP policy:** Final guidance on compliance agreements and orders not yet published as of the latest sources.
- **Potential federal financial crime police:** Bill C-29 (dedicated federal financial crime police agency) was in second reading — watch for progress.

**For PerFiApp:** The AML compliance bar has risen materially. If PerFiApp's Cash Advance Lite module or any Phase 2 payment initiation triggers reporting-entity status, the AML program must now be demonstrably effective (the "reasonably designed, risk-based, effective" standard from the June report remains operative, now backed by 40× penalties). The security-reviewer agent's checklist should include a standing item: does this feature change PerFiApp's FINTRAC reporting-entity status?

Sources: [BLG — preparing for higher penalties (April 2026)](https://www.blg.com/en/insights/2026/04/preparing-for-universal-enrolment-higher-penalties-and-fintrac-enforcement) / [FINTRAC new supervisory framework (AMLP Forum)](https://www.amlpforum.com/documents/fintrac-publishes-a-new-supervisory-framework-setting-out-its-risk-based-transparent-approach-to-monitoring-and-enforcing-compliance-with-aml-and-cft-laws/) / [FINTRAC hikes penalty ceiling (Wealth Professional)](https://www.wealthprofessional.ca/news/industry-news/fintrac-hikes-aml-penalty-ceiling-up-to-40x/392407)

---

### 7.4 STATUS CHANGE: Bill C-27 (federal privacy) is dead — Quebec Law 25 is the strict benchmark

**Status changed from "monitor" to "resolved (dead) — Quebec Law 25 governs."**

Bill C-27 (Consumer Privacy Protection Act + Artificial Intelligence and Data Act) lapsed when Parliament was prorogued in January 2025 and was not reintroduced. The proposed CPPA (with up to CAD $10M or 3% of global revenue administrative penalties) never came into force.

**Current federal privacy regime:** PIPEDA still governs. The OPC cannot directly levy fines — it issues findings and recommendations, and individuals can seek Federal Court review. No PIPEDA amendment is currently in Parliament.

**Quebec Law 25:** Fully in force since September 2024 (all phases). Penalties up to CAD $10M or 2% of worldwide turnover. Includes privacy impact assessments (PIAs), portability rights, and AI-specific transparency requirements. Quebec Law 25 is now the de facto highest-compliance standard in Canada for PerFiApp.

**For PerFiApp:** The architect and spec-lead should verify that privacy impact assessments are conducted for every module that handles personal financial data. Quebec Law 25's requirements (PIA, portability, AI transparency) should be treated as the baseline — not a stretch goal — given PerFiApp's bilingual Canadian-first mandate.

Sources: [Quebec Law 25 (Clym 2026)](https://www.clym.io/blog/quebec-law-25) / [Bill C-27 lapsed — workplace privacy (silaws.com, April 2026)](https://silaws.com/2026/04/29/workplace-privacy-law-25-quebec-pipeda-canada-2026/)

---

### 7.5 PCI DSS — v4.0.1 still current, no v4.1

PCI DSS v4.0.1 (June 2024) remains the sole active version. No v4.1 has been announced. All 51 "future-dated" requirements that arrived with v4.0 were due March 31, 2025 — they are now mandatory.

**For PerFiApp:** No new PCI DSS action required. The prior report's recommendation (reduce scope via tokenization or hosted fields) remains the right approach for any payment card data handling.

Source: [PCI DSS 4.0.1 enforcement overview (compliancehub.wiki)](https://compliancehub.wiki/pci-dss-4-0-1-2026-enforcement-payment-page-script-compliance/)

---

## Track 8 — Competitive & Product Intel

### 8.1 STATUS UPDATE: KOHO banking license — still pending, formal Canada Gazette step taken

**Status: unchanged — no approval granted. Formal licensing step visible March 2026.**

Key developments since June 24:
- A **Canada Gazette notice (March 7, 2026)** stated a KOHO subsidiary intends to ask the Minister of Finance to continue it as a Schedule I bank under the name "KOHO Bank." Public objections could be submitted to OSFI until April 27, 2026.
- KOHO is reportedly in Phase 2 of OSFI's three-part approval process (entered Phase 2 in early 2024).
- OSFI was preparing a clearer new-entrant framework in June 2026 — this may streamline (but not shorten) the approval path.
- No approval announcement found in public sources through October 2026.

**For PerFiApp:** KOHO at 2.5M users and $1.33B valuation is the closest direct Canadian competitor. Its banking license pursuit would enable deposit insurance and direct payment settlement that PerFiApp (as an aggregation-first app) does not need to match, but would make KOHO a more trusted brand. PerFiApp's differentiation (bilingual, AI coaching, aggregation breadth) remains the right strategic focus.

Sources: [KOHO close to securing banking licence (Betakit)](https://betakit.com/koho-hopes-to-launch-telco/) / [Canada Gazette KOHO notice (March 2026)](https://gazette.gc.ca/rp-pr/p1/2026/2026-03-07/html/misc-divers-eng.html) / [KOHO $130M raise (Pulse2)](https://pulse2.com/koho-raises-c130-million-at-c1-33-billion-valuation-to-support-growth-and-banking-license-pursuit/amp/)

---

### 8.2 STATUS UPDATE: Monarch Money — Monarch Plus premium tier, mobile reporting parity

Since the June 24 report's additions (AI assistant, credit score tracking), Monarch has continued expanding:

- **Monarch Plus (April 2026, $199 USD/year):** Financial forecasting, business and rental property tracking, advanced investment analysis powered by Morningstar data, and estate planning tools. This tier is above PerFiApp's planned scope but signals Monarch's ambition.
- **Mobile reporting parity (June 2026):** Full reporting suite on mobile, including the Sankey cash flow view. Goals feature out of beta.
- **Ongoing Canadian limitations:** Still USD pricing for Canadian users. Still uses Plaid/MX/Mastercard (not Flinks) — Canadian bank connectivity issues remain. No French-language support confirmed.

**For PerFiApp:** Monarch's Sankey view and Goals feature are product design signals worth noting for PerFiApp's own UX. The persistent Canadian data-connection and currency friction remains PerFiApp's clearest product differentiation: native Flinks integration, Canadian bank coverage, and bilingual FR-CA parity are things Monarch cannot quickly match.

Sources: [Monarch Money 2026 review (Penny Hoarder)](https://www.thepennyhoarder.com/budgeting/monarch-money-review/) / [Monarch release notes (releasebot.io)](https://releasebot.io/updates/monarch) / [Monarch Canada limitations (FinlyWealth)](https://www.finlywealth.com/money/monarch-money-alternative)

---

### 8.3 NEW: Wealthsimple — 4M users, AI trading dashboard, Family/Business products

Wealthsimple is increasingly a holistic personal-finance competitor (not just robo-advisor):
- **4M+ Canadian users, ~$125B AUA** (March 2026).
- **Wealthsimple Family and Business** (launched May 21, 2026): household account management and SME products — directly relevant territory for PerFiApp's household budgeting modules.
- **AI-powered research-and-trading dashboard** (in development, timeline unconfirmed): would add an AI coaching layer, similar to PerFiApp's positioning.
- **Zero-commission options trading** (October 2025), gold fractional ownership, direct indexing.
- **Cash deposits via Canada Post** (January 2026) — a distribution innovation.

**For PerFiApp:** Wealthsimple's trajectory is toward a super-app. It has scale, Interac integration, direct investments, and is building AI capabilities. PerFiApp's differentiation must rest on what Wealthsimple can't easily offer: deep aggregation across all accounts (not just Wealthsimple accounts), bilingual AI coaching personalized to Canadian credit and loyalty products, and module breadth (Due-Date Coach, Rewards & Loyalty, Credit Monitor) without requiring users to move their money.

Sources: [Wealthsimple Family review (Milesopedia)](https://milesopedia.com/en/news/finance/wealthsimple-family-review-of-new-accounts/) / [Wealthsimple newsroom](https://newsroom.wealthsimple.com/wealthsimple-powers-the-next-evolution-of-investing-in-canada)

---

## Recommended Next Steps

### Immediate (this week)

1. **Verify claude-haiku-5-5 model ID and pricing on Anthropic's official models page.** If confirmed at ~$0.10/$0.50/MTok, update the implementer, test-engineer, and code-reviewer agent files to target `claude-haiku-5-5` as their primary model. Haiku 5.5 is already the Claude Code default as of v2.1.293 — verify capability on PerFiApp's specific task profile (bilingual money math, TypeScript generation) before making it permanent.

2. **Update Claude Code to v2.1.296.** The hook-interpretation bug fix (v2.1.294) means blocking hooks may not have been working as intended before this version. If any cc-safe-setup blocking hooks are installed, they should be re-verified against v2.1.296.

3. **Confirm no live API traffic to `claude-opus-4-1` or `claude-opus-4-1-20250805`.** Retirement was August 5 — these IDs should be returning API errors. Check Claude Console Usage Export. If anything is still hitting them, it is broken.

4. **Check the MCP `cacheScope` field against all current or planned MCP server implementations.** Update the security-reviewer's checklist: any tool returning user-specific financial data must set `cacheScope` to `session` or `user`, not `global`. This is a data leak vector unique to the 2026-07-28 spec.

5. **Check the Anthropic model deprecations page for `claude-haiku-4-5`.** Its "not before October 15, 2026" floor date is this week. If a retirement announcement was posted, PerFiApp's current model fallback chain needs updating.

### Short-term (this sprint)

6. **Upgrade Spec Kit to v1.1.3** (from v0.11.6). Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.1.3`. Priority updates: (a) enable the Spec Kit MCP server (`specify mcp` stdio mode) so the spec-lead and implementer can query Spec Kit artifact state in-session; (b) replace any `/speckit.taskstoissues` usage with the `github` extension; (c) review the community governance preset catalog for a Canadian financial compliance preset.

7. **Add the Flinks docs MCP server to the implementer and architect agents.** Run `claude mcp add flinks --transport http https://docs.flinks.com/mcp`. No credentials required. Confirm it provides useful API reference before adding to CI.

8. **Verify Claude Sonnet 5 pricing and update spec-lead / architect agent files.** If the $3/$15 standard rate from September 1 is confirmed, Sonnet 5 is a direct upgrade from Sonnet 4.6 at the same cost with a larger context window. The 1M context enables spec-lead to process the entire codebase plus spec artifacts in a single turn.

9. **Begin Fable 5 trial on spec-lead tasks — track costs via Console Usage Export.** Fable 5 is now metered (not bundled), so cost tracking is essential. Run a controlled trial of 5–10 complex specification tasks, comparing Fable 5 vs. Sonnet 5 output quality and cost.

10. **Adopt the OWASP MCP Top 10 as the baseline for all MCP server vetting.** Add it to the security-reviewer's checklist alongside the existing CVE-2026-32211 and OX Security items. The pattern is consistent: 30+ CVEs in 2026, mostly from missing authentication and unsanitized shell execution.

### Medium-term (next 4–6 weeks)

11. **Architect should evaluate NestJS v12 as the `apps/api` baseline** before any backend sprint begins. Target Node.js 22.12+, NestJS v12 (ESM), Vitest, and confirm DeepEval TypeScript is Vitest-compatible. Migrating mid-build would be costly. This should be included in the first architectural decision record.

12. **Architect should accelerate Phase 2 RTR integration planning.** The RTR By-law is in force and Q4 2026 production is happening. Phase 2 payment initiation architecture work should begin in Q1 2027, not "mid-2027 when universal RTR is available." The first Direct-to-Exchange participants will be live by the time PerFiApp's Phase 1 read-only integration is complete.

13. **The security-reviewer agent should add a standing FINTRAC check.** For every feature spec that touches Cash Advance Lite, payment initiation, or any money-movement function: explicitly assess whether the feature changes PerFiApp's FINTRAC reporting-entity status under the new 40× penalty framework. This should be a go/no-go gate in the spec review, not an afterthought.

14. **Conduct Privacy Impact Assessments (PIAs) per Quebec Law 25.** With Bill C-27 dead, Quebec Law 25 is the highest compliance standard applicable to PerFiApp. PIAs are mandatory for any new system involving personal data. The spec-lead should create a PIA template as a Spec Kit extension, to be run as part of every feature's clarification phase.

15. **Evaluate pnpm 11.11+ workspace release management.** The native `pnpm change` / `pnpm lane` commands may be sufficient for PerFiApp's monorepo versioning needs without adding Changesets. Evaluate when the first shared package (`packages/money`, `packages/i18n`) is ready to version.

---

*Report generated 2026-10-12. Delta report vs 2026-06-24.*
