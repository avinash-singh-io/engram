/** OKF migration — adopt existing Markdown as conformant concepts (ADR-0016). */
export { deriveFrontmatter, firstSentence, tagsFromPath } from './derive';
export type { DeriveOptions } from './derive';
export { convertWikilinks } from './links';
export type { LinkResolver, WikilinkConversion } from './links';
export { planMigration, applyMigration } from './migrate';
export type { MigrationItem, MigrationPlan } from './migrate';
