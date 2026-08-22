# 0043 — A vault declares a filing convention; engram prefers none

> **Status**: accepted
> **Date**: 2026-08-22
> **Deciders**: Avinash Kumar Singh
> **Amends**: [ADR-0023](0023-structure-tree-plus-views.md) — clarifies what "no
> opinion about the shape" obliges engram to do.

## Context

ADR-0023 says the physical tree is human-chosen and that **engram has no opinion
about the shape**. That claim is right and stands. What went wrong is how it was
implemented: "no opinion" was read as "say nothing".

Saying nothing has a cost the ADR did not anticipate. A vault is written by more
than one party — you, Claude Code, Gemini, an agent with a shell, across many
sessions — and none of them can file consistently against a convention nobody
wrote down. Observed, not hypothesised: four `format` calls into one fresh vault
produced `concepts/`, `knowledge/` and `notes/`, and on a case-sensitive
filesystem it would have been four.

The intermediate state was worse than either extreme. `init` first created five
fixed folders in *every* vault — an opinion, contradicting the ADR — and was then
reduced to `raw/` alone, which removed the opinion and left nothing in its place.
Neither is what ADR-0023 wanted.

The distinction the original ADR missed: **having no preference about which
structure is not the same as being indifferent to whether one exists.**

## Options Considered

### Option A — `init` creates one fixed tree
**Pros:** consistent filing; the vault is navigable from a terminal immediately.
**Cons:** it is an opinion, stated while denying holding one. Wrong for anyone
whose vault already has a shape, and wrong for Zettelkasten, where folders are
meant to carry no meaning at all.

### Option B — create nothing but `raw/`; let structure emerge
**Pros:** honestly opinion-free; nothing imposed.
**Cons:** what emerges is inconsistency, because each agent invents its own
containers. Also strands the human: `ls` and `cd` are the interface outside an
editor, and a vault with no shape cannot be navigated there at all.

### Option C — the vault declares a structure from several engram ships
**Pros:** engram supplies no preference and still guarantees a convention exists.
The declaration is rendered into `AGENTS.md`, so every agent files the same way.
A `custom` option covers people who want to declare their own.
**Cons:** engram now ships opinions *as options*, and must keep a guide for each.

## Decision

**Option C.**

### 1. A vault declares its structure, and engram prefers none

`.engram/config.json` records the choice. Engram ships `default`, `para`,
`zettelkasten` and `custom` and recommends none of them. Adding a philosophy is
adding a registry entry — no code, no branch — the same property the agent
adapters have.

**The opinion belongs to the vault, not to engram.** What engram insists on is
that a vault *has* a convention, which is a contract rather than a preference.

### 2. The declared structure's directories are created

Choosing PARA and not getting PARA's four buckets would be the opposite of the
original mistake. PARA's entire value is seeing those buckets when you `ls`;
Zettelkasten's is that there is one folder and the links carry everything.
A structure that is not on disk is not that structure.

`custom` declares no containers and gets `raw/` alone.

### 3. `raw/` exists in every vault

The one directory the design genuinely requires: `capture` never rejects, so it
must have somewhere to put bytes before anything has been decided about them.

### 4. The convention is rendered into `AGENTS.md`

This is the load-bearing half. A convention recorded only in config is a
convention no agent reads. `AGENTS.md` names each container and what belongs in
it, so filing is consistent across sessions and across agents.

For `custom`, it says the opposite and just as plainly: **ask the human, and do
not invent a top-level folder.**

### 5. `STRUCTURE.md` explains it to the human

Written once, never overwritten. Its own philosophy, the directory table, and the
sections every vault needs: where a formatted note belongs, why relations
organise beyond folders, how to grow without reorganising. Built centrally, so a
newly added philosophy cannot ship a guide that omits how relations work.

### What this does NOT do

**It does not constrain anything.** The convention is advisory. Adding a
subfolder, or a top-level folder the structure never mentioned, breaks nothing —
path is an address, slug is identity ([ADR-0021](0021-identity-slug-path-aliases.md)),
and the graph is built from `part-of` edges rather than from the filesystem. The
correct response to drift is `doctor` reporting it, never a refusal.

**It does not make folders the structure.** ADR-0023's second claim is untouched:
views remain free, and a note may declare several `part-of` edges and appear under
every one of them in `index.md`. Folders give a note one stable address; relations
give it as many arrangements as it belongs to.

## Consequences

- Engram ships opinions **as options**, having previously shipped one as a default
  and then none at all. Each carries a maintenance cost — a guide, a container
  list — which is the price of not choosing for the user.
- **`views/` and folders now have distinct jobs**, and the split is clearer than
  before: folders are the address you navigate in a terminal; views are the
  arrangements a filesystem cannot express — superseded, orphaned, recent.
- A philosophy expressed *only* as a generated view is possible but will
  disappoint for folder-shaped philosophies like PARA, where the point is what you
  see when you `ls`. That is a per-philosophy judgement, not a general rule.
- `doctor` reporting drift from the declared convention is the natural follow-up
  and is deliberately not part of this decision.
