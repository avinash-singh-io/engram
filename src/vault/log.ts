import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileManaged } from './write';

export interface LogEntry {
  /** Bold verb, e.g. Added / Refined / Linked / Updated / Captured. */
  action: string;
  title: string;
  /** Absolute-bundle-relative link to the concept. */
  link: string;
  /** Defaults to now (UTC). Injectable for deterministic tests. */
  date?: Date;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Insert `line` newest-first under a `## YYYY-MM-DD` heading. Pure. */
export function renderLog(existing: string, day: string, line: string): string {
  const lines = existing.replace(/\r\n/g, '\n').replace(/\s+$/, '').split('\n');
  const heading = `## ${day}`;
  const hIdx = lines.findIndex((l) => l.trim() === heading);

  if (hIdx !== -1) {
    let insertAt = hIdx + 1;
    if (lines[insertAt] === '') insertAt++;
    lines.splice(insertAt, 0, line);
  } else {
    let at = 0;
    if (lines[0]?.startsWith('# ')) {
      at = 1;
      while (lines[at] === '') at++;
    }
    lines.splice(at, 0, heading, '', line, '');
  }
  return `${lines.join('\n').replace(/\s+$/, '')}\n`;
}

/** Append an entry to the vault's `log.md` (append-only, newest-first — Principle 6). */
export function appendLog(vaultRoot: string, entry: LogEntry): void {
  const logPath = join(vaultRoot, 'log.md');
  const day = isoDate(entry.date ?? new Date());
  const line = `- **${entry.action}** [${entry.title}](${entry.link})`;
  const existing = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '# Log\n';
  writeFileManaged(logPath, renderLog(existing, day, line));
}
