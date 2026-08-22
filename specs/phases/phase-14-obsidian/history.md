# Phase 14 — History

> Append-only. Newest at the bottom. Format: Rule 8.

### [DISCOVERY] 2026-08-13 — The approval queue §11 assigns to this phase does not exist
Topics: approval-queue, write-gate, guardrails
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: v2-overview §5 gives the write gate three outcomes — APPLY, QUEUE, REJECT — but Phase 8 shipped two and Phase 10 shipped `propose-only` as a rejection whose message says the change "needs human review before it applies". Nothing is held anywhere, so §11's "approval queue panel" has nothing to render. The queue must be built before the Obsidian surface that displays it.

---

### [SCOPE_CHANGE] 2026-08-13 — `recall` and skills dropped from the plugin's scope
Topics: surfaces, obsidian, recall, skills
Affects-phases: phase-14-obsidian, phase-11
Affects-specs: specs/architecture/v2-overview.md#11-surfaces
Detail: §11 lists the Obsidian plugin as exposing `format`, `recall`, skills and the approval queue. `recall` is Phase 11 and gated on Gate 2, so it is not buildable. Skills are instructions an agent follows and engram ships no agent — an agent in this vault already reaches them over MCP, so a panel listing them serves nobody. §11's "agent inside the editor" is the MCP surface Phase 15 shipped; this phase is the human half.

---

### [ARCH_CHANGE] 2026-08-13 — The queue is state, not an eighth operation
Topics: approval-queue, operations, skills
Affects-phases: phase-14-obsidian
Affects-specs: specs/architecture/v2-overview.md#6-skills, specs/architecture/v2-overview.md#11-surfaces
Detail: A queued item is a pending `format` or `link`; approving replays it through the gate. Modelling it as an operation would push `queue` into every skill's `uses:` and make the count seven-plus-one. `OPERATIONS` stays at six (seven with `recall`), and `engram queue` is a management command over gate state rather than a new verb.

---

### [DECISION] 2026-08-13 — Approve and reject are human-only, never MCP tools
Topics: approval-queue, trust-boundary, mcp
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: The queue exists because a human must look at the change. An agent able to approve its own queued proposal has converted a refusal into a retry loop, making every guardrail behind `propose-only` advisory. Agents may list and show the queue over MCP; only the CLI and the Obsidian panel may act on it. Recorded as ADR-0042 because it is a trust-boundary decision on top of ADR-0034 and ADR-0041.

---

### [DECISION] 2026-08-13 — A proposal records a `basis` hash; approve refuses on drift
Topics: approval-queue, corruption, obsidian
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: A proposal carries the entire content it would write. If the target changed after queueing, applying it clobbers newer work — the corruption ADR-0028 was written to prevent, reintroduced by the review mechanism itself. Approve recomputes the hash and refuses on mismatch rather than merging: engram does not resolve conflicts. `crypto.subtle` rather than `node:crypto`, because this path runs on Obsidian mobile.

---

### [DISCOVERY] 2026-08-13 — ADR-0028's device-drift warning was never implemented in v2
Topics: obsidian, doctor, link-format
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: ADR-0028 says `doctor` reads the Obsidian link-format setting from `.obsidian/app.json` and warns when a device's setting differs from what the vault's links actually use. `doctor.ts` emits a fixed advisory telling the human to go change a setting, and never opens the file. On the laptop + phone + tablet setup the ADR was written for, that warning was the point. Taken into this phase's scope — inside the Obsidian surface it costs one JSON read.

---

### [DISCOVERY] 2026-08-13 — ADR-0015's `EditorAdapter` layer did not survive the v2 rewrite
Topics: editor-adapters, obsidian, init
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: ADR-0015 (accepted) specifies `EditorAdapter { id, label, detect, setup }` under `src/editors/`, with `engram init` merging `.obsidian/app.json` to absolute markdown links. v2 has the `detect` half only — `substrate/detect.ts` knows `.obsidian` exists — and no adapter layer at all. Filed as TD-006 rather than taken into scope: restoring an adapter layer is its own work, and this phase already carries the gate change plus a new build target.

---

### [ARCH_CHANGE] 2026-08-13 — The plugin is a second build target in this repo
Topics: obsidian, build, packaging
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: `plugin/` gets its own tsup entry emitting `main.js` + `manifest.json`, with `obsidian` as a dev dependency and a build external so engram's zero runtime dependencies stay zero. One version, one CI, one typecheck — a core change that breaks the plugin fails immediately rather than in another repo's next build. A separate repo was rejected additionally because engram is not on npm (BUG-002), so the plugin would have nothing to depend on.

---

### [DECISION] 2026-08-13 — One `FileStore` contract suite, run against all three implementations
Topics: ports, obsidian, testing
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: `nodeFileStore` cannot run on Obsidian mobile, so the plugin needs `obsidianFileStore` over `app.vault.adapter`. That is the first real test of whether ADR-0032's ports are load-bearing or decorative. A port whose implementations are tested separately is three interfaces sharing a name, so the contract — a missing read is `null` and never a throw, `list` enumerates what was written, `exists` agrees with `read` — is asserted once and run against memory, node, and Obsidian-against-a-fake-adapter.

---

### [DISCOVERY] 2026-08-13 — The ADR index has been stale since ADR-0017
Topics: architecture, tooling
Affects-phases: phase-14-obsidian
Affects-specs: specs/decisions/README.md
Detail: The index table in `specs/decisions/README.md` stops at ADR-0017 (2026-07-03). ADRs 0018–0042 exist as files with no rows, so the index reads as a complete list while omitting 25 entries — misleading rather than merely incomplete. `impact-map.json` stayed current throughout, so `/sync-docs` was never affected; only the human-facing index rotted. Filed as TD-007 and left for `/sync-docs` at completion rather than edited mid-phase (Rule 9).

---

### [DISCOVERY] 2026-08-13 — Guardrail configuration has been unreachable since Phase 10
Topics: guardrails, approval-queue, write-gate
Affects-phases: phase-14-obsidian, phase-10
Affects-specs: none
Detail: No code path loads a `GuardrailConfig` from a vault. Every caller passes `DEFAULT_GUARDRAILS` = `{ enabled: guardrailNames() }`, which sets no `proposeOnly`, `pathScope` or `rateLimit` — and those three rules read only from config, so their preventive halves have been inert since Phase 10. Found by smoke-testing the new QUEUE outcome against the built binary rather than the suite: `format` into a would-be propose-only path applied cleanly, because no path can be propose-only. Filed as BUG-003 (P1) and taken into this phase's scope, since a queue nothing can feed is not a queue. The failure mode is the one this project keeps re-encountering — Phase 10's tests construct configs directly and never ask where a real one comes from.

---

### [SCOPE_CHANGE] 2026-08-13 — Vault guardrail configuration added to Group 2
Topics: guardrails, approval-queue, config
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: `.engram/guardrails.md` — frontmatter over the existing `parseFrontmatter`, prose body, absent means today's defaults so no vault changes behaviour on upgrade. Scaffolded by `init` with the fields present and `proposeOnly` empty, so the mechanism is discoverable without silently making writes require review. Consistent with skills, which already use markdown-plus-frontmatter and travel with a `git clone`.

---

### [DECISION] 2026-08-13 — Resolved proposals are kept, not deleted
Topics: approval-queue, ports, no-delete
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: The plan said approve should remove the queue entry. Implementing it showed two reasons not to. The queue is the only record that a rejected proposal ever existed — nothing else in the vault carries a trace of what an agent wanted to do and a human declined. And deleting would require a `delete` method on the `FileStore` port, which has four and deliberately not that one; adding it for the queue would hand every future consumer a capability the `no-delete` guardrail exists to discourage. Entries carry `status`, `resolvedBy` and `resolvedAt`; `list` shows pending, `--all` shows the history. Recorded as ADR-0042 §5.

---

### [ARCH_CHANGE] 2026-08-13 — `format` and `link` persist their own proposals
Topics: approval-queue, write-gate
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: The gate returns a queued outcome; the operation writes the proposal rather than handing it back for a surface to persist. A deferral that a surface forgets to queue is a change that vanishes silently — worse than either applying or refusing it — and this phase already produced one bug of exactly that shape (the fail-closed regression in Group 1). Making it impossible to forget beats documenting that it must not be.

---

### [NOTE] 2026-08-13 — `engram queue show` renders a real line diff
Topics: approval-queue, surfaces
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: §11 calls the CLI half of the queue "a `git`-style review". Printing the proposed file whole would satisfy the words and miss the point — on a replacement, what a human needs is the three lines that change inside a hundred. `surface/diff.ts` is an LCS line diff with collapsed context, capped at 2000 lines per side, presentation only.

---

### [DISCOVERY] 2026-08-17 — The installed CLI binary has never run
Topics: tooling, cli, release
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: `src/cli.ts` guarded its entry with `argv[1]?.endsWith('cli.js')`, which is true for `node dist/cli.js` and false for every real install — npm puts a bin symlink named `engram` on the PATH, so the guard failed and the process exited 0 having done nothing. Every command was a silent no-op from Phase 8 onward. Two things hid it: the suite imports `main()` directly and never invokes the binary, and BUG-002 kept every version since v0.6.5 off npm, so nobody could install it and find out. Found by `npm link`-ing engram to try the MCP surface with Claude Code. Filed as BUG-004 (P0) and fixed here with `scripts/smoke-cli.mjs` guarding it — the fifth wiring bug in this project that only running the artifact could catch.

---

### [FEATURE] 2026-08-17 — Gemini adapter descriptor
Topics: adapters, surfaces
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: The Gemini CLI looks for `GEMINI.md`, so it needs a pointer like Claude Code's `CLAUDE.md`. One descriptor, no code, no template — which is ADR-0011's claim tested rather than asserted. Antigravity already had one. Prompted by the owner wanting to drive engram from Claude Code and Gemini-family agents before the Obsidian plugin exists.

---

### [SCOPE_CHANGE] 2026-08-17 — Agent surfaces before Obsidian; adoption bugs taken into scope
Topics: surfaces, adapters, mcp, adoption
Affects-phases: phase-14-obsidian
Affects-specs: specs/planning/roadmap.md
Detail: Owner redirected: the Obsidian plugin moves later in the roadmap, and the near-term goal is driving engram from Claude Code and Gemini-family agents, which the Phase 15 MCP surface already supports. Trying that immediately surfaced four bugs that made engram unusable outside a freshly-created vault, all now fixed here: BUG-004 (the installed binary was a silent no-op), BUG-005 (`init` imposed its reference tree on vaults that already had a shape), BUG-006 (a skipped agent pointer left the agent unrouted without saying so), BUG-007 (`--container` slugified the directory, giving every existing folder a twin). Plugin code lands inert and excluded from the npm tarball; the manual Obsidian gate becomes the acceptance criterion for the later phase that releases it.

---

### [DISCOVERY] 2026-08-17 — Three adoption bugs, all invisible to the suite
Topics: adoption, cli, format
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: BUG-005, BUG-006 and BUG-007 were all found within minutes of adopting an existing Obsidian-shaped vault, and none was visible to 587 passing tests, because every test creates its vault from nothing and calls functions directly. The pattern is now unmistakable: this project's defects live in the gap between "the function works" and "a person can use it". `scripts/smoke-cli.mjs` and `scripts/smoke-plugin.mjs` exist to close it and both run in `npm run check`.

---

### [DECISION] 2026-08-22 — A new vault scaffolds `raw/` and nothing else
Topics: structure-views, adoption, init
Affects-phases: phase-14-obsidian
Affects-specs: specs/decisions/0023-structure-tree-plus-views.md
Detail: Engram claims no opinion about folder shape and then created five specific folders; both could not be true. `raw/` is the one directory the design genuinely requires, because `capture` must put bytes somewhere before anything has been decided about them. The other four were a suggestion, and a suggestion belongs in `AGENTS.md` where the agent doing the filing will read it — not as empty directories that make a vault look organised before it is. Owner delegated the call. Structure now emerges from the `part-of` edges actually authored, rendered by `views/`.

---

### [ARCH_CHANGE] 2026-08-22 — The index honours every `part-of` edge, not the first
Topics: structure-views, indexes
Affects-phases: phase-14-obsidian
Affects-specs: specs/decisions/0023-structure-tree-plus-views.md
Detail: ADR-0023 promises views that provide "the *other* arrangements as extra entry points", and the format has always permitted `part-of: [concepts, consensus]`. `generateIndex` used `.find()` and kept only the first parent, so a note could never appear in two groupings — the model permitted it and the projection discarded it. This is the enabling change for several structures over the same files without moving or duplicating anything: physical layout stays a stable address; the index renders every membership declared. Philosophy-shaped views (PARA, Zettelkasten) become skills that emit a view, which keeps engram agnostic while the skill carries the opinion.

---

### [DISCOVERY] 2026-08-22 — `reindex` was not idempotent; it indexed its own output
Topics: derived-state, adapters, indexes
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: Filed as BUG-008 (P0, fixed). `reindex` writes each agent's contract file, then the walker read `GEMINI.md` back as an authored node on the next run — run 1 reported 1 node, run 2 reported 2, violating ADR-0029's determinism claim outright. `RESERVED_FILES` matched on basename, so `AGENTS.md` and `CLAUDE.md` were excluded and `.antigravity/AGENTS.md` was excluded by accident of its basename, while `GEMINI.md` was not. Fixed by deriving the set from the adapter registry rather than restating it. Found by building a realistic vault to demonstrate view generation — not by the suite, which is now the fourth time a defect has lived in the gap between "the function works" and "a person uses it".

---

### [FEATURE] 2026-08-22 — A vault declares a filing convention; engram still prefers none
Topics: structure-views, adoption, agents-contract
Affects-phases: phase-14-obsidian
Affects-specs: specs/decisions/0023-structure-tree-plus-views.md
Detail: ADR-0023's "no opinion about the shape" had been read as "say nothing", and saying nothing cost more than intended — with no stated convention, four filings into one vault produced `concepts/`, `knowledge/` and `notes/`, and on a case-sensitive filesystem a fourth. Engram now ships four structures (default, para, zettelkasten, custom), creates the chosen one's directories, writes a `STRUCTURE.md` guide, and renders the containers into `AGENTS.md` where every agent reads them. `custom` declares none and gets `raw/` alone. The opinion belongs to the vault, not to engram: it insists a vault *has* a convention, never which one. Adding a philosophy is adding a registry entry.

---

### [DISCOVERY] 2026-08-22 — Reproduced BUG-008 within the hour, which settled how to fix it
Topics: derived-state, indexes
Affects-phases: phase-14-obsidian
Affects-specs: none
Detail: `STRUCTURE.md` was written at the vault root and immediately indexed as a knowledge node — a fresh vault reported 1 node — the same defect as `GEMINI.md` (BUG-008), reproduced the same day by the very next generated file. That is the argument against fixing this class by adding a literal each time. `STRUCTURE_GUIDE` now has one definition in `core/paths.ts` that both `init` and `RESERVED_FILES` use, and a new invariant test asserts the property rather than the instances: **whatever engram writes into an empty vault, that vault reports zero nodes** — checked for every structure, and again on a second reindex.

---
