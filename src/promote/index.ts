/**
 * Promote bridge — import a momentum ADR/learning as a one-way OKF `Reference`
 * concept (ADR-0011). Reads momentum artifacts by file path only; no momentum
 * code or SDK dependency (ADR-0001).
 */
export { parseMomentum } from './parse-momentum';
export type { MomentumArtifact, MomentumKind, MomentumSection } from './parse-momentum';
export { rewriteLinks, toConcept } from './to-concept';
export type { RenderedConcept, ToConceptOptions } from './to-concept';
export { promoteMomentum } from './promote';
export type { PromoteInput, PromoteResult } from './promote';
