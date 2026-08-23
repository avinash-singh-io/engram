/**
 * Terminal prompts for `engram init`.
 *
 * **This lives in the CLI layer on purpose, and `ops/init.ts` knows nothing about
 * it.** The same `init` runs over MCP, where there is no human on stdin — an
 * operation that prompted would hang an agent forever waiting on input that never
 * arrives. So the CLI gathers answers first and calls a function that only ever
 * takes resolved values.
 *
 * Every function here is a no-op without a TTY. Piped input, CI and any
 * non-interactive caller fall straight through to the caller's default, so
 * `engram init < /dev/null` behaves exactly as it did before prompts existed.
 */

import { createInterface } from 'node:readline/promises';

/** True only when a human is actually at a terminal on both ends. */
export function interactive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

export interface Choice {
  id: string;
  label: string;
  hint: string;
}

/**
 * Ask the human to pick one option, showing what each means.
 *
 * Returns `fallback` unchanged when not interactive, on an empty answer, or on
 * anything unrecognised — a prompt that misreads an answer as a choice is worse
 * than one that was never asked.
 */
export async function choose(
  question: string,
  choices: Choice[],
  fallback: string,
): Promise<string> {
  if (!interactive() || choices.length === 0) return fallback;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write(`\n${question}\n\n`);
    choices.forEach((c, i) => {
      const mark = c.id === fallback ? ' (default)' : '';
      process.stdout.write(`  ${i + 1}. ${c.label}${mark}\n     ${c.hint}\n`);
    });

    const answer = (await rl.question(`\nChoose 1-${choices.length} [${fallback}]: `)).trim();
    if (answer === '') return fallback;

    const byNumber = choices[Number(answer) - 1];
    if (byNumber !== undefined) return byNumber.id;

    const byName = choices.find((c) => c.id === answer.toLowerCase());
    return byName?.id ?? fallback;
  } finally {
    rl.close();
  }
}

/** A yes/no question. Anything but an explicit yes is a no. */
export async function confirm(question: string, fallback = false): Promise<boolean> {
  if (!interactive()) return fallback;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question} [y/N]: `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}
