# Phase 14 — Retrospective

> **Branch**: `phase-14-obsidian` · **Target**: v0.11.0 · Not gated on Gate 2.

## What shipped

The **approval queue** — the gate's third outcome, specified in §5 since before
Phase 8 and never built — and the **Obsidian plugin** that renders it.

| | |
|---|---|
| **QUEUE in the gate** | `propose-only` defers instead of refusing. The gate routes by a rule's declared `disposition`, never by rule name |
| **The queue** | `.engram/queue/*.md`, plain markdown, holding the whole proposed file. `basis` hash; approve **refuses** on drift |
| **`engram queue`** | list / show / approve / reject, with a real line diff |
| **MCP** | the queue is **readable** and never approvable — asserted over the real tool list |
| **`.engram/guardrails.md`** | BUG-003: a vault can finally set `proposeOnly`, `pathScope`, `rateLimit` |
| **The plugin** | second build target, `obsidianFileStore`, capture + format, the approval panel |
| **ADR-0028's drift warning** | `doctor` now *reads* `.obsidian/app.json` instead of reciting one fixed line |

## What the phase found

Three of these were not on the plan. All three were found by running something
rather than reading it.

**BUG-003 — three guardrails have been inert since Phase 10.** Nothing anywhere
loaded a `GuardrailConfig` from a vault; every caller passed `DEFAULT_GUARDRAILS`,
which enables all six rules and populates none of their fields. `propose-only`
deferred nothing, `path-scope` permitted everything, `rate-limit` never fired.
Thirty tests covered them, all constructing configs directly and none asking where
a real one comes from. Found by smoke-testing the *built binary*: a `format` into a
would-be propose-only path applied cleanly, because no path could be propose-only.

**A regression this phase introduced and nearly shipped.** Adding a third arm to
`GateResult` broke nothing TypeScript could see — `format` narrowed with
`if (verdict.outcome === 'reject')` and fell through to `files.write` for
everything else. A guardrail that had been *refusing* writes in the vault's most
sensitive paths began silently *applying* them, and all 464 tests passed. Both
`format` and `link` now fail closed on anything that is not an explicit `apply`,
and the new tests assert on the filesystem rather than the return value. The fix
was verified by reverting it and watching the assertions fail.

**A `FileStore` divergence, found the moment the contract was shared.**
`memoryFileStore` listed in insertion order; `nodeFileStore` and
`obsidianFileStore` sorted. Every test using the in-memory store could pass on an
ordering production never produces. Fixed in the store, not the contract.

Also found and filed, not fixed: **TD-006** (ADR-0015's `EditorAdapter` layer never
survived the v2 rewrite) and **TD-007** (the ADR index has been stale since 0017 —
25 missing rows).

## Were the ports real?

This was the phase that could answer it. `nodeFileStore` cannot run on Obsidian
mobile, so `obsidianFileStore` had to work for `ops/` to run on a phone.

It did, and nothing above the port changed. Ten contract assertions now run against
all three implementations — including the ones easy to satisfy in one direction
only, like a missing read returning `null` where Obsidian's adapter throws. The
plugin bundle contains **no node builtins**, which is what makes
`isDesktopOnly: false` honest, and a third eslint architecture rule holds that
property rather than trusting whoever edits `plugin/main.ts` next.

## Decisions taken during, not before

- **Resolved proposals are kept, not deleted** (ADR-0042 §5). Deleting would need a
  `delete` on the `FileStore` port, which has four methods and deliberately not
  that one — and the queue is the only record a rejected proposal ever existed.
- **`format` and `link` persist their own proposals.** A deferral a surface forgets
  to queue is a change that vanishes silently. This phase had already produced one
  bug of exactly that shape; making it impossible to forget beat documenting it.
- **A refusal wins over a deferral**, whatever the order in `enabled`. Queueing
  something a hard rule forbids puts a proposal in front of a human that the gate
  refuses anyway on replay.

## Verification Evidence

All output below is fresh from this session, on `phase-14-obsidian`.

### `npm run check` — exit 0

```
 Test Files  34 passed (34)
      Tests  586 passed (586)

[LIB] ESM ⚡️ Build success
[LIB] DTS ⚡️ Build success
[OBSIDIAN-PLUGIN] CJS dist/obsidian/main.js
```

### Built-plugin smoke — `npm run smoke:plugin`, exit 0

```
✓ `obsidian` is required, not bundled
✓ no node builtins in the bundle — mobile safe
✓ the bundle loads as CommonJS
✓ exports a plugin class as default
✓ onload() runs without throwing
✓ command registered: engram-capture
✓ command registered: engram-format
✓ command registered: engram-queue
✓ the approval queue view is registered
✓ ribbon icon registered: Engram: proposals awaiting review
```

This found a real defect: the repo is `"type": "module"`, so a CommonJS `main.js`
was ambiguous under Node's own rules and failed to `require`. Obsidian's loader
would not have cared — but an artifact that works only because one loader is
lenient is not one anybody can verify. The build now emits
`dist/obsidian/package.json` declaring `commonjs`.

### Architecture rules — all three proven by deliberate violation

```
RULE 1: core/ may import only core/            violations caught: 1
RULE 2: a versioned codec only from format/    violations caught: 1
RULE 3: plugin/ must stay mobile-safe (new)    violations caught: 1
```

### Acceptance sweep — the built binary, on a real vault

```
A1 propose-only queues, target absent:      PASS
A2 normal path still applies:               PASS
A3 genuine violation still rejects:         PASS
A4 proposal legible with cat:               PASS
A5 approve applies through the gate:        PASS
A6 record kept, not deleted:                PASS
A7 doctor reads app.json (drift warned):    PASS
A8 doctor silent when device agrees:        PASS
```

### The staleness refusal, end to end

An agent proposes a rewrite; a human edits the file first; the human then approves.

```
refusing: /decisions/d2.md changed since this was proposed.
  Engram will not merge. Review the file, then re-run the change.

$ grep '^#' decisions/d2.md
# My careful original, now revised by hand
```

The hand edit survives, and the proposal stays `pending` so it can be re-reviewed.

### NOT VERIFIED — the manual gate

**The plugin has not been loaded in a real Obsidian vault.** Its loading and
wiring are proven by the smoke test above and its behaviour by 15 tests against a
`FileStore`, but **that it renders correctly and that the buttons behave is
unverified**, and cannot be automated from here.

A vault is prepared for that check, with the plugin installed and two proposals
already waiting — one clean, one deliberately stale so both panel states show:

```
/private/tmp/claude-501/-Users-avinash-Workspace-Projects-engram/2aab1a5e-e632-4cd9-ad26-c907592580e9/scratchpad/engram-plugin-test
```

Open it in Obsidian, enable **Engram** under Community plugins (it is already in
`community-plugins.json`), and check: the ribbon opens the panel; both proposals
appear; the stale one is marked and its Approve button disabled; approving the
clean one writes `/decisions/adopt-queue.md`; Reject leaves its target untouched.

**This must pass before v0.11.0 is tagged.** It is recorded here as outstanding
rather than folded into the suite, because the suite does not cover it.
