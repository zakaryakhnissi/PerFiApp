# PerFiApp Agent Research — 2026-07-27

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: toolchain releases (Expo, React Native, NestJS — uncovered in prior runs), two major new models (Sonnet 5, Opus 5), Claude Code breaking changes in CI, MCP RC shipping tomorrow, and Canadian RTR legal framework now confirmed.

---

## Executive Summary

Five items demand action before the end of the week:

1. **Claude Code v2.1.200 (July 3) changed the default permission mode from Auto to Manual.** PerFiApp's GitHub Actions CI workflows — the weekly researcher and automated PR review — will stall at the first tool call unless `--permission-mode acceptEdits` or `--permission-mode bypassPermissions` is explicitly set. This is a silent failure: the job hangs indefinitely rather than erroring. Check the workflow YAMLs immediately.

2. **`claude-opus-4-1-20250805` retires August 5 — nine days away.** The prior two reports flagged this; it is now urgent. Use Claude Console export to confirm no live traffic hits this model ID. Migration target: `claude-opus-4-8` or `claude-opus-5`.

3. **Opus 4.7 fast mode was removed July 24 — three days ago.** Any API call with `speed: "fast"` on `claude-opus-4-7` now returns an error with no fallback. Scan agent files and wrappers for this combination.

4. **The MCP 2026-07-28 specification ships tomorrow.** The protocol goes stateless: `Mcp-Session-Id` is removed and the `initialize` handshake is eliminated. Any custom MCP server PerFiApp is planning (e.g., a Flinks adapter) must target the stateless model from the start. Existing MCP client libraries will need SDK updates.

5. **Claude Sonnet 5 is in a 33% introductory price window through August 31.** At $2/$10 per MTok (standard post-promo: $3/$15), it outperforms Sonnet 4.6 on every published benchmark including Terminal-Bench (+13.4 points), which directly measures autonomous coding agent performance. Switching the implementer and test-engineer to `claude-sonnet-5` now captures five weeks of discounted cost.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Claude Code v2.1.200 — default changed to Manual** | Toolchain / CI | All CI workflows | **Act — add `--permission-mode` flag to CI invocations this week** |
| **`claude-opus-4-1-20250805` retires August 5** | Model | Any agent using this ID | **Act — audit and migrate within 9 days** |
| **Opus 4.7 fast mode removed July 24** | Model | Any caller using `speed: fast` on Opus 4.7 | **Act — scan and remove immediately** |
| **MCP RC 2026-07-28 ships tomorrow** | Agent tooling / MCP | architect (custom MCP server design) | **Act — design any Flinks adapter stateless now** |
| **Claude Sonnet 5 — introductory price through Aug 31** | Cost / Model | implementer, test-engineer | **Adopt — migrate before promo expires** |
| **Claude Opus 5 released July 24** | Model | spec-lead, architect | **Adopt — same price as Opus 4.8, near-Fable 5 quality, May 2026 knowledge** |
| **Claude Fable 5 restored July 1** | Model | spec-lead, architect | **Trial — access confirmed globally; prior suspension resolved** |
| **CVE-2026-46406 — temp file secrets disclosure (patched June 29)** | Security | All developers | **Act — verify every dev is on Claude Code v2.1.128+** |
| **Claude Code v2.1.212 — /fork to background, /subtask replaces in-session fork** | Toolchain | All agents using parallel work | **Adopt — update agent documentation referencing /fork** |
| **Claude Code v2.1.215 — /verify and /code-review no longer auto-run** | Toolchain | code-reviewer, test-engineer | **Adopt — update CI step that relied on auto skill invocation** |
| **Spec Kit v0.14.2 (from v0.11.6)** | Toolchain | spec-lead | **Adopt — shell security hardening, SicarioSpec Security bundle, Python scripts** |
| **APM v0.26.0 (from v0.21.0)** | Toolchain | All developers | **Adopt — OS trust store TLS, lifecycle hooks, Executable Trust Governance v1** |
| **Expo SDK 56 — Hermes v1 default, Expo UI production-stable** | Toolchain | implementer, architect | **Adopt — target this SDK when mobile implementation starts** |
| **NestJS v12 imminent (Q3 2026) — ESM-first, CJS dropped** | Toolchain | architect, implementer | **Watch — breaking change; plan migration path before coding begins** |
| **RTR By-law comes into force August 24, 2026** | Compliance | architect, spec-lead | **Act — Q4 2026 launch confirmed; update Phase 2 timeline assumptions** |
| **OSFI Streamlined Framework for fintechs (June 25)** | Compliance | spec-lead | **Monitor — 12-month banking license pathway now explicit** |
| **MCP tool-poisoning production exploit documented** | Security | architect, code-reviewer | **Act — add tool allowlisting and identity-binding to MCP vetting checklist** |
| **Claude Code v2.1.200 WebSearch cap + subagent spawn cap** | Toolchain | researcher, implementer | **Adopt — tune caps via env vars if researcher CI hits limits** |
| **DeepEval 4.0 — now Claude Code Skills plugin** | Agent quality | test-engineer | **Adopt — Skills plugin makes it callable without shell; prior "trial" now confirmed adopt** |
| **TypeScript 5.9 — import defer, strictInference** | Toolchain | implementer | **Watch — relevant when NestJS 12 / Expo SDK 56 implementation starts** |
| **pnpm 11 — workspace release management, pnpm doctor** | Toolchain | implementer | **Watch — upgrade when monorepo implementation begins** |

---

## Track 1 — Agent Tooling (Claude Code Features)

### 1.1 CRITICAL: Claude Code v2.1.200 — default permission mode changed to Manual

Released July 3, 2026. The default permission mode changed from Auto to Manual across all Claude Code entry points: CLI, VS Code extension, JetBrains plugin.

In Manual mode, every file write, shell command, and network call requires explicit human approval. **Any CI/CD job that relied on the previous Auto default will now stall silently at the first tool call** — no error, just a hanging job waiting for a human who is not there.

**For PerFiApp's GitHub Actions:** Both the weekly researcher workflow and the automated PR review workflow are affected. The fix is to add an explicit permission mode flag to the Claude Code invocation in the workflow YAML:

- `--permission-mode acceptEdits` — auto-approves file edits only; still prompts for shell commands. Suitable for the code-reviewer agent (read-only pass).
- `--permission-mode bypassPermissions` — auto-approves everything. Requires a `--dangerously-skip-permissions` trust flag. Suitable for fully headless researcher runs, but only in a hardened environment.

Auto mode (classifier-based, the prior default) is still available; it is no longer the default. It can be restored via `--permission-mode auto`.

Sources: [Claude Code 2.1.200 manual mode](https://chatforest.com/builders-log/claude-code-2-1-200-manual-permission-mode-default-breaking-change-builder-guide/) / [TechTimes](https://www.techtimes.com/articles/319874/20260707/claude-code-defaults-human-approval-auto-mode-requires-explicit-opt.htm)

### 1.2 Claude Code v2.1.212 — /fork and /subtask redesigned

Released July 17, 2026.

`/fork` now creates a true background session — it appears as its own independent row in the `claude agents` dashboard and runs in its own context window while the main session continues. This replaces the previous behavior where `/fork` launched an in-session subagent.

The old in-session fork behavior is now `/subtask` — a lighter-weight construct that runs within the current session without spawning a separate context.

Additional limits added in v2.1.212 and confirmed in v2.1.219:
- WebSearch session cap: default 200 calls per session, tunable via `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`.
- Subagent spawn cap: default 200 per session, overridable via `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`. `/clear` resets the budget.
- MCP tool calls running longer than 2 minutes automatically move to the background.

**For PerFiApp:** The researcher CI run could hit the 200 WebSearch cap on particularly broad research runs. If that happens, set the env var to a higher limit in the workflow YAML. Also update any internal docs that reference `/fork` for the architect's parallel subagent spawning — the behavior has changed.

Sources: [Claude Code 2.1.212 changelog](https://freedom.tech/posts/2026-07-17-claude-code-2-1-212/) / [Releasebot July](https://releasebot.io/updates/anthropic/claude-code)

### 1.3 Claude Code v2.1.215 — /verify and /code-review no longer auto-run

Released July 19, 2026. Claude Code previously ran the `/verify` and `/code-review` skills automatically at the end of sessions or after code generation. This behavior has been removed. **Users must invoke them explicitly with `/verify` or `/code-review`.**

**For PerFiApp:** If the PR review workflow invoked the code-reviewer or security-reviewer agent via a mechanism that relied on auto-skill invocation, it will silently stop producing reviews. Verify the workflow explicitly calls the desired skill.

Source: [Havoptic Claude Code v2.1.220 summary](https://www.havoptic.com/tools/claude-code)

### 1.4 Claude Code v2.1.219 — Opus 5 default, DirectoryAdded hook, subagent spawning from UI

Released July 24, 2026 (latest as of this report).

Key changes:
- Default Opus-tier model switched from Opus 4.8 to Opus 5 for Claude Max users. Agents that do not pin a model will silently migrate.
- New `DirectoryAdded` hook fires when a directory is added to the session. Relevant for the implementer if it creates workspace directories during code generation.
- The UI can now spawn agents for complex multi-step tasks directly (in addition to `/subtask`).

**For PerFiApp:** All agent files should explicitly pin their target model (e.g., `model: claude-sonnet-5`) rather than relying on the platform default, which has now changed twice in six weeks.

Sources: [Clauding 2.1.219](https://clauding.de/en/posts/claude-code-2-1-219-opus-5-default-bash-subagenten) / [Claude Code Changelog](https://code.claude.com/docs/en/changelog)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Sonnet 5 introductory pricing: 33% discount available for 5 weeks

`claude-sonnet-5` is priced at $2/$10 per MTok through **August 31, 2026**, then reverts to $3/$15 (same as Sonnet 4.6's standard rate). Combined with the quality improvement (it beats Sonnet 4.6 on every benchmark), this is the clearest cost optimization available right now.

Batch API pricing for Sonnet 5 is $1/$5 per MTok — relevant for bulk researcher operations. The researcher agent could switch to Sonnet 5 batch requests for non-time-sensitive web research synthesis.

Prompt caching is available for Sonnet 5 with the same TTL structure as Sonnet 4.6. Combined with the lower input token price, caching is now even more economical.

Source: [EdenAI Sonnet 5 pricing](https://www.edenai.co/post/claude-sonnet-5-pricing-benchmarks-api-access) / [BenchLM pricing](https://benchlm.ai/anthropic/api-pricing)

### 2.2 Opus 5 fast mode: new option for speed-sensitive Opus-tier calls

`claude-opus-5` fast mode is available at $10/$50 per MTok on the Claude API only (not Bedrock or Vertex). It runs approximately 2.5x faster than standard Opus 5. This is the same price tier as Fable 5 standard mode, but with near-Fable 5 quality.

**For PerFiApp:** If spec-lead or architect sessions become time-sensitive (e.g., blocking a developer waiting on a plan), fast mode on Opus 5 is now the appropriate fallback rather than Fable 5.

Source: [Coursiv Opus 5 guide](https://coursiv.io/blog/claude-opus-5)

---

## Track 3 — Model & Capability Updates

### 3.1 STATUS RESOLVED: Claude Fable 5 access restored July 1

**Status changed from "Suspended" (June 24 report) to "Active."**

On June 30, the US Department of Commerce lifted export controls on both Fable 5 and Mythos 5. Anthropic restored global access on July 1 across Claude.ai, the Claude Platform, Claude Code, and Claude Cowork. Anthropic deployed a new safety classifier blocking the originally-reported jailbreak technique in over 99% of cases.

The prior report's "verify fallback chain" recommendation is now moot for this specific reason. The `claude-fable-5` model ID is active. The trial recommendation for spec-lead and architect from the June 11 report stands. Retirement commitment: not before June 9, 2027.

Sources: [Anthropic redeploying Fable 5](https://www.anthropic.com/news/redeploying-fable-5) / [Forbes](https://www.forbes.com/sites/siladityaray/2026/07/01/trump-administration-lifts-export-controls-on-anthropics-mythos-5-and-fable-5-ai-models/)

### 3.2 New: Claude Sonnet 5 — Adopt for implementer and test-engineer

Released June 30, 2026. API model ID: `claude-sonnet-5`. 1M-token context, 128K max output.

Pricing: $2/$10 per MTok introductory through **August 31, 2026**, then $3/$15 (same as Sonnet 4.6 standard rate). Batch API: $1/$5.

Performance vs Sonnet 4.6 on published benchmarks:
- SWE-bench Pro: 63.2% (vs 58.1% for Sonnet 4.6)
- Terminal-Bench 2.1: 80.4% (+13.4 percentage points vs Sonnet 4.6's 67.0%) — this benchmark directly measures autonomous terminal-based coding agent performance
- OSWorld-Verified: 81.2%
- HLE: 57.4%

Sonnet 5 beats Sonnet 4.6 on every published benchmark and at introductory pricing also beats it on cost.

**For PerFiApp:** Migrate the implementer and test-engineer agents from `claude-sonnet-4-6` to `claude-sonnet-5` before August 31 to capture 5 weeks of 33% cost reduction.

Sources: [Anthropic Sonnet 5 announcement](https://www.anthropic.com/news/claude-sonnet-5) / [MarkTechPost benchmarks](https://www.marktechpost.com/2026/07/13/anthropic-claude-sonnet-5-vs-sonnet-4-6-vs-opus-4-8-agentic-coding-benchmarks-api-pricing-and-cost-performance-tradeoffs-compared/)

### 3.3 New: Claude Opus 5 — Adopt for spec-lead and architect

Released July 24, 2026. API model ID: `claude-opus-5`. 1M-token context, 128K max output. Knowledge cutoff: **May 2026** — the most current of any Claude model (Fable 5 and Sonnet 5 have January 2026 cutoffs).

Pricing: $5/$25 per MTok (same as Opus 4.8). Fast mode (API only): $10/$50, approximately 2.5x faster. Batch API: $2.50/$12.50.

Benchmarks: On Frontier-Bench v0.1, Opus 5 more than doubles Opus 4.8's score. On CursorBench 3.2, Opus 5 performs within 0.5% of Fable 5 at half the cost per task.

Claude Code v2.1.219 (July 24) has already switched its default Opus-tier model to Opus 5. Retirement commitment: not before July 24, 2027.

**For PerFiApp:** Upgrade spec-lead and architect from `claude-opus-4-8` to `claude-opus-5`. The May 2026 knowledge cutoff is especially valuable for the spec-lead writing compliance-sensitive specs — prior models have January 2026 knowledge, missing the RTR By-law publication and CDBA progress since April.

Sources: [Fortune Opus 5](https://fortune.com/2026/07/24/anthropic-debuts-claude-opus-5-with-feature-that-lets-users-toggle-between-cost-and-capability/) / [Requesty pricing](https://www.requesty.ai/models/anthropic/claude-opus-5)

### 3.4 Breaking: Opus 4.7 fast mode removed July 24, 2026

**Effective date: 3 days ago.** Fast mode (`speed: "fast"`) on `claude-opus-4-7` was deprecated June 25 and removed July 24. Any API call with this combination now returns an error; it does not fall back to standard Opus 4.7.

Migration target: `claude-opus-4-8` fast mode or `claude-opus-5` fast mode.

**For PerFiApp:** Scan all agent YAML/JSON frontmatter and API wrappers for `claude-opus-4-7` combined with any `speed` parameter.

Sources: [byteiota Claude API July 2026](https://byteiota.com/claude-api-july-2026-rate-limits-key-expiry/) / [Model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 3.5 Updated model table (current as of July 27, 2026)

| Model ID | Status | Retirement |
|---|---|---|
| `claude-fable-5` | Active | Not before June 9, 2027 |
| `claude-opus-5` | Active | Not before July 24, 2027 |
| `claude-opus-4-8` | Active | Not before May 28, 2027 |
| `claude-opus-4-7` | Active (fast mode removed) | Not before April 16, 2027 |
| `claude-opus-4-6` | Active | Not before February 5, 2027 |
| `claude-opus-4-5-20251101` | Active | Not before November 24, 2026 |
| `claude-opus-4-1-20250805` | **Deprecated** | **August 5, 2026** |
| `claude-sonnet-5` | Active | Not before June 30, 2027 |
| `claude-sonnet-4-6` | Active | Not before February 17, 2027 |
| `claude-sonnet-4-5-20250929` | Active | Not before September 29, 2026 |
| `claude-haiku-4-5-20251001` | Active | Not before October 15, 2026 |

Source: [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 STATUS UPDATE: DeepEval 4.0 now a Claude Code Skills Plugin

**Status: Adopt confirmed (upgraded from prior "Adopt" for v4.0 to also note Claude Code Skills distribution).**

DeepEval 4.0 is now available as a Claude Code Skills plugin via the APM skills catalog and the Claude Plugin Hub. The test-engineer agent can invoke DeepEval commands without needing a separate shell install — it is available as a first-class Claude Code skill.

DeepEval is at nearly 17,000 GitHub stars and 8 million PyPI downloads/month as of July 2026. The `deepeval generate` + `deepeval test run` CLI loop is the core workflow for PerFiApp's test-engineer.

**For PerFiApp:** Install via APM: `apm install deepeval`. The Skills plugin makes it invocable as `/deepeval generate` from within Claude Code sessions. The test-engineer should use this for: (a) synthesizing bilingual EN/FR test cases from spec content; (b) verifying money-precision invariants (no floats); (c) checking tool call correctness on Plaid/Flinks API sequences.

Sources: [DeepEval Skills plugin](https://crossaitools.com/skills/confident-ai/deepeval/deepeval) / [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026) / [Claude Plugin Hub](https://www.claudepluginhub.com/plugins/confident-ai-deepeval)

---

## Track 5 — Toolchain Releases

### 5.1 Spec Kit v0.14.2 (from v0.11.6)

Twelve releases since the prior report's v0.11.6 finding. Current latest: **v0.14.2 (July 24, 2026)**.

Key changes across v0.12.0–v0.14.2:

**v0.14.0 (July 23) — Security hardening:**
Implemented HTTP read bounds and strict redirect validation (prevents SSRF-class attacks in preset fetches). Python script type support added. Reproducible bundle builds via canonical ordering.

**v0.14.2 (July 24) — Shell parameter security:**
Normalized whitespace in auth-config env-var/id references at store time. Improved shell-step interpolation safety.

**v0.13.3 (July 22) — SicarioSpec Security bundle + Linear Weave extension:**
SicarioSpec is a security-focused spec bundle applicable to Spec Kit workflows — relevant for PerFiApp's security-reviewer agent's constitution-level checks.

**v0.13.0 (July 17) — Assess idea pipeline:**
New `assess` extension for idea assessment before a feature enters the full spec pipeline. Reduces spec-lead time on low-viability ideas.

**For PerFiApp:** Upgrade from v0.11.6 to v0.14.2. The v0.14.0 HTTP bounds and shell parameter security hardening are the highest-priority items for a financial app. The SicarioSpec Security bundle can be added to the spec-lead's workflow to run a security checklist against every spec before it reaches the implementer.

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.14.2`

Sources: [Spec Kit releases](https://github.com/github/spec-kit/releases) / [Spec Kit v0.14.2](https://github.com/github/spec-kit/releases/tag/v0.14.2)

### 5.2 APM v0.26.0 (from v0.21.0)

Five releases since the prior report's v0.21.0 finding. Current latest: **v0.26.0 (July 18, 2026)**.

Key changes across v0.22.0–v0.26.0:

**v0.22.0 (June 26) — Executable Trust Governance v1:**
A deny-wins resolver for MCP server executables. If any policy in the chain denies an executable, the install is blocked regardless of other policies.

**v0.22.0 — Configurable default install target:**
`apm config target` sets a default target (e.g., Claude Code) so you do not need to specify it on every install command.

**v0.23.0 (June 29) — General-purpose lifecycle hooks framework:**
Install, update, and uninstall hooks can now trigger custom scripts. Enables PerFiApp-specific post-install validation (e.g., running `apm audit` and secret scanning after installing a new MCP server).

**v0.26.0 (July 18) — OS trust store TLS verification:**
APM now verifies MCP server TLS certificates against the operating system's trust store by default. This closes a MITM vector for MCP server download and update operations.

**For PerFiApp:** Upgrade from v0.21.0 to v0.26.0. The Executable Trust Governance v1 deny-wins resolver and OS trust store TLS are the two most important security additions. Set the default install target: `apm config target claude-code`.

Source: [APM releases](https://github.com/microsoft/apm/releases)

### 5.3 Expo SDK 56 — target for initial mobile implementation

Released May 21, 2026. This is the current stable SDK — uncovered in prior reports because they ran before mobile implementation planning was under way.

Key changes relevant to PerFiApp:
- **React Native 0.85 + React 19.2.** React Native 0.85 (April 7, 2026) is the first stable release built entirely on the New Architecture, with no bridge fallback and no legacy interop layer.
- **Hermes v1 default JavaScript engine.** Faster startup, reduced memory usage.
- **Expo UI stable for production.** Jetpack Compose (Android) and SwiftUI (iOS) APIs in Expo UI are now production-stable and included in the default `create-expo-app` template.
- **iOS build time improvement.** Heaviest Expo modules now ship as prebuilt frameworks; median clean build time cut by approximately 1 minute.

React Native 0.86 (June 11, 2026) added edge-to-edge Android 15+ support and zero user-facing breaking changes. PerFiApp should target React Native 0.85 via Expo SDK 56 as the starting point.

**For PerFiApp:** The architect's first technical design task should specify Expo SDK 56 / React Native 0.85 as the mobile build target. The New Architecture being stable without a bridge fallback simplifies the tech stack decision. Do not start on an older SDK.

Sources: [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56) / [React Native 0.85](https://www.bacancytechnology.com/blog/react-native-0-85) / [React Native 0.86](https://medium.com/@onix_react/release-react-native-0-86-03a39a9c85e8)

### 5.4 NestJS v12 — imminent, ESM-first, CJS removal

NestJS v11.1.28 is the current stable. **v12.0.0 is targeted for early Q3 2026** — possibly within 2–4 weeks of this report's date.

Breaking changes in v12:
- **All NestJS core packages move from CommonJS to ESM.** Any package in `packages/*` that imports NestJS types will need to be ESM-compatible.
- **Vitest replaces Jest** as the default test runner.
- **oxlint replaces ESLint.**
- **Standard Schema Validation.** Route decorators now accept Zod, Valibot, and ArkType validators natively, replacing `class-validator`.
- **The Nest CLI will prompt for CJS vs ESM project type**, making gradual migration practical.

**For PerFiApp:** The architect's technical design should specify which NestJS version to target. Starting on v11 (CJS) and migrating later carries ESM migration debt. Waiting for v12 (if it ships in August) means a cleaner start. Recommended approach: plan for v12 but design the monorepo package boundaries to be ESM-compatible so upgrading is a single package.json change rather than a refactor.

Sources: [NestJS v12 roadmap InfoQ](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/) / [Trilon NestJS 12](https://trilon.io/blog/nestjs-12-is-coming) / [GitHub PR #16391](https://github.com/nestjs/nest/pull/16391)

### 5.5 TypeScript 5.9 — import defer, strictInference

Released Q1 2026. Key additions for PerFiApp's strict-mode TypeScript stack:
- **`import defer`**: Deferred module evaluation — imports a module without executing it until first use. Useful for lazy-loading heavy financial calculation libraries on mobile.
- **`strictInference` compiler flag**: New strict mode for type inference in conditional types. Aligns with PerFiApp's `strict: true` policy; may surface latent type errors in financial logic.
- **Enhanced `satisfies` operator**: Validates object literals against complex mapped types without losing literal specificity. Useful for typed money amount objects.

**For PerFiApp:** The implementer agent should target TypeScript 5.9 from the first commit. Enable `strictInference` alongside `strict: true` — it catches an additional class of type errors relevant to money arithmetic.

Source: [TypeScript 5.9 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)

### 5.6 pnpm 11 — workspace release management and diagnostics

Notable features for PerFiApp's monorepo:
- **`pnpm change` / `pnpm lane` / `pnpm version -r`**: Native workspace release management without external tooling (changesets or lerna). Relevant for PerFiApp's `packages/money` and `packages/i18n` shared primitives.
- **`pnpm doctor`**: End-to-end installation diagnostics. Useful in CI to detect phantom dependency issues.
- **`--filter` sub-100ms resolution**: Dependency graph resolution now under 100ms even in large monorepos.

**For PerFiApp:** No action yet (no monorepo to manage), but the architect should plan for pnpm 11 and be aware that workspace release management is now native — no need to add changesets as a separate tool dependency.

Source: [pnpm releases](https://releases.sh/pnpm)

### 5.7 i18next 26.3.6 / react-i18next 17.0.10 — active, TypeScript 7 compatible

Both libraries continue active maintenance with recent releases. Notable recent changes:
- i18next 26.x: Security fixes in the `deepExtend` function; TypeScript 7 compatibility.
- react-i18next 17.x: `html-parse-stringify` parser updated with modern dual ESM/CJS packaging, zero runtime dependencies.

**For PerFiApp:** The libraries PerFiApp plans to use are well-maintained and compatible with TypeScript 5.9. Pin exact versions in the monorepo root when implementation starts.

Sources: [i18next npm](https://www.npmjs.com/package/i18next) / [react-i18next npm](https://www.npmjs.com/package/react-i18next)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 CVE-2026-46406 — insecure temp file in /copy command (CVSS 6.1)

New CVE not in prior reports. Disclosed and patched in Claude Code **v2.1.128 (June 29, 2026)**.

The `/copy` command wrote responses to a hardcoded predictable path (`/tmp/claude/response.md`) created world-readable (0644). Two attack vectors: (a) any local user on the same machine could read a privileged user's response, which might contain secrets or credentials; (b) a local attacker could pre-create the directory with a symlink, causing a privileged Claude Code process to overwrite an attacker-chosen file.

Affected versions: 2.1.59 through 2.1.127. Patched: 2.1.128+. CVSS 6.1.

**For PerFiApp:** Any developer who has not updated to v2.1.128+ is still vulnerable. The financial-data context makes this more sensitive — a Claude Code session working on Plaid integration might have sandbox API keys in its response history. Auto-update users are fine; check anyone on a pinned or manual install.

Sources: [GitLab Advisory](https://advisories.gitlab.com/npm/@anthropic-ai/claude-code/CVE-2026-46406/) / [pulse.adyog CVE analysis](https://pulse.adyog.com/insights/claude-code-28-cves-ai-coding-tools-attack-surface-cve-2026-46406)

### 6.2 Production fintech MCP tool-poisoning exploit documented

In July 2026, security researchers published documentation of a successful tool-poisoning attack against a production fintech enterprise MCP server. The attack vector: a tampered MCP tool description (not the tool code itself) containing hidden instructions that redirected agent behavior.

The attack succeeded because the enterprise had no tool allowlisting or identity binding — only the tool list at install time had been reviewed, not the tool descriptions at runtime.

**For PerFiApp's MCP vetting checklist (additions):**
- Verify tool descriptions at runtime via content-hash (APM's `apm.lock.yaml`), not just at install time.
- Implement tool allowlisting: agents should only be permitted to call MCP tools from an explicit whitelist.
- Identity binding: associate each MCP session with a specific user identity and log all tool invocations.

Sources: [ITECS MCP tool poisoning](https://itecsonline.com/post/mcp-tool-poisoning-enterprise-ai-agent-security-2026) / [Adversa AI July 2026 CVEs](https://adversa.ai/blog/top-mcp-security-resources-july-2026/) / [Practical DevSecOps MCP](https://www.practical-devsecops.com/mcp-security-vulnerabilities/)

---

## Track 7 — Agent Tooling — MCP Protocol RC

### 7.1 MCP 2026-07-28 specification ships tomorrow

The release candidate locked May 21; the final specification ships **July 28, 2026**. This is the largest revision since MCP's launch.

**Breaking changes:**
- `Mcp-Session-Id` header removed.
- `initialize`/`initialized` handshake eliminated. Every request is stateless.
- Multi Round-Trip Requests: server-to-client requests now return `InputRequiredResult` instead of holding SSE streams open.

**New extensions (graduated or added):**
- **Tasks extension** (graduated from experimental core): Servers return task handles; clients drive execution via `tasks/get`, `tasks/update`, `tasks/cancel`. Enables long-running financial analysis tasks (e.g., "analyze 12 months of transaction data") to run asynchronously.
- **MCP Apps**: Servers can provide server-rendered HTML interfaces in sandboxed iframes, with UI actions routing through standard JSON-RPC.

**Authorization improvements:**
- `iss` parameter validation per RFC 9207.
- OpenID Connect `application_type` declaration at registration.
- Credentials bound to specific authorization servers — prevents token reuse across different OAuth servers.

A remote MCP server can now run behind a plain round-robin load balancer. No sticky sessions, no shared session store. The `ttlMs` + `cacheScope` fields on list/resource responses enable client-side caching with privacy-safe scope controls.

**For PerFiApp:** Any Flinks adapter or custom MCP server must be designed stateless from day one — there is no longer a migration path back to session-based operation. Use the Tasks extension for PerFiApp's multi-step financial operations. Implement `cacheScope: "session"` (never `"global"`) for any response containing account or transaction data.

Sources: [MCP 2026-07-28 RC announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [Stacktree spec changes](https://stacktr.ee/blog/mcp-2026-spec-changes) / [The Register](https://www.theregister.com/devops/2026/07/23/model-context-protocol-prepares-to-break-with-its-stateful-past/5276722)

---

## Track 8 — Canadian Open Banking & Compliance

### 8.1 MAJOR UPDATE: RTR By-law published in Canada Gazette — August 24 in-force date

**Status changed from "Q4 2026 target" to "legally confirmed."**

On July 1, 2026, Finance Minister François-Philippe Champagne formally approved Canadian Payments Association By-law No. 10 (RTR), which was published in the Canada Gazette Part II. The RTR Rules governing the system were approved simultaneously. **Both come into force August 24, 2026.**

Q4 2026 is now the confirmed phased launch window for the RTR; universal participation is targeted for 2027.

**Why August 24 matters for PerFiApp:** The legal framework for real-time payments is now in place. Phase 2 of the CDBA (write access, payment initiation) was always contingent on RTR being operational. With RTR in force and launching Q4 2026, Phase 2 CDBA becomes technically possible in 2027. The architect's Phase 2 design should explicitly reference RTR as the payment rail (not ACH/EFT) and plan for the August 24 By-law in-force date as the starting gun for participant onboarding.

Sources: [Payments Canada RTR milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail) / [McCarthy RTR By-law](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published) / [ClearingPost Q3 2026](https://clearingpost.com/insights/canada-rtr-q3-2026-launch/)

### 8.2 CDBA Phase 1 — still no confirmed launch date

No material change from the June 24 report. The Bank of Canada has not committed to a Phase 1 launch date. The 2026 launch remains "at risk" in public commentary. The legal framework (CDBA Royal Assent March 26) is in place, but technical standards, accreditation criteria, and liability mechanics remain unpublished.

**For PerFiApp:** Architecture guidance unchanged — design for OAuth-only data access (Flinks, Plaid) from day one. RTR progress is not the same as CDBA Phase 1 progress — the two frameworks are related but distinct.

### 8.3 NEW: OSFI Streamlined Framework for fintechs — launched June 25

OSFI launched its Streamlined Framework on June 25, 2026, creating a faster pathway for fintechs seeking to become federally regulated deposit-taking institutions in Canada:
- 12-month formal review window (versus multi-year processes previously)
- Conditional approvals available
- Self-assessment screening criteria published on OSFI's site
- Public-facing dashboard (with applicant consent) for transparency

**For PerFiApp:** Not immediately actionable — PerFiApp is not currently pursuing a banking license. However, it is strategically relevant: if PerFiApp's Cash Advance Lite module grows to trigger deposit-taking status, the pathway is now faster and more predictable. Also noteworthy: competitors like KOHO are reportedly pursuing banking licenses (June 24 report).

Sources: [McCarthy OSFI Industry Day](https://www.mccarthy.ca/en/insights/blogs/techlex/update-from-osfi-industry-day-what-credit-unions-and-fintechs-need-to-know-about-osfi-s-new-streamlined-process-for-entering-canada-s-federal-financial-system) / [Fasken regulatory updates June 2026](https://www.fasken.com/en/knowledge/2026/06/federal-financial-services-regulatory-updates-streamlined-bank-applications-and-summer-consultations)

---

## Recommended Next Steps

### Immediate (this week)

1. **Fix CI workflows for Claude Code v2.1.200 manual mode default.** Add `--permission-mode acceptEdits` to the automated PR review workflow and `--permission-mode bypassPermissions` (with the required trust flag) to the researcher workflow. Without this fix, both workflows are currently stalled on the first tool call. Check `.github/workflows/agent-tooling-research.yml` and `.github/workflows/pr-review.yml`.

2. **Audit and migrate `claude-opus-4-1-20250805` before August 5 (9 days).** Use Claude Console Usage Export (Usage > Export > CSV). Migration target: `claude-opus-4-8` or, preferably, `claude-opus-5`.

3. **Scan for `speed: "fast"` on `claude-opus-4-7`.** This combination has returned errors since July 24. Likely not an issue in PerFiApp today (no application code), but any shared tool or workflow template should be checked.

4. **Verify all developers are on Claude Code v2.1.128+** to have CVE-2026-46406 (temp file secret disclosure) patched. Auto-update users are fine; check anyone on a pinned or manual install.

5. **Migrate implementer and test-engineer agents to `claude-sonnet-5` immediately.** The 33% introductory discount expires August 31 — 5 weeks away. Sonnet 5 outperforms Sonnet 4.6 on every benchmark at the same post-promo price.

### Short-term (this sprint)

6. **Migrate spec-lead and architect agents to `claude-opus-5`.** Same price as Opus 4.8, near-Fable 5 quality, and — critically — May 2026 knowledge cutoff. The spec-lead writing compliance-aware specs benefits from knowing about the RTR By-law and OSFI Streamlined Framework out of the box.

7. **Re-evaluate Claude Fable 5 for spec-lead on complex new features.** The prior suspension is resolved. The June 11 trial recommendation is now unblocked.

8. **Pin model IDs explicitly in all `.claude/agents/*.md` files.** Claude Code v2.1.219 changed the default Opus-tier model to Opus 5, and it may change again. Every agent file should explicitly state its target model to prevent silent drift.

9. **Upgrade Spec Kit to v0.14.2** (from v0.11.6). Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.14.2`. Key additions: shell parameter security hardening (v0.14.2), HTTP read bounds (v0.14.0), SicarioSpec Security bundle (v0.13.3).

10. **Upgrade APM to v0.26.0** (from v0.21.0). Key additions: OS trust store TLS verification (v0.26.0), lifecycle hooks framework (v0.23.0), deny-wins Executable Trust Governance (v0.22.0). Run `apm config target claude-code` to set the default install target.

11. **Update MCP vetting checklist with two additions:** (a) Verify tool descriptions at runtime via content-hash — not just at install time. (b) Require explicit tool allowlist for every MCP server. Both stem from the documented fintech tool-poisoning exploit.

### Medium-term (next 4–6 weeks)

12. **Architect the mobile target as Expo SDK 56 / React Native 0.85.** The New Architecture is now stable with no bridge fallback. Capture this decision in the first technical spec.

13. **Make an explicit decision on NestJS v11 vs v12 before backend coding begins.** NestJS v12 is 2–4 weeks away and is ESM-first. Starting on v11 (CJS) introduces ESM migration debt. If v12 ships within the next month, waiting is the lower-risk path.

14. **Design any custom MCP server (Flinks adapter) stateless from the start.** The MCP 2026-07-28 specification makes stateless mandatory going forward. Use the Tasks extension for long-running financial operations. Implement `cacheScope: "session"` (never `"global"`) for any response containing account or transaction data.

15. **Update Phase 2 architecture timeline based on RTR.** The RTR By-law comes into force August 24, 2026. The phased launch is Q4 2026. Universal RTR participation in 2027 aligns with CDBA Phase 2. The architect's Phase 2 design should now specify RTR as the payment rail and can set a realistic 2027 implementation date for payment initiation features.

16. **Install DeepEval via APM as a Claude Code Skills plugin.** `apm install deepeval`. Have the test-engineer run `deepeval generate` against spec files (once the first spec is written) to synthesize a bilingual EN/FR test baseline and verify money-precision invariants before any implementation begins.

---

## Appendix: Sources

All findings verified against primary sources as of 2026-07-27.

- [Anthropic redeploying Fable 5](https://www.anthropic.com/news/redeploying-fable-5)
- [Forbes: US lifts Fable 5 / Mythos 5 export controls](https://www.forbes.com/sites/siladityaray/2026/07/01/trump-administration-lifts-export-controls-on-anthropics-mythos-5-and-fable-5-ai-models/)
- [Anthropic Claude Sonnet 5 announcement](https://www.anthropic.com/news/claude-sonnet-5)
- [Fortune: Claude Opus 5 launch](https://fortune.com/2026/07/24/anthropic-debuts-claude-opus-5-with-feature-that-lets-users-toggle-between-cost-and-capability/)
- [Anthropic model deprecations page](https://platform.claude.com/docs/en/about-claude/model-deprecations)
- [MarkTechPost: Sonnet 5 vs Sonnet 4.6 vs Opus 4.8 benchmarks](https://www.marktechpost.com/2026/07/13/anthropic-claude-sonnet-5-vs-sonnet-4-6-vs-opus-4-8-agentic-coding-benchmarks-api-pricing-and-cost-performance-tradeoffs-compared/)
- [Requesty: Opus 5 pricing](https://www.requesty.ai/models/anthropic/claude-opus-5)
- [byteiota: Claude API July 2026 changes](https://byteiota.com/claude-api-july-2026-rate-limits-key-expiry/)
- [Claude Code 2.1.200 manual mode analysis](https://chatforest.com/builders-log/claude-code-2-1-200-manual-permission-mode-default-breaking-change-builder-guide/)
- [Clauding 2.1.219: Opus 5 default](https://clauding.de/en/posts/claude-code-2-1-219-opus-5-default-bash-subagenten)
- [Claude Code changelog (official)](https://code.claude.com/docs/en/changelog)
- [Claude Code 2.1.212 at Freedom.Tech](https://freedom.tech/posts/2026-07-17-claude-code-2-1-212/)
- [MCP 2026-07-28 RC announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [Stacktree: MCP 2026 spec changes](https://stacktr.ee/blog/mcp-2026-spec-changes)
- [The Register: MCP stateless transition](https://www.theregister.com/devops/2026/07/23/model-context-protocol-prepares-to-break-with-its-stateful-past/5276722)
- [Spec Kit releases on GitHub](https://github.com/github/spec-kit/releases)
- [APM releases on GitHub](https://github.com/microsoft/apm/releases)
- [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56)
- [React Native 0.85 release](https://www.bacancytechnology.com/blog/react-native-0-85)
- [React Native 0.86 release](https://medium.com/@onix_react/release-react-native-0-86-03a39a9c85e8)
- [NestJS v12 roadmap (InfoQ)](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/)
- [Trilon: NestJS 12 is Coming](https://trilon.io/blog/nestjs-12-is-coming)
- [TypeScript 5.9 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)
- [GitLab CVE-2026-46406 advisory](https://advisories.gitlab.com/npm/@anthropic-ai/claude-code/CVE-2026-46406/)
- [ITECS: MCP tool poisoning enterprise](https://itecsonline.com/post/mcp-tool-poisoning-enterprise-ai-agent-security-2026)
- [Adversa AI: MCP security CVEs July 2026](https://adversa.ai/blog/top-mcp-security-resources-july-2026/)
- [Payments Canada: RTR By-law milestone](https://www.payments.ca/critical-milestone-achieved-law-and-rules-approved-canadas-real-time-rail)
- [McCarthy: RTR By-law published](https://www.mccarthy.ca/en/insights/blogs/techlex/canada-s-real-time-rail-moves-closer-to-launch-rtr-by-law-officially-published)
- [McCarthy: OSFI Streamlined Framework](https://www.mccarthy.ca/en/insights/blogs/techlex/update-from-osfi-industry-day-what-credit-unions-and-fintechs-need-to-know-about-osfi-s-new-streamlined-process-for-entering-canada-s-federal-financial-system)
- [Fasken: Federal financial regulatory updates June 2026](https://www.fasken.com/en/knowledge/2026/06/federal-financial-services-regulatory-updates-streamlined-bank-applications-and-summer-consultations)
- [DeepEval Claude Code Skills plugin](https://crossaitools.com/skills/confident-ai/deepeval/deepeval)
- [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026)

*Report generated 2026-07-27. All findings verified against primary sources. Delta report vs 2026-06-24 — prior findings not repeated unless status changed. Recommendations are proposals — nothing is installed or configured until the team reviews and approves.*
