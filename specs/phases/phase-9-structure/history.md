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
