# PerFiApp Agent Research — 2026-07-13

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: model updates (Fable 5 restored + Sonnet 5 launch), CDBA draft regulations, toolchain releases (TypeScript 7 / Expo SDK 57 / NestJS v12), Claude Code breaking changes (v2.1.200–207), and new MCP security advisories.

---

## Executive Summary

Five findings require action this week or in the next two weeks:

1. **Claude Sonnet 5 launched June 30 — rethink the entire agent tier model.** At $2/MTok input through August 31 (then $3), Sonnet 5 matches Opus 4.8's capability on many agentic-coding tasks at 40–60% the cost. The implementer, test-engineer, and code-reviewer agents should migrate from Sonnet 4.6 to Sonnet 5 now while the introductory price holds.

2. **Claude Fable 5 fully restored July 1 — with a trade-off.** The 19-day export-control suspension is over. Fable 5 is back globally with a new cybersecurity classifier. The classifier blocks the jailbreak (99%+ success) but also flags more routine coding and debugging requests, falling back to Opus 4.8 automatically. Spec-lead and architect can now trial Fable 5 again — but plan for Opus 4.8 fallbacks on security-sensitive code generation. Metered API pricing ($10/$50/MTok) starts July 20.

3. **CDBA draft regulations published June 27 — 60-day comment period closes August 26.** This is the first concrete view of what CDBA accreditation will actually require of fintechs: MFA, 99.5% API uptime SLA, 12-month max consent windows, $2,500 application fee, 5-year record retention, breach notification "as soon as feasible." The architect needs these parameters now — they directly affect PerFiApp's data-layer and consent-management design.

4. **Claude Code v2.1.200 changed default permission mode to "Manual" (July 3) — breaks CI.** The research CI workflow (`agent-tooling-research.yml`) and the PR review workflow both invoke Claude Code non-interactively. Without adding `--permission-mode acceptEdits` to those invocations, they stall waiting for human input. This is an active breakage if the workflows run before the fix.

5. **TypeScript 7.0 is NOT compatible with Expo SDK 57 — do not upgrade.** TypeScript 7.0 GA shipped July 8. Expo SDK 57 expects TypeScript ~6.0.3 and fails with a "Cannot read properties of undefined (reading 'CommonJS')" error on `app.config.ts` when TypeScript 7.0 is installed. PerFiApp must stay on TypeScript 6.x until Expo resolves this.

---

## Recommendations Table

| Finding | Track | Helps | Verdict |
|---|---|---|---|
| **Claude Sonnet 5 ($2/$10 intro through Aug 31)** | Model / Cost | implementer, test-engineer, code-reviewer | **Adopt — migrate now while price is lower** |
| **Fable 5 restored (July 1) + cybersecurity classifier** | Model | spec-lead, architect | **Adopt — re-enable trial; note coding false-positive risk** |
| **Fable 5 API credit pricing starts July 20** | Cost | All agents | **Act — track usage before July 20** |
| **CDBA draft regulations (June 27) — Aug 26 comment deadline** | Compliance | architect, spec-lead | **Act — architect must read and incorporate into data-layer design** |
| **Claude Code v2.1.200 permission mode default → Manual** | Toolchain | CI workflows | **Act — fix CI invocations before next workflow run** |
| **TypeScript 7.0 incompatible with Expo SDK 57** | Toolchain | All developers | **Act — pin TypeScript to 6.x; do not upgrade** |
| **Bill C-36 (PPCDA) tabled June 15** | Compliance | architect, spec-lead | **Monitor — at first reading; not law; watch progress** |
| **Expo SDK 57 (React Native 0.86) — easy upgrade** | Toolchain | implementer | **Adopt — non-breaking upgrade when development begins** |
| **NestJS v12 (early Q3 2026) — ESM + Vitest** | Toolchain | architect, implementer | **Watch — imminent; design new modules for ESM now** |
| **pnpm 11 — pure ESM, Node.js 22 required** | Toolchain | architect | **Watch — assess monorepo impact before adopting** |
| **MCP 2026-07-28 RC (15 days away)** | Agent tooling | architect | **Act — begin validating any custom MCP work against stateless model** |
| **Spec Kit v0.12.8 (from v0.11.6)** | Toolchain | spec-lead | **Adopt — upgrade; new Python scripts, label-driven workflows** |
| **APM v0.22.0 (from v0.21.0)** | Toolchain | All developers | **Adopt — .zip default, AAD auth fallback** |
| **Claude Code v2.1.207 shell injection fix** | Security | All agents | **Act — update to latest; plugin hook injection surface closed** |
| **Claude Code v2.1.207 auto mode config breaking changes** | Toolchain | CI / agent files | **Act — audit settings.local.json and plugin configs** |
| **Amazon Q MCP CVSS 8.5 (auto-load workspace configs)** | Security | architect | **Act — add workspace-config isolation to MCP vetting checklist** |
| **MCP Mid-Session Tool Injection (85% success rate)** | Security | architect, code-reviewer | **Act — update vetting checklist; prefer allowlisted tool schemas** |
| **OSFI streamlined fintech banking license (June 25)** | Compliance | spec-lead | **Monitor — competitive awareness; not a near-term PerFiApp action** |

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS RESOLVED: Claude Fable 5 fully restored July 1, 2026

The 19-day export-control suspension (June 12 – June 30) is over. The US Department of Commerce lifted the controls June 30; Fable 5 and Mythos 5 returned to global availability July 1.

**What changed:** Anthropic deployed an improved cybersecurity safety classifier targeting the Amazon-discovered jailbreak. The classifier blocks that technique in >99% of cases. The downside: it also flags benign coding and debugging requests more often than before, automatically falling back to Opus 4.8 for flagged requests. Anthropic has committed to refining the balance to reduce false positives.

**For PerFiApp:** Re-enable the Fable 5 trial for spec-lead and architect. However, the false-positive risk on security-sensitive code generation is new context — if the spec-lead asks Fable 5 to reason about authentication flows or financial API integration patterns, some requests may be blocked and silently routed to Opus 4.8. This is acceptable behavior (the fallback works) but means output quality may vary between runs on security-adjacent tasks.

**Pricing note:** Fable 5 API pricing at $10/$50/MTok takes effect July 20 (7 days from this report). Any automation using Fable 5 via the API will incur charges starting that date. Monitor usage now.

Sources: [Anthropic — redeploying Fable 5](https://www.anthropic.com/news/redeploying-fable-5) / [CNBC](https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html) / [MarkTechPost](https://www.marktechpost.com/2026/07/01/anthropic-redeploys-claude-fable-5-on-july-1-after-us-export-controls-lift-adds-new-cybersecurity-classifier/)

### 1.2 NEW: Claude Sonnet 5 — near-Opus performance at Sonnet pricing

Launched June 30, 2026. API ID: `claude-sonnet-5` (verify the models overview for the dated version ID before pinning in agent files).

**Key capabilities:** Anthropic describes Sonnet 5 as "the most agentic Sonnet model yet." On agentic-coding benchmarks it scores 63.2% (vs Sonnet 4.6's 58.1% and Opus 4.8's 69.2%). Multi-step tool use, browser automation, and long-horizon software engineering are primary use cases.

**Tokenizer change:** Sonnet 5 uses an updated tokenizer producing 1.0–1.35× more tokens for the same input compared to Sonnet 4.6. Update token budget estimates before switching agent system prompts.

**Pricing:**
- Introductory: $2/MTok input, $10/MTok output (through August 31, 2026)
- Standard: $3/MTok input, $15/MTok output

**Revised agent tier model for PerFiApp:**

| Agent | Recommended model | Rationale |
|---|---|---|
| **spec-lead** | `claude-fable-5` (trial) / `claude-opus-4-8` fallback | Long-horizon spec and constitution work benefits most from Fable 5 |
| **architect** | `claude-fable-5` (trial) / `claude-opus-4-8` fallback | Technical design depth; same reasoning as spec-lead |
| **implementer** | `claude-sonnet-5` | Near-Opus agentic coding at lower cost |
| **test-engineer** | `claude-sonnet-5` | Test authoring and verification benefit from improved agentic capability |
| **code-reviewer** | `claude-sonnet-5` or `claude-haiku-4-5` | Sonnet 5 for complex diffs; Haiku for quick checks |
| **security-reviewer** | `claude-sonnet-5` | Better reasoning on auth/IDOR patterns than Sonnet 4.6; stay off Fable 5 for security tasks to avoid false-positive classifier hits |
| **researcher** | `claude-sonnet-5` | Web research benefits from improved reasoning |

Sources: [Anthropic — Introducing Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5) / [TechCrunch](https://techcrunch.com/2026/06/30/anthropic-launches-claude-sonnet-5-as-a-cheaper-way-to-run-agents/)

### 1.3 Model table (current as of July 13, 2026)

| Model ID | Status | Input / Output ($/MTok) | Notes |
|---|---|---|---|
| `claude-fable-5` | Active (restored July 1) | $10 / $50 | Cybersecurity classifier active; falls back to Opus 4.8 on flagged requests |
| `claude-opus-4-8` | Active | $5 / $25 | Fable 5 fallback target |
| `claude-sonnet-5` | **NEW** Active | $2/$10 intro (→ $3/$15 Sep 1) | Near-Opus agentic coding; updated tokenizer |
| `claude-sonnet-4-6` | Active | $3 / $15 | Superseded by Sonnet 5 for most uses |
| `claude-haiku-4-5` | Active | $1 / $5 | Still valid for Tier 3 lightweight tasks |
| `claude-opus-4-1-20250805` | **Deprecated** | — | **Retires August 5, 2026 — 23 days** |

Source: [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) / [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Sonnet 5 introductory pricing window — act before August 31

The $2/$10 rate on Sonnet 5 is 33% cheaper than Sonnet 4.6's standard $3/$15. Since Sonnet 5 is also materially more capable, the introductory period is a double optimization: lower cost, better output. Any research CI runs or automated PR review jobs should switch to Sonnet 5 before September 1 to capture this window.

**Caveat:** Sonnet 5's tokenizer produces up to 35% more tokens for the same input text. On very long system prompts (the implementer and security-reviewer agents have substantial prompts), actual costs may be similar to Sonnet 4.6 at the intro rate. Measure before assuming savings.

### 2.2 Fable 5 API credit pricing starts July 20 — track now

Fable 5 API usage has been "included" for Pro/Max users. Starting July 20, API calls to Fable 5 will be billed at metered rates ($10/$50/MTok). Check Claude Console Usage → Export → filter by model. Identify any automation using Fable 5. Either switch to Sonnet 5 (better value for most tasks) or accept the Fable 5 rate as intentional. The research runner currently on Sonnet 4.6 is unaffected but should migrate to Sonnet 5 anyway.

Source: [Digital Applied — Fable 5 pricing guide](https://www.digitalapplied.com/blog/claude-fable-5-usage-credits-july-7-pricing-guide-2026)

---

## Track 3 — Agent Tooling (MCP Servers & Claude Code Features)

### 3.1 BREAKING: Claude Code v2.1.200 — default permission mode changed to "Manual" (July 3)

This is the highest-priority operational change in this report.

In v2.1.200, Claude Code's default permission mode changed from "allow" to **"Manual"** across CLI, VS Code, JetBrains, and the `--help` output. In Manual mode, every file write, shell command, and network call requires human confirmation before proceeding. Unattended workflows stall indefinitely.

**For PerFiApp's CI workflows:** Both `agent-tooling-research.yml` and `pr-review.yml` invoke Claude Code non-interactively. Without explicitly setting a permissive mode, both workflows will stall at the first tool call. The fix is to add `--permission-mode acceptEdits` to the Claude Code invocation in each workflow.

**Additional changes in v2.1.200:** `AskUserQuestion` dialogs no longer auto-continue by default — another stall vector for automated workflows.

**Naming note:** The `settings.json` config key remains `default` (not renamed to `manual`). Existing `settings.json` files using `"defaultMode": "default"` do not break.

Sources: [Claude Code 2.1.200 analysis](https://chatforest.com/builders-log/claude-code-2-1-200-manual-permission-mode-default-breaking-change-builder-guide/) / [Start Debugging](https://startdebugging.net/2026/07/claude-code-2-1-200-renames-default-permission-mode-to-manual/)

### 3.2 Claude Code v2.1.188–207 — additional key changes since June 24

**v2.1.198 — Subagents run in background by default**
Claude Code now continues working while subagents execute, receiving notifications when they finish. Previously the main session blocked waiting for subagents. The `/agents` wizard is also removed — manage agent files directly in `.claude/agents/` (which PerFiApp already does correctly).

**v2.1.199 — Rate-limit auto-retry with backoff**
Transient 429 rate-limit errors now auto-retry with exponential backoff for subscribers. This benefits the research CI run, which could be throttled during busy periods.

**v2.1.205 — Transcript tampering blocked in auto mode**
Auto mode now refuses to execute commands that modify session transcript files, closing a class of attacks where a malicious MCP server could alter audit trails.

**v2.1.207 — Shell injection fix for plugin hooks (SECURITY)**
Plugin hooks and monitors now reject shell-form commands that reference `${user_config.*}` variables. This closes a prompt-injection vector where a malicious config value could inject arbitrary shell commands through plugin hooks.

**v2.1.207 — BREAKING: auto mode reads from user-level settings only**
`autoMode` setting is no longer read from repo-level `.claude/settings.local.json`. It must be in `~/.claude/settings.json` (user-level). Any developer who was enabling auto mode via a repo-level local settings file will silently lose that setting.

**v2.1.207 — BREAKING: plugin config no longer reads from project-level settings**
Plugin option values are no longer read from `.claude/settings.json` at the project level. Developers who configured plugins through project settings must move those values to their user-level settings.

Source: [Claude Code releases](https://github.com/anthropics/claude-code/releases) / [Gradually AI changelog](https://www.gradually.ai/en/changelogs/claude-code/)

### 3.3 MCP 2026-07-28 release candidate — 15 days away

The MCP stateless RC publishes July 28 (15 days from this report). This was flagged in the June 24 report as "medium-term." It is now immediate.

**What changes in the RC:**
- Sessions removed at the protocol layer (`Mcp-Session-Id` header gone)
- `Mcp-Method` and `Mcp-Name` headers required on Streamable HTTP
- `ttlMs` + `cacheScope` on list/resource-read results for structured caching
- MCP Apps: servers can ship sandboxed HTML UIs rendered in iframes
- W3C Trace Context propagation in `_meta`

**New security challenge:** The stateless shift removes session hijacking as an attack surface but introduces header-based attacks — forged `Mcp-Method` and `Mcp-Name` headers can potentially route requests to unintended handlers in load-balanced deployments. Any custom MCP server PerFiApp builds (e.g., a Flinks adapter) must validate these headers server-side.

**For PerFiApp:** No custom MCP servers exist yet, so there is no migration to do. Build any Flinks adapter or custom server stateless from the start. Add header validation to the MCP server security checklist.

Sources: [MCP RC announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [WorkOS analysis](https://workos.com/blog/mcp-2026-spec-agent-authentication) / [SC Media security note](https://www.scworld.com/brief/model-context-protocol-overhaul-introduces-new-security-challenges-for-developers)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval — trajectory-level evals for agentic workflows

No major version since v4.0 (covered June 24). The 2026 changelog shows ongoing improvements to tracing/observability and expanded model support.

**New relevant detail:** DeepEval now explicitly supports three levels of agent evaluation — end-to-end, trajectory-level, and component-level. For PerFiApp's future build phase, trajectory-level evals are most relevant: they can verify that the implementer agent follows the correct sequence of Plaid/Flinks API calls for a given user request, not just that the final output is correct.

Source: [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026)

---

## Track 5 — Toolchain Releases

### 5.1 CRITICAL: TypeScript 7.0 is NOT compatible with Expo SDK 57 — do not upgrade

TypeScript 7.0 GA released July 8, 2026. The Go-native rewrite delivers 8–12× faster type-checking (VS Code first-error latency dropped from 17.5s to 1.3s). However:

**Expo SDK 57 embeds TypeScript to process `app.config.ts`.** Without a stable programmatic API (expected in TypeScript 7.1), Expo cannot call TypeScript 7.0's type-checking internals. The result is a `"Cannot read properties of undefined (reading 'CommonJS')"` crash when building Expo projects with TypeScript 7.0 installed. The issue is tracked in the Expo repo (issue #47627).

**Microsoft's workaround:** A compatibility package `@typescript/typescript6` provides a `tsc6` executable, allowing side-by-side installation without naming conflicts. Expo continues using the TypeScript 6.x API.

**For PerFiApp:** Pin TypeScript to `~6.0.3` in all workspace `package.json` files. Add a comment explaining the Expo SDK 57 incompatibility and a link to the Expo issue tracker. Block any PR that bumps TypeScript to 7.x until Expo resolves the issue.

**Separate opportunity:** If the `apps/api` workspace can be decoupled from Expo's TypeScript dependency, it could adopt TypeScript 7.0 for the NestJS backend while `apps/mobile` stays on TypeScript 6.x. Have the architect assess this before attempting.

Sources: [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) / [VS Magazine](https://visualstudiomagazine.com/articles/2026/07/08/typescript-7-arrives-to-rock-vs-code-with-go-powered-speed.aspx) / [Expo issue #47627](https://github.com/expo/expo/issues/47627)

### 5.2 Expo SDK 57 — safe, non-breaking upgrade

Expo SDK 57 brings React Native 0.86. The release is designed as a "simplest upgrade ever" — no breaking changes from SDK 56 / React Native 0.85. Highlights:
- Fixes and improvements to edge-to-edge support on Android
- Light/dark mode emulation in React Native DevTools
- Updated: react-native-reanimated 4.3 → 4.5, gesture-handler 2.31 → 2.32
- **Known issue:** Hermes V1 + Reanimated together adds ~25–30% Android memory overhead from import alone. Workaround: enable Worklets Bundle Mode.

**For PerFiApp:** Apply SDK 57 as the starting point when development begins, not SDK 56.

Sources: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57) / [Upgrade guide](https://paddyb.com/tutorials/expo-sdk-57-upgrade-guide.html)

### 5.3 NestJS v12 — targeting early Q3 2026; design decisions needed now

NestJS v12 is imminent (targeting July–September 2026, likely August). Key architectural changes:

- **Full CommonJS → ESM migration** across all official packages
- **Vitest replaces Jest** as the default test runner for new ESM projects; oxlint replaces ESLint
- **Standard Schema support** in route decorators: `@Body(schema)`, `@Query(schema)`, `@Param(schema)` now accept Zod, Valibot, or ArkType schemas directly — removing the dependency on `class-validator`
- New projects are prompted for CJS or ESM; ESM projects get Vitest + oxlint

**For PerFiApp:** Starting on NestJS v12 (ESM + Vitest) is materially cleaner than migrating from v11. Wait for v12 GA before initializing the API workspace. Do not create any NestJS v11 scaffolding. The architect should factor NestJS v12's ESM requirement into the monorepo design.

Sources: [Trilon NestJS v12 preview](https://trilon.io/blog/nestjs-12-is-coming) / [InfoQ roadmap](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/) / [byteiota ESM/Vitest detail](https://byteiota.com/nestjs-v12-preview-esm-vitest-and-the-end-of-class-validator/)

### 5.4 pnpm 11 — ESM, requires Node.js 22; assess before adopting

pnpm 11 released April 2026 and is now the recommended version (pnpm 10 supported until April 2027). Key changes:
- Pure ESM package; **requires Node.js 22 or newer**
- SQLite-based store index (faster on large monorepos)
- Lifecycle scripts of dependencies not executed on install by default (security improvement)
- pnpm 11.10 (most recent): `_auth` setting for CI registry authentication, `pnpm self-update` can install pnpm v12 (Rust port, currently alpha)

**For PerFiApp:** Before adopting pnpm 11, verify Node.js 22 is available in CI and all developer environments. The lifecycle-scripts-off-by-default change is a security improvement but may require adding native addons or build scripts to `pnpm.onlyBuiltDependencies`. Assess before the first `pnpm install`.

Source: [pnpm 11.0 blog](https://pnpm.io/blog/releases/11.0)

### 5.5 Spec Kit v0.12.8 (from v0.11.6)

Current latest is v0.12.8 (July 8, 2026), up from v0.11.6 (June 23). Six releases in two weeks. Key additions:
- **Python script type support** (v0.12.4) — automation steps can now be written in Python alongside shell scripts
- **Label-driven bug-fix and bug-test workflows** (v0.12.4) — GitHub label triggers can kick off automated bug investigation and test-authoring workflows
- **Configurable shell step timeout** (v0.12.8) — prevents runaway shell steps from blocking spec-lead workflows

Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.12.8`

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases)

### 5.6 APM v0.22.0 (from v0.21.0)

Released June 26, 2026. Changes:
- `.zip` replaces `.tar.gz` as default auto-pack archive format; `--tarball` renamed to `--zip`
- AAD bearer token fallback via `az login` for Azure DevOps file downloads when no `ADO_APM_PAT` is configured
- Validation in `install.sh` prevents data loss by checking `APM_LIB_DIR` before `rm -rf`

Source: [APM releases](https://github.com/microsoft/apm/releases)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 ACTIVE: Claude Code v2.1.207 shell injection fix — update immediately

Plugin hooks and monitors in Claude Code now reject shell-form commands that reference `${user_config.*}` variables. Prior to this fix, a malicious config value stored in user settings (e.g., via a compromised dotfiles repo) could inject arbitrary shell commands through plugin hooks.

**For PerFiApp:** Update to Claude Code v2.1.207 (latest as of July 10, 2026). Any developer on an older version running custom plugin hooks is exposed to this vector. This is particularly relevant for financial-app developers who may have Plaid or Flinks API credentials in their shell environment — a successful injection could exfiltrate those credentials.

Source: [Claude Code release notes](https://github.com/anthropics/claude-code/releases)

### 6.2 Amazon Q MCP vulnerability — CVSS 8.5 auto-load workspace configs (June 2026)

Amazon Q Developer was found to auto-load MCP configuration files from workspace directories without user consent. An attacker placing a malicious `.amazonq/mcp.json` in a project directory (or in a submodule) could execute arbitrary code and exfiltrate AWS credentials.

**Root cause:** MCP clients should not auto-load or auto-execute MCP server configs from arbitrary workspace paths without explicit user confirmation. The same pattern could affect Claude Code if configured to trust workspace-level MCP configs unconditionally.

**For PerFiApp:** Add to the MCP vetting checklist: "Does this MCP client/host auto-load server configs from workspace directories?" Never enable `enableAllProjectMcpServers: true` in committed project settings.

Source: [Adversa AI — top MCP security resources July 2026](https://adversa.ai/blog/top-mcp-security-resources-july-2026/)

### 6.3 Mid-Session Tool Injection (MSTI) — 85% success rate in recent research

Security research (June–July 2026) documents **Mid-Session Tool Injection**: an attacker manipulates tool responses or resource content mid-session to inject malicious instructions, hijacking the agent's planned action sequence. Success rates of 85% were measured against leading coding agents.

Attack flow for PerFiApp: (1) implementer calls Flinks MCP to fetch transactions; (2) a compromised or spoofed response includes injected instructions; (3) implementer acts on injected instructions rather than completing the intended task.

**Mitigations:**
- Use allowlisted tool schemas — define the expected response shape and reject deviations
- Implement output sanitization before passing tool results back to the agent
- Run implementer in Manual permission mode for production financial data operations
- Enable the `sandbox.credentials: false` protection from Claude Code v2.1.187 (recommended from prior report)

Source: [Adversa AI MCP security July 2026](https://adversa.ai/blog/top-mcp-security-resources-july-2026/) / [Security Boulevard](https://securityboulevard.com/2026/07/exposed-critical-security-vulnerabilities-in-ais-new-communication-standard-mcp-under-scrutiny/)

### 6.4 MCP 2026-07-28 spec introduces new attack surfaces

The stateless RC introduces:
- **Header injection via `Mcp-Method` / `Mcp-Name`:** In load-balanced deployments, forged headers may route to unintended handlers
- **`cacheScope` misconfiguration:** A misconfigured `cacheScope: "global"` on a resource containing user account data would share that data across all users

**For PerFiApp:** Add to the MCP server design checklist: (a) validate `Mcp-Method` and `Mcp-Name` headers server-side; (b) default `cacheScope` to `"user"` for any resource containing personal financial data; never use `"global"` scope for financial data.

Source: [SC Media MCP security](https://www.scworld.com/brief/model-context-protocol-overhaul-introduces-new-security-challenges-for-developers) / [WorkOS MCP auth analysis](https://workos.com/blog/mcp-2026-spec-agent-authentication)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 URGENT: CDBA Draft Regulations published June 27 — comment period closes August 26

This is the most important compliance development since the prior report and the first time concrete operational requirements for CDBA accreditation are visible. The Department of Finance published the proposed Consumer-Driven Banking Regulations in the Canada Gazette, Part I on June 27, 2026.

**Key requirements that directly affect PerFiApp's architecture:**

| Requirement | Implication for PerFiApp |
|---|---|
| **Multi-factor authentication** required | MFA must be designed into every user authentication flow from the start |
| **99.5% API uptime each month** | If PerFiApp acts as a data provider (Phase 2), infrastructure reliability is a contractual obligation |
| **Consumer consent valid max 12 months** | Consent management must track expiry dates and prompt renewal; design into the data model |
| **Security breaches reported "as soon as feasible"** | Breach detection and notification infrastructure required before production launch |
| **5-year electronic record retention** | Transaction and consent records must be retained; design storage with this in mind from day one |
| **$2,500 application fee** | Budget for accreditation |
| **Notify Bank of Canada of material changes within 30 days** | Change management process must include regulatory notification steps |

**Accreditation pathway:** Fintechs registered under the Retail Payment Activities Act (RPAA) may qualify for a streamlined accreditation pathway. PerFiApp should assess whether RPAA registration is worth pursuing both for its own compliance value and for the CDBA streamlined pathway benefit.

**Timeline:** The regulations come into force in a staggered approach beginning with accreditation. Final publication date is not yet set, but the staggered approach means PerFiApp has lead time — use it.

Sources: [Canada Gazette Part I — CDBA Regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Bennett Jones](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations) / [McCarthy Tétrault](https://www.mccarthy.ca/en/insights/blogs/techlex/canadas-consumer-driven-banking-framework-takes-shape-with-draft-regulations) / [Government of Canada release](https://www.canada.ca/en/department-finance/news/2026/06/government-pre-publishes-regulations-to-prevent-fraud-and-facilitate-the-next-phase-of-consumer-driven-banking.html)

### 7.2 Bill C-36 (PPCDA) — tabled June 15; major privacy reform, not law yet

Canada's third attempt at federal private-sector privacy reform. Bill C-36 proposes the Protecting Privacy and Consumer Data Act (PPCDA) to replace PIPEDA.

**Status:** First reading only (June 15, 2026). Must pass second reading, committee, third reading, full Senate process, and Royal Assent.

**Key changes vs current PIPEDA:**
- **Express consent as default** — no more assumed/implied consent for most processing
- **New regulator:** Digital Safety and Data Protection Commission with binding order-making powers (vs OPC's advisory role)
- **AMPs:** Up to the greater of $10M or 3% of gross global annual revenue
- **Criminal fines:** Up to the greater of $25M or 5% of gross global revenue
- **Private right of action:** Individuals can sue organizations directly
- **Data deletion rights** must be honored on request
- **Privacy Impact Assessments** required for cross-border transfers

**Note:** C-27's AI provisions are expected to travel as a standalone bill — not included in C-36.

**For PerFiApp:** The bill is not law, but its direction is clear and it is likely to pass in some form. Design should assume express consent as default, anticipate data deletion obligations, and plan PIAs as a standard pre-launch step. Quebec Law 25 PIAs (already required) serve as a practical template.

Sources: [McCarthy Tétrault C-36 analysis](https://www.mccarthy.ca/en/insights/blogs/techlex/bill-c-36-what-organizations-need-to-know-about-canada-s-new-privacy-reform) / [DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act)

### 7.3 OSFI streamlined fintech banking license framework (June 25)

OSFI officially launched a targeted program to expedite banking license review for fintechs and provincial credit unions. Key parameters:
- 12-month formal review timeline (significantly faster than historical norms)
- Three-phase process: readiness assessment, formal application, operational readiness

**For PerFiApp:** PerFiApp is not seeking a banking license. This is competitive context: the same framework that helped KOHO approach a banking license is now formalized and faster. Other Canadian neobanks will use this pathway. PerFiApp's architecture should be complementary to — not competitive with — federally regulated institutions, positioned as a consumer-facing data aggregation and coaching layer above the banking rails.

Sources: [OSFI streamlined framework](https://www.osfi-bsif.gc.ca/en/data-forms/applications-approvals/streamlined-approvals-framework-targeted-new-entrants) / [Mondaq](https://www.mondaq.com/canada/financial-services/1808912/osfi-officially-launches-targeted-fast-track-new-entry-regime)

---

## Recommended Next Steps

### Immediate (this week)

1. **Fix CI workflow permission mode.** Add `--permission-mode acceptEdits` to `agent-tooling-research.yml` and `pr-review.yml` Claude Code invocations. Without this fix, the next automated run will stall indefinitely.

2. **Update implementer, test-engineer, code-reviewer, security-reviewer, and researcher agents from Sonnet 4.6 to Sonnet 5.** The introductory pricing window ($2/$10) runs through August 31.

3. **Re-enable Fable 5 trial for spec-lead and architect.** Update those agent files from `claude-opus-4-8` back to `claude-fable-5` as primary, with `claude-opus-4-8` as fallback. Add a note that security-adjacent requests may fall back to Opus 4.8 automatically.

4. **Check Fable 5 API usage before July 20.** Any automation using Fable 5 will start incurring $10/$50/MTok charges on July 20. Make intentional decisions now.

5. **Pin TypeScript to `~6.0.3` across all workspaces.** Add a comment explaining the Expo SDK 57 incompatibility and link to issue #47627. Block any PR that bumps TypeScript to 7.x.

6. **Update to Claude Code v2.1.207.** Picks up the shell injection fix for plugin hooks, auto mode transcript-tampering protection, and rate-limit auto-retry.

### Short-term (this sprint)

7. **Architect to read the CDBA draft regulations.** MFA, 99.5% uptime, 12-month consent windows, 5-year retention, breach notification — these must be reflected in the data-layer and consent-management spec from the start.

8. **Add three items to the MCP vetting checklist:** (a) Does the MCP client auto-load configs from workspace directories without user consent? (b) Are `Mcp-Method` / `Mcp-Name` headers validated server-side? (c) Is `cacheScope` set to `"user"` (not `"global"`) for any resource containing personal financial data?

9. **Upgrade Spec Kit to v0.12.8** from v0.11.6. The label-driven bug-fix and bug-test workflows are directly useful once development begins.

10. **Audit v2.1.207 breaking changes for agent files:** (a) Check whether any developer had `autoMode` in repo-level `settings.local.json` (now ignored; must move to `~/.claude/settings.json`). (b) Verify no plugin options are being read from committed `.claude/settings.json` project files.

### Medium-term (next 4–6 weeks)

11. **Architect: design API workspace for NestJS v12 (ESM).** NestJS v12 GA is imminent. Starting on v12 is cleaner than migrating. Plan Vitest as the test runner and assess Zod (via Standard Schema) vs class-validator for request validation.

12. **Assess pnpm 11 migration.** Requires Node.js 22; verify CI Node.js version. Review the lifecycle-scripts-off-by-default behavior against any native dependencies the project will need.

13. **Consider TypeScript 7.0 split for the backend.** If `apps/api` can be isolated from Expo's TypeScript dependency, adopting TypeScript 7.0 only for the backend could yield faster CI type-check times. Have the architect assess whether pnpm workspace resolution allows per-package TypeScript version pinning cleanly.

14. **Audit `claude-opus-4-1` usage before August 5.** `claude-opus-4-1-20250805` retires August 5 (23 days from today). Check Claude Console Usage Export for any remaining calls to this ID and migrate to `claude-opus-4-8`.

15. **Monitor Bill C-36 progress** via `parl.ca/legisinfo`. When it reaches committee stage, expert testimony will produce practical compliance guidance more actionable than the bill text itself. Watch for the companion AI regulation bill.

---

*Report generated 2026-07-13. All findings verified against primary sources. Delta report vs 2026-06-24 — prior findings not repeated unless status changed. Recommendations are proposals — nothing is installed or configured until the team reviews and approves.*

**Sources referenced:**
- Anthropic — [Redeploying Fable 5](https://www.anthropic.com/news/redeploying-fable-5) / [Introducing Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5) / [Platform docs](https://platform.claude.com/docs/en/about-claude/models/overview)
- [CNBC — Fable 5 export controls lifted](https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html)
- [MarkTechPost — Fable 5 redeployment + classifier](https://www.marktechpost.com/2026/07/01/anthropic-redeploys-claude-fable-5-on-july-1-after-us-export-controls-lift-adds-new-cybersecurity-classifier/)
- [TechCrunch — Sonnet 5 launch](https://techcrunch.com/2026/06/30/anthropic-launches-claude-sonnet-5-as-a-cheaper-way-to-run-agents/)
- [Digital Applied — Fable 5 pricing switch](https://www.digitalapplied.com/blog/claude-fable-5-usage-credits-july-7-pricing-guide-2026)
- [Claude Code releases (GitHub)](https://github.com/anthropics/claude-code/releases) / [Gradually AI changelog](https://www.gradually.ai/en/changelogs/claude-code/)
- [MCP RC announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [WorkOS — MCP auth analysis](https://workos.com/blog/mcp-2026-spec-agent-authentication) / [SC Media — MCP security](https://www.scworld.com/brief/model-context-protocol-overhaul-introduces-new-security-challenges-for-developers)
- [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) / [Expo issue #47627](https://github.com/expo/expo/issues/47627) / [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
- [Trilon NestJS v12 preview](https://trilon.io/blog/nestjs-12-is-coming) / [byteiota ESM/Vitest](https://byteiota.com/nestjs-v12-preview-esm-vitest-and-the-end-of-class-validator/)
- [pnpm 11.0 blog](https://pnpm.io/blog/releases/11.0) / [Spec Kit releases](https://github.com/github/spec-kit/releases) / [APM releases](https://github.com/microsoft/apm/releases)
- [Canada Gazette — CDBA Regulations](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Bennett Jones CDBA](https://www.bennettjones.com/Insights/Blogs/Canada-Advances-Consumer-Driven-Banking-Framework-with-Proposed-Regulations) / [McCarthy Tétrault CDBA](https://www.mccarthy.ca/en/insights/blogs/techlex/canadas-consumer-driven-banking-framework-takes-shape-with-draft-regulations)
- [McCarthy Tétrault — Bill C-36](https://www.mccarthy.ca/en/insights/blogs/techlex/bill-c-36-what-organizations-need-to-know-about-canada-s-new-privacy-reform) / [DLA Piper — Bill C-36](https://www.dlapiper.com/en/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act)
- [OSFI streamlined approvals framework](https://www.osfi-bsif.gc.ca/en/data-forms/applications-approvals/streamlined-approvals-framework-targeted-new-entrants)
- [Adversa AI — MCP security July 2026](https://adversa.ai/blog/top-mcp-security-resources-july-2026/) / [Security Boulevard — MCP vulnerabilities](https://securityboulevard.com/2026/07/exposed-critical-security-vulnerabilities-in-ais-new-communication-standard-mcp-under-scrutiny/)
- [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026)
