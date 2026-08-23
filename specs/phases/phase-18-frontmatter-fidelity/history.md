# Phase 18 — History

### [DISCOVERY] 2026-08-23 — A formatting variation costs a note its identity
Topics: frontmatter, yaml, identity, obsidian
Affects-phases: none
Affects-specs: specs/decisions/0021-identity-slug-path-aliases.md
Detail: Reported from real use on v0.14.0 and reproduced. engram accepts flow
sequences and not block sequences; Obsidian's Properties panel rewrites the first to
the second on any property edit. The parse throws, `parseFrontmatter` returns null for
the **whole** document, and both codecs do `parsed.frontmatter ?? {}` — so `id`,
`author`, `timestamp` and every edge are discarded, not just the offending key. Per
ADR-0021 the note then falls back to path-as-identity, so moving it breaks its
relations. Filed as BUG-011 (P0). Present since Phase 8 (`a78b260`).

---

### [DISCOVERY] 2026-08-23 — A parse failure also selects the wrong codec
Topics: frontmatter, codecs
Affects-phases: none
Affects-specs: none
Detail: `detectVersion(null)` falls back to `DEFAULT_VERSION`, okf 0.1 — which has no
closed relations by construction. So a v0.2 file whose frontmatter fails to parse loses
its edges twice, by two independent mechanisms, and the second was not in the report.
Fixed as a consequence of per-key recovery rather than as a separate change.

---

### [DECISION] 2026-08-23 — Warn and keep going
Topics: frontmatter, error-handling
Affects-phases: none
Affects-specs: specs/decisions/0026-capture-never-rejects.md
Detail: Owner's call between warn-and-continue and refuse-the-write. Warn is
consistent with ADR-0026 and with a tool whose premise is that the files are the
user's: refusing to write would make engram the gatekeeper of a file it does not own.
The safety this gives up is recovered by degrading per key rather than per document,
so warn-and-continue never silently loses a readable field.

---

### [DECISION] 2026-08-23 — Keep the subset; no YAML dependency
Topics: frontmatter, dependencies
Affects-phases: none
Affects-specs: none
Detail: The report proposed a real YAML parser. Zero runtime dependencies is
load-bearing — the Obsidian plugin bundles engram and runs on mobile — and the
measured gap is two constructs, not a general parsing failure: quoted scalars
containing colons and nested maps already parse. So the subset stays and stops being
implicit. ADR-0047 states what is guaranteed and the tests iterate that statement,
which is what was actually missing since Phase 8.

---

### [DECISION] 2026-08-23 — Recovery policy is per consumer
Topics: frontmatter, guardrails, security
Affects-phases: none
Affects-specs: none
Detail: `parseFrontmatter` has four consumers. Per-key recovery is right for a note —
it is the whole point — and wrong for `guardrails.md`, where a half-parsed file could
yield a looser configuration than its author wrote. Guardrails therefore fail closed to
`DEFAULTS` on any key error, notes and the queue recover, and skills keep rejecting
loudly. Three policies, each asserted by a test naming it, so the difference is
deliberate rather than incidental.

---

### [DISCOVERY] 2026-08-23 — The report's scope estimate was too broad
Topics: frontmatter, yaml
Affects-phases: none
Affects-specs: none
Detail: The report predicted the line-based parser would also fail on quoted values
containing colons and on nested maps. Probing 16 constructs showed both already pass,
along with empty properties, comments, booleans and dates. The real gap is block
sequences and block scalars. Recorded because it is the difference between replacing
the parser and extending it, and because the probe becomes a permanent test (T6.2).

---

### [DISCOVERY] 2026-08-23 — The bug made a user write a workaround into their own notes
Topics: frontmatter, obsidian, docs
Affects-phases: none
Affects-specs: none
Detail: The owner's vault-conventions note carries a section headed "Do not edit
properties in Obsidian", documenting this defect as a house rule. That is a second
cost of the bug beyond the data loss: a prohibition written into a user's own
knowledge base outlives the defect that caused it, and nothing in engram would ever
tell them it had become false. T6.5 added — the docs and release notes must state the
Properties panel is safe again. A fix is not finished until the workaround it forced
is retractable.

---

### [DISCOVERY] 2026-08-23 — AGENTS.md points at STRUCTURE.md instead of carrying it
Topics: agents-md, structure, adapters
Affects-phases: none
Affects-specs: none
Detail: Found while scoping this phase, from the owner's vault-conventions note.
`AGENTS.md` advertises the structure's containers and then says "`STRUCTURE.md`
explains the reasoning and how this scales. Read it once." — a pointer to 104 lines of
filing guidance. This is **ADR-0017's exact failure one level down**: that ADR exists
because an agent loading one file does not reliably go and read a referenced second
one, and Phase 17 fixed it for `CLAUDE.md` → `AGENTS.md` while leaving `AGENTS.md` →
`STRUCTURE.md` untouched. A vault also has no way to declare conventions *beyond* its
structure — the owner's are in a knowledge node, reachable only by retrieval, which is
Phase 11 and blocked on Gate 2. Filed as TD-008 and deliberately kept out of this
phase: different subsystem, different ADR, and folding it in would delay a P0.

---

### [DISCOVERY] 2026-08-23 — `format --help` and `capture --help` hang on stdin
Topics: cli
Affects-phases: none
Affects-specs: none
Detail: `stripFlags` removes flags before the positional check, so `engram format
--help` leaves `rest` empty and falls through to `readStdin()`, which blocks. A
`--help` that hangs is the worst version of missing help, because it reads as the tool
being broken. Filed as BUG-012 (P2), out of scope here.

---
### [DECISION] 2026-08-23 — Group 0: the subset is a table the tests iterate
Topics: frontmatter, yaml, testing
Affects-phases: none
Affects-specs: none
Detail: ADR-0047 accepted. `src/format/subset.ts` holds `SUBSET` (24 guaranteed
constructs) and `EXCLUDED` (5 named refusals) as data rather than prose, so the
parser tests iterate the promise instead of restating it — a construct cannot be
claimed without a test, nor tested without being claimed. This is the same
derive-don't-restate move that closed BUG-008 three times, applied to a promise
instead of to a path list. `ParsedFrontmatter` gains `keyErrors` and per-key `styles`;
both are populated empty in this group so behaviour is unchanged, and Group 1 makes
them mean something. 32 structural tests; 771 existing tests still pass.

---

### [DISCOVERY] 2026-08-23 — The parser cited an ADR that does not say what it claimed
Topics: frontmatter, specs
Affects-phases: none
Affects-specs: none
Detail: `registry.ts` justified its subset with "OKF frontmatter is flat by design
(ADR-0020)". ADR-0020 is *Adopt OKF v0.2; do not invent time or provenance* and says
nothing about flatness — no ADR does. The parser was built around an unwritten rule
and diverged from it unobserved for ten releases, which is the actual mechanism behind
BUG-011 rather than the missing constructs. Recorded in ADR-0047, which states both
the flatness and the subset. Three of five ADR links in this phase's own plan.md were
also wrong on first write and were corrected at phase start — the same class of error,
found the same day, which is an argument for link-checking the specs. Not filed as a
backlog item yet; if it recurs a third time it is a tooling gap, not a slip.

---
### [DECISION] 2026-08-23 — Group 1: BUG-011's P0 half is fixed, and it stands alone
Topics: frontmatter, identity, yaml
Affects-phases: none
Affects-specs: specs/decisions/0021-identity-slug-path-aliases.md
Detail: `parseSimpleYaml` no longer throws. It collects per-key failures and returns
every key it could read; `frontmatter: null` now means **wholly** unreadable. On the
reporting user's file `id`, `author` and `timestamp` all survive and the correct codec
is selected — verified against the built binary. Edges are still lost because block
sequences remain unparsed, which is Group 2; the point of splitting them is that the
identity fix does not depend on which constructs the parser knows, so a construct
invented tomorrow cannot reopen this. The recovery tests use only content engram
*still* cannot parse, deliberately, so they assert blast radius rather than coverage.
Verified by reverting to per-document failure: 8 of 13 fail, including all four
identity assertions. 803 tests pass.

---

### [DISCOVERY] 2026-08-23 — A failed nested block left an empty husk
Topics: frontmatter, yaml
Affects-phases: none
Affects-specs: none
Detail: Found while implementing per-key recovery. `part-of:` followed by an
unreadable indented line opens a nested map, so a naive recovery leaves `part-of: {}`
behind — which downstream reads as "declared and empty" and produces no warning at
all. That is a quieter lie than "could not be read": the edges are equally gone and
nothing says so. Failed blocks are now dropped rather than emptied, and the case has
its own test.

---
