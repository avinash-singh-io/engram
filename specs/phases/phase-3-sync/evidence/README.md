# Phase 3 — M5 evidence

> Verification evidence for the Mac↔Android round-trip (metric M5). The pass
> protocol is frozen in [ADR-0011](../../../decisions/0011-m5-verification-instrument.md);
> the procedure is [`docs/sync/round-trip.md`](../../../../docs/sync/round-trip.md).

## Capture checklist

For a real-device run via the canonical free path (Obsidian Git + free private
GitHub repo):

- [ ] `engram-doctor-source.txt` — `engram doctor .` output on the Mac vault
      before push (expect exit 0, "vault healthy").
- [ ] `engram-doctor-clean-checkout.txt` — `engram doctor <clone>` output on a
      fresh `git clone` after the device round-trip (expect exit 0, concept present).
- [ ] `android-obsidian-note.png` — dated screenshot of the concept rendered in
      Obsidian on Android.
- [ ] `android-obsidian-properties.png` — dated screenshot showing the OKF
      frontmatter surfaced as Properties (type/title/description/tags/timestamp).
- [ ] `plugin-versions.txt` — pinned Obsidian Git (and, if used, Remotely Save)
      plugin versions for reproducibility.

## Status (2026-07-03)

**Automated + local-CLI evidence: captured this session.**

- `engram doctor` exercised on real vaults this session: clean vault → exit 0;
  OKF-invalid concept → exit 1 (`missing-field:title`); unresolved conflict
  marker → exit 1 (`sync-conflict-marker`). Verified via `npm run check` (exit 0,
  65 tests) — see the phase `retrospective`/`tasks.md`.
- `tests/round-trip.test.ts` green: a concept is byte-faithful AND OKF-valid on
  the far side through both a real git-clone transport and an S3 object-copy
  transport, including adversarial CRLF/BOM/unicode-NFD cases, with `engram
  doctor` exiting clean on the cloned checkout.

**Real-device screenshots: PENDING.** This lane runs in a headless environment
with no physical Android device, so steps 4–5 of the round-trip procedure (pull
in Obsidian on Android, screenshot the rendered note + Properties) cannot be
executed here. The procedure is fully documented and the machine-checkable half
(byte-fidelity + OKF-validity via `engram doctor`) is proven. The Android
screenshots must be captured on a real device before M5 is signed off at
`/complete-phase`; drop the files above into this directory when done.
