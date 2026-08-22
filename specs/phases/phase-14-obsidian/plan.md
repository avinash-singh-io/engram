# Phase 14 — Implementation Plan

```
Sequential: Group 0 → Group 1 → Group 2 → Group 3 → Group 4 → Group 5 → Group 6
```

**TDD stays on** (Rule 13). The queue is pure logic over `FileStore`, so it is
testable in memory end to end; the plugin's handlers take injected deps for the same
reason.

## Reference specs (constitutional — read, never edit; Rule 10)

[`v2-overview.md`](../../architecture/v2-overview.md) §5 the write gate, §7
guardrails, §11 surfaces, §12 degradation · ADR-0015 editor adapters ·
ADR-0024 tiering · ADR-0028 Obsidian owns link rewriting · ADR-0032 ports ·
ADR-0034 engram never transmits · ADR-0041 MCP amends the trust boundary.

---

## Group 0 — ADR-0042

**Sequential. Blocks everything.**

The queue is a *trust* mechanism before it is a feature, and Phase 15 established
that the constraints get decided before there is code shaped around their absence.

- **ADR-0042** — the approval queue's trust boundary.
  - What the queue is for: `propose-only` defers to a human, and the deferral is
    only worth something if the human is the one who resolves it.
  - **Approve and reject are human-only.** Agents may read; only the CLI and the
    panel may act. Record why: an agent that approves its own proposal has turned a
    refusal into a retry.
  - **Staleness.** A proposal carries the full content it would write, so a target
    that moved on would be clobbered. Record the `basis` hash rule and that
    approve refuses rather than merges — engram does not resolve conflicts.
  - What is **not** solved: nothing authenticates the human. Anyone with the
    filesystem can approve, exactly as anyone with the filesystem can write the file
    directly. The queue constrains the *agent* path, not the human one.
- Queue entry schema — `id`, `target`, `rule`, `basis`, `by`, `at`, plus the content.

*Commit:* `docs(specs): ADR-0042 — the approval queue's trust boundary`

---

## Group 1 — QUEUE in the gate

**Sequential.** Depends on Group 0.

- `GateResult` gains a third arm: `{ outcome: 'queue'; change; rule; reason }`.
- Guardrail rules gain **`disposition: 'reject' | 'queue'`**, defaulting to `reject`.
  `propose-only` is the only one that queues today.
- `checkAll` returns the disposition alongside `{ rule, reason }`; the gate maps it.
  **The gate must never mention `propose-only`** — a name check would break silently
  the first time a second rule wants to defer. A test adds a second queueing rule to
  prove the mechanism is general.
- `propose-only`'s message changes from a refusal to a deferral.

*Commit:* `feat(gate): QUEUE — the third outcome §5 specified`

---

## Group 2 — The queue store

**Sequential.** Depends on Group 1.

`.engram/queue/<id>.md`, plain readable markdown — §12's promise is that everything
survives engram being uninstalled, and the queue must not be the exception.

- **propose** — write the entry; record `basis` = SHA-256 of the target's current
  content, or the absent-marker when the target does not exist yet.
- **list / show** — read-only; `show` renders what would change.
- **approve** — recompute `basis`; **refuse on mismatch**, naming the drift. On
  match, apply the change **through the gate** (with the queueing rule satisfied),
  never around it. Then mark the entry `approved` — resolved proposals are **kept**,
  not deleted (ADR-0042 §5).
- **reject** — discard, recording why. Target untouched.
- `crypto.subtle`, not `node:crypto` — this code runs on Obsidian mobile.
- `OPERATIONS` is **not** extended. A test asserts it still has six entries.

*Commit:* `feat(ops): the approval queue — propose, review, apply or discard`

---

## Group 3 — CLI and MCP

**Sequential.** Depends on Group 2.

- **`engram queue`** — `list`, `show <id>`, `approve <id>`, `reject <id> [why]`.
  §11 calls this "a `git`-style review", so `show` prints the diff-shaped view.
- **MCP** — the queue becomes *readable*: `engram_queue_list`, `engram_queue_show`.
  **No approve or reject tool exists.** Asserted by a test over the real tool list,
  not by inspection — this is the phase's load-bearing security property.
- `format` and `link` over both surfaces now report a queued outcome distinctly from
  a rejected one.

*Commit:* `feat(surface): engram queue; MCP reads the queue but cannot approve it`

---

## Group 4 — The plugin build target and `ObsidianFileStore`

**Sequential.** Depends on Group 3.

- `plugin/` as a second tsup entry emitting `main.js` + `manifest.json`.
  `obsidian` is a **dev**-dependency and an external — engram's zero runtime
  dependencies stay zero.
- **`obsidianFileStore(vault)`** implementing `FileStore` against `app.vault.adapter`,
  which works on desktop and mobile where `node:fs` does not.
- **The port contract suite** — one set of assertions, run against `memoryFileStore`,
  `nodeFileStore` and `obsidianFileStore(fakeAdapter)`. Anything a port promises
  (`read` of a missing path is `null`, never a throw; `list` enumerates what was
  written; `exists` agrees with `read`) is proven for all three or for none.

*Commit:* `feat(plugin): Obsidian build target and the FileStore port`

---

## Group 5 — Plugin commands, the queue panel, and doctor's drift warning

**Sequential.** Depends on Group 4.

- **Commands** — Capture (never rejects) and Format. Handlers take injected deps so
  they are testable without Obsidian.
- **The queue panel** — an `ItemView` listing pending proposals with approve and
  reject. Same objects the CLI reads; different rendering, which is §11's own test
  that the tiering is real.
- **doctor reads `.obsidian/app.json`** and warns when `newLinkFormat` /
  `useMarkdownLinks` disagree with the vault's actual links — closing
  [ADR-0028](../../decisions/0028-obsidian-owns-link-rewriting.md)'s device-drift
  gap. Detected, never configured (ADR-0025); doctor still rewrites nothing.

*Commit:* `feat(plugin): capture, format and the approval queue panel`

---

## Group 6 — Verification

**Sequential.**

- Full `npm run check`; the acceptance sweep; a deliberate import violation to
  re-prove the architecture rules; smoke tests of the **built** binary covering the
  queue round-trip and the staleness refusal.
- **The manual gate**, run and recorded as manual: the plugin loads in a real
  Obsidian vault; capture, format, and one approve round-trip work. Rule 12 forbids
  reporting this as if the suite covered it — it does not and cannot.
- Capture output for `retrospective.md` § Verification Evidence.

*Commit:* `test(plugin): phase 14 acceptance verification`
