# Phase 15 — Retrospective

> **Closed**: 2026-08-12 · **Target release**: v0.10.0
> All 7 groups complete and verified. **Not gated on Gate 2.**

## What the phase produced

Skills, an MCP server on two transports, and agent adapters. 450 tests, up from 373.

| | Phase 10 | Phase 15 |
|---|---|---|
| Commands | init · capture · format · link · reindex · doctor | + **skill** · **mcp** |
| Surfaces | CLI, AGENTS.md | + MCP (stdio + HTTP), native pointers |
| Runtime dependencies | 2 (both dead) | **0** |
| Tests | 373 | 450 |

## What went right

- **Two findings shrank the work before it started.** A skill is instructions, never
  code — so there is no interpreter, only discovery, validation and exposure. And
  ADR-0011's *decision* (converge on `AGENTS.md`) is better served by pointers than
  by its own implementation section's per-agent command surfaces. Both came from
  reading the specs against each other rather than from the roadmap's summary.
- **ADR-0041 landed before any HTTP code.** That ordering did real work: it forced
  opt-in, `127.0.0.1` and the exposure warning to be chosen while the transport was
  still being shaped, rather than retrofitted onto code that assumed none of them.
  Each is a test, because a default can be changed quietly and a tested constraint
  cannot.
- **Writing tests from the spec's examples caught a security bug.**
  `guardrails: [require-sources]` — §6's own shorthand — parsed to *nothing*, so a
  skill asking to be constrained would have run unconstrained. Silent loosening. A
  test written from the implementation would have agreed with the implementation.
- **Zero runtime dependencies**, and kept that way: the MCP layer is five JSON-RPC
  methods written directly rather than an SDK plus its tree.

## What went wrong

- **Three separate wiring gaps, all found by running the thing rather than testing
  it.** `policy/` and `surface/` were missing from the library exports, so skills,
  guardrails, MCP and adapters were reachable from the CLI and from MCP but not from
  `import`. This is the fourth instance of one pattern across Phases 9, 10 and 15:
  coverage of a claim is not coverage of its wiring.
- **I wasted three rounds fighting eslint-disable comments** that prettier kept
  relocating, then mangled a test file with a regex and had to rewrite it. The
  `any`-casts were the smell; typed helpers were the fix and should have been the
  first move.
- **`tighten()` has a sharp edge worth knowing.** A skill requesting a *wider*
  `pathScope` gets the intersection — which is empty — so it locks itself out of the
  vault entirely rather than getting the scope it had. That is the correct reading of
  tighten-only and arguably the right outcome for a greedy skill, but it is a
  surprising failure mode for an honest one that names a path the vault does not
  permit.

## Carried forward

| Item | Owner |
|---|---|
| **BUG-002 — npm publish broken since v0.6.5** | P0, needs the npmjs.com setting |
| **Gate 2 — 48 blind edge judgements** | blocks Phase 11 |
| Traversal retrieval | Phase 11, gated |
| Obsidian plugin | Phase 14 |
| `doctor --fix`, `views/by-tag.md` | future |
| HTTP authentication, if localhost ever stops being enough | ADR-0041 amendment |

## Verification Evidence

Captured fresh on 2026-08-12 from `phase-15-surfaces`.

### `npm run check` — exit 0

```
ESM Build start
ESM dist/index.js     53.41 KB
ESM dist/cli.js       57.74 KB
ESM dist/index.js.map 141.05 KB
ESM dist/cli.js.map   153.68 KB
ESM ⚡️ Build success in 90ms
DTS Build start
DTS ⚡️ Build success in 534ms
DTS dist/cli.d.ts   95.00 B
DTS dist/index.d.ts 41.61 KB
```

### Acceptance spot-checks

```
architecture lint rules fire       3 violations caught
runtime dependencies               {} ✓
no describe.skip survives          ✓
core/ has zero non-core imports    ✓
gate freeze (2 gates, 3 versions)  17 tests
```

### ADR-0041's constraints, through the built binary

```
$ engram mcp                      → no warning, no socket

$ engram mcp --http --port 7891
⚠  MCP HTTP server on 127.0.0.1:7891
   EXPOSING: /var/folders/.../tmp.d9xtFveUde
   Anything with local access can read and write this vault. No authentication.
   Engram listens on nothing by default — this was enabled explicitly (ADR-0041).
```

### A real MCP handshake through `dist/`

```
$ printf ... | node dist/cli.js mcp
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18",
 "capabilities":{"tools":{},"prompts":{}},"serverInfo":{"name":"engram","version":"0.10.0"}}}

prompts/list returned all three skills, including one scaffolded seconds
earlier — vault-local discovery reaching the protocol surface.
```

### Skill validation and tightening, through the binary and the built library

```
$ engram skill list
skipped bad-skill: /.engram/skills/bad.md: declares unknown operation(s): rm-rf.
  engram has exactly: init, capture, format, link, reindex, doctor

tightening applies:                        ["require-sources"]
a skill asking to loosen everything gets:  {"enabled":["path-scope"],
                                            "pathScope":[],"rateLimit":5}
```
