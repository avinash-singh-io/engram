# Success Criteria

> Measurable targets. When all are met, the project has achieved its goals.

## Phase 0 Targets (Foundation)

| Criterion | Target | How to Measure |
|-----------|--------|----------------|
| Package builds | `npm run build` exits 0 | Run in CI + locally |
| Tests pass | `npm test` exits 0 | Run in CI + locally |
| OKF spec documented | v0.1 conformance spec committed | File present, reviewed |
| Validator correctness | 100% of fixture corpus classified right | Validator run over locked fixtures (valid pass, malformed rejected) |
| CLI runs | `engram --version` and `engram --help` succeed | Smoke test in this session |
| Lint clean | 0 errors | `npm run lint` exits 0 |

## Long-Term Targets

| ID | Criterion | Target | How to Measure |
|----|-----------|--------|----------------|
| M1 | Time-to-first-concept after `init` | < 2 min | Timed walkthrough from empty dir |
| M2 | Concepts frontmatter-complete + OKF-valid | 100% (enforced) | Write-hook validation; no invalid file committable |
| M3 | Retrieval cost per `/recall` | Sublinear; bounded regardless of vault size | Fraction of vault files read, measured on a 100+ concept vault |
| M4 | Index freshness | 0 stale indexes | Re-run `/reindex`; diff must be empty (idempotent) |
| M5 | Cross-device round-trip | Works on the documented free stack | Concept written by agent on Mac appears OKF-valid in Obsidian on Android |
| M6 | No whole-vault loads | Never | `/recall` never reads the entire vault (asserted in Phase 2 acceptance) |
