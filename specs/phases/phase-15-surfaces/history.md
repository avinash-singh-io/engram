# Phase 15 — History

### [DECISION] 2026-08-12 — MCP ships over stdio **and** HTTP; ADR-0034 is amended first
Topics: mcp, security, trust-boundary, transport
Affects-phases: phase-15-surfaces
Affects-specs: specs/decisions/0034-encryption-is-a-substrate-concern.md
Detail: The owner chose both transports, with the cost stated at decision time. The
cost is real and worth writing down plainly: **engram's security story has been
structural** — there is nothing to attack because nothing listens, nothing
authenticates, and nothing leaves the machine. A stdio server preserves that, being
local IPC with no socket. An HTTP server does not.

ADR-0034 does not leave the sequencing to judgement: *"If engram ever gains a network
call — telemetry, a hosted index, a sync service — this section must be revisited
first."* So **ADR-0041 lands in Group 0, before any HTTP code exists**. That ordering
is the point — an amendment written afterwards documents whatever was built, whereas
one written first forces the constraints to be chosen before there is code shaped
around their absence. Three constraints follow: opt-in only, `127.0.0.1` by default,
and a startup warning naming the exposed root. ADR-0030's answer to the private-vault
problem is that it is a separate repository the agent has no reason to be in, and a
server started in the wrong directory defeats that silently; the warning is what makes
it observable.

---

### [DECISION] 2026-08-12 — Engram does not execute skills, so they are MCP prompts
Topics: skills, mcp, architecture
Affects-phases: phase-15-surfaces
Affects-specs: specs/architecture/v2-overview.md#6-skills
Detail: v2-overview §6 is explicit that a skill is *instructions, never code* — it can
only sequence the seven operations and can never add an eighth. So there is **no skill
interpreter to build**: engram discovers, validates and exposes, and the agent follows
the instructions. This is the same shape as Phase 10's finding that engram cannot
extract relations, and it shrinks the phase the same way.

MCP distinguishes **tools** (things the server does) from **prompts** (instructions
the client follows), so operations become tools and skills become prompts. §11 says
"skills as tools", but exposing a skill as a callable tool would imply engram executes
it — engram would have to either interpret the skill or misrepresent what the call
does. Mapping them to prompts makes the protocol assert the same thing the
architecture does, and is additive to reverse if a client ever needs a tool surface.

---

### [DECISION] 2026-08-12 — Adapters emit pointers, not command surfaces
Topics: adapters, agents-md, drift
Affects-phases: phase-15-surfaces
Affects-specs: specs/decisions/0011-adapters-converge-on-agents-md.md
Detail: ADR-0011 describes v1's adapter layer in detail — `.claude/commands/`,
`.codex/prompts/`, `.antigravity/commands/` rendered from a shared definition set. That
design predates both MCP and a generated `AGENTS.md`. Per-agent command surfaces
existed to reach v1's operations; MCP is that surface now, and `AGENTS.md` is the
contract. Rebuilding them would duplicate both, and **every duplicated command is a
second place the contract can drift** — the Phase 9 codec failure in a new costume.

So an adapter is a descriptor: a name and the path of its native instructions file,
emitting a pointer and no contract content. Claude Code gets `CLAUDE.md` pointing at
`AGENTS.md`, because it looks for that filename and would otherwise not find the
contract at all. ADR-0011's actual decision — convergence on `AGENTS.md` — is honoured
more completely by this than by its own implementation section.

---

### [NOTE] 2026-08-12 — FEAT-004 corrected against code, not documents
Topics: backlog, verification, rule-12
Affects-phases: phase-15-surfaces
Affects-specs: specs/backlog/backlog.md
Detail: FEAT-004 (guardrails) is marked `open` but shipped in v0.9.0 — six rules, both
preventive and detective halves, 30 tests. Corrected in Group 0 **against the shipped
code**, which matters because the same row-versus-reality gap is exactly how BUG-002
stayed wrong: it was marked `resolved` earlier in this session on the strength of a
status document, when the registry showed the release had never published. A backlog
row is a claim; the artifact is the evidence.

---

### [DISCOVERY] 2026-08-12 — Two dead runtime dependencies were shipping to every installer
Topics: dependencies, packaging, clean-room
Affects-phases: phase-15-surfaces, phase-8-core
Affects-specs: none
Detail: `commander` and `yaml` sat in `dependencies` and were installed by everyone
who installed engram. Neither has been imported by a single file since Phase 8's
clean-room rewrite, which deliberately hand-rolled both the argument parsing and a
small YAML subset — the latter recorded at the time on the grounds that OKF
frontmatter is flat, so a full engine carried far more surface than the format uses.

The rewrite deleted every consumer and never touched the manifest. Found by grepping
`src/` at Phase 15 start rather than reading `package.json`, which is the same
distinction that let BUG-002 stay wrong for five weeks: a manifest is a claim, the
imports are the evidence. Removed, and engram now has **zero runtime dependencies** —
which is worth stating as a property rather than an accident, given how much of the
architecture rests on the tool being disposable (ADR-0039) and the vault depending on
nothing above a directory of files. Filed and closed as TD-005.

---
