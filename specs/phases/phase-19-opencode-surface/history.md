# Phase 19 — History

### [DISCOVERY] 2026-08-24 — opencode sessions see no engram surfaces
Topics: adapters, opencode, skills
Affects-phases: phase-19-opencode-surface
Affects-specs: docs/adapters.md#the-model
Detail: Owner observed skills absent in real opencode sessions. Root cause
confirmed against opencode's published docs (2026-08-24): discovery reads
`<skills-dir>/*/SKILL.md` one level deep, while engram's built-ins render two
levels down inside Claude's plugin layout with `:` namespacing. The clean-room v2
registry also has no opencode entry, so nothing native is rendered; codex is
absent from it too.

---
### [SCOPE_CHANGE] 2026-08-24 — Phase 19 scoped: opencode surface + process generalization
Topics: adapters, opencode, generalization, doctor
Affects-phases: phase-19-opencode-surface
Affects-specs: none
Detail: Interview settled scope from the owner's two asks. In: an opencode
descriptor covering skills AND slash commands; docs/adapters.md rewritten for the
v2 seam; doctor reporting per-agent render state; live verification per ADR-0044
before `verified:` is claimed. Out: `.agents/skills/` universal target, MCP
wiring doc, codex re-entry, home-directory scopes. Plan grounded against live
opencode skills/commands/rules docs rather than assumption.

---
### [DECISION] 2026-08-24 — Commands become a second descriptor render-target type
Topics: adapters, commands, single-source
Affects-phases: phase-19-opencode-surface
Affects-specs: docs/adapters.md#adding-a-new-agent
Detail: AgentDescriptor gains an optional CommandTarget rendered from the
operation registry beside skills — owner-requested explicit `/engram-*`
invocations without hand-written duplication (skills are agent-invoked only in
opencode; commands are its user-invoked surface). Provenance/regeneration
semantics mirror skills exactly; `$ARGUMENTS` passes invocation text through.

---
### [DECISION] 2026-08-24 — No separate opencode contract file
Topics: adapters, contract, agents-md
Affects-phases: phase-19-opencode-surface
Affects-specs: none
Detail: opencode reads project AGENTS.md natively and treats CLAUDE.md as a
fallback used only when AGENTS.md is absent — engram's dual render conflicts with
nothing, and ADR-0017's full-render means file references not parsing is
irrelevant. Claim grounded in the rules docs 2026-08-24 and still proven live in
G0 before being relied on.

---
### [NOTE] 2026-08-24 — TD-008 remains the one open P1
Topics: backlog
Affects-phases: none
Affects-specs: none
Detail: Pre-phase bug scan found no P0s and one P1 (TD-008, needs an ADR,
phase-sized). Deferred by owner for this phase; unchanged from status.md.

### [NOTE] 2026-08-24 — Group 0 complete: probe confirmed the docs; model landed clean
Topics: opencode, adapters, commands, probe
Affects-phases: phase-19-opencode-surface
Affects-specs: none
Detail: Live probe (headless opencode 1.18.21, free-tier model after the
workspace default lacked balance) confirmed skill discovery from
`.opencode/skills/`, root AGENTS.md injection, and unknown-frontmatter tolerance;
`/command` execution is TUI-only and deferred to the G4 manual session
(evidence/t0-discovery-probe.md). `contractFile` became optional; opencode joined
the registry with skills + commands targets and no contract copy; walker excludes
`.opencode/commands/` via the new registry-derived `isCommandPath`. 908 tests
green.

### [NOTE] 2026-08-24 — Group 1 complete: commands render beside skills
Topics: opencode, commands, rendering, smoke
Affects-phases: phase-19-opencode-surface
Affects-specs: none
Detail: renderCommands mirrors renderSkills (skip/stale/marker rules) with one
generator per file type; reindex calls it and ReindexResult carries `commands`;
auditSkills expected-map covers both types so doctor inherits command auditing;
gitignore gains the managed `engram-*.md` glob. Deviation from plan: the v1-era
tests/fixtures/ directory did not survive the clean-room rewrite, so the golden
tree is pinned by tests/surface/render-commands.test.ts plus the built-binary
smoke instead. Smoke: 17 checks against dist/cli.js, all green; suite 920.

### [NOTE] 2026-08-24 — Group 2 complete: doctor makes the surface visible
Topics: doctor, opencode, audit
Affects-phases: phase-19-opencode-surface
Affects-specs: none
Detail: DoctorReport gains a surfaces section (one row per registered agent:
contract strategy, rendered skill/command counts, verification claim quoted in
full — truncation landed mid-version and was dropped). Audit warnings split by
kind so commands carry their own remedy ([command-edited]/[command-unrendered]/
[command-stale]; [skill-not-ours] generalized to [not-ours]); a new
[surface-unrendered] names any agent whose verified targets hold zero renders —
FEAT-009's failure made loud. Suite 924.

### [NOTE] 2026-08-24 — Group 3+4 complete: docs rewritten, verification earned
Topics: opencode, verification, evidence
Affects-phases: phase-19-opencode-surface
Affects-specs: docs/adapters.md, docs/using-engram.md
Detail: adapters.md now describes the real seam (two render-target types,
registry-derived exclusions) and carries the probe-then-evidence checklist;
using-engram.md gained the opencode row and lost two stale claims (pointer
wording pre-dating ADR-0017, codex in the MCP list). `npm run check` green end
to end incl. smoke:opencode; a real opencode session listed all six engram-* skills
beside unprefixed user skills with rules from AGENTS.md (evidence/live-session.md);
descriptor verified: fields cite it. TUI slash-command execution remains one
manual owner confirmation — headless run cannot execute commands.
