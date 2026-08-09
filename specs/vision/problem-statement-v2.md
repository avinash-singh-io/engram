# Problem Statement (v2)

> **Date**: 2026-08-09
> **Status**: canonical — supersedes the problem statement in `project-charter.md`
> **Decided in**: [ADR-0018](../decisions/0018-product-definition.md)

This is the outcome of the 2026-08 design review. It replaces the framing engram
shipped under through v0.6.8. Read this before `project-charter.md`.

---

## What engram is

> **A notes system for humans — thinking on the page, journaling, learning,
> projects, planning, tracking — where the organizing work is performed by an
> agent, on the human's own plain files.**

You write however you think: a scratchpad, pasted links, a half-finished thought.
You ask the agent to format it. It emits OKF, resolves the references you gave it,
works out what relates to what and what supersedes what, and files it.

**The organizing effort disappears.** That is the entire pitch, and it is the
reason vaults die — not capture friction, not search, but the accumulating cost of
keeping a growing pile organized.

## What engram is not

**Not agent memory.** Mem0, Zep, Letta, and Cognee store what you told an agent,
for the agent's benefit — DB-backed, agent-owned, not portable past the vendor.
Engram stores what *you* know, in files *you* own. Any agent — Claude Code, Codex,
Antigravity, or one engram ships — is a co-pilot over those files, never the owner.

**Not a fix for context windows.** Models change, windows grow, routing improves.
Not a problem worth designing around.

**Not a better Obsidian.** Engram does not compete on UI or on breadth. Obsidian is
the first human surface; engram earns its place on what happens to knowledge
*after* it is written.

---

## The core problem

> **Non-regenerable knowledge — decisions, failures, constraints, and the
> relations between them — is produced continuously by human + agent work and
> destroyed at every session boundary. Nothing durable captures it in a form both
> a human and an agent can read, write, and navigate cheaply, over decades,
> without a curator.**

### Why this is the wedge

Split what people store by whether a model can regenerate it:

| Kind | Example | Regenerable by the model? |
|---|---|---|
| **Semantic** | How Graph RAG works | **Yes** — better than your notes |
| **Episodic** | We tried it in March; too slow; moved to hybrid | **Never** |
| **Procedural** | How *our* cert rotation actually works | **Never** |

All three belong in the vault. But most of what people historically stored is
semantic — and semantic knowledge no longer needs storing. The last two are what
nothing else in the world holds, and they are where the design spends its care.

### The unoccupied square

| | Human-owned & editable | Agent-navigable at scale | Portable for 20 years |
|---|---|---|---|
| Mem0 / Zep / Letta / Cognee | ✗ | ✓ | ✗ |
| Obsidian / Notion | ✓ | ✗ | partial |
| `AGENTS.md` / `CLAUDE.md` | ✓ | ✗ (does not scale) | ✓ |
| **Engram** | **✓** | **✓** | **✓** |

---

## The three dimensions the user named

1. **Knowledge & graph** — the substance and its connections
2. **Structure** — how a *human* navigates it, which is the dimension that matters
   most to the primary user
3. **AI-native** — a human working alongside an agent as the default mode

The design review expanded these to ten dimensions in three tiers
([ADR-0024](../decisions/0024-three-tier-dependency-inversion.md)) and found that
"knowledge & graph" is two dimensions, "structure" is Tier-2 policy rather than
substrate, and "AI-native" splits into *Agency* (who acts, how autonomously) and
*Surface* (where they act from). Three dimensions were also missing entirely:
**Time**, **Provenance**, and **Derivation**.

---

## Requirements, and how each was answered

The originating requirements came from a founder's vault spanning private records,
portable technical research, company IP, and public content.

| # | Requirement | Answer |
|---|---|---|
| 1 | Confidential personal files strictly private | **Repos, not code.** One repo per distinct set of humans who may see all of it ([ADR-0030](../decisions/0030-boundaries-are-repos.md)) |
| 2 | Technical expertise portable and permanent | Its own repo; cross-root linking explicitly **cut** |
| 3 | Company IP safely shareable | Same repo rule |
| 4 | Multi-company / consulting | Same repo rule; +1 repo per engagement |
| 5 | Obsidian graph and markdown standards | **Solved within one root** — body links stay standard markdown and render everywhere ([ADR-0022](../decisions/0022-relations-in-frontmatter.md)) |
| 6 | Daily capture friction minimized | Reframed: not friction, a **queue with no consumer**. Answered by [ADR-0026](../decisions/0026-validation-gates-promotion.md) |

Four of six were retired with zero code — which is why the product definition had
to be rewritten. The originating document described a **filing** problem; engram is
a **trust-and-retrieval** product. They were never the same problem.

---

## The one assumption everything rests on

> **Structured navigation beats brute search over the same folder.**

An agent with `rg`, `find`, and a large context window is a strong, zero-cost
baseline. Graph retrieval measurably wins on multi-hop and structural questions and
**ties** on simple lookup — so it earns its cost only if a real fraction of actual
questions are structural.

That is a measurement, not an opinion, and it has not been taken. It is Phase 7,
Gate 1, and it can end the project in an afternoon
([ADR-0031](../decisions/0031-evidence-gates-before-graph.md)).

## An honest caution

Every first-principles pass in this review made the product **smaller**: boundaries
became `mkdir`, the lens died, config became detection, git-as-ledger died on the
substrate floor, four relation types became two, and Time and Provenance turned out
to be already specified upstream.

That is either convergence on an irreducible core, or subtraction toward zero.
Gate 1 is the measurement that distinguishes them.
