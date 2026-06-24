# Review Suppressions

Findings listed here are **known, accepted risks** — intentional decisions the team has
reviewed and chosen to defer or accept. The automated PR review workflow reads this file and
silently omits any finding whose topic matches an active suppression.

Adding an entry here does not close the issue — it stops the noise until the team is ready
to act. Each entry carries a `Reopen on` condition so it doesn't stay suppressed forever.

---

## Active suppressions

### SUP-001 — Mutable GitHub Actions tags (no SHA pinning)

- **Affects:** `.github/workflows/pr-review.yml`, `.github/workflows/agent-tooling-research.yml`
- **Suppressed patterns:** findings about `actions/checkout@v4` or `anthropics/claude-code-action@v1`
  using floating/mutable tags instead of commit SHA pins; findings about the absence of
  Dependabot or equivalent automated update tooling for GitHub Actions.
- **Why accepted:** deliberate trade-off — SHA pins require a maintenance process (Dependabot
  or manual bumps) that isn't in place yet. Accepted for now; both upstream actions are from
  trusted publishers with a track record of responsible releases.
- **Actual risk:** if either upstream repo or tag is compromised, attacker code runs in CI
  with `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, and `GITHUB_TOKEN` in scope.
- **Reopen on:** when Dependabot or an equivalent SHA-update workflow is set up, remove this
  entry and restore SHA pins with a maintenance process.
