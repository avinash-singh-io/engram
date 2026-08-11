/**
 * gate1 transcript reader — pure functions, no I/O.
 *
 * Throwaway instrument (ADR-0038 parks the durable observation substrate).
 *
 * A stored session records many things under `type: "user"` that are NOT a human
 * prompt. Measured across two real sessions: 189 `type:"user"` records contained
 * only 33 human prompts. Counting naively overstates n by ~5.7x and silently
 * corrupts the Gate 1 denominator, so every exclusion below is load-bearing.
 *
 *   content=array + toolUseResult   -> tool result fed back to the model
 *   isMeta                          -> harness-injected meta turn
 *   isSidechain                     -> a subagent's prompt, not the human's
 *   content=array, no toolUseResult -> attachment-only turn, no prompt text
 */

/**
 * Harness-injected turns that arrive as `type: "user"` but were never typed by
 * anyone. Found in the real corpus: 155 task notifications and 30 command stdout
 * blocks out of 1715 extracted records.
 */
const INJECTED = /^<(task-notification|local-command-stdout|local-command-stderr)[>\s]/;

/**
 * True when a transcript record is a prompt typed by the human.
 * @param {any} record
 * @returns {boolean}
 */
export function isHumanPrompt(record) {
  if (!record || record.type !== 'user') return false;
  if (record.isMeta === true) return false;
  if (record.isSidechain === true) return false;
  if (record.toolUseResult !== undefined) return false;
  if (typeof record.message?.content !== 'string') return false;
  return !INJECTED.test(record.message.content.trim());
}

/**
 * Unwrap a slash-command invocation to what the human actually expressed.
 *
 * A `/command` turn is stored as a wrapper whose `<command-args>` holds the real
 * text. Dropping these wholesale would discard genuine questions — 47 of 56
 * wrappers in the real corpus carry non-empty args.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (!text.includes('<command-name>')) return text.trim();
  const name = text.match(/<command-name>([\s\S]*?)<\/command-name>/)?.[1].trim() ?? '';
  const args = text.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1].trim() ?? '';
  return [name, args].filter(Boolean).join(' ').trim();
}

/**
 * Extract human prompts from the lines of one session file.
 * @param {string[]} lines raw JSONL lines
 * @param {{ rootId: string }} opts
 * @returns {{ id: string, text: string, ts: string, session: string, root: string }[]}
 */
export function extractFromLines(lines, opts) {
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    let record;
    try {
      record = JSON.parse(trimmed);
    } catch {
      continue; // a truncated tail line is not a reason to lose the file
    }
    if (!isHumanPrompt(record)) continue;
    const text = normalizeText(record.message.content);
    if (text === '') continue; // wrapper with neither a name nor args
    out.push({
      id: record.uuid,
      text,
      ts: record.timestamp,
      session: record.sessionId,
      root: opts.rootId,
    });
  }
  return out;
}
