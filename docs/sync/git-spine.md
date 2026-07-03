# Git spine — the source of truth for your vault

> **Read this first.** Everything in `docs/sync/` builds on the git spine.
> Per [ADR-0004](../../specs/decisions/0004-git-source-of-truth.md), **git is the
> durable source of truth**; the phone is a **read-mostly** leg. Engram is
> sync-agnostic — it operates on a local folder and ships these recipes, not a
> sync engine.

## Why git and not a cloud drive

A plain cloud drive (iCloud/Drive/Dropbox) is trivial to set up but gives you
"newest-wins" conflict handling that silently corrupts on true concurrent edits,
and **no reviewable, revertable history**. Agents edit this vault. You want every
agent edit to be a diff you can read and revert (NFR-4). Only version control
gives you that. So:

- **Mac = the write / curate node.** Agents (Claude Code and friends) capture,
  refine, link, and reindex here; you review the diffs and commit.
- **Phone = read-mostly.** It pulls the repo (or an encrypted mirror) so you can
  read on the go. Writing on the phone is possible but discouraged (see
  "Read-mostly discipline" below).

## Choosing a private remote

The vault is personal knowledge — the remote **must be private**.

| Option | Cost | Notes |
|--------|------|-------|
| **GitHub free private repo** (recommended) | Free, no expiry | Unlimited private repos on the free plan; pairs with Obsidian Git on Android. This is the **canonical free path** ([ADR-0010](../../specs/decisions/0010-canonical-free-sync-path.md)). |
| GitLab / Bitbucket private repo | Free tier | Equivalent; pick what you already use. |
| Self-hosted bare repo over SSH | Free (your box) | `git init --bare` on any always-on machine; maximum control, no third party. |

### Self-hosted bare repo (if you prefer no third party)

On the server:

```bash
mkdir -p ~/git/engram-vault.git
git init --bare ~/git/engram-vault.git
```

On the Mac, add it as the remote (see "Wiring the Mac" below), using
`ssh://user@your-host/~/git/engram-vault.git` as the URL.

## Initialize the vault as a git repo

From the vault root on the Mac:

```bash
# 1. Put the vault .gitignore in place BEFORE the first commit so Obsidian
#    workspace state and plugin secrets never enter history.
cp docs/sync/assets/vault.gitignore .gitignore   # adjust path to this repo

# 2. Initialize and make the first commit.
git init
git add -A
git status            # sanity-check: no .obsidian/workspace*.json, no secrets
git commit -m "chore: initial vault snapshot"
```

What **is** tracked: your concept `*.md` files, the auto-generated `index.md`
files, `log.md`, `AGENTS.md`, and the `.engram/` config. What is **not**: the
files listed in [`assets/vault.gitignore`](assets/vault.gitignore) — Obsidian
per-device workspace state, plugin secrets, `.trash/`, OS cruft, credentials.

> **Why the .gitignore matters.** Committing `.obsidian/workspace.json` creates a
> churn/merge magnet, and committing a plugin `data.json` can leak a Remotely
> Save password or S3 keys into history. Get the ignore right before commit #1.

## Wiring the Mac to the remote

### Auth: PAT (simplest) or SSH

- **GitHub PAT (HTTPS)** — create a *fine-grained* Personal Access Token scoped
  to the single vault repo with **Contents: read/write**. Use it as the password
  when git prompts, and let the OS keychain remember it:

  ```bash
  git remote add origin https://github.com/<you>/engram-vault.git
  git config credential.helper osxkeychain
  git push -u origin main       # paste the PAT when prompted for a password
  ```

- **SSH** — add an SSH key to your account, then:

  ```bash
  git remote add origin git@github.com:<you>/engram-vault.git
  git push -u origin main
  ```

Store PATs/keys **out-of-band** (a password manager) — never in the repo.

## Commit cadence

You want history granular enough to revert a single bad agent edit, without
babysitting every save.

- **Automatic (per agent edit):** the Phase 1 write-hook already re-validates,
  reindexes, and appends to `log.md` on every concept write. It does **not**
  commit — committing stays a deliberate act so you review diffs.
- **Recommended rhythm:** commit after each curation session, or when you're
  about to sync to the phone. A one-line conventional message is plenty:

  ```bash
  engram doctor .            # green before you commit (see round-trip.md)
  git add -A
  git commit -m "feat(vault): add temporal-internals; link idempotency"
  git push
  ```

- **Optional automation:** a cron/launchd job that runs `engram doctor . && git
  add -A && git commit -m "chore(vault): snapshot $(date -u +%F)" && git push`
  on an interval. Keep it gated on `engram doctor` exiting 0 so you never push a
  broken vault.

## History, branches, and revert (NFR-4)

Because the vault is git, every agent edit is a diff:

```bash
git log --oneline -- system-design/temporal-internals.md   # who changed what
git show HEAD~1:system-design/temporal-internals.md         # the prior version
git revert <sha>                                            # undo a bad edit
git checkout -- <file>                                      # discard uncommitted junk
```

For a risky agent run, branch first (`git switch -c experiment/refactor-tags`),
let the agent work, review the diff, then merge or discard. This is the one
property a cloud drive cannot give you.

## Read-mostly discipline (why the phone pulls, rarely pushes)

The mobile legs (Obsidian Git, Remotely Save → S3) work best when the phone
**pulls** and the Mac **writes**. Concurrent edits on both ends produce merge
conflicts (git) or last-writer-wins clobbering (S3). Keep writing on the Mac;
treat the phone as a reader. If you must jot on the phone, keep it to new files
(not edits to existing concepts) and sync promptly. `engram doctor` flags any
unresolved conflict markers that slip in — run it after every sync.

## Next steps

- Mobile leg, canonical free path → [`obsidian-git.md`](obsidian-git.md)
- Mobile leg, AWS-native alternative → [`remotely-save-s3.md`](remotely-save-s3.md)
- End-to-end verified procedure (M5) → [`round-trip.md`](round-trip.md)
