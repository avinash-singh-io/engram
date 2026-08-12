# Phase 10 — Retrospective

> **Closed**: 2026-08-12 · **Target release**: v0.9.0
> All 8 groups complete. **Gate 2 is instrumented but unadjudicated** — 48 edges
> await blind human judgement, and the report correctly refuses a verdict.

## What the phase produced

`format`, six guardrails in both halves, a generated `AGENTS.md`, and the Gate 2
instrument. 373 tests, up from 269.

| | Phase 9 | Phase 10 |
|---|---|---|
| Commands | init · capture · link · reindex · doctor | + **format** |
| Guardrails | none | 6, preventive **and** detective |
| `AGENTS.md` | static scaffold | generated from the registries |
| Tests | 269 | 373 |

## What went right

- **Reading the ADRs against each other shrank the phase before any code.** ADR-0034
  forbids network calls, so engram cannot call a model, so it cannot extract
  relations — which ADR-0019 had already assigned to the agent. There was no
  extractor to build, and Gate 2 turned out to measure the *model*, not engram.
- **Two bars, not one.** A single combined bar would let a 70%-directionality run
  pass on 99% predicate accuracy. There is now a test for exactly that case.
- **The smoke test caught what the unit tests could not.** Guardrails were
  implemented, tested in isolation, and wired into `doctor` — but never connected to
  the gate. Every test passed. Only running the built binary revealed that `format`
  cheerfully wrote the uncited synthesis it was supposed to refuse.
- **`AGENTS.md` is derived**, so the contract cannot drift from the code — the
  failure Phase 9 hit with the codec's hardcoded relation list, in prose form.

## What went wrong

- **Half a feature passed a full test suite.** The preventive guardrails existed and
  were correct; nothing called them. Unit tests proved the rules worked, the doctor
  tests proved detection worked, and the gap between them was invisible because no
  test crossed it. The lesson repeats from Phase 9: coverage of a claim is not
  coverage of its *wiring*.
- **A defect from Phase 8 surfaced only now.** No serialized file ended with a
  newline. Fixing it broke the round-trip, which was the useful part — the real
  invariant is that the writer adds one and the reader strips one.
- **The corpus trigger is synthetic**, and no amount of care changes that. The edges
  are real agent output over real documents, but produced in a batch rather than in
  the flow of work. Stated in the protocol and printed on every report run.

## Carried forward

| Item | Owner |
|---|---|
| **48 blind edge judgements** — Gate 2 has no verdict without them | you |
| Skills, MCP server, agent adapters | **Phase 15** |
| Traversal retrieval, gated on Gate 2 | Phase 11 |
| `views/by-tag.md` — still needs tag extraction | future |
| `doctor --fix` | future, own pass |
| **BUG-002 — npm publish broken since v0.6.5** | P0, needs the npmjs.com setting |

## Verification Evidence

Captured fresh on 2026-08-12 from `phase-10-agent-surface`.

### `npm run check` — exit 0

```
CLI Target: node20
CLI Cleaning output folder
ESM Build start
ESM dist/index.js     37.32 KB
ESM dist/cli.js       40.42 KB
ESM dist/index.js.map 103.05 KB
ESM dist/cli.js.map   112.09 KB
ESM ⚡️ Build success in 10ms
DTS Build start
DTS ⚡️ Build success in 482ms
DTS dist/cli.d.ts   95.00 B
DTS dist/index.d.ts 26.11 KB
```

### Acceptance spot-checks

```
architecture lint rules fire            3 violations caught
every guardrail has both halves         30 tests
gate freeze intact (2 gates, 3 vers.)   17 tests
no describe.skip survives               ✓
core/ has zero non-core imports         ✓
```

### The gap the smoke test found, and its fix

Before — `format` wrote a node the guardrail should have refused:

```
$ node dist/cli.js format "# Synthesis of everything" --id synthesis-x
synthesis-x -> /synthesis-x.md
```

After — preventive halves wired into the gate:

```
$ node dist/cli.js format "# Synthesis of everything" --id synthesis-x
rejected [require-sources]: a synthesis node must cite at least one source (synthesis-x)
exit=1

$ node dist/cli.js format "# Synthesis of everything" --id synthesis-x --sources paper-x
synthesis-x -> /synthesis-x.md (1 relation(s))
exit=0
```

### Both halves of a guardrail, on a real vault

```
$ node dist/cli.js doctor
  • [guardrail:require-sources] /synthesis-x.md is a synthesis node carrying no sources edge

guardrail detectives (6 in force)
  these catch writes the gate never saw — Obsidian and shell edits
  require-sources: prevents an unauditable synthesis claim you act on months later
    • /synthesis-x.md is a synthesis node carrying no sources edge
```

### Gate 2 — instrumented, unadjudicated

```
$ node tools/gate2/build-corpus.js
formatted 24 ADRs through the real format path
edges: 48  {"part-of":24,"supersedes":2,"sources":22}

$ node tools/gate2/report.js
sample                 48 edges
judgements             ABSENT

VERDICT: PROVISIONAL — NOT A GATE DECISION
```
