/**
 * Parse the Claude Code PostToolUse stdin JSON and extract written file path(s).
 * Tolerant by design: unknown shapes yield an empty path list (no-op), never throw.
 */
export interface HookPayload {
  toolName?: string;
  filePaths: string[];
  cwd?: string;
}

export function parseHookPayload(json: string): HookPayload {
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object') return { filePaths: [] };
    data = parsed as Record<string, unknown>;
  } catch {
    return { filePaths: [] };
  }

  const paths = new Set<string>();
  const input = (data.tool_input ?? {}) as Record<string, unknown>;
  for (const key of ['file_path', 'notebook_path', 'path']) {
    const v = input[key];
    if (typeof v === 'string' && v.length > 0) paths.add(v);
  }

  return {
    toolName: typeof data.tool_name === 'string' ? data.tool_name : undefined,
    filePaths: [...paths],
    cwd: typeof data.cwd === 'string' ? data.cwd : undefined,
  };
}
