# Mobile leg: Obsidian Git on Android (canonical free path)

> This is the **canonical zero-cost, verified path** the Mac↔Android round-trip
> (M5) is proven against ([ADR-0010](../../specs/decisions/0010-canonical-free-sync-path.md)).
> It pairs a **free private GitHub repo** with the **Obsidian Git** community
> plugin so the phone pulls the same git history the Mac writes — diffs and
> revert reach the device, and it stays free with no expiry.
>
> Prerequisite: a working [git spine](git-spine.md) with a private remote.

## What you get

- The phone holds a real git clone of the vault (read-mostly).
- Concepts render in Obsidian with frontmatter surfaced as **Properties**.
- Zero cost, no free-tier clock.

## 1. Create the fine-grained GitHub PAT (on the Mac or phone)

Obsidian Git on Android authenticates over HTTPS with a Personal Access Token.

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate.
2. **Repository access:** only your `engram-vault` repo.
3. **Permissions:** Repository → **Contents: Read and write**.
4. Set a sensible expiry (e.g. 90 days) and note the renewal date.
5. Copy the token into your password manager — you'll paste it on the phone once.

Never put the PAT in the repo. If it leaks, revoke and regenerate.

## 2. Install Obsidian + Obsidian Git on Android

1. Install **Obsidian** from the Play Store.
2. Create/choose a **vault folder** on the phone. On Android, prefer a path
   inside Obsidian's own app storage or a clearly app-owned folder — external
   SD-card / scoped-storage paths can make Obsidian Git's file access flaky.
   Keep the vault out of directories other apps sync (avoid double-syncing).
3. Open **Settings → Community plugins**, turn off Restricted mode, browse for
   **Obsidian Git**, install, and enable it.
4. **Pin the plugin version** and record it in your evidence notes — mobile Git
   plugins are version-sensitive and recipes rot (see Risks below).

## 3. Clone the private repo into the vault

In Obsidian Git settings on the phone:

1. Set **Authentication/Username** to your GitHub username and
   **Password/Personal access token** to the PAT from step 1.
2. Use the command palette → **Obsidian Git: Clone an existing remote repo**,
   and enter `https://github.com/<you>/engram-vault.git`.
3. Point it at the vault folder from step 2. Let the initial clone finish (first
   clone can be slow on a large vault).

Once cloned, opening a concept should show its Properties (type, title,
description, tags, timestamp) — that's the OKF frontmatter rendering natively.

## 4. Pull schedule (read-mostly)

Configure Obsidian Git to keep the phone current without you thinking about it:

- **Pull on startup:** enable, so opening Obsidian fetches the latest.
- **Auto-pull interval:** set a period (e.g. every 15–30 min) if you read often.
- **Auto-commit/push:** **leave OFF** (or long) on the phone. The phone is a
  reader; the Mac is the writer (read-mostly discipline, ADR-0004). Auto-pushing
  from the phone is exactly how you create conflicts.

To read the freshest content on demand: command palette → **Obsidian Git: Pull**.

## 5. Conflict avoidance and recovery

- **Write on the Mac, read on the phone.** This alone avoids almost all conflicts.
- If you *do* edit on the phone and a pull conflicts, Obsidian Git surfaces it; a
  concept may end up with `<<<<<<<` / `>>>>>>>` markers. **On the Mac, run
  `engram doctor .`** — it exits non-zero and names any file carrying an
  unresolved conflict marker so you can fix it before it spreads.
- Because git is the source of truth, the Mac's history is always the recovery
  point: worst case, discard the phone's local changes and re-pull.

## Risks (and how this recipe hedges them)

- **Plugin/version drift.** Android Git plugins change; auth flows shift. Pin the
  plugin version and keep dated screenshots (see [round-trip.md](round-trip.md)).
- **Scoped storage.** Vaults on external/scoped-storage paths can break the
  plugin's file access. Keep the vault app-owned.
- **Large binary vaults.** Obsidian Git on mobile is happiest with text. Engram
  vaults are markdown, so this is rarely an issue.

## Next step

Run the full verified procedure end-to-end: [`round-trip.md`](round-trip.md).
