# Claude Code Agent Team — How It Works

PerFiApp ships a small **team of specialized AI agents** that everyone gets automatically.
This is the Claude-native equivalent of tools like [Squad](https://github.com/bradygaster/squad) —
role-based agents that live in the repo — but it runs on **Claude Code** (the agent the rest
of our tooling already targets), with nothing extra to install.

## How it's shared (the important part)

The agents are plain markdown files committed to the repo under
[`.claude/agents/`](../.claude/agents/). That's the entire distribution mechanism:

```text
clone the repo  →  open it in Claude Code  →  the whole team is available
```

No per-developer setup, no CLI install. Because the files are version-controlled, the team's
roles evolve through normal pull requests, and everyone stays in sync.

> The only `.claude/` file we **don't** share is `settings.local.json` (your personal
> permission grants), which is gitignored.

## The roster

| Agent | Use it for |
|---|---|
| **spec-writer** | Turning a product idea into a clear spec with acceptance criteria. |
| **architect** | Turning a spec into a technical plan and weighing trade-offs (stack-agnostic for now). |
| **implementer** | Writing the code for an approved plan, matching existing conventions. |
| **test-engineer** | Writing and running meaningful tests; verifying behavior. |
| **code-reviewer** | Reviewing a diff for correctness, money/precision, security, and i18n (read-only). |

Each agent is tuned for PerFiApp: **Canada-first**, **bilingual (EN/FR)**, money handled as
exact units (never floats), and aligned with our [Spec Kit](https://github.com/github/spec-kit)
workflow.

## How to use them

You don't need to memorize the names. Claude Code **delegates automatically** based on each
agent's `description` — e.g. ask it to "write a spec for the subscription radar feature" and
it will route to `spec-writer`. You can also call one explicitly:

```text
Use the code-reviewer agent to review my current changes.
Have the architect plan the best-card recommender, then ask the implementer to build it.
```

Subagents run one at a time within your session and report back — token-efficient and the
default for most work.

## Optional: parallel "agent teams"

For tasks that benefit from several agents working **in parallel** (e.g. a multi-lens code
review, or building independent modules at once), Claude Code has an experimental
**[agent teams](https://code.claude.com/docs/en/agent-teams)** feature. A lead session spawns
teammates — and those teammates can be spawned **using the role files above**, so the same
roster works in both modes.

It's **off by default**. To try it, enable it in your settings (per-user, not committed):

```json
// .claude/settings.local.json  (or ~/.claude/settings.json)
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
}
```

Then ask Claude, e.g.: *"Create an agent team to review PR #42 — one teammate on security,
one on money/precision, one on test coverage."* Note it uses more tokens and (on Windows)
runs in-process rather than split panes. Requires Claude Code v2.1.32+.

## Editing the team

- **Add a role**: drop a new `*.md` file in `.claude/agents/` with `name`, `description`, and
  a focused system prompt. Optional: `tools` (allowlist) and `model`.
- **Change a role**: edit its file and open a PR — reviewers see exactly what changed.
- Keep descriptions sharp; that text is what Claude uses to decide when to delegate.

## How this fits the rest of our tooling

- **Spec Kit** = the *process* (spec → plan → tasks → implement). Our agents are tuned to it.
- **APM** ([setup guide](APM_SETUP.md)) = the *supply chain* for shared agent skills/MCP.
- **This agent team** = the *who* — the specialist roles that carry out the work.
