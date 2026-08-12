# Phase 14 — Tasks

> Legend: `[ ]` todo · `[/]` in progress · `[x]` done
> Execution: Group 0 → 1 → 2 → 3 → 4 → 5 → 6 (sequential)
> **TDD is on** (Rule 13) — the failing test comes first in every group.

## Group 0 — ADR-0042 — blocks everything

- [x] Write **ADR-0042** — the approval queue's trust boundary
- [x] Record **approve/reject are human-only**, and why: an agent that can approve
      its own proposal has converted a refusal into a retry loop
- [x] Record the **staleness rule** — `basis` hash at propose, recomputed at approve,
      refusal on mismatch. Engram refuses; it does not merge
- [x] Record what is **not** solved: nothing authenticates the human. The queue
      constrains the agent path, not the filesystem
- [x] Queue entry schema — `id`, `target`, `rule`, `basis`, `by`, `at`, content
- [x] File **TD-006** — ADR-0015's `EditorAdapter` layer absent from v2
- [x] File the ADR-0028 doctor gap; close it in Group 5
- [x] Also filed **TD-007** — ADR index stale since 0017
- [x] Also filed **TD-007** — ADR index stale since 0017

## Group 1 — QUEUE in the gate

- [x] Tests first — 17 tests in `tests/gate.test.ts`
- [x] `GateResult` third arm: `{ outcome: 'queue'; change; rule; reason }`
- [x] Guardrail rules gain `disposition: 'reject' | 'queue'`, default `reject`
- [x] `checkAll` returns the disposition; the gate maps it
- [x] **The gate never names `propose-only`** — proven by a second queueing rule
      added in test, which must queue without touching the gate
- [x] `propose-only`'s message becomes a deferral, not a refusal
- [x] A normal path still applies; a genuine violation still rejects
- [x] **Fixed a regression this change introduced**: `format` and `link` narrowed
      with `outcome === 'reject'` and fell through to `files.write` for the new
      outcome — `propose-only` went from refusing writes to silently applying
      them, with all 464 tests green. Both now fail closed on anything that is
      not `apply`, and the new assertions are on the filesystem, not the return
      value
- [x] Surfaces report queued distinctly — CLI exit `3`; MCP `isError` with text
      stating the agent cannot approve it and that no such tool exists
- [x] Verify: `npm run check` exit 0 — 28 files, **467 tests**. Regression proven
      by reverting the fix and watching the two filesystem assertions fail

## Group 2 — The queue store, and a config that can feed it

- [x] Tests first
- [x] **BUG-003** — `.engram/guardrails.md`, so a vault can declare `proposeOnly`,
      `pathScope` and `rateLimit` at all. Absent means today's defaults, so no
      existing vault changes behaviour; `init` scaffolds it with the fields
      present and `proposeOnly` empty
- [x] `AGENTS.md` renders the loaded config rather than `DEFAULT_GUARDRAILS`
- [x] `.engram/queue/<id>.md` — plain readable markdown (§12)
- [x] `propose` records `basis` = SHA-256 of the target now, or the absent-marker
- [x] `list` / `show` are read-only; `show` renders what would change
- [x] `approve` recomputes `basis` and **refuses on mismatch**, naming the drift
- [x] `approve` applies **through the gate**, never around it, then clears the entry
- [x] `reject` discards with a reason; target untouched either way
- [x] `crypto.subtle`, not `node:crypto` — this runs on Obsidian mobile
- [x] Assert `OPERATIONS` still has **six** entries — the queue added no operation
- [x] Resolved proposals are **kept**, not deleted — ADR-0042 §5, amended
      mid-group when deleting turned out to need a `delete` on the FileStore port
- [x] `format`/`link` persist their own proposals, so a surface cannot forget
- [x] Verify: `npx vitest run tests/ops/queue.test.ts` — 25 passed

## Group 3 — CLI and MCP

- [x] Tests first
- [x] `engram queue list | show <id> | approve <id> | reject <id> [why]`
- [x] `show` prints the `git`-style review §11 names
- [x] MCP gains `engram_queue_list` and `engram_queue_show` — read-only
- [x] **Assert no MCP tool can approve or reject**, over the real tool list
- [x] `format` / `link` report queued distinctly from rejected on both surfaces
- [x] `surface/diff.ts` — LCS line diff with collapsed context, so `show` is a
      review rather than a dump
- [x] e2e through `main()` on a real temp vault: defer, approve, stale-refuse,
      reject, and AGENTS.md carrying the vault's own propose-only paths
- [x] Verify: `npm run check` — 532 tests at this point

## Group 4 — Plugin build target and the port

- [x] Tests first
- [x] `plugin/` as a second tsup entry → `main.js` + `manifest.json`
- [x] `obsidian` is a **dev** dependency and an external — runtime deps stay zero
- [x] `obsidianFileStore(vault)` over `app.vault.adapter`
- [x] **One port contract suite, three implementations** — memory, node, and
      Obsidian-against-a-fake-adapter, same assertions
- [x] **Fixed a real divergence the contract found**: `memoryFileStore` listed in
      insertion order while the other two sorted — a test could pass on an
      ordering production never produces
- [x] **Architecture rule 3** — `plugin/**` may not import node builtins or
      `substrate/index`, which re-exports `nodeFileStore` and would pull
      `node:fs` into the mobile bundle. Proven by deliberate violation
- [x] Verify: contract suite green for all three (39 tests); `npm run build`
      emits `main.js` + `manifest.json` + `styles.css`, `obsidian` external,
      **zero node builtins in the bundle**

## Group 5 — Commands, panel, and doctor's drift warning

- [x] Tests first
- [x] Capture command (never rejects) and Format command, deps injected
- [x] Queue panel — `ItemView` listing proposals with approve / reject
- [x] `doctor` reads `.obsidian/app.json` and warns when `newLinkFormat` /
      `useMarkdownLinks` disagree with the vault's actual links (ADR-0028)
- [x] doctor still rewrites nothing — detection only (ADR-0025, ADR-0028)
- [x] Manifest drift guard — plugin version must equal package version
- [x] Verify: `npx vitest run tests/plugin tests/ops/doctor.test.ts` — 40 passed

## Group 6 — Verification

- [ ] Full `npm run check` — fresh output, exit 0
- [ ] Acceptance sweep against `overview.md`
- [ ] Deliberate import violation re-proves the architecture rules
- [ ] Built-binary smoke: queue round-trip and the staleness refusal
- [ ] **Manual gate, recorded as manual** — plugin loads in a real Obsidian vault;
      capture, format, one approve round-trip
- [ ] `retrospective.md` with `## Verification Evidence`
