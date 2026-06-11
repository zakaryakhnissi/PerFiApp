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
| **spec-lead** | Spec Kit specialist: owns the **constitution**, turns a request into a **clarified spec**, and produces the **plan** — driving the real `.specify/` assets. |
| **architect** | **Architect & tech lead**: turns the plan into concrete technical design, tech choices, and a sequenced task breakdown; coordinates the build. |
| **implementer** | Writing the code for an approved plan, matching existing conventions. |
| **test-engineer** | Writing and running meaningful tests; verifying behavior. |
| **code-reviewer** | Reviewing a diff for correctness, money/precision, security, and i18n (read-only). |
| **researcher** | Scouting developments that make the team better/cheaper/safer/more compliant — tooling, AI cost optimization, model updates, evals, toolchain releases, AI/fintech security, and Canadian compliance; writes a dated report. Runs weekly via CI and on demand. |

Each agent is tuned for PerFiApp: **Canada-first**, **bilingual (EN/FR)**, money handled as
exact units (never floats), and aligned with our [Spec Kit](https://github.com/github/spec-kit)
workflow.

### The spec-driven flow

The roster mirrors how a feature actually moves through Spec Kit:

```text
spec-lead                         architect / tech lead          builders
─────────                         ─────────────────────          ────────
constitution → specify → clarify → plan  ──►  design + sequence ──►  implementer
                  ▲                                                  test-engineer
                  └── clarifying questions                           code-reviewer
                      surfaced to you (the
                      main session) to answer
```

- **spec-lead** owns the *upstream* (why/what): constitution, spec, clarifications, plan.
- **architect / tech lead** owns the *downstream* (how): technical design, technology choice,
  task sequencing, and coordinating the builders.
- Because subagents can't interview you mid-run, the spec-lead returns **clarifying
  questions** for the main session to ask you, then folds your answers back in.

**How spec-lead and architect coordinate** — by design this works two ways:
- **Today (normal subagents):** each reports to the main session, which relays artifacts
  between them.
- **With parallel [agent teams](https://code.claude.com/docs/en/agent-teams) enabled:** they
  run as teammates and **message each other directly** to negotiate the plan. Same roles,
  just direct messaging.

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

## Automated tooling research

The **researcher** is the one agent that runs on its own schedule, not just on demand. A
GitHub Actions workflow,
[`.github/workflows/agent-tooling-research.yml`](../.github/workflows/agent-tooling-research.yml),
wakes **weekly**, has the researcher scout new MCP servers / plugins / addons for the team,
writes a dated report to [`docs/research/`](research/), and **opens a PR** for the team to
review. You can also run it manually from the **Actions** tab → *Run workflow*.

It needs a **one-time setup by a repo admin**:

1. Install the [Claude GitHub app](https://github.com/apps/claude) (or run
   `/install-github-app` from Claude Code in this repo).
2. Add an `ANTHROPIC_API_KEY` repository secret (**Settings → Secrets and variables →
   Actions**).

Each run consumes Claude API tokens and Actions minutes, and nothing it finds is adopted
until the team reviews the PR.

## How this fits the rest of our tooling

- **Spec Kit** = the *process* (spec → plan → tasks → implement). Our agents are tuned to it.
- **APM** ([setup guide](APM_SETUP.md)) = the *supply chain* for shared agent skills/MCP.
- **This agent team** = the *who* — the specialist roles that carry out the work.
