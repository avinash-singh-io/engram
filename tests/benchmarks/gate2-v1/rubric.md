# gate2-v1 — edge accuracy rubric (LOCKED)

> **Status:** FROZEN. Version tag `gate2-v1`. Do **not** edit. Any change is
> `gate2-v2`; rescore from scratch and never backfill v1. Rule 11 /
> [ADR-0040](../../../specs/decisions/0040-gate2-thresholds-and-protocol.md).

## What is being measured

Edges **the agent authored** via `format`. Engram does not extract — ADR-0034
forbids network calls, so this measures the model's judgement, not engram's code.

Each sampled edge is judged on two independent axes. An edge can fail one and pass
the other, which is the entire reason for two bars.

---

## Axis 1 — Directionality

**Does the arrow point the right way?**

`supersedes` and `part-of` are asymmetric: reversing them asserts the opposite. This
axis carries the higher bar (**≥95%**) because a reversal **inverts meaning** — it
presents a superseded node as current, which is exactly what the validity filter
exists to prevent.

| Verdict | Meaning |
|---|---|
| `correct` | The arrow points as the content supports |
| `reversed` | The relation is right, the direction is not |
| `n/a` | The kind is symmetric, or the edge fails Axis 2 so badly that direction is meaningless |

Worked examples:

- Content: *"This replaces our March decision on storage."*
  `june-decision --supersedes--> march-decision` → **correct**
  `march-decision --supersedes--> june-decision` → **reversed**
- Content: *"Raft is one of the consensus algorithms."*
  `raft --part-of--> consensus` → **correct**
  `consensus --part-of--> raft` → **reversed**
- `a --sources--> paper` where the node genuinely cites the paper → **correct**.
  Note `sources` is directional too: the citing node points at the cited one.

---

## Axis 2 — Predicate

**Is it the right relation kind?**

Bar **≥90%**. A wrong predicate degrades traversal without lying about currency.

| Verdict | Meaning |
|---|---|
| `correct` | The kind matches what the content asserts |
| `wrong-kind` | A different registered kind was meant |
| `should-be-untyped` | The content supports mere association, not a closed relation. **Inventing a closed relation from vague association is the most consequential predicate error** — it grants validity semantics the content does not support |
| `spurious` | No relation is supported at all |

Worked examples:

- *"Building on the caching work…"* → `part-of` is **wrong-kind** if the note is not
  contained by the caching note; `sources` may be correct if it draws on it.
- *"See also the retrieval notes."* → any closed relation is
  **should-be-untyped**. "See also" is a body link (ADR-0022), not a typed edge.
- *"This supersedes nothing in particular."* → a `supersedes` edge here is **spurious**.

---

## Scoring

```
directionality accuracy = correct ÷ (correct + reversed)        [n/a excluded]
predicate accuracy      = correct ÷ (all judged edges)
```

`n/a` is excluded from directionality only. It is **never** excluded from predicate:
an edge whose kind is wrong still counts against predicate accuracy, otherwise the
worst errors would vanish from the denominator.

## Edge cases — decided in advance

| Situation | Rule |
|---|---|
| The target node does not exist | Judge on the content. A forward reference is valid (ADR-0019); a *wrong* forward reference is still wrong |
| The edge duplicates one already present | Judge it normally; duplication is a separate concern |
| The content is too vague to judge | `should-be-untyped` on Axis 2 — if a human cannot tell, the agent had no basis either |
| An unregistered kind was emitted | `should-be-untyped`; it carries no validity semantics (ADR-0022) |
| Both axes fail | Count both. Errors are not deduplicated across axes |
