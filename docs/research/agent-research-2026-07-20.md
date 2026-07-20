# PerFiApp Agent Research — 2026-07-20

**Third run. Delta report vs 2026-06-24.** Prior findings not repeated unless status has changed. Rotation emphasis this run: Claude Sonnet 5 launch, Fable 5 restoration, MCP RC imminent, Consumer-Driven Banking draft regulations, new MCP attack patterns, and toolchain major versions (pnpm 11, NestJS v12 prerelease, Expo SDK 57).

---

## Executive Summary

Five findings demand action in the next four weeks:

1. **Consumer-Driven Banking Regulations pre-published June 27 — consultation closes August 26, 2026.** The draft regulations in Canada Gazette Part I are the most concrete regulatory text PerFiApp has had to design against. They specify accreditation pathways, a 24-month transaction history requirement, 99.5% endpoint uptime, MFA before every data share, and 5-year consent record retention. Architect and spec-lead need to read these before August 26.

2. **`claude-opus-4-1-20250805` retires August 5, 2026 — 16 days away.** Flagged in the June 24 report. If no audit has happened yet, it must happen this week.

3. **Claude Sonnet 5 launched June 30 with introductory $2/$10 per MTok pricing through August 31.** A time-limited 33% cost reduction vs standard Sonnet pricing; Sonnet 5 reaches near-Opus 4.8 quality for agentic coding. The implementer and test-engineer agents should be evaluated for migration before August 31.

4. **MCP 2026-07-28 RC is live — final stateless spec ships July 28 (8 days).** Any custom MCP server designed with session IDs today will require migration after July 28. Design stateless now.

5. **Agentjacking via Sentry MCP and ShareLock multi-tool poisoning are newly documented attack patterns with 85–90%+ success rates.** A public Sentry DSN is all an attacker needs to hijack Claude Code into running arbitrary commands. If Sentry is wired via MCP in any developer environment, this is an active risk today.

---

## Track 1 — Model & Capability Updates

### 1.1 STATUS RESOLVED: Claude Fable 5 restored July 1, 2026

**Status changed from "suspended" (June 24 report) to "active with new safety constraints."**

The US export-control directive was lifted June 30. Anthropic restored access on July 1 across Claude Platform, Claude.ai, Claude Code, and Claude Cowork.

**What changed in the model:**

- A new cybersecurity classifier blocks the documented jailbreak in >99% of cases. When the classifier fires, the request is rerouted to Claude Opus 4.8 rather than outright refused — the user still gets a response, but from a different model.
- Anthropic intentionally over-blocks ambiguous requests to establish a larger safety margin. Expect more refusals on security-adjacent prompts.
- A new CJS (Cybersecurity Jailbreak Severity) framework scores exploits on four axes: capability gain, breadth, ease of weaponization, and discoverability (Low/Medium/High/Critical bands).

**For PerFiApp:** The prior "trial" verdict for spec-lead and architect can resume. Two new operational notes: (a) security-reviewer agent prompts may trigger the classifier and get silently rerouted to Opus 4.8 — test explicitly before committing; (b) the reroute adds latency and can produce cost surprises. Monitor actual model usage in Claude Console.

Sources: [Redeploying Claude Fable 5 (Anthropic)](https://www.anthropic.com/news/redeploying-fable-5) / [Fable 5 cybersecurity safeguards (Anthropic)](https://www.anthropic.com/news/fable-safeguards-jailbreak-framework)

### 1.2 NEW MODEL: Claude Sonnet 5 — launched June 30, 2026

- **Model ID:** `claude-sonnet-5` (pinned snapshot: `claude-sonnet-5-20250715` for production)
- **Context window:** 1M tokens (same as Opus 4.8), 128k max output
- **Introductory pricing (through August 31, 2026):** $2/MTok input, $10/MTok output
- **Standard pricing (September 1+):** $3/MTok input, $15/MTok output
- **Benchmark:** Agentic coding 63.2% (vs Opus 4.8's 69.2%, Sonnet 4.6's 58.1%)
- **Tokenizer note:** Uses the newer tokenizer (~30% more tokens for the same text vs Sonnet 4.6). Update token-budget estimates when migrating.

**Recommended model assignment updates:**

| Agent | Prior | Updated |
|---|---|---|
| spec-lead | Fable 5 / Opus 4.8 | Fable 5 (trial resumed) / Opus 4.8 fallback |
| architect | Fable 5 / Opus 4.8 | Fable 5 (trial resumed) / Opus 4.8 fallback |
| implementer | Sonnet 4.6 | **Sonnet 5** (before Aug 31 for intro pricing) |
| test-engineer | Sonnet 4.6 | **Sonnet 5** (same rationale) |
| code-reviewer | Sonnet 4.6 / Haiku 4.5 | **Sonnet 5** for substantive reviews; Haiku 4.5 for quick checks |
| security-reviewer | Sonnet 4.6 | **Sonnet 5** (test Fable 5 classifier interaction first) |
| researcher | Sonnet 4.6 | Sonnet 5 — agentic web-research loops benefit from improved planning |

Sources: [Introducing Claude Sonnet 5 (Anthropic)](https://www.anthropic.com/news/claude-sonnet-5) / [TechCrunch](https://techcrunch.com/2026/06/30/anthropic-launches-claude-sonnet-5-as-a-cheaper-way-to-run-agents/)

### 1.3 DEADLINE: `claude-opus-4-1-20250805` retires August 5, 2026

Unchanged from June 24 report. **16 days from this report.** Any agent file, CI script, or wrapper referencing `claude-opus-4-1-20250805` or `claude-opus-4-1` will return API errors on August 5. Replacement: `claude-opus-4-8`.

Source: [Model deprecations (Anthropic)](https://platform.claude.com/docs/en/about-claude/model-deprecations)

### 1.4 Updated model table (as of 2026-07-20)

| Model ID | Status | Notes |
|---|---|---|
| `claude-fable-5` | Active (restored July 1) | Cybersecurity classifier active; reroutes flagged requests to Opus 4.8 |
| `claude-sonnet-5` | **New — June 30** | $2/$10 intro through Aug 31; 1M context; 63.2% agentic coding |
| `claude-opus-4-8` | Active | Fallback for Fable 5; minimum retirement May 2027 |
| `claude-sonnet-4-6` | Active | Superseded by Sonnet 5 for agentic work |
| `claude-haiku-4-5-20251001` | Active | Minimum retirement Oct 2026 |
| `claude-opus-4-1-20250805` | Deprecated | **Retires August 5, 2026** |

---

## Track 2 — AI Cost & Token Optimization

### 2.1 Sonnet 5 introductory pricing as a time-limited routing opportunity

At $2/$10 (vs eventual $3/$15), each implementer session on Sonnet 5 costs 33% less through August 31. Concrete estimate: if the implementer generates 50 MTok input + 5 MTok output per sprint, the savings are ~$75/sprint during the intro window — while also getting a materially better model.

### 2.2 Prompt caching on non-Anthropic platforms

Claude Code v2.1.208 (July 14) fixed prompt caching for Bedrock, Vertex, Mantle, and Foundry. If PerFiApp routes agents through these platforms, caching now works again. Separate caveat: extended thinking and prompt caching interact incorrectly at the API level on Bedrock/Vertex/Foundry — disable extended thinking in caching-critical paths if using those platforms directly.

Sources: [finout.io Anthropic API Pricing 2026](https://www.finout.io/blog/anthropic-api-pricing) / [Claude Code changelog v2.1.208](https://code.claude.com/docs/en/changelog)

---

## Track 3 — Agent Tooling (MCP & Claude Code)

### 3.1 IMMINENT: MCP 2026-07-28 specification final — 8 days

The RC is published; final spec ships **July 28, 2026**. This is the largest revision since protocol launch.

**Key changes:**

- **Sessions removed entirely.** `Mcp-Session-Id` and all session machinery are gone (SEP-2567). Every MCP request must be stateless.
- **New required headers on Streamable HTTP:** `Mcp-Method` and `Mcp-Name` on every request.
- **`cacheScope` on list/resource responses:** `cacheScope: user` vs `cacheScope: global` is a privacy-critical distinction — any server returning account-level financial data must use `cacheScope: user` to prevent cross-user cache leakage.
- **MCP Apps and Tasks extensions:** First-class server-rendered UIs and long-running async work are now in the protocol.
- **Auth hardening:** Alignment with OAuth 2.0 and OIDC.

**For PerFiApp's architect:** Any custom MCP server (e.g., a Flinks adapter) using `Mcp-Session-Id` for state must be redesigned before or immediately after July 28. Migration pattern: mint an explicit handle from a tool call and have the model pass it back as a regular argument. The `cacheScope: user` requirement is particularly important for financial data — validate this on every financial-data MCP server before production.

Sources: [MCP 2026-07-28 RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) / [MCP.Directory explanation](https://mcp.directory/blog/mcp-2026-07-28-release-candidate) / [WorkOS auth changes](https://workos.com/blog/mcp-2026-spec-agent-authentication)

### 3.2 Claude Code v2.1.188–v2.1.215 — most actionable changes since June 24

**v2.1.208 (July 14):** Prompt caching fixed on Bedrock/Vertex/Foundry.

**v2.1.212 (July 17):** `/fork` now creates a background session (visible in `claude agents`); in-session forking moved to `/subtask`. Update any workflows that used `/fork` to parallelize sub-tasks. New limits: 200 WebSearch calls and 200 subagent spawns per session.

**v2.1.214 (July 18):** `EndConversation` tool allows Claude Code to self-terminate on severe abuse. OpenTelemetry attributes (`message.uuid`, `client_request_id`, `tool_source`) now attached to message events — useful for tracing implementer tool calls to specific API requests. Windows PowerShell and Bash permission-check bypass fixed.

**v2.1.215 (July 19):** **`/verify` and `/code-review` no longer auto-run.** Must be explicitly invoked. Any CI automation that expected these skills to fire automatically will produce empty results silently. Audit immediately.

**v2.1.207 (July 11):** Auto mode on Bedrock/Vertex/Foundry no longer requires opt-in. Default model on Bedrock/Vertex changed to Opus 4.8 (was Opus 4.6) — verify CI cost budgets if using these platforms.

Source: [Claude Code changelog](https://code.claude.com/docs/en/changelog)

### 3.3 No official Flinks MCP server — gap confirmed

No official Flinks MCP server announced as of July 20. The publication of the Consumer-Driven Banking draft Regulations may accelerate Flinks's roadmap since the accreditation pathway is now clearer. Contact Flinks directly.

Source: [Flinks Open Banking API](https://www.flinks.com/go/open-banking-api)

---

## Track 4 — Agent Quality & Evaluation

### 4.1 DeepEval — no material new releases for June–July 2026

Official changelog shows no entries beyond April 2026. The prior "Adopt" verdict for v4.0 stands. Watch for v4.1 or v5.0 — the pattern of rapid earlier releases suggests one is likely. Verify installed version before the next sprint.

Source: [DeepEval changelog 2026](https://deepeval.com/changelog/changelog-2026)

---

## Track 5 — Toolchain Releases

### 5.1 Expo SDK 57 — React Native 0.86, no breaking changes

Released July 2026. Upgrades RN from 0.85 to 0.86; React stays at 19.2. No breaking changes from SDK 56.

Notable additions:
- `expo-image`: `writeToCacheAsync` / `readFromCacheAsync` — useful for caching institution logos.
- Animation updates: `react-native-reanimated` 4.3→4.5, `react-native-worklets` 0.8→0.10.
- **Known issue:** Importing `react-native-reanimated` increases app memory 25–30% (Hermes change). A worklet bundle mode workaround is available.

**Recommendation:** Adopt SDK 57. Zero breaking changes makes this low-risk. Test Reanimated memory impact in CI before merging.

Sources: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)

### 5.2 NestJS v12 — prerelease on npm, Q3 2026 target

Prerelease packages live under the `next` tag. Key breaking changes:

- **ESM migration:** All official packages move from CJS to ESM. CLI prompts project type; `apps/api` currently uses CJS-style imports.
- **Toolchain swap (ESM projects):** Vitest replaces Jest, oxlint replaces ESLint, Rspack replaces Webpack.
- **Standard Schema support:** `@Body()`, `@Query()`, `@Param()` decorators accept Zod, Valibot, ArkType directly — a significant improvement for money validation at the API boundary.
- **Node.js 22 minimum.**
- **v11.1.28 (July 8, 2026):** Fixes SSE producer teardown on client disconnect.

**Recommendation:** Watch. Test-engineer should smoke-test `apps/api` against `@nestjs/core@next` in a branch to surface breaking changes before GA. The Zod/Standard Schema integration is a compelling reason to plan migration.

Sources: [NestJS v12 roadmap (InfoQ)](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/) / [Trilon Consulting v12 preview](https://trilon.io/blog/nestjs-12-is-coming)

### 5.3 pnpm 11 — released April 28, 2026 (missed in prior reports)

This major version was missed in the June 24 report. **Breaking changes affecting PerFiApp's monorepo:**

- **Node.js 22 required.** Drops Node 18–21.
- **Config moves out of `package.json`** to `pnpm-workspace.yaml` with camelCase keys. The `pnpm` field in `package.json` is no longer read.
- **Lifecycle scripts opt-in.** `postinstall` scripts error unless explicitly permitted via `allowBuilds`.
- **Supply-chain protection on by default:** `minimumReleaseAge: 1440` (packages must be ≥1 day old before install), `blockExoticSubdeps: true`.
- **SQLite-backed store index** replaces JSON-per-package files.
- **`npm_config_*` env vars renamed to `pnpm_config_*`** — breaks any CI env vars using the npm-style prefix.

**Migration tooling:** `pnpx codemod run pnpm-v10-to-v11` automates most config changes.

**Recommendation:** Adopt, but sequence carefully. Run the codemod in a branch, verify all workspace packages build, confirm `allowBuilds` for any native modules, update CI env vars. The supply-chain protection defaults are valuable for a financial app.

Sources: [pnpm 11.0 release post](https://pnpm.io/blog/releases/11.0) / [pnpm migration guide](https://pnpm.io/migration)

### 5.4 TypeScript 5.9

- **`import defer`**: Deferred module evaluation — load module metadata without executing until first access. Direct fit for lazy-loading i18n translation bundles in `apps/mobile`.
- **`strictInference` flag**: New compiler option catching more inference errors. Worth enabling in a dedicated PR to surface hidden type gaps in financial calculation code.
- **11% build speed increase** from compiler optimizations.
- **Conditional type narrowing**: Narrows inside conditional type branches — reduces manual assertions in money utility types.

**Recommendation:** Adopt. Prototype `import defer` for `packages/i18n` first.

Sources: [TypeScript 5.9 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)

### 5.5 Spec Kit v0.13.0 (July 17, 2026)

Moved from v0.11.6 (June 24 report) to v0.13.0. Key changes:

- v0.12.3 (July 1): Retired Roo Code integration (Roo Code extension shut down). Update any spec-lead workflow references.
- v0.12.3: Fixed bundle catalog removal by relative path; improved workflow validation.
- v0.13.0 (July 17): Latest stable. Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.13.0`.

**Recommendation:** Upgrade from v0.11.6 to v0.13.0.

Source: [Spec Kit releases](https://github.com/github/spec-kit/releases)

### 5.6 APM v0.26.0 (July 18, 2026)

Moved from v0.21.0 to v0.26.0. Key additions since v0.21.0:

- **v0.22.0 (June 26):** Executable Trust Governance v1 — full governance model with explicit trust tiers.
- **v0.23.0 (June 29):** Lifecycle hooks framework — pre/post install/upgrade/remove hooks for agent packages.
- **v0.24.0 (July 5):** Hardened plugin binary permissions.
- **v0.26.0 (July 18):** TLS verification against OS trust stores (previously used its own bundle, which lagged CA revocations). 40+ stability fixes.

**Recommendation:** Upgrade from v0.21.0 to v0.26.0. Lifecycle hooks and TLS verification are the highest-value additions for a financial app.

Source: [APM releases](https://github.com/microsoft/apm/releases)

---

## Track 6 — AI & Supply-Chain Security

### 6.1 NEW ATTACK: Agentjacking via Sentry MCP — active threat to Claude Code

CSA research note (June 12–15, 2026). An attacker who knows any project's public Sentry DSN can inject malicious instructions into Sentry error events. The Sentry MCP server retrieves those events and returns them as trusted diagnostics to Claude Code. The agent then executes the attacker's commands with the developer's own system privileges.

**Attack path:**
1. Attacker posts a crafted error to Sentry's public ingest endpoint using the target project's DSN.
2. The fake event contains a prompt-injection payload in the error message or stack trace.
3. Developer or their agent session fetches recent errors via Sentry MCP.
4. Claude Code reads the payload as trusted Sentry output and executes it.

**Reported success rate:** 85% across tested coding agents.

**For PerFiApp:** Financial data and credentials in a PerFiApp developer session (Plaid sandbox keys, Flinks tokens, PostgreSQL connection strings) are exactly what this attack targets.

**Mitigations:**
- Do not install the Sentry MCP server with a public DSN. Use a private ingest endpoint if Sentry MCP is required.
- Add to code-reviewer and security-reviewer checklists: flag any PR adding Sentry DSN to a `.env` file or MCP configuration.
- Treat all MCP tool output — including monitoring/observability tools — as untrusted input.

Sources: [CSA Agentjacking research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-agentjacking-mcp-sentry-injection-20260612/) / [The New Stack](https://thenewstack.io/agentjacking-sentry-mcp-attack/)

### 6.2 NEW ATTACK: ShareLock — multi-tool threshold poisoning (90%+ success rate)

Paper arXiv:2606.27027 (June 2026). Splits malicious instructions across multiple benign-looking MCP tool descriptions using Shamir's threshold secret-sharing logic. No single tool description looks malicious on inspection; the attack assembles when the model reads all tools together.

**Existing MCP vetting checklists fail** because they review tool descriptions individually. Automated detection models cannot catch it — with Claude showing higher resistance than other tested models.

**For PerFiApp:** Add to the MCP vetting checklist: "Review all tool descriptions in aggregate — do they collectively guide the agent toward behavior inconsistent with the stated tool purpose?" This requires human judgment.

Sources: [ShareLock paper (arXiv)](https://arxiv.org/abs/2606.27027)

### 6.3 NEW ATTACK CLASS: WebMCP Tool Surface Poisoning (MSTI)

Paper arXiv:2606.06387 (June 2026). Mid-Session Tool Injection (MSTI) uses the AbortSignal API or tool-registration race conditions to swap or modify tools during an active session. Success rates of 60–72% in the MCPTox benchmark.

**For PerFiApp:** Design any Flinks MCP adapter for static tool registration at session start — do not allow dynamic tool mutation during a session.

Source: [WebMCP poisoning paper (arXiv)](https://arxiv.org/abs/2606.06387) / [Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/06/30/securing-ai-agents-ai-tools-move-from-reading-acting/)

### 6.4 MCPPrivacyDetector — credentials/PII leak at 10%+ across real-world MCP servers

A new framework scanning 10,000+ real-world MCP servers found credentials, API keys, and PII leaking in tool handler responses at rates exceeding 10%. Tool handlers that return raw API responses inadvertently include fields not intended for the AI agent.

**For PerFiApp:** Any MCP server wrapping Plaid or Flinks must explicitly filter API responses before returning as tool results. Never pass raw bank API responses through. Define explicit output schemas and strip anything not in the schema. Add this check to the MCP vetting template.

Source: [Adversa AI MCP security July 2026](https://adversa.ai/blog/top-mcp-security-resources-july-2026/)

---

## Track 7 — Fintech Domain & Canadian Compliance

### 7.1 MAJOR: Consumer-Driven Banking Regulations pre-published June 27, 2026

**This is the most actionable compliance development for PerFiApp's architecture since the CDBA Royal Assent in March.**

Draft Consumer-Driven Banking Regulations published in Canada Gazette, Part I on June 27, 2026. Public consultation closes **August 26, 2026**.

**Key provisions with direct architectural implications:**

**Accreditation:**
- Non-streamlined pathway for fintechs: requires Canadian business presence, insurance, integrity assessments for key personnel, security compliance demonstration.
- Accreditation fee: **$2,500** (adjusted annually for inflation).

**Data scope and quality:**
- Minimum **24 months of transaction history** must be provided by participating institutions.
- Data sharing is read-only at Phase 1.
- No charges permitted for data access or consent management.
- Endpoints must maintain **99.5% monthly uptime** — a Service Level Agreement that flows to PerFiApp as a data recipient.

**Consent management (design specifications):**
- Express consent required before each data share.
- **MFA required before data sharing begins.**
- Additional MFA triggered on authentication compromise, significant consumer circumstances change, or entity circumstances change.
- **Consent records must be retained for 5 years.**
- Consumers can request data deletion (with exceptions for legal retention).

**Liability:** "Flows with the data" — responsibility assigned by activity. PerFiApp's consent and authentication flows must be defensible as the origin point of authorization.

**For PerFiApp:** The 99.5% uptime requirement and 24-month history requirement are new constraints that should be in the data layer spec. Architect and spec-lead must read the draft before August 26.

Sources: [Canada Gazette, Part I, June 27, 2026](https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html) / [Government of Canada announcement](https://www.canada.ca/en/department-finance/news/2026/06/government-pre-publishes-regulations-to-prevent-fraud-and-facilitate-the-next-phase-of-consumer-driven-banking.html) / [Fasken analysis](https://www.fasken.com/en/knowledge/2026/07/draft-consumer-driven-banking-regulations-released) / [Blakes analysis](https://www.blakes.com/insights/proposed-consumer-driven-banking-regulations-released-for-comment/)

### 7.2 NEW LEGISLATION: Bill C-36 (PPCDA) tabled June 15 — PIPEDA replacement

Introduced June 15, 2026. Would enact the Protecting Privacy and Consumer Data Act (PPCDA), replacing PIPEDA's Part 1. **Not yet law.**

**Key changes vs current PIPEDA:**

- New regulator: Digital Safety and Data Protection Commission of Canada.
- Penalties: up to $10M or 3% of global revenue for serious violations; up to **$25M or 5% of global revenue** for the most serious offences.
- Formal privacy management programs required (policies, complaint handling, staff training).
- Data minimization: collect only what is genuinely necessary.
- **Cross-border data transfer PIAs required** before sending personal information outside Canada. Relevant if PerFiApp uses US-based cloud infrastructure or sends user data to Plaid (US-based) for processing.
- Right to deletion with exceptions for legal retention.

**For PerFiApp:** The cross-border PIA requirement is the most architectural implication. If the backend runs on AWS us-east-1 and user financial data flows through it, a formal PIA will be required when the law comes into force. Begin designing for Canadian data residency optionality now.

Sources: [DLA Piper Bill C-36](https://www.dlapiper.com/en-us/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act) / [Osler overview](https://www.osler.com/en/insights/reports/the-protecting-privacy-and-consumer-data-act-bill-c-36-key-obligations-and-enforcement-overview/)

### 7.3 OSFI Fast-Track Framework — accelerates KOHO's banking license timeline

OSFI introduced a Targeted Fast-Track Framework for new fintech bank license applications in June 2026: initial feedback within 4 weeks, risk-based review within 12 months, recommendation to Minister, then up to 3 months for ministerial decision. KOHO's application is reportedly in Phase 2 of OSFI review.

**For PerFiApp:** Competitive signal. If KOHO receives its banking license in 12–15 months, it moves from "prepaid card + budgeting" to a full deposit-taking institution. PerFiApp's aggregation-first, AI-coaching-first positioning becomes more important to differentiate from a newly full-service KOHO. Spec-lead should revisit the competitive positioning section of the PDR.

Source: [Yahoo Finance KOHO coverage](https://ca.finance.yahoo.com/news/koho-moves-closer-getting-banking-110050793.html)

---

## Recommendations Table

| Finding | Track | Addresses | Verdict |
|---|---|---|---|
| Claude Sonnet 5 — $2/$10 intro pricing through Aug 31 | Model / Cost | implementer, test-engineer | **Adopt before Aug 31** |
| Claude Fable 5 restored July 1 with cybersecurity classifier | Model | spec-lead, architect | **Resume trial — test security-reviewer prompts first** |
| `claude-opus-4-1-20250805` retires August 5 | Model | any agent referencing this ID | **Act — 16 days remaining** |
| Consumer-Driven Banking Regulations (Canada Gazette June 27) | Compliance | architect, spec-lead | **Act — read before Aug 26 consultation close** |
| Bill C-36 (PPCDA) tabled June 15 — PIPEDA replacement | Compliance | architect, spec-lead, security-reviewer | **Monitor — design for Canadian data residency now** |
| MCP 2026-07-28 RC — stateless protocol July 28 | Agent tooling | architect | **Act — design custom MCP servers stateless; add `cacheScope: user`** |
| Agentjacking via Sentry MCP | Security | all developers, security-reviewer | **Act — audit MCP roster; no public DSNs** |
| ShareLock multi-tool threshold poisoning | Security | architect, code-reviewer | **Act — add aggregate review to MCP vetting checklist** |
| WebMCP Tool Surface Poisoning (MSTI) | Security | architect | **Watch — design for static tool registration** |
| MCPPrivacyDetector — raw API response leak | Security | architect, code-reviewer | **Act — add output schema filtering to MCP vetting template** |
| Expo SDK 57 (React Native 0.86) | Toolchain | implementer | **Adopt — no breaking changes; test Reanimated memory** |
| NestJS v12 prerelease (Q3 2026 target) | Toolchain | architect, implementer | **Watch — smoke-test prerelease in a branch** |
| pnpm 11 (April 28 release) | Toolchain | implementer | **Adopt — run codemod; audit Node 22, `allowBuilds`, env vars** |
| TypeScript 5.9 | Toolchain | implementer, test-engineer | **Adopt — `import defer` for i18n; enable `strictInference`** |
| Spec Kit v0.13.0 (July 17) | Toolchain | spec-lead | **Adopt — jump from v0.11.6; remove Roo Code references** |
| APM v0.26.0 (July 18) | Toolchain / Security | all developers | **Adopt — lifecycle hooks, TLS verification, 40+ fixes** |
| `/verify` and `/code-review` no longer auto-run (v2.1.215) | Toolchain | code-reviewer, CI | **Act — update CI workflows immediately** |
| Fable 5 classifier reroutes to Opus 4.8 | Model / Cost | security-reviewer | **Watch — higher latency and cost surprises** |
| OSFI Fast-Track Framework — KOHO accelerated | Competitive | spec-lead | **Monitor — revisit PDR competitive positioning** |
| Expo SDK 57 Reanimated memory regression | Toolchain | implementer | **Watch — 25-30% memory increase; workaround available** |

---

## Recommended Next Steps

### Immediate (this week — before July 28)

1. **Audit for `claude-opus-4-1-20250805` usage.** 16 days to August 5 retirement. Search all agent files, CI scripts, and API wrappers. Replace with `claude-opus-4-8`. Use Claude Console Usage Export to verify no live traffic is hitting this model ID.

2. **Finalize any custom MCP server design to be stateless before July 28.** The MCP RC final spec drops July 28. Design uses explicit handle patterns (not `Mcp-Session-Id`) and include `cacheScope: user` on all financial-data tool responses.

3. **Audit the MCP server roster for Sentry MCP with public DSNs.** Check every developer's `.claude/settings.json` and APM-managed servers for a Sentry MCP entry. Add to code-reviewer and security-reviewer checklists: block PRs that configure Sentry MCP with a public DSN.

4. **Update CI workflows that relied on `/verify` or `/code-review` auto-run.** Claude Code v2.1.215 (July 19) requires explicit invocation. Any CI pipeline that depended on auto-execution will produce empty results silently.

### Short-term (this sprint)

5. **Migrate implementer and test-engineer agents to `claude-sonnet-5` before August 31.** Validate on two representative feature tasks before fully committing. The introductory $2/$10 pricing ends September 1.

6. **Read the Consumer-Driven Banking draft Regulations (Canada Gazette, June 27).** Consultation closes August 26. Architect and spec-lead should map the 99.5% uptime, 24-month transaction history, MFA-before-data-share, and 5-year consent record retention requirements against the current data layer design.

7. **Upgrade Spec Kit to v0.13.0.** Run `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.13.0`. Remove Roo Code integration references.

8. **Upgrade APM to v0.26.0.** Key gains: Executable Trust Governance v1, lifecycle hooks for custom vetting scripts, TLS verification against OS trust stores.

9. **Add two new items to the MCP vetting checklist.** (a) "Review all tool descriptions in aggregate — do they collectively guide the agent toward unintended behavior?" (ShareLock mitigation.) (b) "Do tool handlers filter API responses against explicit output schemas, or pass raw API data through?" (MCPPrivacyDetector finding.)

10. **Resume Fable 5 trial for spec-lead and architect.** Run security-reviewer prompts through Fable 5 explicitly to test the cybersecurity classifier false-positive rate before committing. If over-firing, keep security-reviewer on Opus 4.8.

### Medium-term (next 4–6 weeks)

11. **Evaluate pnpm 11 migration.** Run `pnpx codemod run pnpm-v10-to-v11` in a branch. Key checkpoints: Node 22 CI compatibility, `allowBuilds` for native modules, `pnpm_config_*` env var rename, `pnpm-workspace.yaml` config migration.

12. **Test NestJS v12 prerelease in a branch.** Install `@nestjs/core@next` in a copy of `apps/api` and run the existing test suite. Focus on ESM import compatibility, Zod/Standard Schema integration for money validation at API boundaries, and Vitest runner compatibility.

13. **Enable TypeScript 5.9 `import defer` for i18n bundle splitting.** Prototype deferred loading for `packages/i18n` translation bundles. Validate with Expo SDK 57's Metro bundler before landing in `apps/mobile`.

14. **Assess Bill C-36 cross-border data transfer implications.** Before the bill passes, evaluate whether the backend can be configured for Canadian data residency. AWS ca-central-1, Azure Canada Central, and GCP northamerica-northeast1 are the relevant options. Flag as an architecture decision requiring a spec amendment if it changes the current stack.

15. **Contact Flinks about MCP roadmap and CDBA accreditation pathway.** The draft Consumer-Driven Banking Regulations clarify the non-streamlined accreditation pathway. A direct inquiry referencing the Canada Gazette draft and asking about their Phase 1 integration roadmap is well-timed.

---

*Report generated 2026-07-20. All findings verified against primary sources. Delta report vs 2026-06-24 — prior findings not repeated unless status has changed.*

**Key sources:**
- Canada Gazette draft CDBA regulations: <https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html>
- Anthropic Redeploying Fable 5: <https://www.anthropic.com/news/redeploying-fable-5>
- Claude Sonnet 5 announcement: <https://www.anthropic.com/news/claude-sonnet-5>
- MCP 2026-07-28 RC: <https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/>
- Agentjacking / Sentry MCP (CSA): <https://labs.cloudsecurityalliance.org/research/csa-research-note-agentjacking-mcp-sentry-injection-20260612/>
- ShareLock paper: <https://arxiv.org/abs/2606.27027>
- Expo SDK 57: <https://expo.dev/changelog/sdk-57>
- APM releases: <https://github.com/microsoft/apm/releases>
- Spec Kit v0.13.0: <https://github.com/github/spec-kit/releases>
- Bill C-36 (PPCDA): <https://www.dlapiper.com/en-us/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act>
- pnpm 11 release: <https://pnpm.io/blog/releases/11.0>
- NestJS v12 roadmap: <https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/>
- TypeScript 5.9: <https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/>
- Model deprecations: <https://platform.claude.com/docs/en/about-claude/model-deprecations>
- Claude Code changelog: <https://code.claude.com/docs/en/changelog>
- WebMCP poisoning paper: <https://arxiv.org/abs/2606.06387>
