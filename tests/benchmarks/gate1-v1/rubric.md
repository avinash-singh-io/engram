# gate1-v1 — classification rubric (LOCKED)

> **Status:** FROZEN. Version tag `gate1-v1`. Do **not** edit this file. Any change
> is a new `gate1-v2` rubric; reclassify from scratch and rerun prior results
> against v2 — never backfill v1. See CLAUDE.md Rule 11 and
> [ADR-0037](../../../specs/decisions/0037-gate1-measurement-protocol.md).

## What is being measured

For each user prompt in the corpus, exactly one label. The Gate 1 fraction is

```
structural ÷ (lookup + structural)
```

`not-a-kb-question` items are excluded from the denominator entirely.

---

## The three labels

### `not-a-kb-question` — excluded from the denominator

The prompt requests an **action**, **generation**, or **conversation**, rather than
seeking information that was previously recorded.

Includes:

- Imperatives and task instructions — *"run the tests"*, *"fix the failing build"*,
  *"add a `--dry-run` flag"*, *"refactor this into a helper"*
- Meta and control — *"continue"*, *"stop"*, *"thanks"*, *"try again"*, *"use the other approach"*
- Pure generation with no retrieval component — *"write a function that parses ISO dates"*
- **Questions about the code currently open**, where reading the source answers it —
  *"what does this function do"*, *"why is this test failing"*. The code is the
  source of truth, not a knowledge base.
- General world knowledge the model answers without any recorded material —
  *"what's the syntax for a bash heredoc"*

> **The boundary that matters.** This label sets the denominator, and therefore the
> answer. The test is: **is the user seeking something that was recorded, or asking
> for something to be done?** When a prompt is genuinely both, see *Compound
> prompts* below. When it is genuinely ambiguous, label `not-a-kb-question` — the
> conservative direction, because it shrinks the denominator and makes the
> structural fraction *easier* to clear, which is the bias that must not be hidden.

### `lookup` — in the denominator

Seeks **recorded information**, answerable by matching topic or text against
material that exists. One hop. No relation, no time, no provenance required.

- *"what did I write about consistent hashing"*
- *"do I have notes on the saga pattern"*
- *"what were the numbers from that benchmark"*
- *"summarise my notes on vector clocks"*

> Text search is competitive here. ADR-0031's own table shows graph and naïve
> retrieval effectively tie on simple fact retrieval (60.1 vs 60.9).

### `structural` — in the denominator

Answering correctly **requires relations, time, or provenance** — not just matching
text. The operational test:

> **Would `rg` over the same directory return the right answer with the same
> confidence?** If text search cannot distinguish the *current* answer from a
> *superseded* one, or cannot follow a link to reach the answer, the prompt is
> structural.

Six markers — any one is sufficient:

| # | Marker | Example |
|---|---|---|
| 1 | **Currency / supersession** | *"what's our current position on hybrid retrieval"*, *"is this still true"*, *"what replaced the graph-rag-only decision"* |
| 2 | **Lineage / provenance** | *"what was that conclusion based on"*, *"where did this claim come from"*, *"which sources support this"* |
| 3 | **Prior attempts** | *"have we tried this before"*, *"what did we already decide about caching"*, *"why did we rule that out"* |
| 4 | **Dependency / impact** | *"what depends on the codec registry"*, *"what breaks if I change the identity model"* |
| 5 | **Contradiction** | *"do these two notes conflict"*, *"does this contradict what we said in March"* |
| 6 | **Multi-hop synthesis** | requires combining two or more recorded items *connected by a relation*, not merely both matching the same keyword |

---

## Edge cases — decided in advance

| Situation | Rule |
|---|---|
| **Compound prompt** (instruction + question) | Label by the *dominant* intent. If the question is load-bearing for the instruction — *"what did we decide about retries, then implement it"* — label the question. |
| **Follow-up with a pronoun** — *"what about the other one?"* | Resolve against the immediately preceding turn. If unresolvable from the transcript, label `not-a-kb-question`. |
| **Repeated / rephrased question** in one session | Label each occurrence. Repetition is itself signal about retrieval failure and must not be silently deduplicated. |
| **Question the agent answers from its own general knowledge** | Label on what the *question* requires, never on how it happened to be answered. The answer path is not the question's shape. |
| **Question about the project's own decisions** — *"why did we choose slugs over paths"* | `structural`, marker 3. This is engram's core case. |
| **Multi-part question** with both a lookup and a structural part | `structural`. The harder requirement governs. |
| **Prompt containing pasted content plus a question** | Label the question; the paste is context. |
| **Non-English or mixed-language prompt** | Label normally; language is not a factor. |

---

## Bias disclosure — non-negotiable

Two directional biases are known and must be reported alongside the number, never
silently absorbed:

1. **Ambiguous → `not-a-kb-question`** shrinks the denominator and makes the
   structural fraction *easier* to clear.
2. **The corpus is retrospective**, so it undercounts structural traffic — nobody
   asks what nothing can answer. The reading is therefore a **lower bound**
   (ADR-0037 §3).

These point in opposite directions. Neither is corrected; both are stated.
