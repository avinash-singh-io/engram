# Phase 9 — History

### [DISCOVERY] 2026-08-12 — `part-of` does not exist; the roadmap assumed it did
Topics: relations, views, roadmap, prerequisites
Affects-phases: phase-9-structure
Affects-specs: specs/planning/roadmap.md
Detail: The roadmap lists Phase 9 as "view generation from `part-of`", but Phase 8
registered exactly two closed relations — `supersedes` and `sources` — and left a
test asserting exactly those two. Under ADR-0022 ("no code, no closed type") views
cannot project a relation that carries no semantics, so registering `part-of` is a
prerequisite sitting in Group 0 rather than an implementation detail. Registered with
`invalidatesTarget: false`: containment says nothing about currency, and a node being
part of a superseded parent is not itself superseded. Updating the
exactly-two-relations test to exactly-three is the intended cost of that test — it
exists precisely to make relation additions visible rather than incidental.

---

### [DECISION] 2026-08-12 — `init` ships one tree, not presets
Topics: init, structure, scope
Affects-phases: phase-9-structure
Affects-specs: specs/decisions/0023-structure-tree-plus-views.md
Detail: `--structure` accepts `default` only. Named presets (PARA, Zettelkasten,
Johnny.Decimal) were considered and declined: ADR-0019's generalisation rule says any
structure is just a choice of which `part-of` edges you author, so a preset adds no
capability — it adds an opinion, and ADR-0023 is explicit that engram has none about
the shape. Each preset would also be a thing to document and maintain permanently.
The flag is kept rather than dropped so adding one later is additive, not a CLI
break.

---

### [DECISION] 2026-08-12 — Nested roots are refused loudly, and detected on a marker only
Topics: security, boundaries, walker, td-004
Affects-phases: phase-9-structure
Affects-specs: specs/decisions/0030-boundaries-are-repos.md
Detail: TD-004 closes here. A parent `reindex` descending into a nested vault would
write that vault's titles and one-line descriptions into a shared, committed
`index.md` — a real disclosure path, and the obvious thing a user tries when told to
keep private notes in a separate directory. The walker detects a nested root on the
**explicit `.engram/` marker only**, never a heuristic: a false positive silently
skips real authored content, which is a worse failure than the disclosure being
guarded against, so a negative test (an ordinary subdirectory is not skipped) is as
load-bearing as the positive one. Skipped subtrees are reported in both `reindex` and
`doctor` output rather than skipped silently — silence is indistinguishable from the
feature not existing. ADR-0030's answer is still "use a separate repo"; this only
stops the trap being quiet.

---

### [DECISION] 2026-08-12 — Two of ADR-0023's named views are deferred, with reasons
Topics: views, scope, phase-10
Affects-phases: phase-9-structure, phase-10-agent-surface
Affects-specs: specs/decisions/0023-structure-tree-plus-views.md
Detail: ADR-0023 names four views: `superseded`, `unread-sources`, `by-tag`,
`recent`. Only two are buildable on the current model. **`by-tag`** needs tags, and
ADR-0019 makes a tag an edge to an abstract node — nothing extracts them yet, which
is write-time extraction in Phase 10. **`unread-sources`** needs a notion of *read*
that exists nowhere in the model, so building it would mean inventing data. Both are
deferred with the blocking reason recorded rather than quietly dropped. `orphans`
(nodes with no edges) is added in their place — cheap, and genuinely useful for
finding content nothing points at. A generated view whose backing data does not exist
would look authoritative and mean nothing, which is the same failure mode ADR-0036
warns about for inference.

---

### [DECISION] 2026-08-12 — `doctor` is read-only, and no generated file carries a timestamp
Topics: doctor, reindex, idempotence, derived-state
Affects-phases: phase-9-structure
Affects-specs: specs/decisions/0028-obsidian-owns-link-rewriting.md, specs/decisions/0029-derived-state-never-committed.md
Detail: Two constraints that only look like details. **`doctor` writes nothing** this
phase — ADR-0028 makes not-rewriting-links engram's default posture and `--fix` is
its single exception, which deserves a deliberate pass rather than riding along with
the reporting work. It also exits non-zero on integrity *failures* only: ADR-0021 is
explicit that slug collisions and missing slugs are warnings, so a `doctor` that
fails on them would make the warning-not-error decision meaningless in practice.
**No generated file may embed a generation timestamp** — that is the whole mechanism
behind `reindex` idempotence, and therefore behind ADR-0029's "regenerate, never
merge" being quiet rather than a permanent source of spurious diffs. Both are
asserted by the delete-and-rebuild byte-identical test.

---

### [DECISION] 2026-08-12 — Reserved names and derived paths live in `core/paths.ts`
Topics: paths, derived-state, walker, views
Affects-phases: phase-9-structure
Affects-specs: none
Detail: Two vocabularies — what engram owns (`index.md`, `log.md`, `AGENTS.md`,
`CLAUDE.md`) and what is derived (`index.md`, `views/**`) — are consulted by the
walker, every generator, and `doctor`. Defining them inline in each would let them
drift, and the specific failure that drift produces is a generator writing to a path
the walker still treats as authored content, which would overwrite a user's file.
One module, in Tier 1, with both directions tested (`my-index.md` and `/viewsly/x.md`
are *not* matched). `part-of` registered here too, with `invalidatesTarget: false`
asserted by its own test: if containment invalidated, reorganising a tree would
silently mark everything inside it superseded.

---

### [DECISION] 2026-08-12 — The vault's own sidecar is not a nested root
Topics: walker, td-004, boundaries
Affects-phases: phase-9-structure
Affects-specs: none
Detail: Detecting nested roots by searching for `/.engram/` in a path has an obvious
false positive: the vault's *own* sidecar at `/.engram/`. Treating that as a nested
root would make every vault skip itself entirely — the feature would appear to work
while silently enumerating nothing. The rule is therefore that a marker at position 0
is the vault's own, and only a marker deeper in the path denotes a nested root. Three
negative tests pin this down alongside the positive case: an ordinary subdirectory is
not skipped, a similarly-named directory (`engram-notes/`, `my.engram.backup/`) is not
a marker, and the vault's own sidecar is not a nested root. For a feature whose
failure mode is *silently dropping authored content*, the negative tests carry more
weight than the positive one.

---

### [DECISION] 2026-08-12 — The index shows live nodes; `recent` shows history
Topics: views, validity, generation
Affects-phases: phase-9-structure
Affects-specs: none
Detail: `generateAll` filters expired nodes out of `index.md` but keeps them in
`views/recent.md`, because the two answer different questions. The index is a live
structure tree — showing a lapsed node there presents it as current, which is exactly
the confusion the validity filter exists to remove. `recent` is a history, and hiding
what recently lapsed would make it lie by omission. Asserted by a test rather than
left as an implementation accident. Superseded nodes are handled differently again:
they stay listed in `views/superseded.md` by definition, alongside the id of whatever
replaced them, since "what replaced this" is the question that brings someone there.

---

### [DISCOVERY] 2026-08-12 — The codec hardcoded its relation list; `part-of` was registered but never read
Topics: relations, codecs, open-closed, architecture
Affects-phases: phase-9-structure, phase-8-core
Affects-specs: specs/decisions/0032-internal-model-versioned-codecs.md
Detail: Registering `part-of` in Group 0 and asserting it in the registry was not
enough — the OKF v0.2 codec carried its own literal `['supersedes', 'sources']`, so
`part-of: [x]` in frontmatter was silently ignored. Nothing failed; the relation
simply did not exist in any file that was read. Caught by `doctor`'s detective check
in Group 3, which is precisely the job Phase 8 gave detectives.

This narrows a claim Phase 8 made. Its open/closed test proved that adding a relation
requires no edit to `gate.ts` or `graph.ts` — true, but it never exercised the
**codec**, which did need one. ADR-0032 says relations are a registry rather than a
switch, and a literal list in the codec is a switch wearing a different hat. The codec
now calls `relationKinds()`, so "adding a relation is registering it" is true of
serialization too. Worth noting that Phase 8's open/closed test passed throughout —
a property proven at two of three sites reads exactly like one proven everywhere.

---

### [DECISION] 2026-08-12 — `init` appends to `.gitignore` rather than owning it
Topics: init, gitignore, derived-state
Affects-phases: phase-9-structure
Affects-specs: none
Detail: A vault is frequently an existing git repo with an existing `.gitignore` —
`node_modules/`, `.env`, whatever the user already had. Writing engram's derived-state
block by replacing the file would silently delete rules protecting real secrets, which
is a far worse outcome than a duplicated line. `init` therefore appends its block and
skips entirely if `/views/` is already present, so running it twice is a no-op. This
is the same non-destructive posture as the rest of `init`: an existing `AGENTS.md`
is skipped rather than overwritten, and a test pins that a user's own file survives.

---

### [DISCOVERY] 2026-08-12 — `nodeFileStore.list()` never walked the filesystem
Topics: substrate, ports, testing, regression
Affects-phases: phase-9-structure, phase-8-core
Affects-specs: none
Detail: The real `FileStore` tracked writes in an in-process `Set` and returned that
from `list()`, so a **fresh** store — which is exactly what every CLI invocation
builds — enumerated nothing. `reindex` on a real vault found zero nodes and wrote an
empty index while reporting success.

Phase 8 shipped this and its tests passed, because every test wrote through the same
store instance before listing, and nothing in Phase 8 needed to enumerate a vault it
had not just created. The in-memory implementation was correct throughout, which is
the trap: a port with two implementations was only ever exercised through the easy
one. Fixed with a recursive walk, plus six regression tests — the load-bearing one
being that a *different* store instance sees the files. One detail matters for
TD-004: the walk deliberately does not hide dotdirs, because nested-root detection
works by finding `.engram/` markers, and a store that hid them would leave the
disclosure guard reporting clean while doing nothing.

---

### [NOTE] 2026-08-12 — TD-004 resolved; Phase 9 acceptance swept
Topics: td-004, verification, rule-12, acceptance
Affects-phases: phase-9-structure
Affects-specs: specs/backlog/backlog.md
Detail: TD-004 is closed in the backlog. The disclosure path was verified end to end
rather than only unit-tested: a real vault with a nested private root, reindexed by
the **built** binary, then grepped to prove nothing private reached the generated
index. All 12 acceptance criteria evidenced with fresh output — `npm run check` exit
0 (19 files, 262 tests), both architecture lint rules re-proven by deliberate
violation, no `describe.skip` surviving, `core/` free of non-core imports, and
ADR-0029's delete-and-rebuild claim confirmed byte-identical three ways (in memory,
on a real filesystem, and through the binary at sha256 `d686efbb…`).

Worth recording what this phase says about the previous one: **both defects found
here were in Phase 8 code, with passing tests, exposed only by Phase 9 using them.**
The codec's hardcoded relation list and `nodeFileStore.list()` never walking the disk
were each invisible until something needed the behaviour for real. Coverage of a
claim is not coverage of its sites, and a port with two implementations exercised
only through the convenient one is not a tested port.

---
