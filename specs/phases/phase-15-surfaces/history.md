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

### [DISCOVERY] 2026-08-12 — The shorthand guardrail form silently produced no guardrails
Topics: skills, guardrails, parsing, security
Affects-phases: phase-15-surfaces
Affects-specs: none
Detail: `guardrails: [require-sources]` — the exact shorthand v2-overview §6's own
example uses — parsed to *nothing*. `Array.isArray` is also `typeof 'object'`, so
testing for an object first swallowed the list form and returned a config with no
`enabled` key. A skill asking to be constrained would have run unconstrained.

That is the worst shape this bug could take: **silent loosening**. A skill that fails
to load is visible; a skill that loads with its safety declarations quietly dropped is
not, and the whole point of `tighten()` is that a downloaded skill cannot widen its
own permissions. Caught by writing the test from §6's example rather than from the
implementation. A second, smaller version of the same problem followed: `rateLimit: 3`
arrived as the string `'3'`, because the Phase 8 YAML subset deliberately does not
coerce numbers — it cannot, since `okf_version: 0.2` must stay a string or
`detectVersion` stops recognising it. Coerced at the consumer instead of widening the
parser and breaking the format layer.

---

### [DECISION] 2026-08-12 — JSON-RPC implemented directly, keeping zero dependencies
Topics: mcp, dependencies, protocol
Affects-phases: phase-15-surfaces
Affects-specs: none
Detail: The MCP TypeScript SDK was the obvious choice and was not taken. The surface
engram needs is five methods — `initialize`, `tools/list`, `tools/call`,
`prompts/list`, `prompts/get` — over JSON-RPC 2.0, which is roughly 80 lines. Group 0
had just removed `commander` and `yaml` to reach **zero runtime dependencies**, and
adding an SDK plus its tree back in the next group to avoid writing those 80 lines
would have been a poor trade for a tool whose pitch is that it depends on nothing.

The counter-argument is real and worth recording: MCP is an evolving protocol, and a
hand-rolled implementation can drift from it in ways an SDK would absorb. The
mitigation is that the protocol version is a single exported constant and the whole
surface is one `handle()` function with a test that drives a genuine client exchange
over paired streams — so drift shows up as a failing handshake rather than a silent
incompatibility. If the protocol moves faster than that stays cheap, taking the SDK
is a contained change.

---

### [ARCH_CHANGE] 2026-08-12 — One `handle()`, two transports, and the constraints are tested
Topics: mcp, transport, adr-0041, security
Affects-phases: phase-15-surfaces
Affects-specs: specs/architecture/v2-overview.md#11-surfaces
Detail: `mcp.ts` holds the protocol and no transport; `mcp-transport.ts` holds both
transports and no protocol. That split is what lets a test prove stdio and HTTP serve
the same tools — a real `fetch` against a live server, compared with a real stdio
exchange — rather than asserting it in a comment.

ADR-0041's three constraints each got a test rather than a default, because a default
can be changed by anyone quietly while a tested constraint changes visibly:
the HTTP transport **throws** unless explicitly enabled, binds `127.0.0.1`, and emits
a warning naming the exposed root. The refusal message itself states that engram
listens on nothing by default and that there is no authentication — the moment
someone is about to open the socket is the only moment that information is useful.

---

### [DECISION] 2026-08-12 — A pointer's emptiness is enforced by test, and it explains itself
Topics: adapters, agents-md, drift
Affects-phases: phase-15-surfaces
Affects-specs: specs/decisions/0011-adapters-converge-on-agents-md.md
Detail: An adapter emits a file that says almost nothing: this is an engram vault,
the contract is `AGENTS.md`, read it first. Two things make that hold rather than
merely being the current state.

First, **a test asserts the emptiness**. It takes four real claims from the generated
contract — capture never rejects, engram cannot infer a relationship, a node may be
empty, repair is trivial — checks each appears in `AGENTS.md`, and checks none appears
in any pointer, along with no guardrail name. A pointer that grows content fails.

Second, **the pointer says why it is empty**: "a second copy of the rules is the copy
that goes stale." Without that line the file reads as unfinished, and the natural
instinct on finding an almost-empty `CLAUDE.md` is to helpfully fill it in — which is
precisely the drift the design avoids.

Each descriptor also carries a `why` field explaining what makes that agent need a
pointer at all. Codex is deliberately absent: it reads `AGENTS.md` natively, so a file
for it would exist only to be maintained. The `why` is what stops the list quietly
accumulating those.

---

### [DECISION] 2026-08-12 — The scaffold teaches the constraint rather than just the shape
Topics: skills, cli, onboarding
Affects-phases: phase-15-surfaces
Affects-specs: none
Detail: `engram skill new` produces a file whose Steps section says what a skill
actually is: *"Engram runs none of this — you do. It only checks the operations
exist"*, that `uses:` may name only real operations, that `guardrails:` may tighten
and never loosen, and that every write still passes the gate so a skill cannot exceed
what its author already may do.

That is deliberate. The most likely misunderstanding about skills is that engram
executes them, and the moment someone is authoring one is the moment that
misunderstanding gets built in. A scaffold that showed only the shape would leave
them to discover the constraint by having a skill not do what they expected. An e2e
test asserts the scaffold passes its own validator and loads alongside the built-ins,
because a scaffold that fails validation would be worse than none.

---

### [NOTE] 2026-08-12 — Both transports verified through the built binary
Topics: mcp, verification, adr-0041
Affects-phases: phase-15-surfaces
Affects-specs: none
Detail: Checked against `dist/`, not just the source. A real JSON-RPC handshake piped
into `engram mcp` returned a correct `initialize` result and a `prompts/list`
containing all three skills — including one scaffolded seconds earlier, which is the
end-to-end proof that vault-local discovery reaches the protocol surface.

Both ADR-0041 constraints observed rather than asserted: plain `engram mcp` produced
**no warning and no socket**, and `engram mcp --http` printed the exposure warning
naming the exact root. That distinction matters here more than elsewhere — the whole
argument for HTTP being acceptable rests on it being opt-in, and "opt-in" is a claim
about the built artifact rather than about the source.

---
