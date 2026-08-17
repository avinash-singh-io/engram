# Roadmap

> **Last Updated**: 2026-08-17 · v2 architecture adopted (ADR-0018 … ADR-0042)
> **Current line**: **v2.** Phases 7, 8, 9, 10 and 15 are complete (v0.10.0 tagged).
> Phase 14's approval queue is next out as v0.11.0; the Obsidian plugin moved to
> Phase 16 so the **agent surfaces get real use first**.
> **Caveat**: nothing since v0.6.5 has reached npm (BUG-002). Tags are current; the
> registry is not. Install from source until that is fixed.

## Vision

A notes system for humans where the **organizing work is done by an agent**, on
plain files the human owns. You write however you think; the agent formats,
relates, supersedes, and files. Durable for decades, readable with `cat`, navigable
by any agent, and dependent on nothing above a directory of files.

See [problem-statement-v2](../vision/problem-statement-v2.md) for the canonical framing.

---

## v1 — shipped (2026-07)

| Version | Phase | Status |
|---------|-------|--------|
| v0.1.0 | Phase 0 — Foundation | ✅ Released |
| v0.2.0 | Phase 1 — MVP Vault + Claude Code | ✅ Released |
| v0.3.0 | Phase 2 — Progressive-Disclosure Retrieval | ✅ Released |
| v0.4.0 | Phase 4 — Ecosystem | ✅ Released |
| v0.5.0 | Phase 3 — Sync + Multi-Device | ✅ Released |
| v0.6.0 | Phase 6 — Onboarding & OKF Migration | ✅ Released |
| v0.6.5–v0.6.8 | ad-hoc (BUG-001, BUG-002) | ✅ Released |
| — | Phase 5 — Semantic Layer | ❌ **Cancelled** — superseded by v2 Phase 11 |

**What v1 proved:** the CLI shape, the adapter seam, the sync path, and the
bounded-read metric — all of which carry forward. **What v1 got wrong:** one
Concept primitive with an inert `type`, path-is-identity, five required fields that
reject mobile capture, and untyped links that discard the structure they draw.

---

## v2 — the rewrite

Clean-room. `src/` is replaced, not patched
([ADR-0019](../decisions/0019-node-edge-primitives.md) changes the primitive, so
incremental migration would be patchwork over a different model). Zero external
users makes this free.

| Version | Phase | Key deliverables | Gate |
|---------|-------|-----------------|------|
| _(none)_ | **Phase 7 — Evidence & Observation** | ✅ **Complete 2026-08-10.** Gate 1 measured retrospectively over 1066 real prompts from stored transcripts; locked evaluator `gate1-v2` in `tests/benchmarks/` (Rule 11). No product code. | **GATE 1 — PROCEED** |
| v0.7.0 | ✅ **Phase 8 — Core** (2026-08-12) | Clean-room `src/`. `core/model.ts` (Node + Edge, version-free) + `format/` codec registry (ADR-0032); narrow ports (`FileStore`, `Detector`, `Clock`); identity (slug · path · `aliases`); relations in frontmatter; capture never rejected | — |
| v0.8.0 | ✅ **Phase 9 — Structure, views & health** (2026-08-12) | `init --structure=<x>` scaffolds; view generation from `part-of`; derived state gitignored; `doctor` incl. Obsidian link-format detection | — |
| v0.9.0 | ✅ **Phase 10 — Agent surface, write path** (2026-08-12) | `format(content, hints)` — content from anywhere, no capture prerequisite (ADR-0033); write-time relation extraction; write gate + guardrails; skills; AGENTS.md; adapters; MCP server | **GATE 2 — edge accuracy** |
| v0.10.0 | ✅ **Phase 15 — Surfaces** (2026-08-12) | Skills; **MCP server over stdio and HTTP**; agent adapters (Claude, Antigravity, Gemini). **Not gated on Gate 2** — they expose operations Gate 2 does not affect. This is the surface an agent uses today | — |
| v0.11.0 | **Phase 14 — The approval queue** | The gate's third outcome, QUEUE (ADR-0042): `propose-only` defers instead of refusing; proposals held as plain markdown in `.engram/queue/`; `engram queue` review; approve refuses on drift rather than merging. **Approve and reject are human-only — never MCP tools.** Plus BUG-003: a vault can finally configure its guardrails at all | — |
| v0.12.0 | **Phase 11 — Retrieval** | Traversal over closed relations; validity filter (drop superseded/expired); trust weighting (`verified` > `generated`); must beat the Phase 7 baseline on the locked evaluator | **blocked on GATE 2** |
| **v1.0.0** | **— base product complete —** | Everything above. The knowledge system, without intelligence | — |
| v1.1.0 | **Phase 16 — Obsidian surface** | Community plugin: `ObsidianFileStore` over the vault adapter (desktop **and** mobile), capture + format commands, the approval-queue panel. **Code is already written and tested and lands inert**; this phase is the manual vault verification, the community-plugin submission, and whatever the first real use demands | — |

### Parked — reopened only after v1.0 has real usage

Per [ADR-0038](../decisions/0038-intelligence-deferred-post-v1.md), intelligence is
deferred **as an indivisible system** — the ADR-0035 observation substrate parks with
it. ADR-0035 and ADR-0036 stay `accepted`; only scheduling changes. Zero debt is
created: ADR-0036 requires no new fields, so nothing in Phases 8–11 exists to serve it.

| Phase | Name | Key deliverables |
|---|---|---|
| Phase 12 | Intelligence I | Observation log; distillation: events → proposed patterns as nodes; confirm/reject; **gaps** and **re-derivation** |
| Phase 13 | Intelligence II | `contradicts` with code behind it; staleness × intent; dead weight; proactive surfacing — opt-in, evidence-cited, rate-limited |

### The two gates

**Gate 1 (before Phase 8) — is the query traffic structural?**
Threshold: **fewer than 20% structural → stop.** Ship a folder convention and a
good `AGENTS.md` instead. Log the questions you *wanted* to ask but didn't bother
asking — nobody asks what nothing can answer, so measuring only today's questions
undercounts by construction.

**Gate 2 (after write-time extraction, before Phase 11) — are the agent's relations correct?**
Sample agent-authored edges for semantic directionality and predicate accuracy.
Threshold fixed before sampling. Poor accuracy → stop at nodes plus untyped links,
which is still a working product.

See [ADR-0031](../decisions/0031-evidence-gates-before-graph.md).

### Phase dependencies

- **Phase 7 gated the *graph*, not everything.** ADR-0031 gates "any graph work";
  a failed gate still ships a folder convention needing a format, capture and
  identity. **Gate 1 was answered on 2026-08-10 — PROCEED** (88.9% structural,
  95% CI [74.7%, 95.6%]; classifier validation waived by the owner). See
  [the report](../phases/phase-7-evidence/gate-1-report.md).
- Phase 8 is the foundation — Tier 1 of [ADR-0024](../decisions/0024-three-tier-dependency-inversion.md).
  Nothing above it can be built first.
- Phase 9 depends on 8 (`part-of` edges to project from).
- Phase 10 depends on 8 (something to write into) and produces the data Gate 2 samples.
- Phase 11 depends on 10 clearing Gate 2.
- **Phases 12–13 depend on 7 (the log) and 11 (the graph) — by *dependency*, not
  priority.** You cannot learn from usage you do not have, and there is no usage yet.
- **Phase 14 split, and the split is the proof.** It was scoped as one phase — an
  Obsidian plugin plus "the approval queue panel". Building it showed those are two
  different things: the queue is *gate* work (Tier 1-adjacent, surface-agnostic,
  rendered identically by the CLI), and the plugin is *surface* work. The queue
  ships as v0.11.0; the plugin became **Phase 16**. A phase that can be cut in half
  along the tier boundary is evidence the boundary is real.
- **Phase 16 is independent of 11–13** and of everything else. It is pure Tier 2
  *Surface* and can move at will without blocking anything, which is the same test
  in its stronger form: the plugin was deprioritized *after being written* and
  nothing else had to change.
- **Deliberate ordering: agent surfaces before the human one.** MCP and the
  adapters (Phase 15) already let Claude Code, Antigravity and Gemini drive a vault,
  so the fastest path to real usage is an agent, not a plugin. Real usage is also
  what Phases 12–13 are waiting on, so this ordering shortens the parked path too.

### Why the intelligence layer is possible here and not elsewhere

Roam cannot tell you a note is stale — it never knew *when it was true*. Obsidian
cannot tell you two notes conflict — its links are untyped. Notion cannot tell you a
claim is unsupported — it has no provenance.

**Intelligence is downstream of the metadata, not a module bolted beside it.** The
Tier-1 core is what makes Phases 12–13 buildable at all, which is the strongest
retroactive justification for [ADR-0020](../decisions/0020-adopt-okf-v02.md).

Note also that the two highest-value inferences — **retrieval gaps** and
**re-derivation** — need no model whatsoever. They need a log nobody keeps.

---

## Beyond v2 — the Tier-2 expansion

These are **Agency** and **Surface** concerns ([ADR-0024](../decisions/0024-three-tier-dependency-inversion.md)).
They add affordances over a core that does not know about them, which is why they
can wait without creating debt.

**Two items left this table by shipping**, which is the tiering working as designed
— both were added over an unchanged core. **Skills** shipped in Phase 15 (discovered,
validated and exposed; engram never runs one). **Guardrails** shipped in Phase 10,
each with a preventive half at the write gate and a detective half in `doctor`, and
became configurable per-vault in Phase 14.

| Item | Dimension | Notes |
|---|---|---|
| **Engram's own agent** | Agency | Optional — the vault must stay usable by any external agent |
| **Engram's own UI** | Surface | Only after Obsidian proves the surface layer is genuinely swappable |
| **Connectors** — calendar, events, external feeds | Surface / Derivation | ⚠️ **This is where engram becomes a productivity suite** competing with much larger incumbents. Worth doing eventually; worth not doing *accidentally*. Inference item 6 in [ADR-0036](../decisions/0036-intelligence-loop.md) — ranked last because it demos best |
| `depends-on`, `duplicate-of` relation types | Relation | Each requires code behind it first ([ADR-0022](../decisions/0022-relations-in-frontmatter.md)). `contradicts` lands in Phase 13 |
| Semantic / embedding layer | Retrieval | The cancelled Phase 5, revisited only if Phase 11 shows structural traversal is insufficient |
| Local model for the private vault | Agency | The answer to "the agent is the egress path" ([ADR-0034](../decisions/0034-encryption-is-a-substrate-concern.md)) once quality permits |

---

## Guiding principles

1. **Evidence before architecture.** A gate that ends the project is a successful
   outcome, not a setback.
2. Every dependency points inward. Policy and detail depend on the core; the core
   depends on neither.
3. Design for the floor, not the union. The invariant across substrates is *a
   directory of files*; everything the core needs is in-band.
4. A closed contract requires code behind it. No code, no closed type.
5. Validation gates promotion, never capture.
6. **Inference is proposed, evidenced, and decays — never asserted.** A proactive
   system that is wrong is worse than none, because it teaches the user to ignore
   the tool.
7. **Engram never transmits anything.** No account, no telemetry, no network calls
   ([ADR-0034](../decisions/0034-encryption-is-a-substrate-concern.md)).
8. Ship working software in every phase; each leaves the project releasable.
