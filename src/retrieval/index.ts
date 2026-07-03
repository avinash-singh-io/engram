/**
 * Engram retrieval layer — the structural, progressive-disclosure navigator
 * (ADR-0005). `RecallResult` + `ReadReport` are the stable exported contract.
 */
export type {
  ReadTier,
  TierStat,
  ReadReport,
  RecallQuery,
  RecallReference,
  RecallResult,
  RecallVia,
  MatchedSection,
} from './types';
export { ReadLedger } from './reader';
export type { BodyRead } from './reader';
export { resolveVaultRoot, rootIndexPath, countConcepts } from './vault-root';
export { parseIndex, isDescentTarget } from './index-parse';
export type { IndexEntry, ParsedIndex } from './index-parse';
export { tokenize, scoreCandidate } from './score';
export type { ScoreFields, ScoreResult } from './score';
export { grepFrontmatter, toFrontmatterMatch } from './scan';
export type { FrontmatterMatch, GrepOptions } from './scan';
export { navigate } from './navigate';
export type { NavigateOptions } from './navigate';
export { renderAgentsContract, writeAgentsContract } from './agents-contract';
export type { WriteContractResult } from './agents-contract';
export { checkIndexQuality } from './index-quality';
export type { IndexQualityReport, IndexQualityIssue, IndexQualitySeverity } from './index-quality';
