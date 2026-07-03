# Roadmap

> **Last Updated**: 2026-07-03 · Phase 0 released as v0.1.0

## Vision

Engram becomes the OKF-native, agent-navigable knowledge base that both a
technical individual and their AI agents grow together — durable, cross-project
memory that compounds instead of being re-derived, with retrieval that stays
bounded no matter how large the vault gets.

## Release Plan

| Version | Phase | Key Deliverables | Target |
|---------|-------|-----------------|--------|
| v0.1.0 | Phase 0 — Foundation | TS/Node package + toolchain + CI; OKF v0.1 conformance spec; frontmatter validator + concept-ID resolver; CLI skeleton | ✅ Released 2026-07-03 |
| v0.2.0 | Phase 1 — MVP Vault + Claude Code | `engram init` scaffolds OKF vault; Claude Code adapter (`/capture`, `/refine`, `/link`, `/reindex`); write-hook (validate + reindex + log); adapter seam; Obsidian setup doc | ✅ Verified 2026-07-03 (merge pending) |
| v0.3.0 | Phase 2 — Progressive-Disclosure Retrieval | `/recall` structural navigation (index→tags→links→grep); `AGENTS.md` traversal contract; auto-index quality; bounded-read measurement | ✅ Released 2026-07-03 |
| v0.4.0 | Phase 4 — Ecosystem | Codex + Antigravity adapters (a new agent is a descriptor); `/promote` momentum→OKF bridge | ✅ Released 2026-07-03 |
| v0.5.0 | Phase 3 — Sync + Multi-Device | git-spine; Remotely Save→S3 & Obsidian Git recipes; `engram doctor`; Mac↔Android round-trip | ✅ Released 2026-07-03 (M5 device evidence pending) |
| v0.6.0 | Phase 5 (optional) — Semantic Layer | Embeddings index + MCP `recall` tool; hybrid navigate+retrieve; structural path stays default | Deferred (optional — roadmap wrapped at v0.5.0) |

## Phase Dependencies

- Phase 0 blocks everything — the format core (spec + validator) is the shared
  foundation.
- Phase 1 depends on Phase 0 (validator, concept-ID, CLI skeleton).
- Phase 2 depends on Phase 1 (a populated vault + indexes to navigate).
- Phase 3 is largely independent of Phase 2 (sync operates on the folder) but
  needs a real vault from Phase 1.
- Phase 4 depends on Phase 1 (adapter architecture) and momentum (for `/promote`).
- Phase 5 is optional and additive — it never replaces the structural path.

## Guiding Principles

1. Ship working software in every phase.
2. Each phase leaves the project in a releasable state.
3. Defer scope, not quality — RAG and real-time sync are explicitly later.
4. Progressive disclosure is the north star: never trade bounded retrieval for
   convenience.
