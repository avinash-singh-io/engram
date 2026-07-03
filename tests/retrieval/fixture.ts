import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the locked recall-v1 fixture vault (Rule 11 — do not mutate). */
export const FIXTURE_VAULT = join(here, '..', 'benchmarks', 'recall-v1', 'vault');

/** Absolute path to the recall-v1 source modules (for the metric-integrity test). */
export const RETRIEVAL_SRC = join(here, '..', '..', 'src', 'retrieval');
