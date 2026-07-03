### [DECISION] 2026-06-20 — Lock the evaluator before the optimization loop

Topics: evaluation, optimization, discipline
Affects-phases: phase-3-loop
Affects-specs: tests/benchmarks/README.md
Detail: Froze the evaluation corpus and the scalar metric before building the
self-improvement loop so score history stays comparable across runs.
