import { findVaultRoot } from '../vault/paths';

/** A command-level error carrying an intended process exit code. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly code = 2,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

/** Throw a CliError (caught at the CLI boundary and turned into an exit code). */
export function fail(message: string, code = 2): never {
  throw new CliError(message, code);
}

/** Run a command action, converting CliError into stderr + a non-zero exit code. */
export async function runCommand(action: () => void | Promise<void>): Promise<void> {
  try {
    await action();
  } catch (e) {
    if (e instanceof CliError) {
      process.stderr.write(`engram: ${e.message}\n`);
      process.exitCode = e.code;
    } else {
      throw e;
    }
  }
}

/** Read all of stdin to a string. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

/** kebab-case slug for filenames, bounded length. */
export function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  return s || 'note';
}

/** ISO-8601 timestamp without milliseconds (matches the OKF fixture convention). */
export function isoTimestamp(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Filesystem-safe timestamp prefix for inbox filenames. */
export function fileStamp(date = new Date()): string {
  return date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

export function parseTags(csv?: string): string[] {
  return (csv ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Resolve the vault root or throw a CliError with guidance. */
export function requireVaultRoot(cwd = process.cwd()): string {
  const root = findVaultRoot(cwd);
  if (!root) fail('not inside a vault — run `engram init` first.', 1);
  return root;
}
