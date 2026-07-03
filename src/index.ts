/**
 * Engram — OKF-native knowledge base library entry point.
 *
 * Phase 0 exposes the format core (validation + concept-ID resolution).
 * Vault scaffolding, indexing, and retrieval arrive in later phases.
 */
export { VERSION } from './version';
export * from './format';
export * from './vault';
export * from './indexer';
export * from './hooks';
export * from './adapters';
export * from './editors';
export * from './retrieval';
export * from './promote';
export * from './migrate';
