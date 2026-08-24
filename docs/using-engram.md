# Using engram — install, adopt a vault, wire an agent

The three things worth understanding up front:

1. **Engram is installed once on your machine, never into a vault.** A vault is a
   directory of markdown. Engram is a CLI you point at one.
2. **A vault can be any directory** — a new one, or an Obsidian vault you have used
   for years. `init` is non-destructive and does not impose a folder structure on a
   vault that already has one.
3. **The agent is how you use it.** Engram ships no agent and no UI. Claude Code,
   Antigravity, Gemini or anything that speaks MCP does the organizing work; engram
   validates, files, and refuses.

---

## 1. Install

Engram is **not on npm** right now — every release since v0.6.5 failed to publish
(BUG-002). Until that is fixed, install from source:

```bash
git clone git@github.com:avinash-singh-io/engram.git && cd engram && npm install && npm run build && npm link
```

That puts `engram` on your PATH. Verify it actually runs — this is worth doing, since
the installed binary was a silent no-op until BUG-004:

```bash
engram --help
```

Nothing is installed into any vault. There is no per-vault dependency, no
`node_modules` in your notes, and uninstalling engram leaves every file readable.

## 2. Point it at a vault

**A new vault:**

```bash
mkdir ~/my-vault && cd ~/my-vault && engram init
```

You get a reference tree (`inbox/ concepts/ decisions/ sources/ projects/`), which is
illustrative and yours to delete — [ADR-0023](../specs/decisions/0023-derived-views-from-part-of.md)
is explicit that engram has no opinion about the shape.

**An Obsidian vault you already use:**

```bash
cd ~/path/to/your/vault && engram init
```

It detects that you already have notes and **does not create its folder tree** — you
already have a structure, and imposing a second one is an opinion engram does not
hold. It adds only:

| Path | What it is |
|---|---|
| `.engram/config.json` | Which structure this vault declares |
| `.engram/guardrails.md` | **What an agent may do here.** Edit this |
| `AGENTS.md` | The generated contract every agent reads |
| `CLAUDE.md`, `GEMINI.md`, `.antigravity/AGENTS.md` | The contract rendered in full for each agent that needs its own file (ADR-0017) |
| `index.md`, `views/` | Derived. Gitignored; rebuilt by `engram reindex` |

**If you already have a `CLAUDE.md`**, engram leaves it alone — it may carry
instructions engram knows nothing about. But then Claude Code never learns the
contract exists, so `init` tells you the one line to add:

```markdown
This is an engram vault. The contract is [AGENTS.md](AGENTS.md) — read it first.
```

Run `engram init` again any time. It is idempotent and never overwrites.

## 3. Wire an agent

Since v0.14.0 there are **two** ways, and the simpler one needs no configuration at
all. Skills are rendered into each agent's own directory by `engram reindex`, so the
whole surface is reachable as slash commands the moment a vault exists.

### Slash commands — no MCP, no config

```bash
engram reindex     # renders skills into every agent directory
```

Then, in a session started **at the vault root**:

| | Engram's own | Skills you wrote |
|---|---|---|
| Claude Code | `/engram:capture`, `/engram:format`, … | `/your-skill-name` |
| Gemini CLI, Antigravity | `/engram-capture`, `/engram-format`, … | `/your-skill-name` |
| OpenCode | skill tool: `capture`, `format`, … · commands: `/engram-capture`, … | `/<your-skill-name>` via the skill tool |

**If it carries engram's mark, engram wrote it. If it does not, you did.** Only the
separator differs — `:` where the host provides a namespace, `-` where it does not.

OpenCode separates its two surfaces: skills are **agent-invoked** through the
native skill tool (ask for `format` and the agent loads it), while `.opencode/commands/`
is the explicit, user-invoked form — type `/engram-capture some thought` and the
thought rides in as `$ARGUMENTS`. opencode also reads the vault's root `AGENTS.md`
as its rules file, so the contract needs no separate copy; if both `AGENTS.md` and
`CLAUDE.md` exist, `AGENTS.md` wins. Setting `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1`
changes nothing engram renders — the native copies are written for it directly.

Two things about Claude Code specifically, both of which are its rules rather than
engram's, and neither of which engram can work around:

- **You have to accept the workspace trust dialog once.** Project-scoped skills load
  only after that. Engram uses project scope deliberately — the personal directory
  (`~/.claude/skills/`) has no prompt but is machine-wide, and would leak one vault's
  skills into every unrelated project you open.
- **Start the session at the vault root.** Project-scoped plugins load only from the
  directory Claude Code starts in and do not walk up. `engram` itself is fine from any
  subdirectory ([ADR-0046](../specs/decisions/0046-vault-root-discovery.md)), but the
  slash commands will not be there.

### Writing your own skill

```bash
engram skill new literature-review
```

That writes `engram/skills/literature-review/SKILL.md` — **visible in Obsidian,
committed with your vault** — and renders it immediately. Edit it there and run
`engram reindex`. Or just ask an agent: `/engram:create-skill`.

Everything under an agent's own directory (`.claude/skills/`, `.gemini/skills/`,
`.antigravity/skills/`, `.opencode/skills/`, `.opencode/commands/`) is
**generated**. Editing a file there does nothing lasting:
the next `engram reindex` overwrites it. There is no lock on those files and there
should not be — they are plain files on your disk — but the edit you want to keep
belongs in `engram/skills/`. Commands cannot be edited at all: they are generated
from engram's operation registry, with no vault-local source.

To replace one of engram's own skills, create one with the same name in
`engram/skills/`. Engram then stops rendering its own, and yours takes the plain
name. You never need to edit engram's copy.

The format is the [Agent Skills standard](https://agentskills.io/specification): a
directory containing `SKILL.md`, with `name` and `description` required and anything
engram-specific under `metadata`. A skill written here works in any agent that
implements the standard, including ones engram has never heard of.

### Over MCP — optional, and additive

MCP is still supported and still useful for a client already configured that way. It
is no longer the only route to the operations.

#### Claude Code

Create `.mcp.json` in the vault:

```json
{
  "mcpServers": {
    "engram": { "command": "engram", "args": ["mcp"] }
  }
}
```

`engram mcp` speaks MCP over **stdio** — Claude Code spawns it as a subprocess and
talks over pipes. No socket, no port, nothing listening
([ADR-0034](../specs/decisions/0034-encryption-is-a-substrate-concern.md) holds
intact). Omit `--vault` and it uses the working directory; pass
`"args": ["mcp", "--vault", "/abs/path"]` to drive a vault from elsewhere.

Then start Claude Code in the vault. It reads `CLAUDE.md` → `AGENTS.md` for the
contract, and gets these tools:

| Tool | What it does |
|---|---|
| `engram_capture` | Persist raw content. **Never rejects** |
| `engram_format` | Content + the structure the agent decided → a validated node |
| `engram_link` | Assert one typed relation |
| `engram_reindex` | Regenerate `index.md` and `views/` |
| `engram_doctor` | Health report. Read-only |
| `engram_queue_list`, `engram_queue_show` | **Read** the approval queue |

There is deliberately **no tool that approves or rejects** — see §4.

#### Gemini CLI, Antigravity, OpenCode

Same server, each client's own config location. `reindex` renders the contract in
full into `GEMINI.md` and `.antigravity/AGENTS.md`; OpenCode needs no copy because
it already reads `AGENTS.md`. Adding another agent is [one descriptor plus
evidence](adapters.md), no code.

#### Any agent with a shell

Needs no MCP at all — `AGENTS.md` plus the CLI is a complete surface. This is the
floor the whole design targets, and `AGENTS.md` now includes a **How to run these**
section naming the shell form, the slash form and the MCP form, so an agent is told
how to reach an operation rather than only that it exists.

## 4. Decide what the agent may do

Edit `.engram/guardrails.md`. The field that matters most:

```yaml
proposeOnly: [/decisions/]
```

Paths listed there are **held for your review** instead of written. An agent's
`format` into one of them returns "not written", and the change waits:

```bash
engram queue list           # what is pending
engram queue show <id>      # a git-style diff of what would change
engram queue approve <id>   # apply it
engram queue reject <id> why not
```

Two properties worth knowing, both from
[ADR-0042](../specs/decisions/0042-approval-queue-trust-boundary.md):

- **Approve and reject are human-only.** No MCP tool for either. An agent that could
  approve its own proposal would have turned a refusal into a retry.
- **Approve refuses if the file changed since the proposal was made.** Engram does
  not merge. If you edited the note in Obsidian meanwhile, your edit wins and the
  proposal stays queued for you to look at again.

`proposeOnly` ships **empty**, so nothing is held until you ask for it.

## Editing frontmatter — including in Obsidian

**Obsidian's Properties panel is safe.** Edit properties there, edit the file in a
text editor, or let engram write it — all three round-trip.

That was not always true. Until v0.15.0, editing any property in Obsidian's panel
rewrote `part-of: [finance]` into

```yaml
part-of:
  - finance
```

which engram could not read — and it discarded the *whole* frontmatter when it hit
that line, including `id`. The note then fell back to path-as-identity, so moving it
broke every relation pointing at it. If you wrote yourself a rule like *"do not edit
properties in Obsidian"*, **it no longer applies. Delete it.**

Nothing needs migrating. Those files were always valid YAML; engram simply could not
read them, so they work untouched. `engram upgrade` will say so and change nothing.

### What engram reads

Both sequence styles, and **whichever one your file already uses is what engram writes
back** — it will not reformat your notes, and it will not fight Obsidian over style.

```yaml
part-of: [a, b]        # flow — what engram writes for a new note
part-of:               # block — what Obsidian writes
  - a
  - b
```

Plus: quoted and unquoted scalars (including ones containing colons), booleans, nulls,
dates, flow maps, one level of nested mapping, `|` and `>` block scalars, comments.
The full list is `SUBSET` in `src/format/subset.ts`, and every entry in it has a test.

Not read, and **named in the warning** rather than silently misparsed: anchors (`&x`),
aliases (`*x`), tags (`!!type`), complex keys (`? [a, b]`), and nesting deeper than one
level.

### If something is unreadable

You lose **that key**, never the file. `id`, `author`, `timestamp` and every other
readable relation survive, and `engram doctor` names the line:

```
[frontmatter] /3-resources/finance/glossary.md line 6: engram does not read a
  YAML anchor; this key was skipped. engram reads 24 YAML constructs including
  block and flow sequences — see STRUCTURE.md, or rewrite this key in a form it lists.
```

The one exception is `engram/guardrails.md`, which **fails closed**: if any line in it
is unreadable, engram applies its defaults — every rule on — rather than a
half-understood config that might permit more than you wrote. It says so loudly.

## 5. Check on it

```bash
engram doctor
```

Read-only. Reports dangling relations, synthesis nodes with no sources, agent writes
outside their permitted scope, and — if this is an Obsidian vault — whether **this
device's** link settings disagree with how the vault's links are actually written.
That last one matters on a laptop-plus-phone setup, where the setting is
per-vault-per-install ([ADR-0028](../specs/decisions/0028-obsidian-owns-link-rewriting.md)).

## What is not here yet

- **`recall`** — structural retrieval. Phase 11, blocked on Gate 2.
- **The Obsidian plugin** — written and tested, held for Phase 16. Until then Obsidian
  is a first-class *reader and editor* of the vault; engram just runs beside it.
- **Sync** — git. Engram never transmits anything.
