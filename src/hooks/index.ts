/** Write-hook engine + PostToolUse payload parsing (ADR-0008). */
export { parseHookPayload } from './payload';
export type { HookPayload } from './payload';
export { runWriteHook } from './write-hook';
export type { HookAction, HookResult } from './write-hook';
