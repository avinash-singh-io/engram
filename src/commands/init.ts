import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { ADAPTERS, adapterIds, getAdapter, type Adapter } from '../adapters';
import { assetsRoot, readAsset } from '../assets';
import { reindex } from '../indexer/reindex';
import { defaultConfig, writeConfig } from '../vault/config';
import { writeFileSafe } from '../vault/write';
import { fail, runCommand } from './util';

export interface InitOptions {
  dir?: string;
  force?: boolean;
  agent?: string;
}

export interface InitResult {
  root: string;
  created: string[];
  skipped: string[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Resolve the `--agent` selector to a list of adapters. `all` = every adapter. */
export function resolveAdapters(agent = 'claude'): Adapter[] {
  if (agent === 'all') return adapterIds().map((id) => ADAPTERS[id] as Adapter);
  const adapter = getAdapter(agent);
  if (!adapter) {
    fail(`unknown agent "${agent}" — choose one of: ${[...adapterIds(), 'all'].join(', ')}`);
  }
  return [adapter];
}

/** Deep-merge JSON: objects recurse, arrays append deduped, scalars take incoming. */
export function deepMergeJson(existing: unknown, incoming: unknown): unknown {
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const out = [...existing];
    for (const item of incoming) {
      if (!out.some((e) => JSON.stringify(e) === JSON.stringify(item))) out.push(item);
    }
    return out;
  }
  if (isPlainObject(existing) && isPlainObject(incoming)) {
    const out: Record<string, unknown> = { ...existing };
    for (const key of Object.keys(incoming)) {
      out[key] = key in existing ? deepMergeJson(existing[key], incoming[key]) : incoming[key];
    }
    return out;
  }
  return incoming;
}

export function runInit(opts: InitOptions = {}): InitResult {
  const root = resolve(opts.dir ?? '.');
  const created: string[] = [];
  const skipped: string[] = [];

  const put = (dest: string, content: string, mode: 'skip' | 'merge-json' = 'skip'): void => {
    const abs = join(root, dest);
    if (mode === 'merge-json' && existsSync(abs) && !opts.force) {
      const merged = deepMergeJson(
        JSON.parse(readFileSync(abs, 'utf8')) as unknown,
        JSON.parse(content) as unknown,
      );
      writeFileSafe(abs, `${JSON.stringify(merged, null, 2)}\n`, { force: true });
      created.push(`${dest} (merged)`);
      return;
    }
    (writeFileSafe(abs, content, { force: opts.force }) ? created : skipped).push(dest);
  };

  // Static vault files.
  put('AGENTS.md', readAsset('vault', 'AGENTS.md'));
  put('log.md', readAsset('vault', 'log.md'));
  put('.gitignore', readAsset('vault', 'gitignore'));
  put('.engram/concept.template.md', readAsset('vault', 'concept.template.md'));
  // Setup doc lives under .engram/ so it is not enumerated as a concept.
  put('.engram/obsidian-setup.md', readAsset('obsidian', 'obsidian-setup.md'));
  put('inbox/.gitkeep', '');

  // Tooling config.
  const cfgAbs = join(root, '.engram', 'config.json');
  if (!existsSync(cfgAbs) || opts.force) {
    writeConfig(root, defaultConfig());
    created.push('.engram/config.json');
  } else {
    skipped.push('.engram/config.json');
  }

  // Adapter files (per-agent command surface + any hooks). A file carries either
  // inline `content` (rendered from the shared command set) or a bundled `src`.
  for (const adapter of resolveAdapters(opts.agent)) {
    for (const f of adapter.files(assetsRoot())) {
      const content = f.content ?? readFileSync(f.src as string, 'utf8');
      put(f.dest, content, f.mode === 'merge-json' ? 'merge-json' : 'skip');
    }
  }

  // Generate the root index.md (tool-owned).
  reindex(root);
  created.push('index.md');

  return { root, created, skipped };
}

export function registerInit(program: Command): void {
  program
    .command('init [dir]')
    .description('Scaffold an OKF-conformant vault in [dir] (default: cwd). (Phase 1)')
    .option('--force', 'overwrite existing managed files')
    .option('--agent <id>', `agent adapter to scaffold (${[...adapterIds(), 'all'].join('|')})`, 'claude')
    .action((dir: string | undefined, opts: { force?: boolean; agent?: string }) =>
      runCommand(() => {
        const res = runInit({ dir, force: opts.force, agent: opts.agent });
        process.stdout.write(`engram: initialized vault at ${res.root}\n`);
        for (const f of res.created) process.stdout.write(`  + ${f}\n`);
        for (const f of res.skipped) process.stdout.write(`  · ${f} (exists, skipped)\n`);
      }),
    );
}
