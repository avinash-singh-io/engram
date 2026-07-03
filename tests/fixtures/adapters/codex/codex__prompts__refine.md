# /refine

> Refine an inbox note into a filed OKF concept

Turn an inbox item into a filed, frontmatter-complete concept.

1. Read the inbox item.
2. Choose a `type` (Concept / Reference / Playbook / MOC), a `title`, a
   **one-sentence** `description`, `tags`, and a destination `category/slug.md`.
3. Run:
   `engram refine <inbox-path> --type <T> --title "<title>" --description "<one sentence.>" --tags a,b --to <category>/<slug>.md`

The command validates OKF conformance and refuses to write a non-conformant
concept. Indexes and `log.md` update automatically.
