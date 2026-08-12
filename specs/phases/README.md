# Phases Index

| Phase | Name | Status | Directory |
|-------|------|--------|-----------|
| 0 | Foundation | Complete (v0.1.0) | `phase-0-foundation/` |
| 1 | MVP Vault + Claude Code | Complete (v0.2.0) | `phase-1-mvp-vault/` |
| 2 | Progressive-Disclosure Retrieval | Complete (v0.3.0) | `phase-2-retrieval/` |
| 4 | Ecosystem | Complete (v0.4.0) | `phase-4-ecosystem/` |
| 3 | Sync + Multi-Device | Complete (v0.5.0) | `phase-3-sync/` |
| 6 | Onboarding & OKF Migration | Complete (v0.6.0) | `phase-6-onboarding/` |
| 7 | Evidence & Observation | Complete — Gate 1: PROCEED | `phase-7-evidence/` |
| 8 | Core | Complete (v0.7.0) | `phase-8-core/` |

## Phase Structure

Each phase directory contains:

| File | Purpose |
|------|---------|
| `overview.md` | Goal, scope, deliverables, acceptance criteria |
| `plan.md` | Group execution pattern with tasks |
| `tasks.md` | Checklist `[ ]` / `[x]` |
| `history.md` | Append-only log |
| `retrospective.md` | Post-completion review (created by /complete-phase) |

## Swarm-member briefs (optional)

When a phase is driven by a swarm conductor (Phase 17+), `overview.md`
MAY carry an optional YAML frontmatter block declaring its swarm
context. Solo briefs omit this entirely — they remain plain markdown.

```yaml
---
swarm: 0007-user-auth
wave: 2
initiative: user-auth
claimed_by_session: <session-uuid>
---
```

`/start-phase` populates these when invoked from a swarm context.
`/validate` checks that `swarm:` resolves to a real swarm manifest,
that `wave:` matches the wave the swarm has assigned this repo, and
that `initiative:` matches the swarm's initiative.
