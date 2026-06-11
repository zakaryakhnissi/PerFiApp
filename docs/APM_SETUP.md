# Agent Package Manager (APM) — Setup Guide

This document explains how we use **[Microsoft APM](https://microsoft.github.io/apm/)
(Agent Package Manager)** in PerFiApp, and how to set it up as a collaborator.

APM is a **dependency manager for AI agents** — think "npm for agent context." It lets us
declare every agent primitive the project relies on (instructions, skills, prompts, agents,
hooks, plugins, and MCP servers) **once** in a manifest, so every collaborator — and CI —
gets a byte-identical agent setup with a single command.

> **APM vs. Spec Kit — they are complementary, not competing.**
> [Spec Kit](https://github.com/github/spec-kit) (already set up in this repo under
> `.specify/` and `.claude/skills/speckit-*`) gives us the **spec-driven _workflow_**
> (`constitution → specify → plan → tasks → implement`). APM manages the **_supply chain_**
> of agent primitives those workflows — and our day-to-day coding agents — depend on.
> Spec Kit is the process; APM is how we distribute and pin the shared tooling that powers it.

---

## Why we use APM here

We expect **multiple people collaborating** across different machines, OSes, and possibly
different agents (Claude Code, Copilot, Cursor…). Without APM, each person hand-installs
skills/MCP servers and they drift. APM gives us:

- **Reproducibility** — `apm.yml` + `apm.lock.yaml` pin every dependency to an exact source
  ref **and** content hash, so two developers running `apm install` get identical context.
- **One onboarding command** — clone, run `apm install`, done.
- **Security** — content-hash pinning, hidden-Unicode scanning, and a rule that **MCP
  servers must be explicitly declared** (no silent transitive MCP).
- **Governance** — an optional `apm-policy.yml` can gate what's installable, with
  enterprise → org → repo inheritance (useful as the team grows).

---

## 1. Install the APM CLI (once per machine)

Each collaborator installs the CLI locally — it is **not** committed to the repo.

**Windows (PowerShell):**

```powershell
irm https://aka.ms/apm-windows | iex
```

**macOS / Linux:**

```bash
curl -sSL https://aka.ms/apm-unix | sh
```

Verify:

```powershell
apm --version
```

> Homebrew, Scoop, and pip install methods are also documented at
> <https://microsoft.github.io/apm/quickstart/> if you prefer a package manager.

---

## 2. Day-to-day: get the project's agent setup

After cloning **or** after pulling changes that touch `apm.yml` / `apm.lock.yaml`:

```powershell
apm install
```

With no arguments, this restores exactly what the lockfile pins and materializes the
agent-specific files locally (for Claude Code, under `.claude/`). Run it whenever the
manifest or lockfile changes.

For a strict, lockfile-only restore (recommended in CI and for guaranteeing no drift):

```powershell
apm install --frozen
```

`--frozen` fails if `apm.yml` and `apm.lock.yaml` have diverged, catching un-committed
manifest edits.

---

## 3. One-time repo initialization (already-done / for reference)

A maintainer initializes APM **once** for the repo. This is documented here for
transparency — you generally won't re-run it.

```powershell
apm init
```

This creates `apm.yml`. We target **Claude Code** to match our existing tooling (you can
add more targets later). A minimal manifest for this repo looks like:

```yaml
name: perfiapp
version: 0.1.0
description: Agent dependencies for PerFiApp (FinOS)
author: perfiapp

# Compile primitives for these agents. Add 'copilot', 'cursor', etc. as the team adopts them.
targets:
  - claude

dependencies:
  apm: []      # agent primitives (skills / prompts / agents / plugins / full packages)
  mcp: []      # MCP servers — must be declared explicitly

includes: auto
scripts: {}
```

---

## 4. Adding a dependency

Add a primitive or package (shorthand is `owner/repo[/path][#ref]`). Pin a ref so installs
stay reproducible:

```powershell
# A skill from a repo, compiled for Claude Code
apm install anthropics/skills/skills/frontend-design --target claude

# A full package pinned to a release tag
apm install microsoft/apm-sample-package#v1.0.0 --target claude

# An MCP server (HTTP transport) — declared explicitly
apm install io.github.github/github-mcp-server
```

`--target` accepts `claude`, `copilot`, `cursor`, `opencode`, `codex`, `gemini`,
`windsurf`, `all`, and more (comma-separate for several: `--target claude,copilot`).

After adding, **commit the updated `apm.yml` and `apm.lock.yaml`** so the rest of the team
picks it up on their next `apm install`.

### Keeping dependencies current

```powershell
apm outdated   # show available updates
apm update     # re-resolve to latest allowed refs and rewrite the lockfile
apm audit      # security scan of declared dependencies
```

---

## 5. What to commit vs. ignore

APM follows the npm model: **commit the source of truth, ignore the build output.**

| Path | Commit? | Why |
|---|---|---|
| `apm.yml` | ✅ Yes | The manifest — the list of what we depend on. |
| `apm.lock.yaml` | ✅ Yes | Pins exact refs + content hashes for reproducible installs. |
| `.apm/` (if we author local primitives) | ✅ Yes | Our own skills/prompts source tree. |
| `apm_modules/` | ❌ Ignore | Resolved package cache — regenerated by `apm install`. |
| Generated agent dirs (APM's output in `.claude/`, `.github/`, `.cursor/`, …) | ❌ Ignore | Build output — never edit by hand; re-run `apm install`. |

`apm install` **automatically appends its managed paths to `.gitignore`** on first run.

> ⚠️ **Coexistence with Spec Kit:** our Spec Kit skills under
> `.claude/skills/speckit-*` are **committed on purpose** (they're installed by Spec Kit,
> not APM). After the first `apm install`, review the entries APM adds to `.gitignore` and
> make sure they're scoped to APM's own generated files and don't accidentally un-track the
> committed Spec Kit skills. Edit the APM source under `.apm/` and re-run `apm install` —
> never hand-edit deployed copies under `.claude/`.

---

## 6. CI / onboarding checklist

For a new collaborator:

1. Install the CLI (§1).
2. Clone the repo.
3. Run `apm install` (or `apm install --frozen` to guarantee no drift).
4. Start your agent (Claude Code) — the declared primitives are now available.

In CI, prefer `apm install --frozen` so a build fails fast if `apm.yml` and
`apm.lock.yaml` are out of sync.

---

## References

- APM home & quickstart — <https://microsoft.github.io/apm/>
- What is APM? — <https://microsoft.github.io/apm/concepts/what-is-apm/>
- Package anatomy — <https://microsoft.github.io/apm/concepts/package-anatomy/>
- `apm install` reference — <https://microsoft.github.io/apm/reference/cli/install/>
- Source — <https://github.com/microsoft/apm>
