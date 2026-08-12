#!/usr/bin/env node
/**
 * engram CLI.
 *
 * Each surface is a thin translation of the same operations — the test that
 * ADR-0024's tiering is real rather than decorative. `recall` arrives in Phase 11;
 * skills and MCP in Phase 15.
 */
import { capture } from './ops/capture.js';
import { doctor, formatReport } from './ops/doctor.js';
import { format } from './ops/format.js';
import { init } from './ops/init.js';
import { link } from './ops/link.js';
import { reindex } from './ops/reindex.js';
import { filesystemDetector, nodeFileStore, systemClock } from './substrate/index.js';

const USAGE = `engram — a notes system where the organizing work is done by an agent

usage:
  engram init                    scaffold a vault; non-destructive
  engram capture [text]          persist raw content to the inbox; never rejects
  engram format [text]           content + your structure -> a validated node
  engram link <file> <to> <kind> assert a typed relation (supersedes | sources | part-of)
  engram reindex                 regenerate derived state (index.md, views/)
  engram doctor                  health and integrity report; read-only

options:
  --vault <dir>       vault root (default: cwd)
  --by <who>          who is asserting (default: $USER)
  --structure <name>  init only; engram ships "default"

format options (the agent supplies the structure; engram does not infer it):
  --title <t>         title; the slug is derived from it
  --id <slug>         explicit slug, wins over the title
  --container <c>     files it there, and records a part-of edge
  --supersedes <id>   repeatable
  --sources <id>      repeatable
  --generated         mark as agent-authored rather than human
`;

function flag(argv: string[], name: string, fallback: string): string {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || argv[i + 1] === undefined ? fallback : argv[i + 1]!;
}

/** A flag's value, or undefined when absent — distinct from a default. */
function flagOrUndef(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
}

/** Every occurrence of a repeatable flag. */
function multiFlag(argv: string[], name: string): string[] {
  const out: string[] = [];
  argv.forEach((a, i) => {
    if (a === `--${name}` && argv[i + 1] !== undefined) out.push(argv[i + 1]!);
  });
  return out;
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
    case 'init': {
      try {
        const { created, skipped, reindexed } = await init(
          files,
          clock,
          flag(argv, 'structure', 'default'),
        );
        for (const p of created) process.stdout.write(`created ${p}\n`);
        for (const p of skipped) process.stderr.write(`exists, left alone: ${p}\n`);
        process.stdout.write(`regenerated ${reindexed.length} derived file(s)\n`);
        return 0;
      } catch (e) {
        process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
        return 2;
      }
    }
    case 'reindex': {
      const { written, counts, findings, warnings } = await reindex(files, clock);
      for (const f of findings) process.stderr.write(`warning: ${f.message}\n`);
      for (const w of warnings) process.stderr.write(`warning: ${w}\n`);
      process.stdout.write(
        `${counts.nodes} node(s), ${counts.edges} edge(s) -> ${written.length} derived file(s)\n`,
      );
      return 0;
    }
    case 'doctor': {
      const report = await doctor(files, filesystemDetector(root));
      process.stdout.write(formatReport(report));
      // Warnings never fail: ADR-0021 makes collisions and missing slugs warnings,
      // and a doctor that failed on them would make that decision meaningless.
      return report.failures.length === 0 ? 0 : 1;
    }
    case 'format': {
      const content = rest.length > 0 ? rest.join(' ') : await readStdin();
      const result = await format(
        content,
        {
          by,
          title: flagOrUndef(argv, 'title'),
          id: flagOrUndef(argv, 'id'),
          container: flagOrUndef(argv, 'container'),
          path: flagOrUndef(argv, 'path'),
          supersedes: multiFlag(argv, 'supersedes'),
          sources: multiFlag(argv, 'sources'),
          generated: argv.includes('--generated'),
        },
        { files, clock },
      );
      if (result.outcome === 'rejected') {
        process.stderr.write(`rejected [${result.rule}]: ${result.reason}\n`);
        return 1;
      }
      for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
      process.stdout.write(
        `${result.node.id} -> ${result.node.path}` +
          (result.edges.length > 0 ? ` (${result.edges.length} relation(s))` : '') +
          `\n`,
      );
      return 0;
    }
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
