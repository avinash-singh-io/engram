/** Vault filesystem layer — root discovery, config, read model, safe writes. */
export { IGNORE_DIRS, findVaultRoot, linkToFsPath, fsPathToLink } from './paths';
export { OKF_VERSION, defaultConfig, configPath, loadConfig, writeConfig } from './config';
export type { EngramConfig } from './config';
export { enumerateConceptFiles, readVault } from './read';
export type { ConceptRecord, VaultModel } from './read';
export { ensureDir, writeFileSafe, writeFileManaged } from './write';
export type { WriteOptions } from './write';
