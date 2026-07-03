# Mobile leg: Remotely Save → S3 (AWS-native alternative)

> **Recommended AWS-native path**, not the free bar. This leg gives a nicer
> Android experience — end-to-end encryption at rest, built-in scheduled sync —
> and is a natural fit if you already run AWS. But it is **free only within AWS's
> 12-month / 5 GB free tier**; after that it bills per GB-month + requests. The
> **canonical free path is [Obsidian Git](obsidian-git.md)**
> ([ADR-0010](../../specs/decisions/0010-canonical-free-sync-path.md)).
>
> Even with this leg, **git remains the source of truth**
> ([ADR-0004](../../specs/decisions/0004-git-source-of-truth.md)): the S3 copy is
> an encrypted mirror for the phone, not the master. Keep the [git
> spine](git-spine.md) on the Mac.

## Architecture

```
Mac (write node)  --git-->  private git remote      (source of truth)
      |
      +----Remotely Save---> S3 bucket (encrypted)  --Remotely Save--> Android (read-mostly)
```

The Mac pushes to git *and* to S3; the phone syncs from S3. The S3 object is
opaque, end-to-end-encrypted ciphertext — so no diffs live on this leg.

## 1. Create the S3 bucket

1. In the AWS console (or CLI), create a bucket, e.g. `your-engram-vault`, in a
   region close to you.
2. Keep **Block Public Access = ON** (this is private data).
3. Default SSE (SSE-S3) is fine; Remotely Save also encrypts client-side, so your
   data is encrypted before it ever reaches S3.

> **Cost note.** The free tier covers 5 GB storage + limited requests for 12
> months. A text vault is tiny, but after the free-tier window S3 is not free.
> If "free forever" matters, use the [Obsidian Git](obsidian-git.md) path.

## 2. Attach a least-privilege IAM user

Do **not** use your root or admin keys in a phone plugin. Create a dedicated IAM
user with an inline/managed policy scoped to just this bucket. A ready template
lives at [`assets/s3-iam-policy.json`](assets/s3-iam-policy.json) — replace
`YOUR-ENGRAM-VAULT-BUCKET` with your bucket name. It grants only
`ListBucket`/`GetBucketLocation` on the bucket and `GetObject`/`PutObject`/
`DeleteObject` on its objects — no bucket creation, deletion, or reconfiguration.

Generate an **access key + secret** for that user. These go **only** into the
Remotely Save config on each device (out-of-band), never into the repo.

## 3. Install and configure Remotely Save (Mac + Android)

On **both** the Mac and the phone, in Obsidian → Community plugins, install and
enable **Remotely Save**, then in its settings:

1. **Remote service:** S3.
2. **Endpoint / region:** your bucket's region.
3. **Bucket name:** `your-engram-vault`.
4. **Access key / secret key:** the IAM user's keys from step 2.
5. Use the **same** settings on both devices so they target the same bucket.
6. **Pin the plugin version** and record it in your evidence notes.

## 4. End-to-end encryption + out-of-band key management

1. In Remotely Save, set an **E2E encryption password**. With it set, files are
   encrypted **client-side** before upload — AWS only ever sees ciphertext.
2. Use the **same password on every device**, or they can't read each other's
   uploads.
3. **Store the password out-of-band** (a password manager) — **never** in the
   vault or the repo. If you commit the plugin `data.json`, you leak it; the
   [`vault.gitignore`](assets/vault.gitignore) already excludes it.
4. **Recovery:** if you lose the E2E password, the S3 copy is **unrecoverable**.
   That is by design and acceptable **because git — not S3 — is the recovery
   source of truth** (ADR-0004). Re-derive the S3 mirror from the git checkout.

## 5. Scheduled sync interval + read-mostly discipline

- Set Remotely Save's **auto-sync interval** (e.g. every 15–30 min) so the phone
  refreshes without manual taps.
- Keep the phone **read-mostly** (ADR-0004). S3 has no merge — it's
  last-writer-wins, so a phone edit racing a Mac edit can silently clobber a
  concept. Write on the Mac; read on the phone.
- Because two channels (git + S3) run off one folder, a phone write can diverge
  the two. After syncing, run **`engram doctor .`** on the Mac — it flags
  unresolved conflict markers and CRLF/BOM mangling that a channel can introduce.

## Risks (and hedges)

- **Free-tier expiry** → the "free" claim rests on the Obsidian Git path; this
  leg is an *alternative*, clearly cost-bearing.
- **Last-writer-wins clobbering** → read-mostly discipline + `engram doctor`.
- **E2E password loss** → git is the recovery source of truth.
- **Key leakage via committed plugin data** → the vault `.gitignore` excludes it.
- **Plugin version drift on Android** → pin versions, keep dated screenshots.

## Next step

Run the verified end-to-end procedure: [`round-trip.md`](round-trip.md).
