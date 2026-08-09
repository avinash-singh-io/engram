export interface Gate1Prompt {
  id: string;
  text: string;
  ts: string;
  session: string;
  root: string;
}

export function isHumanPrompt(record: unknown): boolean;

export function normalizeText(text: string): string;

export function extractFromLines(lines: string[], opts: { rootId: string }): Gate1Prompt[];
