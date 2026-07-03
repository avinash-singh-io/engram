# 0007 — TypeScript single-package MVP; vendor the engine, extract later

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

Engram reuses momentum's engine ([ADR-0001](0001-separate-product-shared-engine.md)).
Two structural choices were open for the MVP: (1) language/runtime, and (2)
whether to physically extract a shared "engine" library from momentum now, or
ship Engram as a single self-contained package that vendors the pattern.

## Options Considered

### Language — TypeScript vs JavaScript
- **TypeScript (chosen):** typed parsers for OKF frontmatter and index
  generation; safer format core; standard for modern npm CLI tooling.
- JavaScript: no build step for the tool, but weaker guarantees on the
  format-parsing core (the riskiest code).

### Packaging — single package vs extract shared engine now
- **Single package (chosen):** Engram vendors momentum's engine pattern; one
  distributable npm package (`bin: engram`). Fastest path to a working MVP; no
  cross-repo coupling to manage while the design is still moving.
- Extract shared engine now: cleaner long-term, but premature — couples two
  products before either's boundaries are proven.

## Decision

**MVP is a single TypeScript/Node npm package that vendors the engine pattern.**
Toolchain: TypeScript, a bundler (tsup/tsc), vitest for tests, eslint + prettier,
CI. The physical extraction of a shared engine library is **deferred** and
tracked as TD-001 — revisit once Engram and momentum boundaries are stable.

## Consequences

- Phase 0 stands up the TS/Node package + toolchain + CI as its Group 0.
- The format core (validator, concept-ID resolver) is typed — the highest-risk
  code gets the strongest guarantees.
- Engine extraction is an explicit future decision, not an accident; until then
  duplication with momentum is accepted (TD-001, P2).
- Aligns with PRD open-question 16 ("extract engine later; MVP can vendor the
  pattern").
