# Phase 14 — The approval queue (Obsidian plugin deferred to Phase 16)

> **Status**: in progress (started 2026-08-13)
> **Branch**: `phase-14-obsidian`
> **Target release**: v0.11.0
> **Not gated on Gate 2** — nothing here depends on edge accuracy.
>
> **SCOPE CHANGED 2026-08-17.** The owner deprioritized the Obsidian plugin in favour
> of getting the **agent** surfaces into real use first. This phase now releases the
> **approval queue**; the plugin's code lands inert, excluded from the npm tarball,
> and its manual vault verification becomes **Phase 16**'s acceptance gate. The split
> follows the tier boundary exactly — the queue is gate work, the plugin is surface
> work — which is why it was clean.

## Goal

Give the **human** a surface inside the editor they already live in, and build the
thing that surface is supposed to render: **the approval queue**.

[v2-overview §11](../../architecture/v2-overview.md) lists the plugin as serving
*"human, agent inside the editor."* The agent half is already served — that is the
MCP surface Phase 15 shipped. This phase is the human half.

## What was missing when this phase started

§11 names the approval queue as a Phase 14 deliverable. It does not exist.

§5 gives the write gate **three** outcomes — APPLY, QUEUE, REJECT. Phase 8 shipped
two and said so in its own header. Phase 10 shipped `propose-only` as a *refusal*:

```
`${change.path} is propose-only — this change needs human review before it applies`
```

It states the change needs review, then refuses it. Nothing is held anywhere, and
there is no queue for a panel to render. The gate cannot be a review mechanism while
its only answers are yes and no.

## Key decisions (→ ADRs)

| Decision | Rationale | ADR |
|---|---|---|
| **The gate gains QUEUE** — `propose-only` defers rather than refuses | §5 specified three outcomes before Phase 8 existed, and `gate.ts`'s own header names QUEUE as what "a change is a proposed diff" was for. This is implementing the spec, not amending it | §5 |
| A guardrail rule declares a **`disposition`** (`reject` \| `queue`) | The alternative is the gate special-casing `propose-only` **by name** — coupling that breaks the moment a second deferring rule exists, and silently | this phase |
| **The queue is state, not an eighth operation** | A queued item *is* a pending `format` or `link`; approving replays it through the gate. Making `queue` an operation would push it into every skill's `uses:` and make the count seven-plus-one | §6, §11 |
| **Approve and reject are human-only — never MCP tools** | The queue exists *because* a human must look. An agent that can approve its own queued change has converted a refusal into a retry loop. Agents may read the queue; only the CLI and the panel may act on it | **0042** |
| A proposal records a **`basis` hash**; approve refuses on mismatch | A proposal carries the whole content it would write. If the target moved on, applying it clobbers newer work — precisely the corruption [ADR-0028](../../decisions/0028-obsidian-owns-link-rewriting.md) exists to prevent | **0042** |
| Queue entries are **plain readable markdown** in `.engram/queue/` | Everything else in the vault survives engram being uninstalled (§12). A queue in a binary or a database would be the one thing that does not | §12 |
| The plugin is a **second build target in this repo** | One version, one CI, one typecheck. A core change that breaks the plugin fails immediately instead of in another repo's next build — and engram is not on npm (BUG-002), so a separate repo would have nothing to depend on | this phase |
| **`ObsidianFileStore` implements `FileStore`** against `app.vault.adapter` | `nodeFileStore` cannot run on Obsidian mobile. If the ports are real, swapping this one makes every operation work on a phone unchanged | 0032 |
| **One port contract suite, run against all three** implementations | A port whose implementations are tested separately is three interfaces wearing a shared name | this phase |
| `doctor` reads `.obsidian/app.json` | Closes an accepted-ADR gap — see below | 0028 |

## Two accepted ADRs with no v2 implementation

Both found while orienting; both belong to this phase's subject.

**[ADR-0028](../../decisions/0028-obsidian-owns-link-rewriting.md)'s device-drift
warning does not exist.** The ADR says doctor *reads* the Obsidian link-format
setting and warns when a device disagrees with what the vault's links actually use.
`doctor.ts` emits a fixed advisory instead and never opens `app.json`. On the
laptop + phone + tablet setup the ADR was written for, that warning was the entire
point. **In scope here** — inside the plugin the setting is readable directly, and
doctor only needs to read one JSON file.

**[ADR-0015](../../decisions/0015-editor-adapters.md)'s `EditorAdapter` did not
survive the clean-room rewrite.** v1 had `src/editors/` with `detect` + `setup`;
v2 has detection only. **Out of scope** — restoring an adapter layer is its own
work, filed as **TD-006**.

## Scope (In)

1. **ADR-0042** — the queue's trust boundary and staleness rule.
2. **QUEUE in the gate** — third `GateResult` arm; rule dispositions; `propose-only`
   defers.
3. **The queue store** — `.engram/queue/*.md`; propose, list, show, approve, reject,
   staleness refusal.
4. **`engram queue`** — the `git`-style review §11 names.
5. **MCP: the queue is readable, not approvable** — asserted by a test that no
   approve tool exists.
6. **The plugin** — second build target, `ObsidianFileStore`, shared port contract
   suite, capture + format commands, the queue panel.
7. **ADR-0028's `app.json` drift warning** in doctor.

## Scope (Out)

- **`recall`** — Phase 11, gated on Gate 2. §11 lists it under this phase; it is not
  buildable yet and the plugin ships without it.
- **Skills in the plugin.** A skill is instructions for an agent to follow, and
  engram ships no agent. An agent working in this vault reaches skills over MCP
  already. A panel listing them for nobody to read is decoration.
- **`EditorAdapter` setup layer** — TD-006.
- **Sync / E2E encryption** — would reverse [ADR-0034](../../decisions/0034-engram-never-transmits.md)
  and needs its own ADR before any design work.

## Acceptance (Rule 12)

- [ ] **ADR-0042 accepted before any queue code exists**
- [ ] `npm run check` exits 0 with fresh output
- [ ] A write into a `propose-only` path **queues** — it does not reject, and it does
      not write the target
- [ ] A write into a normal path still applies, and a genuine violation still rejects
- [ ] The gate never names `propose-only`: the deferral is carried by a rule's
      declared `disposition`, proven by a second rule adopting it
- [ ] A queued proposal is **plain readable markdown** — the content it would write
      is legible with `cat`
- [ ] `approve` applies the change **through the gate**, not around it
- [ ] `approve` **refuses a stale proposal** whose target changed since queueing,
      and says so
- [ ] `reject` discards and records why; neither leaves the target modified
- [ ] `OPERATIONS` still has six entries — the queue added no operation
- [ ] **No MCP tool can approve or reject.** Asserted directly, not by inspection
- [ ] MCP *can* list and show the queue
- [ ] The **port contract suite passes against all three** `FileStore`
      implementations — memory, node, Obsidian-against-a-fake-adapter
- [ ] The plugin builds to `main.js` + `manifest.json` from this repo's own build
- [ ] Plugin command handlers are tested with injected deps
- [ ] `doctor` reads `.obsidian/app.json` and warns when the configured link format
      disagrees with the vault's actual links
- [ ] **Manual, and recorded as manual**: the plugin loads in a real Obsidian vault;
      capture, format and one approve round-trip work. This cannot be automated and
      will not be reported as if it were
- [ ] `retrospective.md` carries a `## Verification Evidence` section

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **An agent approves its own proposal** | The queue becomes a speed bump: reject once, approve once, write anyway. Every guardrail behind `propose-only` becomes advisory | Approve/reject exist only on the CLI and in the panel. A test asserts the MCP tool list contains neither |
| **A stale proposal clobbers newer content** | Exactly the corruption ADR-0028 was written to prevent, reintroduced by the review mechanism | `basis` hash recorded at queue time, recomputed at approve, refusal on mismatch |
| The gate special-cases `propose-only` by name | The second deferring rule silently rejects instead of queueing | Disposition is declared per rule; a second rule in the test proves the mechanism is general |
| `ObsidianFileStore` diverges from the other stores | "The ports are real" becomes untrue quietly, and mobile breaks in ways desktop never shows | One contract suite, three implementations, same assertions |
| The plugin cannot be tested in real Obsidian | A green suite that proves nothing about whether it loads | Stated as a manual gate, in the acceptance list and the retrospective. Not folded into the suite |
| Web Crypto unavailable on a target | Approve cannot verify staleness | `crypto.subtle` is a global in Node 20+ and in every Obsidian webview. `node:crypto` would not be |
