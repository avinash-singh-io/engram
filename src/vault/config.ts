import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** OKF version this Engram build targets. */
export const OKF_VERSION = '0.1';

export interface EngramConfig {
  okf_version: string;
  /** Extra directory names to skip during concept enumeration. */
  ignore: string[];
}

const CONFIG_REL = join('.engram', 'config.json');

export function defaultConfig(): EngramConfig {
  return { okf_version: OKF_VERSION, ignore: [] };
}

export function configPath(vaultRoot: string): string {
  return join(vaultRoot, CONFIG_REL);
}

export function loadConfig(vaultRoot: string): EngramConfig {
  const p = configPath(vaultRoot);
  if (!existsSync(p)) return defaultConfig();
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as Partial<EngramConfig>;
    return { ...defaultConfig(), ...parsed, ignore: parsed.ignore ?? [] };
  } catch {
    return defaultConfig();
  }
}

export function writeConfig(vaultRoot: string, config: EngramConfig): void {
  const p = configPath(vaultRoot);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(config, null, 2)}\n`);
}
