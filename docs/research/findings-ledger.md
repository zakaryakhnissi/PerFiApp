# Research Findings Ledger

Canonical list of **every finding the researcher has already reported**, so future runs can
*exclude what's already known* and spend effort only on what's new or has materially changed.

How it's used (see [`.claude/agents/researcher.md`](../../.claude/agents/researcher.md)):

- The researcher **reads this file first** — and *only* this file, not every dated report — to
  learn what's already been covered.
- A finding whose topic is already listed here is **not re-reported**. The one exception is a
  **material change** — a new version/price, a moved deadline, a changed verdict, or a status
  flip. Those are reported as an **update** in the new report, and the matching row here is
  revised (bump *Last seen*, note the change). If the ledger row is too terse to judge whether
  something changed, open that finding's original dated report for detail.
- After each run, the researcher **appends new findings** and updates changed rows, then commits
  this file alongside the new report.

One row per finding. `ID` is a stable kebab-case slug — **never reuse, renumber, or delete a
row** (mark it *Resolved* in Status instead, e.g. a deadline that has passed or an item the team
adopted). Status carries the verdict (`adopt` / `trial` / `watch` / `avoid` / `act` / `monitor` /
`ignore`) or `resolved`.

| ID | Title | Track | First seen | Last seen | Status | Notes |
|---|---|---|---|---|---|---|
| model-claude4-retirement | claude-sonnet-4 / claude-opus-4 retirement | Model | 2026-06-11 | 2026-06-11 | act | Deadline 2026-06-15; check after it passes → resolved |
| model-fable-5 | Claude Fable 5 (`claude-fable-5`) | Model | 2026-06-11 | 2026-06-11 | trial | Most capable Anthropic model; spec-lead, architect |
| model-sonnet-4-6-default | Claude Sonnet 4.6 as default workhorse | Model | 2026-06-11 | 2026-06-11 | adopt | implementer, test-engineer, code-reviewer |
| cost-haiku-4-5-light | Claude Haiku 4.5 for lightweight tasks | Cost | 2026-06-11 | 2026-06-11 | adopt | researcher, quick code-reviewer checks |
| cost-prompt-caching | Prompt caching (5 min + 1 h TTL) | Cost | 2026-06-11 | 2026-06-11 | adopt | All agents with long system prompts |
| cost-batches-api | Message Batches API (50% off, 300k output) | Cost | 2026-06-11 | 2026-06-11 | adopt | researcher bulk doc processing |
| cost-context-compaction | Context compaction (`compact-2026-01-12`) | Cost | 2026-06-11 | 2026-06-11 | trial | Long-running implementer sessions |
| cost-three-tier-routing | Three-tier model routing pattern | Cost | 2026-06-11 | 2026-06-11 | adopt | Entire agent team |
| toolchain-cc-nested-subagents | Claude Code nested subagents (5 levels, v2.1.172) | Toolchain | 2026-06-11 | 2026-06-11 | watch | architect, implementer parallelism |
| toolchain-cc-fallback-chain | Claude Code fallback model chain | Toolchain | 2026-06-11 | 2026-06-11 | adopt | All agents |
| toolchain-cc-worktree-isolation | Claude Code worktree isolation | Toolchain | 2026-06-11 | 2026-06-11 | adopt | implementer + test-engineer parallel work |
| toolchain-spec-kit-0-9-5 | Spec Kit v0.9.5 | Toolchain | 2026-06-11 | 2026-06-11 | adopt | spec-lead; watch for newer releases |
| toolchain-apm-0-19-0 | APM v0.19.0 | Toolchain | 2026-06-11 | 2026-06-11 | adopt | All developers; watch for newer releases |
| tooling-github-mcp | GitHub MCP Server (official) | Agent tooling | 2026-06-11 | 2026-06-11 | adopt | code-reviewer, architect |
| tooling-plaid-mcp | Plaid MCP Server (official) | Agent tooling | 2026-06-11 | 2026-06-11 | trial | implementer, architect (banking) |
| tooling-snaptrade-mcp | SnapTrade MCP Server (read-only brokerage) | Agent tooling | 2026-06-11 | 2026-06-11 | watch | implementer (investment data) |
| quality-deepeval | DeepEval v3.9+ (agent evals) | Agent quality | 2026-06-11 | 2026-06-11 | trial | test-engineer |
| security-owasp-mcp-top10 | OWASP MCP Top 10 + Agentic Apps Top 10 | Security | 2026-06-11 | 2026-06-11 | act | architect, code-reviewer review checklist |
| security-github-3p-agent-validation | GitHub security validation for third-party agents | Security | 2026-06-11 | 2026-06-11 | adopt | code-reviewer, CI pipeline |
| compliance-cdba-phase1 | Consumer-Driven Banking Act (CDBA) Phase 1 | Compliance | 2026-06-11 | 2026-06-11 | act | architect, spec-lead; OAuth APIs, no scraping |
| compliance-fintrac-2026 | FINTRAC 2026 AML/PCMLTFA amendments | Compliance | 2026-06-11 | 2026-06-11 | act | architect, spec-lead |
| compliance-pci-dss-4 | PCI DSS v4.0 fully mandatory | Compliance | 2026-06-11 | 2026-06-11 | act | architect, implementer |
| compliance-quebec-law25 | Quebec Law 25 fully in force | Compliance | 2026-06-11 | 2026-06-11 | act | architect, spec-lead; PIAs |
| competitive-monarch-canada | Monarch Money Canada launch | Competitive | 2026-06-11 | 2026-06-11 | monitor | spec-lead positioning |
