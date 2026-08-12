#!/usr/bin/env node
/**
 * engram CLI — Phase 8 ships `capture` and `link` (roadmap, v0.7.0).
 *
 * `format` is Phase 10 (ADR-0033), `recall` is Phase 11, `reindex` and `doctor`
 * are Phase 9. Each surface is a thin translation of the same operations, which
 * is the test that ADR-0024's tiering is real rather than decorative.
 */
import { capture } from './ops/capture.js';
import { link } from './ops/link.js';
import { nodeFileStore, systemClock } from './substrate/index.js';

const USAGE = `engram — a notes system where the organizing work is done by an agent

usage:
  engram capture [text]          persist raw content to the inbox; never rejects
  engram link <file> <to> <kind> assert a typed relation (supersedes | sources)

options:
  --vault <dir>   vault root (default: cwd)
  --by <who>      who is asserting (default: $USER)
`;

function flag(argv: string[], name: string, fallback: string): string {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || argv[i + 1] === undefined ? fallback : argv[i + 1]!;
}

const stripFlags = (argv: string[]): string[] => {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i]!.startsWith('--')) {
      i++;
      continue;
    }
    out.push(argv[i]!);
  }
  return out;
};

/** Reads stdin when it is piped; returns '' for an interactive terminal. */
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const root = flag(argv, 'vault', process.cwd());
  const by = flag(argv, 'by', process.env.USER ?? 'unknown');
  const [command, ...rest] = stripFlags(argv);

  const files = nodeFileStore(root);
  const clock = systemClock();

  switch (command) {
    case 'capture': {
      const content = rest.length > 0 ? rest.join(' ') : await readStdin();
      const { path, bytes } = await capture(content, { files, clock });
      process.stdout.write(`captured ${bytes} bytes -> ${path}\n`);
      return 0;
    }
    case 'link': {
      const [file, to, kind] = rest;
      if (file === undefined || to === undefined || kind === undefined) {
        process.stderr.write('usage: engram link <file> <to> <kind>\n');
        return 2;
      }
      const result = await link(file, to, kind, { files, clock, by });
      if (result.outcome === 'rejected') {
        process.stderr.write(`rejected [${result.rule}]: ${result.reason}\n`);
        return 1;
      }
      for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
      process.stdout.write(`${result.edge.from} --${result.edge.kind}--> ${result.edge.to}\n`);
      return 0;
    }
    case undefined:
    case 'help':
    case '--help':
      process.stdout.write(USAGE);
      return 0;
    default:
      process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
      return 2;
  }
}

// Run only when invoked directly, so tests can import `main` freely.
if (process.argv[1]?.endsWith('cli.js') === true) {
  main().then((code) => process.exit(code));
}
