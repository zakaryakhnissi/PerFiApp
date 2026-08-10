# PerFiApp Agent Research — 2026-08-10

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: model updates (Fable 5 status, two new flagship models), MCP 2026-07-28 spec shipped, Canadian compliance (RTR By-law, CDBA law enacted), and Claude Code security patches (four permission bypasses in one release).

---

## Executive Summary

Three findings demand attention before anything else:

1. **Claude Sonnet 5 and Opus 5 are now the active flagship models — and this agent team has not been updated to reflect either.** Sonnet 5 became the Claude Code default on June 30 (v2.1.197) and sits at promotional pricing of $2/$10 per MTok through August 31, then rises to $3/$15. Opus 5 launched July 24 at $5/$25 per MTok with SOTA benchmark results. The agent roster files need a routing review: Sonnet 5 is the new cost-optimal choice for implementer and test-engineer; Opus 5 is the justified replacement for spec-lead and architect. If no files have been updated since the June report, the team may still be defaulting to Sonnet 4.6 or Opus 4.8 for flagship work.

2. **Claude Code shipped four permission-bypass security fixes in a single release (v2.1.223, August 6) — two days ago.** One bypass used invisible Unicode codepoints to hide command content from the approval prompt. Another let agent `bypassPermissions` override org policy. A third let workflow scripts use dynamic `import()` to escape the sandbox. These are critical for a financial app running implementer agents in autonomous mode. Verify Claude Code is on v2.1.226 (August 8) or later. A separate sandbox filesystem bypass (v2.1.224, August 7) affecting `denyRead`/`denyWrite` path rules on Linux/macOS also shipped.

3. **RTR By-law officially published and comes into force August 24, 2026 — fourteen days away.** This is the legal cornerstone for Q4 2026 RTR launch. The Consumer-Driven Banking Act already received Royal Assent on March 26. Canadian open banking is no longer a "timeline at risk" item — the legal and infrastructure rails are now in place. This changes the architecture urgency for Phase 2 (payment initiation) from "watch" to "design now."

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **STATUS CHANGED: Fable 5 restored globally July 1** | Model | spec-lead, architect | **Adopt (trial) — with new safety classifier; Mythos 5 US-restricted** |
| **STATUS CONFIRMED: Opus 4.1 retired August 5** | Model | All | **Act — audit for dead model ID, no grace period** |
| **NEW: Claude Sonnet 5 (June 30) — new cost-optimal default** | Model / Cost | implementer, test-engineer, researcher | **Adopt — $2/$10 promo through Aug 31, near-Opus-4.8 quality** |
| **NEW: Claude Opus 5 (July 24) — new flagship** | Model | spec-lead, architect | **Adopt — SOTA, $5/$25, replaces Opus 4.8 for complex reasoning** |
| **STATUS: Agent SDK billing split still paused** | Cost | All | **Monitor — conflicting signals; treat as paused until Anthropic confirms** |
| **STATUS CONFIRMED: MCP 2026-07-28 spec shipped — stateless** | Agent tooling | architect | **Act — design any custom MCP server (Flinks adapter) for stateless now** |
| **NEW: Plaid official MCP server (dashboard-level)** | Agent tooling | architect, implementer | **Trial — useful for CI/integration diagnostics; not a substitute for transaction API** |
| **Claude Code v2.1.226 (Aug 8) — 39 versions since prior report** | Toolchain | All | **Adopt — update immediately; critical security patches in v2.1.223-224** |
| **NEW: Claude Code v2.1.223 — four permission bypasses patched** | Security | implementer, all devs | **Act — update to latest; invisible Unicode bypass is severe for financial app** |
| **NEW: Claude Code v2.1.224 — denyRead/denyWrite sandbox bypass** | Security | implementer, architect | **Act — path-slash rule bypass silently failed on Linux/macOS** |
| **NEW: Claude Code v2.1.198 — subagents background by default; auto commit/push/PR** | Toolchain | implementer | **Adopt with caution — auto-PR on code work needs governance review** |
| **NEW: Claude Code v2.1.219 — subagents nest to depth 3** | Toolchain | architect | **Adopt — enables multi-agent orchestration patterns** |
| **NEW: Spec Kit v0.16.0 (Aug 5) — major jump from v0.11.6** | Toolchain | spec-lead | **Adopt — skills-first installation; multiple bug fixes** |
| **NEW: APM v0.22.0–v0.28.0 (Jun–Aug 2026)** | Toolchain | All | **Adopt — TLS trust store verification (v0.26.0), path traversal fix (v0.27.0)** |
| **NEW: NestJS v12 (Q3 2026 target) — ESM, Vitest, oxlint** | Toolchain | implementer, architect | **Watch — breaking changes; plan migration before starting backend code** |
| **NEW: Expo SDK 56 with RN 0.85 + React 19.2** | Toolchain | implementer | **Adopt — stable Jetpack Compose/SwiftUI APIs, new default template** |
| **NEW: CVE-2026-39861 (CVSS 10.0) — Claude Code symlink sandbox escape** | Security | All devs | **Act — patched in v2.1.64 (March); verify no dev is below that version** |
| **NEW: Mid-Session Tool Injection (MSTI)** | Security | architect, security-reviewer | **Act — add to MCP vetting checklist; restrict tool output parsing** |
| **STATUS CHANGED: RTR By-law in force August 24, 2026** | Compliance | architect, spec-lead | **Act — Phase 2 architecture design can now begin with legal certainty** |
| **STATUS CHANGED: CDBA received Royal Assent March 26** | Compliance | architect, spec-lead | **Act — open banking is now law; accreditation timeline is the gating factor** |
| **NEW: OSFI fast-track fintech bank licensing (June 25)** | Compliance | spec-lead | **Monitor — KOHO could become bank this year; changes competitive landscape** |
| **STATUS UPDATE: KOHO in OSFI licensing Phase 2** | Competitive | spec-lead | **Monitor — 12-month OSFI review clock has started** |
| **NEW: Wealthsimple joins SWIFT; family/business banking** | Competitive | spec-lead | **Monitor — deepening full-stack offering; prediction markets app new vector** |
| **NEW: Neo Financial joins Interac network** | Competitive | spec-lead | **Monitor — all major neobanks now have direct Interac access** |
| **STATUS UPDATE: Monarch Money adds RBC/TD Canada; Core/Plus tiers** | Competitive | spec-lead | **Monitor — accelerating Canada push; pricing restructure worth watching** |
| **NEW: Quebec Law 25 2026 amendments — cross-border transfer obligations** | Compliance | architect, security-reviewer | **Act — any data sent to third-party AI APIs from Quebec residents requires disclosure** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS CHANGED: Fable 5 fully restored globally on July 1, 2026

**Prior status:** Suspended (export control, June 12 – June 30). **New status: Active.**

The US Department of Commerce lifted the export-control directive on June 30, 2026, ending the 19-day suspension. Anthropic redeployed `claude-fable-5` globally on July 1. Key restoration conditions:

- Anthropic deployed an improved safety classifier that blocks the reported jailbreak technique in over 99% of cases. When the classifier triggers, requests are silently redirected to `claude-opus-4-8`.
- The new safeguard uses a larger "safety margin" — it deliberately false-positives on some benign prompts to ensure no boundary-case evasion.
- Through July 7, Fable 5 was included in Pro/Max/Team/Enterprise usage limits. After July 7, usage requires credits.
- Guaranteed minimum retirement date: not before June 9, 2027 (per official deprecation table).

**Mythos 5 is still restricted.** `claude-mythos-5` is available only to a set of approved US organizations via Project Glasswing. This is not changing in the near term.

**For PerFiApp:** The prior report's trial recommendation for Fable 5 on spec-lead and architect workflows is now unblocked. The 1% false-positive rate on the new safety classifier may occasionally redirect a complex financial spec task to Opus 4.8 mid-session — this is acceptable behavior and requires no code change. At $10/$50 per MTok, Fable 5 is expensive relative to Opus 5 (below); reserve it for the most complex architectural reasoning only.

Sources: [Anthropic redeployment announcement](https://www.anthropic.com/news/redeploying-fable-5) / [CNBC](https://www.cnbc.com/2026/06/30/anthropic-says-trump-administration-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html) / [Coursiv Fable 5 guide](https://coursiv.io/blog/claude-fable-5)

### 1.2 STATUS CONFIRMED: claude-opus-4-1-20250805 retired August 5, 2026

**Prior status:** Deprecated (announced June 5, retirement August 5). **New status: Retired.** Today is August 10 — this model is now dead.

Requests to `claude-opus-4-1-20250805` or `claude-opus-4-1` return API errors. If any agent file or CI script still references this model ID, it is currently broken. Run a Claude Console usage export to verify no live traffic is hitting it.

Source: [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.3 NEW: Claude Sonnet 5 — new default, near-flagship quality at reduced cost

**Released:** June 30, 2026. **Model ID:** `claude-sonnet-5`

Sonnet 5 became the Claude Code default model in v2.1.197 (June 30). Key characteristics:

- **Context:** 1M tokens, 128K output (300K output via Batch API + beta header)
- **Benchmarks:** 63.2% on agentic coding vs Opus 4.8's 69.2%; slightly outperforms Opus 4.8 on knowledge work. Close enough for spec drafting, code review, and test writing.
- **Pricing:** Promotional $2/$10 per MTok through **August 31, 2026**, then standard $3/$15. The promotional window closes in 21 days.
- **No sampling parameter restrictions** — unlike Opus 4.7+, Sonnet 5 does not return 400 errors for `temperature`/`top_p`/`top_k`.

**For PerFiApp agent routing:** Switch implementer, test-engineer, researcher, code-reviewer, and debugger to `claude-sonnet-5` now. Lock in the promotional rate before August 31.

Sources: [EdenAI Sonnet 5 guide](https://www.edenai.co/post/claude-sonnet-5-pricing-benchmarks-api-access) / [DataCamp](https://www.datacamp.com/blog/claude-sonnet-5) / [BenchLM pricing](https://benchlm.ai/anthropic/api-pricing)

### 1.4 NEW: Claude Opus 5 — new flagship, SOTA benchmarks

**Released:** July 24, 2026. **Model ID:** `claude-opus-5`

Added to Claude Code as the default Opus tier model in v2.1.219 (July 24). Characteristics:

- **Context:** 1M tokens, 128K output
- **Benchmarks:** SOTA on Frontier-Bench; 3x next-best on ARC-AGI 3. Strongest model available for multi-step complex reasoning.
- **Knowledge cutoff:** May 2026 (more current than Opus 4.8)
- **Pricing:** $5/$25 per MTok — substantially cheaper than Fable 5 ($10/$50), comparable quality
- **Guaranteed minimum retirement:** Not before July 24, 2027
- **Important:** Inherits the Opus 4.7+ restriction — `temperature`, `top_p`, `top_k` return 400 errors if set. Verify all Opus-tier API wrappers still have these parameters removed (from the June fix).

**For PerFiApp agent routing:** Opus 5 is the new recommended default for spec-lead, architect, and security-reviewer.

Sources: [Coursiv Opus 5 guide](https://coursiv.io/blog/claude-opus-5) / [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.5 Updated model routing table (as of August 10, 2026)

| Agent | Prior recommendation | New recommendation | Rationale |
|---|---|---|---|
| spec-lead | claude-opus-4-8 | **claude-opus-5** | SOTA, $5/$25, better knowledge cutoff |
| architect | claude-opus-4-8 | **claude-opus-5** | Complex reasoning, multi-step |
| implementer | claude-sonnet-4-6 | **claude-sonnet-5** | Near-flagship, promo pricing through Aug 31 |
| test-engineer | claude-sonnet-4-6 | **claude-sonnet-5** | Same capability class, lower cost |
| code-reviewer | claude-sonnet-4-6 | **claude-sonnet-5** | Default Claude Code model |
| security-reviewer | claude-opus-4-8 | **claude-opus-5** | Higher stakes; SOTA reasoning |
| debugger | claude-sonnet-4-6 | **claude-sonnet-5** | Adequate for diagnostic work |
| researcher | claude-sonnet-4-6 | **claude-sonnet-5** | Better quality at promotional price |

Fallback chain: `["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"]`

---

## Track 2 — AI Cost & Token Optimization

### 2.1 STATUS: Agent SDK billing split — still paused, conflicting signals

The June 15 billing split (moving Agent SDK usage to a separate credit pool) was paused on the day of rollout. As of late July, there are conflicting third-party reports: one source claims the change went live July 10, another says it was cancelled entirely. Anthropic has not issued an official post-pause status update from a primary source as of this report.

**Recommended stance:** Treat the billing split as still paused. Continue monitoring Agent SDK token consumption in the Claude Console (Usage > Export > CSV). When Anthropic issues an official notice, the team will have 30 days minimum advance warning per their commitment.

Source: [Anthropic June billing change pause](https://codersera.com/blog/anthropic-june-2026-billing-change-claude-code/)

### 2.2 Sonnet 5 promotional pricing window closes August 31

Sonnet 5 at $2/$10 per MTok is a 33% discount vs standard $3/$15. For PerFiApp's CI research runs and any automated agent work, locking agent files to `claude-sonnet-5` before August 31 captures the promotional rate. After August 31, Sonnet 5 is still the preferred implementer/test-engineer model — just at the standard rate.

---

## Track 3 — Agent Tooling (MCP & Claude Code)

### 3.1 STATUS CONFIRMED: MCP 2026-07-28 specification shipped

**Prior status:** "RC planned for July 28." **New status: Final spec published July 28, 2026.**

The specification shipped as planned. This is a breaking-change release for any MCP server built on the prior spec. Key changes:

**Breaking removals:**
- `initialize`/`initialized` handshake: gone
- `Mcp-Session-Id` header: gone
- Server-initiated requests (bidirectional streams): gone, replaced by Multi Round-Trip Requests (MRTR)

**New requirements for MCP server implementers:**
- `Mcp-Method` and `Mcp-Name` HTTP headers are now **required** on all Streamable HTTP requests
- Client identity and capabilities carried in request `_meta` per-request
- Authorization: RFC 9207 issuer validation now required; Dynamic Client Registration deprecated in favor of Client ID Metadata Documents

**New features:**
- Multi Round-Trip Requests (MRTR): server returns `resultType: "input_required"` instead of holding a stream open; client retries with `inputResponses`
- Tool/prompt/resource list responses now include `ttlMs` and `cacheScope` — clients can cache list results
- W3C Trace Context propagation in `_meta` (final)
- Tier 1 SDKs (TypeScript, Python, Go, C#) ship spec support immediately

**For PerFiApp:** The most urgent implication is for any custom MCP server design (e.g., a Flinks adapter). The stateless model means no sticky sessions — the adapter can run behind a round-robin load balancer from day one. **Critical privacy guard:** `cacheScope` on list results must be scoped per-user, not globally — misconfiguration would expose one user's account list to another user's agent session. The `Mcp-Method`/`Mcp-Name` header requirement is not optional.

Sources: [MCP 2026-07-28 final spec blog](https://blog.modelcontextprotocol.io/posts/2026-07-28/) / [DigitalApplied migration guide](https://www.digitalapplied.com/blog/mcp-2026-07-28-spec-stateless-migration-guide) / [The Register](https://www.theregister.com/devops/2026/07/23/model-context-protocol-prepares-to-break-with-its-stateful-past/5276722)

### 3.2 NEW: Plaid official MCP server — dashboard diagnostics only

Plaid now ships an official hosted MCP server at `https://api.dashboard.plaid.com/mcp/sse`, connecting via OAuth token scoped for MCP access. Available tools: `plaid_debug_item`, `plaid_get_link_analytics`, `plaid_get_tools_introduction`, `plaid_get_usages`, `plaid_list_teams`.

**Important limitation:** This server exposes integration diagnostics and Link analytics — **not** real account balances or transactions. Production financial data still requires a community MCP server with your own Plaid API keys, which introduces security review requirements.

**For PerFiApp:** The official Plaid MCP server is useful for the implementer agent during integration development (debugging Plaid Link setup, checking item status, reviewing usage). It is not a substitute for a Flinks adapter serving production financial data. The server is hosted by Plaid, uses OAuth (good), and requires `mcp:read` scope — scope-check before using in any environment that has production credentials.

Sources: [Plaid MCP guide](https://www.openbankingtracker.com/api-aggregators/plaid/mcp) / [MCP directory](https://mcp.directory/servers/plaid) / [Plaid Effects 2026 recap](https://plaid.com/blog/effects-2026-recap/)

### 3.3 Claude Code v2.1.226 (August 8, 2026) — 39 versions since v2.1.187

The changelog from June 25 to August 8 is extensive. Most actionable for PerFiApp's agent workflows:

**Subagents and orchestration (major behavioral changes):**
- **v2.1.198 (July 1):** Subagents now run in background by default. Background agents auto-commit, push, and open draft PRs on code work — requires governance: add a policy that automated PRs from the implementer agent must not target `main` and must include a human review step.
- **v2.1.219 (July 24):** Subagents can spawn nested subagents up to depth 3 (was 1). Enables the architect → implementer → test-engineer chain without main-session intervention.
- **v2.1.212 (July 17):** Per-session cap on subagent spawns (default 200) and WebSearch calls (default 200). `/fork` now copies conversation to a new background session. MCP tool calls over 2 minutes auto-background.
- **v2.1.217 (July 21):** Cap of 20 concurrently-running subagents.

**Security-relevant (see Track 6 for detail):**
- v2.1.221: `mode: "mask"` for sandbox credential files
- v2.1.222: Worktree-isolated sessions no longer allow destructive git commands on main checkout; `bypassPermissions` gap fixed
- v2.1.223: Four permission bypass fixes (critical)
- v2.1.224: `denyRead`/`denyWrite` sandbox bypass fixed; cross-session `SendMessage`

**For CI and automation:**
- **v2.1.207 (July 11):** Auto mode now available without opt-in on Bedrock, Vertex AI, and Foundry. If PerFiApp CI uses these platforms, auto mode is now on by default.
- **v2.1.225 (August 8):** Gateway spend-limit support with cap naming and reset time — useful for controlling CI costs.
- **v2.1.210 (July 14):** Transcript size reduced up to 79× in edit-heavy sessions; per-tool-call CPU reduced 7× via tool-pool caching. Significant cost savings for long implementer sessions.
- **v2.1.215 (July 19):** Claude no longer auto-runs `/verify` and `/code-review` skills. If PerFiApp workflows depended on auto-verify runs, they must now be explicitly invoked.

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval — stable at v4.0, no major new release since June 22

The June report covered v4.0's adoption. No v4.1 or major release has been confirmed since. The framework continues active development (component-level evals, 50+ metrics, TypeScript support). The prior "Adopt" verdict stands.

One new development: [Braintrust](https://www.braintrust.dev/articles/deepeval-alternatives-2026) now positions itself as an alternative with stronger enterprise features, but for PerFiApp's open-source toolchain preference, DeepEval v4.0 remains the recommended choice.

Source: [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026)

---

## Track 5 — Toolchain Releases

### 5.1 STATUS UPDATE: Spec Kit v0.16.0 (August 5, 2026) — major jump from v0.11.6

Six versions shipped between v0.11.6 and v0.16.0 (June 29 to August 5). Key changes:

**v0.14.0–v0.14.4 (July 23–31):** Frontmatter handling fixes; corrupted run state file recovery (`list_runs` now skips corrupted files instead of failing).

**v0.16.0 (August 5, 2026) — headline changes:**
- **Skills-first installation:** Copilot default now installs skills (`skills/speckit-*/SKILL.md`) instead of commands. Existing command-layout projects are preserved on upgrade, but new projects get the skills layout. This affects how PerFiApp's spec-lead agent invokes Spec Kit commands — review the skills-vs-commands distinction.
- **Extension backup conflict resolution:** Improved handling when multiple extensions want to write to the same file.
- **Manifest validation:** Stricter validation on install; malformed extensions now fail loudly.
- **Preset registry handling:** Improvements to how presets (including `security-governance` at v0.6.0) are resolved.

**Action:** Upgrade from v0.11.6 to v0.16.0. The skills-first change means the spec-lead agent's system prompt may need updating if it references command paths.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.16.0`

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases)

### 5.2 STATUS UPDATE: APM v0.22.0 through v0.28.0 (June–August 2026)

Seven new releases since the June report's v0.21.0. Most security-relevant additions:

**v0.22.0 (June 26):** Executable Trust Governance v1 — deny-wins resolver and vocabulary unification. `allowExecutables` gate now has explicit vocabulary (`allow`, `deny`, `prompt`).

**v0.23.0 (June 29):** Lifecycle hooks framework — custom scripts can now run at `pre-install`, `post-install`, `pre-remove` events. A `post-install` hook could automatically audit new MCP server permissions.

**v0.24.0 (July 5):** Glob trigger support for hooks. Plugin bin deployment security: stricter permissions on installed executables.

**v0.26.0 (July 18):** OS trust store verification for TLS by default. Any MCP server or APM-managed dependency that makes HTTPS calls is now verified against the system trust store — closes a class of MITM risks for financial-data integrations.

**v0.27.0 (August 2):** Static path traversal checks in the dashboard; POST body limits. Patches a class of server-side injection via the APM dashboard UI.

**v0.28.0 (August 6):** Agent primitives deployed to `.kiro/agents/` — integration with Kiro IDE's agent system.

**For PerFiApp:** Upgrade to v0.28.0. TLS verification (v0.26.0) is the most important addition for a financial app. The lifecycle hooks (v0.23.0) enable automated post-install security checks.

Source: [APM GitHub releases](https://github.com/microsoft/apm/releases)

### 5.3 NEW: NestJS v12 — planned Q3 2026, breaking changes ahead

NestJS v12 is targeted for early Q3 2026. **PerFiApp's backend has not been started yet** — this is the ideal time to adopt v12 from the start. Key changes:

- **Full ESM migration** for all official packages — the backend must be structured as an ESM project from day one.
- **Default toolchain swap:** Jest → Vitest, ESLint → oxlint, Webpack → Rspack. The test-engineer agent should be configured for Vitest.
- **Standard Schema validation** on all route decorators (`@Body`, `@Query`, etc.) — simplifies validation for financial data routes.
- **tsc** remains the default compiler — TypeScript strict mode preserved.

**For PerFiApp:** Since no backend code has been written, target NestJS v12 from the first commit. The architect should confirm the v12 release candidate ships before PerFiApp's first backend sprint.

Sources: [NestJS v12 PR](https://github.com/nestjs/nest/pull/16391) / [InfoQ](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/) / [Trilon blog](https://trilon.io/blog/nestjs-12-is-coming)

### 5.4 NEW: Expo SDK 56 with React Native 0.85 and React 19.2

Current stable. Key features relevant to PerFiApp:

- **React Native 0.85 + React 19.2** — the latest stable combination
- **Jetpack Compose (Android) and SwiftUI (iOS) APIs in Expo UI are now stable** — available in the default `create-expo-app` template
- **Universal components API** for shared interfaces across platforms
- New Architecture is the default since SDK 53 — PerFiApp must not use the Legacy Architecture

**For PerFiApp:** Target Expo SDK 56 for the initial React Native setup. The stable Compose/SwiftUI APIs are relevant for PerFiApp's native-feel financial UI (charts, card widgets). The implementer agent should use SDK 56's `create-expo-app` template as the starting point.

Source: [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 NEW (CRITICAL): Claude Code v2.1.223 — four permission bypasses in a single release

Released August 6, 2026. All four fixes are directly relevant to a financial app running implementer agents autonomously:

**Bypass 1 — Crafted Bash commands hiding from permission checks:**
A Bash command could show a safe-looking representation in the permission dialog while executing a different, hidden portion. Fixed by normalizing command representations before displaying and checking.

**Bypass 2 — Tab characters and invisible Unicode hiding content from approval prompts:**
241 Unicode codepoints render as nothing or as whitespace in a terminal. A malicious prompt-injection payload could embed these to hide command content from the approval dialog. For a financial app, a compromised prompt could silently approve a command that exfiltrates data. **This is the most alarming bypass for PerFiApp.**

**Bypass 3 — Workflow scripts using dynamic `import()` to escape the sandbox:**
Workflow scripts could use JavaScript dynamic `import()` to load and execute arbitrary code outside the workflow sandbox. Fixed by restricting dynamic imports within workflow execution.

**Bypass 4 — `bypassPermissions` ignoring org policy:**
An agent definition with `bypassPermissions: true` could override an org-level policy that explicitly disabled bypass mode. Fixed by enforcing org policy wins over agent-level declarations.

**For PerFiApp:** Any implementer agent session running between June 24 and today (August 10) without auto-updates to v2.1.223+ was exposed to these bypasses. Verify all developers and CI are on v2.1.226.

Sources: [Dev.to v2.1.223 checklist](https://dev.to/ahab_indieseek/claude-code-21223-permission-bypass-regression-checklist-58n9) / [Towards AI writeup](https://pub.towardsai.net/claude-code-patched-4-permission-bypasses-in-one-release-one-was-a-tab-character-db0ea95481ad) / [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 6.2 NEW: Claude Code v2.1.224 — sandbox denyRead/denyWrite path-slash bypass

Released August 7, 2026. A `denyRead` or `denyWrite` rule with a path ending in a slash (e.g., `denyRead: "~/.aws/"`) was silently not enforced on Linux and macOS. The sandbox reported the rule as active while not actually blocking access.

**For PerFiApp:** This directly undermines the `sandbox.credentials` protection recommended in the June report. If `settings.json` has any path-based deny rules with trailing slashes, they were not working on Linux/macOS (which is the CI environment). Update to v2.1.224+ immediately and audit your sandbox rules.

Source: [Claude Hub v2.1.224 writeup](https://www.claudehub.fr/en/blog/claude-code-2-1-224-cross-session-messaging-sandbox-fix/)

### 6.3 STATUS: CVE-2026-39861 — Claude Code symlink sandbox escape (confirmed patched)

This CVSS 10.0 vulnerability (sandbox escape via symlink following enabling arbitrary file write outside workspace) was patched in v2.1.64 (March 3, 2026). Current latest (v2.1.226) is safe.

**New context:** The attack vector requires indirect prompt injection — malicious content placed in the model's context window steering sandboxed tool calls into symlink creation. For PerFiApp, the risk surface is any session that reads external content (e.g., a Plaid webhook payload, a transaction description, a user-provided budget note) while running the implementer agent with file write access. Prompt injection via financial data inputs is a realistic threat vector.

Source: [GitHub Advisory GHSA-vp62-r36r-9xqp](https://github.com/advisories/GHSA-vp62-r36r-9xqp) / [SentinelOne CVE-2026-39861](https://www.sentinelone.com/vulnerability-database/cve-2026-39861/)

### 6.4 NEW: Mid-Session Tool Injection (MSTI) — emerging MCP attack class

Adversa AI's July 2026 research documents Mid-Session Tool Injection: attackers inject malicious content mid-conversation (via MCP tool output) to hijack subsequent tool calls. Unlike initial prompt injection, MSTI targets active agent sessions and achieves high success rates through third-party scripts embedded in tool responses.

**For PerFiApp:** Any MCP server that returns user-controlled data (transaction descriptions, merchant names, account nicknames) in tool responses is a potential MSTI vector. The security-reviewer agent's checklist should add: "Does any MCP tool response include user-controlled strings that are not sanitized before being returned to the model?" This is distinct from static prompt injection — it applies mid-turn.

Source: [Adversa AI July 2026 MCP security](https://adversa.ai/blog/top-mcp-security-resources-july-2026/)

### 6.5 NEW: CVE-2026-40576 — Excel MCP Server path traversal

An unauthenticated path traversal vulnerability in `excel-mcp-server` (versions up to 0.1.7) allows arbitrary file read and write outside the intended directory.

**For PerFiApp:** PerFiApp does not currently use the Excel MCP server, but this is a reminder that any MCP server that reads or writes files requires explicit path-traversal validation. Add to the MCP vetting checklist: "Does this server validate that all file paths are within the allowed workspace before reading or writing?"

Source: [SentinelOne CVE-2026-40576](https://www.sentinelone.com/vulnerability-database/cve-2026-40576/)

### 6.6 Quebec Law 25 — 2026 amendments add cross-border transfer obligations

Quebec Law 25 2026 amendments add explicit obligations for cross-border personal information transfers. **Any call to an Anthropic API that includes personal financial data from Quebec residents** (transaction history, account balances, credit info) requires disclosure and data residency review. Penalties: up to **$25M or 4% of worldwide turnover** for serious violations.

**For PerFiApp:** The architect and security-reviewer must assess whether financial data sent to Claude API calls is classified as personal information under Law 25. Data minimization (sending only anonymized/aggregated data to the AI layer) is the recommended mitigation. The spec-lead should add a compliance gate to any spec that routes user financial data through AI models.

Source: [Sherlock Forensics Law 25 2026](https://www.sherlockforensics.com/blog/quebec-law-25-2026-amendments-canadian-organizations.html) / [Agentys Law 25 guide](https://www.agentys.io/en/blog/loi-25-quebec-privacy-ai-email)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 STATUS CHANGED: Consumer-Driven Banking Act received Royal Assent March 26, 2026

**Prior status:** "Phase 1 timeline slipping — Bank of Canada still in information-gathering." **New status: CDBA is law.**

Bill C-15 received Royal Assent on March 26, 2026, converting the Consumer-Driven Banking framework into Canadian law. The gating factor is now the Bank of Canada's accreditation criteria and technical standards body — not whether the law will pass.

The Bank of Canada remains in information-gathering mode for accreditation criteria. A 2026 Phase 1 operational launch is still widely seen as at risk due to: no technical standards body designated, accreditation criteria not published, consumer liability mechanics partially defined.

**For PerFiApp:** Royal Assent means open banking will happen. Design for OAuth-based data access from day one. Flinks' live OAuth programs with National Bank and EQ Bank can be used for testing today even before the Bank of Canada framework is operational.

Sources: [Open Banking Tracker Canada](https://www.openbankingtracker.com/country/canada) / [Flinks 2026 blog](https://www.flinks.com/blog/open-banking-canada-2026-launch-fintech-institutions) / [Forbes open banking](https://www.forbes.com/sites/christerholloman/2026/02/09/open-banking-now-launching-in-canada-what-it-means-for-you-and-banks/)

### 7.2 STATUS UPDATED: RTR By-law in force August 24, 2026 — Q4 2026 launch confirmed

**Prior status:** "Q4 2026 phased launch." **New status: Legal framework finalized; comes into force August 24.**

Both the RTR By-law and RTR Rules have received all necessary approvals. The By-law comes into force on **August 24, 2026 — fourteen days from today.** Payments Canada's Q1 2026 update confirmed active testing, performance, security, and resilience testing phases. Universal participation is expected in 2027, not at initial launch.

**For PerFiApp:** RTR is no longer a "may slip" dependency for Phase 2. The architect should begin designing the payment initiation architecture for Phase 2 now, targeting RTR availability in Q4 2026. The design should use ISO 20022 messaging standards (RTR's native format). Design for gradual rollout, not day-one full coverage.

Sources: [Payments Canada RTR milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [ClearingPost RTR](https://clearingpost.com/insights/canada-rtr-q3-2026-launch/) / [McCarthy Tétrault RTR By-law](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published)

### 7.3 NEW: OSFI fast-track fintech bank licensing (June 25, 2026)

OSFI launched a targeted pilot program on June 25, 2026 to expedite bank license approvals for fintechs and crypto custodians. Timeline: initial feedback within 4 weeks, formal risk-based review within 12 months, Minister of Finance decision within 3 months. Total: approximately 15–16 months from application.

**For PerFiApp:** This affects the competitive landscape, not PerFiApp's own operations. The implication: KOHO, and potentially other neobanks, could receive Schedule 1 banking status within 2026–2027. A licensed KOHO is a fundamentally different competitive threat than a prepaid card fintech.

Source: [Fasken OSFI streamlined licensing](https://www.fasken.com/en/knowledge/2026/06/federal-financial-services-regulatory-updates-streamlined-bank-applications-and-summer-consultations) / [Torys fast-track analysis](https://www.torys.com/our-latest-thinking/publications/2026/02/osfi-to-fast-track-new-entry-regime-for-fintechs-and-credit-unions)

---

## Track 8 — Competitive & Product Intel

### 8.1 STATUS UPDATE: KOHO in OSFI Phase 2 licensing review — approval possible this year

KOHO's Schedule 1 bank licence application has advanced to Phase 2 of OSFI review. With the new fast-track framework (12-month review, 3-month ministerial decision), KOHO could receive approval as early as Q4 2026 or Q1 2027. They already have: direct Interac e-Transfer access (since May 12), Payments Canada membership (January 2026), and $1.33B valuation.

**For PerFiApp:** A KOHO banking license would allow it to hold deposits directly (removing Peoples Bank as intermediary), offer insured accounts, and potentially move into lending. PerFiApp's differentiation (AI coaching, bilingual, aggregation-first) remains valid — but the spec-lead should assess whether PerFiApp's positioning narrative in the PDR adequately accounts for a full-bank KOHO competitor.

Sources: [Yahoo Finance KOHO licensing](https://ca.finance.yahoo.com/news/2-5-million-canadians-already-111500202.html) / [EIN Presswire Phase 2](https://www.einpresswire.com/article/684172221/koho-advances-into-phase-two-of-canadian-banking-license)

### 8.2 NEW: Wealthsimple joins SWIFT; expands into family, business, and prediction markets

Since the June report's "Monitor" verdict:

- **SWIFT membership (March 2026):** Wealthsimple is the first Canadian fintech and second non-bank globally to join SWIFT. Enables faster international transfers.
- **Family banking (May 2026):** Wealthsimple Households (live) + Kids/Teens Accounts (Fall 2026) + Authorized Traders (Summer 2026). Directly addresses multi-member household financial management — competing with PerFiApp's household vision.
- **Business banking (May 2026):** Wealthsimple Business with Business Chequing — moves into SMB territory.
- **Prediction markets app (June 25, 2026):** Standalone prediction markets product for Canadians.

**For PerFiApp:** Wealthsimple's family banking features (Households, Kids/Teens) could compete with PerFiApp's household financial management vision. The spec-lead should flag this in the Due-Date Coach and Credit Monitor module specs — household/shared access may need earlier prioritization.

Sources: [CBC Wealthsimple banking](https://www.cbc.ca/news/business/wealthsimple-launching-kids-businesses-9.7207296) / [Fintech.ca SWIFT](https://www.fintech.ca/2026/03/03/wealthsimple-swift-power-faster-visible-money/)

### 8.3 NEW: Neo Financial joins Interac network directly

Neo Financial joined the Interac e-Transfer network as a direct participant in April 2026 — making it the second fintech to do so (after Wealthsimple), followed by KOHO in May.

**For PerFiApp:** All three major Canadian neobank competitors now have direct Interac access. Real-time domestic payment infrastructure is table stakes for Canadian fintech. This reinforces the urgency of the RTR/open-banking architecture for Phase 2.

Source: [iPhone in Canada — Neo Interac](https://www.iphoneincanada.ca/2026/04/08/fintech-neo-financial-joins-interac-network-following-wealthsimple/)

### 8.4 STATUS UPDATE: Monarch Money — RBC/TD Canada integrations; Core/Plus pricing

Since the June report's "Monitor" verdict:

- **RBC and TD Bank integrations** confirmed for Canada — deepening Canadian data-source coverage that previously favored Flinks-powered Canadian apps.
- **Two-tier pricing** introduced: Monarch Core (base budgeting) and Monarch Plus (power users, full financial future modeling, small business finance).

**For PerFiApp:** Monarch's RBC/TD integrations reduce the data-access gap. PerFiApp's clearest remaining differentiation: French-language support (Monarch has none) and deeper AI coaching integrating credit, rewards, and payment optimization. The spec-lead should update the competitive analysis in the PDR.

Source: [Monarch Money Canada review](https://wealthnorth.ca/personal-finance/monarch-money-review-canada/) / [Releasebot Monarch July 2026](https://releasebot.io/updates/monarch)

---

## Recommended Next Steps

### Immediate (this week — August 10–17)

1. **Update Claude Code to v2.1.226** across all developer environments and CI. Picks up the four permission bypass patches from v2.1.223 (invisible Unicode bypass, Bash command hiding, dynamic import escape, bypassPermissions org policy bypass) and the denyRead/denyWrite sandbox filesystem bypass from v2.1.224.

2. **Audit for `claude-opus-4-1-20250805` in all agent files and CI scripts.** Today is August 10 — this model is retired. Any reference will return an API error. Use Claude Console (Usage > Export > CSV) to verify no live traffic is hitting it.

3. **Update agent model IDs before August 31 (Sonnet 5 promotional window).** Switch implementer, test-engineer, code-reviewer, debugger, and researcher to `claude-sonnet-5` at $2/$10 promo pricing. Switch spec-lead, architect, and security-reviewer to `claude-opus-5`. Update the fallback chain to `["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"]`.

4. **Audit denyRead/denyWrite sandbox rules for trailing-slash paths.** Rules with trailing slashes (e.g., `denyRead: "~/.aws/"`) were silently not enforced on Linux/macOS prior to v2.1.224. Review `settings.json` and fix all affected rules.

5. **Begin Phase 2 payment initiation architecture spike this week.** RTR By-law comes into force August 24. The architect should begin designing the ISO 20022 payment initiation architecture for Phase 2 now. This does not need to ship in MVP but should be designed before the first payment module spec locks in architecture choices.

### Short-term (this sprint — August 10–31)

6. **Upgrade Spec Kit to v0.16.0** (from v0.11.6). The skills-first installation change means reviewing the spec-lead agent's system prompt for command path references. Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.16.0`

7. **Upgrade APM to v0.28.0** (from v0.21.0). Most important: TLS trust-store verification (v0.26.0, closes MITM risk for financial MCP servers), lifecycle hooks framework (v0.23.0, enables post-install security audits), and path traversal patches (v0.27.0).

8. **Add Quebec Law 25 cross-border data transfer review to the security-reviewer checklist.** Any spec routing user financial data through Claude API calls must include a disclosure mechanism for Quebec residents. Add as a mandatory gate before any spec touching the AI coaching or transaction enrichment modules reaches the implementer.

9. **Add Mid-Session Tool Injection (MSTI) to the MCP vetting checklist.** For any MCP server returning user-controlled strings (transaction descriptions, merchant names, account nicknames): require sanitization of tool responses before they re-enter the model context.

10. **Establish governance policy for background agents auto-committing/pushing PRs** (Claude Code v2.1.198 behavior). Define in project settings: implementer agent PRs must target a staging branch, not `main`; must include a human-review label; must not auto-merge. Add this to `.claude/settings.json` as an auto-mode rule.

### Medium-term (next 4–8 weeks)

11. **Design any custom MCP server (Flinks adapter) for the 2026-07-28 spec.** Stateless protocol is now final: no session state, `Mcp-Method`/`Mcp-Name` headers required, `cacheScope` scoped per-user (cross-user financial data leakage is the risk), RFC 9207 issuer validation for auth.

12. **Evaluate NestJS v12 for backend architecture.** No backend code exists yet — target v12 from the first commit. ESM modules only, Vitest (not Jest) for tests, oxlint (not ESLint) for linting, Rspack for bundling. Confirm v12 RC has shipped before the first backend sprint.

13. **Evaluate Expo SDK 56 for the mobile scaffold.** Target SDK 56 with React Native 0.85 and React 19.2. Use `create-expo-app` with SDK 56 as the starting point.

14. **Re-evaluate Fable 5 for the most complex spec-lead tasks** now that access is restored (July 1). At $10/$50 per MTok, Fable 5 is expensive relative to Opus 5 ($5/$25). Reserve Fable 5 for cases where Opus 5 demonstrably underperforms — test both on a representative PerFiApp spec task before committing either as spec-lead default.

15. **Update the PDR competitive analysis** to reflect: (a) all three major neobanks now have direct Interac access; (b) KOHO may become a licensed bank by Q4 2026/Q1 2027 under the OSFI fast-track; (c) Monarch Money has RBC/TD Canada integrations and two-tier pricing; (d) Wealthsimple now has SWIFT access and family banking. PerFiApp's clearest remaining differentiation: bilingual (EN/FR-CA) depth and AI coaching integrating credit, rewards, and payment optimization in a single bilingual experience.

---

*Report generated 2026-08-10. All findings verified against primary sources where possible. Delta report vs 2026-06-24 — prior findings not repeated unless status changed.*
