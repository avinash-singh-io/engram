# Phase 9 — Implementation Plan

```
Sequential: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4 → Group 5 → Group 6
```

**TDD stays on** (Rule 13). It paid for itself in Phase 8, and views and `doctor` are
pure projections over the model — the cheap case again. The walker touches a real
filesystem, so it goes through `FileStore` and is exercised in memory.

## Reference specs (constitutional — read, never edit; Rule 10)

[`v2-overview.md`](../../architecture/v2-overview.md) §2 modules, §4 the seven
operations, §7 guardrails (preventive vs detective), §12 degradation ·
ADR-0019 primitives · ADR-0022 relations · ADR-0023 structure and views ·
ADR-0025 detection over configuration · ADR-0028 Obsidian owns link rewriting ·
ADR-0029 derived state · ADR-0030 boundaries are repos.

---

## Group 0 — Register `part-of`, and the derived-state policy

**Sequential. Blocks everything.**

The roadmap says "view generation from `part-of`" without noticing that `part-of`
does not exist. Phase 8 registered two relations and a test asserts exactly those
two, so this group closes a prerequisite rather than adding a detail.

- Register `part-of`: `invalidatesTarget: false` (containment says nothing about
  currency), a meaning, and a detective form.
- Update the exactly-two-relations test to exactly-three, deliberately — the test
  exists to make relation additions visible, so changing it is the intended cost.
- Constants for reserved filenames and derived paths, in one place.
- `.gitignore` fragment for derived state (ADR-0029).

*Commit:* `feat(core): register part-of relation`

---

## Group 1 — The walker

**Sequential.** Depends on Group 0.

Three behaviours, all inherited: TD-004 from the backlog, reserved-file detection
and enumeration-only counting from the Phase 8 v1 sweep.

- Enumerate authored content under a root, via `FileStore`.
- **Nested-root refusal (TD-004).** Detect on an **explicit marker only** (`.engram/`),
  never a heuristic — a misfire silently skips real content, which is worse than the
  disclosure it guards against. Skip the subtree and return it as a reported finding.
- **Reserved-file detection** at any depth: `index.md`, `log.md`, `AGENTS.md`,
  `CLAUDE.md`. Never authored content, never enumerated as a node.
- **Enumeration-only counting** — structure without reading bodies.

Both directions are tested: a marked root is skipped, an ordinary subdirectory is not.

*Commit:* `feat(ops): vault walker with nested-root refusal`

---

## Group 2 — View generation

**Parallel with Group 3.** Depends on Groups 0 and 1.

- `index.md` — a projection of `part-of`.
- `views/superseded.md` — from `supersedes` edges.
- `views/recent.md` — from assertion stamps.
- `views/orphans.md` — nodes with no edges at all.

**No generated file may embed a generation timestamp.** That is what makes `reindex`
idempotent and "regenerate, never merge" quiet rather than noisy.

*Commit:* `feat(views): generate index and edge projections`

---

## Group 3 — `doctor`

**Parallel with Group 2.** Depends on Group 1.

- Structural findings from `core/graph.ts`: slug collisions, path-as-identity,
  dangling edges.
- Walker findings: nested roots, reserved-path content a generator did not write.
- **Every registered relation's detective form**, reported by name. This is the
  payoff of Phase 8 requiring one: §7 is explicit that a rule enforceable only at
  the gate is advisory, because Obsidian and any agent with a shell bypass it.
- Obsidian link-format detection from `.obsidian/app.json`, via the `Detector` port.
- Derived-file conflict → report **"regenerate, never merge"**.
- **Read-only.** Exit non-zero on integrity *failures* only, never on warnings —
  ADR-0021 is explicit that collisions and missing slugs are not errors.

*Commit:* `feat(ops): doctor health and integrity report`

---

## Group 4 — `reindex` and `init`

**Sequential.** Depends on Groups 2 and 3.

- `reindex` — regenerate all derived state. Idempotent.
- `init` — scaffold ADR-0023's reference tree, write the derived-state gitignore,
  and run a first `reindex`. `--structure` accepts `default` only.
- `init` is non-destructive: it never overwrites an existing file.

*Commit:* `feat(ops): reindex and init`

---

## Group 5 — CLI wiring and e2e

**Sequential.** Depends on Group 4.

`engram init`, `engram reindex`, `engram doctor`, joining `capture` and `link`.

The load-bearing e2e is ADR-0029's safety claim: **delete every derived file,
re-run `reindex`, and compare byte-for-byte.** If that ever fails, something in
`views/` was not derived and the ADR is being violated.

*Commit:* `feat(cli): init, reindex and doctor commands`

---

## Group 6 — Verification

**Sequential.**

Full `npm run check`; the acceptance sweep; a deliberate import violation to
re-prove the architecture rules still fire; a smoke test of the **built** binary,
not just the source. Capture output for `retrospective.md` § Verification Evidence.

*Commit:* `test(views): phase 9 acceptance verification`
