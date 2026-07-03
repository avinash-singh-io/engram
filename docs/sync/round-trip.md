# Verified Mac↔Android round-trip (metric M5)

> **Goal (M5):** a concept an agent writes on the Mac appears — OKF-valid and
> rendering with Properties — in Obsidian on Android, via the **canonical free
> path** ([Obsidian Git](obsidian-git.md) + a free private GitHub repo,
> [ADR-0010](../../specs/decisions/0010-canonical-free-sync-path.md)).
>
> The pass/fail protocol is **frozen** (Rule 11,
> [ADR-0011](../../specs/decisions/0011-m5-verification-instrument.md)): a concept
> is **byte-faithful AND OKF-valid** on the far side after transport, confirmed
> by `engram doctor` on a clean checkout plus a real-device Obsidian eyeball.

## The verification instrument: `engram doctor`

`engram doctor [dir]` is a **read-only** command (it never writes). It walks the
vault with the shipped canonical walker, runs the shipped `validateConcept` over
every concept, and adds sync-health checks. It reuses the format core and the
indexer — it is **not** a sync engine.

| Check | Severity | Meaning |
|-------|----------|---------|
| OKF validation error (missing/invalid frontmatter, etc.) | **error → exit 1** | Concept is non-conformant. |
| Unresolved VCS conflict marker (`<<<<<<<` / `\|\|\|\|\|\|\|` / `>>>>>>>`) | **error → exit 1** | A sync/merge left a conflict in a concept. |
| Case-fold filename collision (`Note.md` vs `note.md`) | **error → exit 1** | Two files fold to one name on a case-insensitive backend; concept IDs would drift. |
| CRLF line endings | warning (exit 0) | A channel rewrote line endings; frontmatter still parses. |
| UTF-8 BOM | warning (exit 0) | A channel re-encoded the file; frontmatter still parses. |
| Stale index (`reindex --check`) | warning (exit 0) | Run `engram reindex`. |
| No git repo at vault root | warning (exit 0) | The sync source of truth is missing. |

Run it, or emit machine-readable JSON:

```bash
engram doctor .            # human summary; exit 1 iff any error
engram doctor . --json     # full report as JSON
```

## Automated proof (runs in CI, no devices needed)

`tests/round-trip.test.ts` freezes the transport half of the protocol. It takes a
concept authored via the format core and a fixture under `tests/fixtures/sync/`,
then asserts it is **byte-faithful AND OKF-valid** on the far side after:

1. a **real git-clone transport** (init → commit → clone, `core.autocrlf=false`),
   and
2. an **S3 object-copy transport** (verbatim byte copy),

including **adversarial CRLF / BOM / unicode-NFD** cases (which
`parseFrontmatter` already tolerates). It also runs `engram doctor` on the cloned
checkout and asserts it exits clean. This is the regression net: if any future
change makes a transport lossy, CI goes red.

## Real-device procedure (closes M5)

Prerequisites: a working [git spine](git-spine.md) and the
[Obsidian Git mobile leg](obsidian-git.md) set up on the phone.

1. **Mac — write a concept via an agent.** In a Claude Code session on the vault:

   ```
   /capture "Temporal internals: determinism, replay, event history"
   /refine <inbox-item> --type Reference --title "Temporal Internals" \
       --description "How determinism, replay, and event history make workflows durable." \
       --to system-design/temporal-internals.md
   ```

   The Phase 1 write-hook auto-validates, reindexes, and logs the write.

2. **Mac — verify before you push.**

   ```bash
   engram doctor .        # expect: exit 0, "vault healthy" (warnings OK, no errors)
   ```

3. **Mac — commit and push to the private repo.**

   ```bash
   git add -A
   git commit -m "feat(vault): add temporal-internals concept"
   git push
   ```

   (If you also run the [S3 leg](remotely-save-s3.md): let Remotely Save push,
   or trigger a manual sync.)

4. **Android — pull.** In Obsidian on the phone: command palette → **Obsidian
   Git: Pull** (or wait for the auto-pull interval).

5. **Android — confirm it rendered.** Open
   `system-design/temporal-internals.md`. Confirm:
   - the note renders, and
   - the frontmatter surfaces as **Properties** (type, title, description, tags,
     timestamp).

   **Capture a screenshot** of the rendered note + Properties.

6. **Verify OKF-validity on a clean checkout.** On the Mac (or any machine),
   clone the repo fresh and run the instrument:

   ```bash
   git clone https://github.com/<you>/engram-vault.git /tmp/engram-clean
   engram doctor /tmp/engram-clean     # expect: exit 0, concept present & valid
   ```

   **Capture the `engram doctor` output.**

## Evidence (Rule 12)

Store the captured proof under
[`specs/phases/phase-3-sync/evidence/`](../../specs/phases/phase-3-sync/evidence/):

- the Android Obsidian screenshot(s) (rendered note + Properties), dated;
- the `engram doctor` output from the clean checkout (step 6);
- the pinned plugin version(s) used.

See that directory's `README.md` for the exact capture checklist and the current
evidence status.

## Pass criteria (frozen)

M5 passes iff **all** hold:

1. `engram doctor` exits 0 on the source vault before push (no errors).
2. The automated round-trip test is green (byte-faithful + OKF-valid through both
   transports, incl. adversarial cases).
3. On a clean checkout after the device round-trip, `engram doctor` exits 0 and
   the concept is present and OKF-valid.
4. The concept renders in Obsidian on Android with Properties populated
   (screenshot captured).
