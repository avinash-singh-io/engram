# 0046 — Find the vault root; do not assume the current directory is it

> **Status**: accepted
> **Date**: 2026-08-23
> **Deciders**: Avinash Kumar Singh
> **Amends**: [ADR-0030](0030-boundaries-are-repos.md) — the *discovery* half only.
> The boundary rule is unchanged and remains the point of that ADR.

## Context

`engram capture` run from a subdirectory of a vault creates a second vault inside the
first. Verified against the built binary on 2026-08-23:

```
$ cd my-vault/concepts && engram capture "a thought"
captured 29 bytes -> /raw/2026-08-23T13-23-11-853Z.md
$ find my-vault -path '*raw*'
my-vault/concepts/raw/2026-08-23T13-23-11-853Z.md
```

Two things are wrong. The note is filed into a `raw/` nobody asked for, and the path
engram reports — `/raw/...` — is relative to a root the user does not believe they
are in. Nothing warns; it simply reports success about the wrong place.

This became urgent in Phase 17. A skill invoked as `/engram:capture` runs from
whatever directory the agent's session started in, so shipping slash-command
invocation onto this behaviour would put a working path on top of a broken one.

### Why it is like this

ADR-0030 decided that boundaries are repositories and that **one root is the whole
world**, in preference to a visibility model that would have looked like security
without being it. Its implementation made the invocation root the only root.

That conflated two different rules:

- **Boundary** — how far a vault extends, and what is deliberately outside it. This
  is the one ADR-0030 is about, and it is correct.
- **Discovery** — how engram works out which root it is standing in. ADR-0030 never
  argued for "the current directory", it simply never distinguished the question.

`git` makes the same distinction and gets it right: a repository has exactly one
root, and `git status` works from anywhere inside it.

## Options Considered

### A — Require the user to stand at the root, or pass `--vault`
No code. But `--vault` already exists and the failure is silent, which is the whole
problem: a tool that quietly does the wrong thing when you are one directory too deep
is not teaching anyone to pass a flag.

### B — Walk up for `.engram/`
Matches git, npm, cargo, and every other tool with a project root. The marker already
exists and already means "this is a vault root" (ADR-0030).

### C — Walk up, but stop at a repository boundary
As B, plus: stop at a directory containing `.git` that has no `.engram/`. A vault
checked out inside an unrelated repository never resolves past its own project.

## Decision

**Option C.**

`findVaultRoot(cwd)` walks upward from the working directory:

1. A directory containing `.engram/` is the vault root. **Nearest wins** — which is
   ADR-0030's "one root is the whole world" evaluated from wherever you stand, and
   preserves the nested-root rule the walker already enforces.
2. A directory containing `.git` but no `.engram/` **stops the search** and reports
   no vault. Escaping a repository to find a vault outside it would be a boundary
   violation, which is the thing ADR-0030 exists to prevent.
3. The filesystem root ends the search.

### `--vault` still wins

An explicit flag is used verbatim, with no discovery. Explicit beats implicit, and a
user who names a directory means that directory.

### Not finding a vault is an error, except for `init`

Every command that reads or writes a vault fails with a message naming `engram init`.
`init` itself uses the working directory, because creating a vault is exactly the case
where there is not one yet.

Silently falling back to the working directory is what produced the bug: it turns
"you are not in a vault" into "here is a new vault", which is a much larger action
than the user asked for.

### The resolved root is printed when it differs from the working directory

One line on stderr. Discovery that is invisible is indistinguishable from magic, and
the user needs to be able to see which vault they just wrote to.

## Consequences

- **`engram` works from anywhere inside a vault**, like every other project-rooted
  tool. This is the behaviour users already expect, which is why the old one was
  surprising rather than merely limiting.
- **A skill can invoke an operation without knowing where the session started.** That
  is what makes `/engram:capture` reliable rather than occasionally destructive.
- **ADR-0030's boundary rule is untouched.** A vault is still one root, still bounded
  by the repository, and engram still refuses to reach across a `.git` it does not own.
- **A nested vault still wins over its parent**, matching what the walker already does
  when it refuses to descend into a nested root.
- **This does not fix skill loading from a subdirectory.** Project-scope plugins load
  only from the directory the agent starts in and do not walk up — a host rule engram
  cannot change. Root discovery fixes where `engram capture` files; it cannot make
  `/engram:capture` exist in a session started three directories down. `doctor` says
  so, because the two failures look identical from the outside and only one of them
  is engram's to fix.
