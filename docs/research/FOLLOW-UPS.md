# Research report follow-ups

Dispositions for every **Act**-verdict finding from the research reports. GitHub Issues
are disabled on this repo, so this file is the tracking record — check items off (or move
them to "Done") in the PR that resolves them. The weekly researcher should read this file
to avoid re-reporting items already dispositioned.

## From [agent-research-2026-06-24.md](agent-research-2026-06-24.md)

### Done / verified (2026-07-03)

| Finding | Disposition |
|---|---|
| Fable 5 export-control suspension — verify fallback chain | ✅ Verified n/a: no agent file or workflow pins `claude-fable-5` (or any model except the PR-review workflow's explicit `--model claude-sonnet-4-6`). Agents inherit the session model, so there is no broken pin to fall back from. |
| `claude-opus-4-1` retires 2026-08-05 — audit references | ✅ Audit clean: zero references to `claude-opus-4-1` anywhere in the repo. |
| `temperature`/`top_p`/`top_k` 400 on Opus 4.7+ — remove sampling params | ✅ Audit clean: no sampling parameters set anywhere (no application code exists yet). Re-check when the first API-calling code lands. |
| OX Security MCP RCE — add RCE check to MCP vetting | ✅ Done: MCP server vetting checklist added to [docs/APM_SETUP.md](../APM_SETUP.md) §7, including RCE-surface review and the Azure MCP (CVE-2026-32211) auth check. |
| CVE-2026-32211 Azure MCP — don't deploy without auth verification | ✅ Covered by the same vetting checklist; Azure MCP is not in use and would have to pass §7 before adoption. |

### Open

- [ ] **FINTRAC implementation guidance** ("reasonably designed, risk-based, effective"
      standard) — owners: architect + spec-lead. Determine which Phase 1 modules
      (Rewards & Loyalty, Credit & Coaching, Bills & Subscriptions) trigger obligations,
      and capture conclusions as constraints in the relevant feature specs via
      `/speckit-specify` / `/speckit-plan`. The first feature (Card Knowledgebase &
      Best Card Recommender) is static reference data and likely has no FINTRAC surface;
      Bills/payment features later in Phase 1 might.
- [ ] **Claude Code CVE-2025-59536 + CVE-2026-21852** — per-developer hygiene: each
      collaborator verifies they run a current Claude Code release (CI uses
      `claude-code-action@v1`, which tracks latest). One-time check for the current team;
      fold into onboarding notes.

*Adopt/Trial/Monitor-verdict items from the reports (toolchain upgrades, DeepEval, Spec
Kit/APM versions, open-banking timelines, competitor moves) are deliberately not tracked
here — they get picked up when relevant work makes them actionable.*
