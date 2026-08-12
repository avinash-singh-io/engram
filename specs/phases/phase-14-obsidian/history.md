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
