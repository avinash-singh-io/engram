/** Deterministic, idempotent index generation (ADR-0006). */
export { generateIndex } from './generate';
export type { GenerateIndexInput, IndexConcept, IndexChild } from './generate';
export { reindex, computeIndexes } from './reindex';
export type { ReindexOptions, ReindexResult } from './reindex';
