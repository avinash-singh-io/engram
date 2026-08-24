// momentum enforcement plugin for opencode.
//
// Installed by momentum init/upgrade --agent opencode into
// .opencode/plugins/momentum.js — auto-loaded by opencode at startup.
//
// One plugin, three hooks — the opencode-native equivalent of the shell
// hooks the other adapters wire (core/scripts/brainstorm-gate.sh,
// check-history-reminder.sh, sessionstart-handoff.sh). Reads the same
// .momentum/ sentinels, so enforcement semantics are identical across
// platforms:
//
//   tool.execute.before  — brainstorm gate: while .momentum/brainstorm-active
//                          exists, write-class tools targeting specs/** throw
//                          (throwing blocks the tool call).
//   tool.execute.after   — history reminder: meaningful edits during phase
//                          work prompt for a history.md append (Rule 8);
//                          bash tool calls additionally delegate to the
//                          installed scripts/check-history-reminder.sh,
//                          which also feeds the ecosystem session log
//                          (commit / pr events — ENH-058).
//   event (session.created) — session banners: delegates to the installed
//                          scripts/sessionstart-handoff.sh (ecosystem
//                          context + handoff inbox, same output as every
//                          other adapter); pure-JS handoff fallback when
//                          the script is absent. TUI/serve sessions only;
//                          see the run-mode note below.
//
// Node builtins only, no npm dependencies. The ecosystem behaviors reuse the
// SAME installed shell scripts the other adapters wire (scripts/ self-guard
// and no-op outside ecosystems), so semantics stay identical across
// platforms. Fail-open by design: any unexpected error in reminder/banner
// paths is swallowed; only the gate throws, and only on a confirmed
// specs/-write during an active brainstorm.

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const WRITE_TOOLS = new Set(["write", "edit", "patch"])
const REMINDER_THROTTLE_MS = 30 * 60 * 1000 // one nudge per 30 min
const SCRIPT_TIMEOUT_MS = 3000

// Run an installed momentum hook script (scripts/<name>) with the canonical
// JSON hook payload on stdin. Returns trimmed combined output, or null when
// the script is missing/failed — callers treat null as "nothing to show".
function runInstalledScript(root, name, payload) {
  try {
    const script = path.join(root, "scripts", name)
    if (!fs.existsSync(script)) return null
    const r = spawnSync("bash", [script], {
      cwd: root,
      input: payload ? JSON.stringify(payload) : "",
      encoding: "utf8",
      timeout: SCRIPT_TIMEOUT_MS,
      env: { ...process.env, MOMENTUM_PROJECT_DIR: root },
    })
    if (r.error) return null
    const out = `${r.stdout || ""}${r.stderr || ""}`.trim()
    return out.length ? out : ""
  } catch {
    return null
  }
}

function extractTargetPath(tool, args) {
  if (!args || typeof args !== "object") return null
  if (typeof args.filePath === "string") return args.filePath
  if (typeof args.path === "string") return args.path
  if (tool === "bash" && typeof args.command === "string") {
    // Mirror brainstorm-gate.sh's shell heuristic: first specs/ path in the
    // command (catches `> specs/...`, `sed -i ... specs/...`, `tee specs/...`).
    const m = args.command.match(/specs\/[^\s"'\\]+/)
    return m ? m[0] : null
  }
  return null
}

function isUnderSpecs(root, targetPath) {
  const abs = path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath)
  const rel = path.relative(path.join(root, "specs"), abs)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

export const MomentumPlugin = async ({ directory, worktree }) => {
  const root = worktree || directory || process.cwd()
  const momentumDir = path.join(root, ".momentum")

  // tool.execute.after does NOT carry tool args (confirmed live, Phase 22 G5)
  // — only the before hook sees them. Correlate by callID so the reminder
  // knows which path a completed write touched. Bounded: entries are removed
  // at after-time; the cap guards sessions whose after hooks never fire.
  const pendingWrites = new Map()
  const pendingBash = new Map()
  const PENDING_CAP = 512

  const remember = (map, key, value) => {
    if (map.size >= PENDING_CAP) map.delete(map.keys().next().value)
    map.set(key, value)
  }

  return {
    "tool.execute.before": async (input, output) => {
      const tool = (input && input.tool) || ""
      if (!WRITE_TOOLS.has(tool) && tool !== "bash") return
      const target = extractTargetPath(tool, output && output.args)
      if (target && WRITE_TOOLS.has(tool) && input && input.callID) {
        remember(pendingWrites, input.callID, target)
      }
      if (tool === "bash" && input && input.callID) {
        const command = output && output.args && output.args.command
        if (typeof command === "string") remember(pendingBash, input.callID, command)
      }
      if (!fs.existsSync(path.join(momentumDir, "brainstorm-active"))) return
      if (!target) return // fail-open when no path is extractable
      if (isUnderSpecs(root, target)) {
        throw new Error(
          [
            "[brainstorm-gate] Blocked: cannot write to specs/ during active brainstorm.",
            `[brainstorm-gate] Path: ${target}`,
            "[brainstorm-gate] The conversation IS the draft. Get explicit user approval, then:",
            "[brainstorm-gate]   rm .momentum/brainstorm-active",
            "[brainstorm-gate] and retry the write.",
          ].join("\n"),
        )
      }
    },

    "tool.execute.after": async (input, output) => {
      try {
        const tool = (input && input.tool) || ""
        // Bash completions delegate to the installed reminder script, which
        // also appends commit/pr events to the ecosystem session log
        // (ENH-058). The script self-guards: instant no-op outside
        // ecosystems and for non-matching commands.
        if (tool === "bash") {
          let command = input && input.callID ? pendingBash.get(input.callID) : undefined
          if (input && input.callID) pendingBash.delete(input.callID)
          if (!command && output && output.args) command = output.args.command
          if (typeof command !== "string" || !command) return
          const out = runInstalledScript(root, "check-history-reminder.sh", {
            tool_name: "Bash",
            tool_input: { command },
          })
          if (out) console.log(out)
          return
        }
        if (!WRITE_TOOLS.has(tool)) return
        // Args live only in the before hook — recover the path via callID
        // (fallback to output.args for synthetic/direct invocations).
        let target = input && input.callID ? pendingWrites.get(input.callID) : undefined
        if (input && input.callID) pendingWrites.delete(input.callID)
        if (!target) target = extractTargetPath(tool, output && output.args)
        if (!target) return
        // Edits to the spec layer ARE the tracking — only code/doc edits
        // outside specs/ and .momentum/ warrant a history nudge.
        if (isUnderSpecs(root, target)) return
        const rel = path.relative(root, path.isAbsolute(target) ? target : path.join(root, target))
        if (rel.startsWith(".momentum")) return

        const stampFile = path.join(momentumDir, "history-reminder-stamp")
        const now = Date.now()
        try {
          const last = fs.statSync(stampFile).mtimeMs
          if (now - last < REMINDER_THROTTLE_MS) return
        } catch {
          /* no stamp yet — proceed */
        }
        fs.mkdirSync(momentumDir, { recursive: true })
        fs.writeFileSync(stampFile, String(now))
        console.log(
          "[momentum] Meaningful edit landed — if this completes a decision, discovery, or " +
            "scope change, append a history entry to your phase's history.md (Rule 8). " +
            "Resolve your phase from the current branch (Rule 15).",
        )
      } catch {
        /* reminder is best-effort; never disturb the session */
      }
    },

    // Handoff banner. Session events reach plugins ONLY via the generic
    // `event` bus in opencode 1.17.x — a named "session.created" hook key
    // never fires (live-verified, Phase 22 follow-up). The event handler is
    // registered conditionally: its mere presence HANGS `opencode run`
    // non-interactive mode (reproduced on 1.17.13), and a session-start
    // banner is meaningless there anyway — so run-mode skips it.
    ...(process.argv.includes("run")
      ? {}
      : {
          event: async ({ event }) => {
            try {
              if (!event || event.type !== "session.created") return
              // Preferred path (ENH-058): the installed script prints BOTH
              // banners — ecosystem context (parent-walk + sibling-scan) and
              // the handoff inbox — with the same output every other adapter
              // shows. Non-TTY stdin keeps it prompt-free.
              const banners = runInstalledScript(root, "sessionstart-handoff.sh", null)
              if (banners !== null) {
                if (banners) console.log(banners)
                return
              }
              // Fallback (script not installed): pure-JS handoff banner.
              const inboxDir = path.join(momentumDir, "inbox")
              if (!fs.existsSync(inboxDir)) return
              const pending = fs
                .readdirSync(inboxDir)
                .filter((f) => /^handoff-\d+\.md$/.test(f))
                .sort()
              if (pending.length === 0) return
              console.log(
                `[momentum] ${pending.length} pending handoff(s) in .momentum/inbox/: ` +
                  `${pending.join(", ")} — run /continue (or \`momentum continue\`) to pick up.`,
              )
            } catch {
              /* banner is best-effort; never disturb the session */
            }
          },
        }),
  }
}
