# Research reports

Output from the **researcher** agent ([`.claude/agents/researcher.md`](../../.claude/agents/researcher.md)),
which scouts external tools — MCP servers, Claude Code plugins, and addons — that could help
PerFiApp's agent team, evaluated for relevance, maturity, and security.

Reports land here as dated files: **`agent-tooling-YYYY-MM-DD.md`**.

They are generated:

- **Automatically**, on a weekly schedule, by the
  [Agent Tooling Research workflow](../../.github/workflows/agent-tooling-research.yml). It
  runs the researcher and **opens a PR** with the new report for the team to review.
- **On demand**, by asking Claude Code in this repo to *"use the researcher agent to scan for
  new tooling."*

Everything here is a **recommendation only** — nothing is installed or wired up until the
team reviews a report and decides. MCP servers in particular must be explicitly vetted before
adoption (see the [APM setup guide](../APM_SETUP.md)).
