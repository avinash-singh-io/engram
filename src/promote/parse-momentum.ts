/**
 * Parse a momentum artifact from plain text — an ADR or a history/learning
 * entry. Engram reads momentum files as text only; it never imports momentum
 * code or its SDK (ADR-0001 no-runtime-coupling, ADR-0012). The parser is a
 * tolerant heuristic: anything it cannot recognize still yields a usable
 * artifact so the downstream validate-before-write gate can reject bad mappings.
 */

export type MomentumKind = 'adr' | 'learning';

/** One `## Heading` block of an ADR, heading text + trimmed body. */
export interface MomentumSection {
  heading: string;
  body: string;
}

export interface MomentumArtifact {
  kind: MomentumKind;
  /** ADR number (e.g. '0001') when the title carries one; undefined otherwise. */
  id?: string;
  title: string;
  /** `YYYY-MM-DD` when found in the source. */
  date?: string;
  status?: string;
  deciders?: string;
  /** momentum `Topics:` seeds (learning entries); empty for a bare ADR. */
  topics: string[];
  /** `## Decision` section body (ADR) when present. */
  decision?: string;
  /** `Detail:` text (learning entry) when present. */
  detail?: string;
  /** Ordered `## ` sections — the ADR's structural body. */
  sections: MomentumSection[];
  /** Short human reference, e.g. `ADR-0001` or `[DECISION] 2026-07-03`. */
  sourceRef: string;
}

const LEARNING_HEADER = /^#{0,6}\s*\[([A-Za-z_]+)\]\s+(\d{4}-\d{2}-\d{2})\s*[—–-]\s*(.+?)\s*$/m;
const ADR_TITLE = /^#\s+(.+?)\s*$/m;
const ADR_NUMBERED_TITLE = /^(\d{1,4})\s*[—–-]\s+(.+)$/;

function normalize(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function firstMatch(text: string, re: RegExp): string | undefined {
  const m = re.exec(text);
  return m?.[1]?.trim();
}

/** Split everything after the front-matter/title into ordered `## ` sections. */
function splitSections(text: string): MomentumSection[] {
  const sections: MomentumSection[] = [];
  let current: MomentumSection | null = null;
  for (const line of text.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1] ?? '', body: '' };
    } else if (current) {
      current.body += current.body ? `\n${line}` : line;
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ heading: s.heading, body: s.body.trim() }));
}

/** Collect a `Detail:` value across wrapped lines to the next blank/`---`/heading/EOF. */
function extractDetail(text: string): string | undefined {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^Detail:/.test(l));
  if (start === -1) return undefined;
  const collected = [(lines[start] ?? '').replace(/^Detail:\s*/, '')];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.trim() === '' || line.trim() === '---' || /^#/.test(line)) break;
    collected.push(line);
  }
  const detail = collected.join(' ').replace(/\s+/g, ' ').trim();
  return detail || undefined;
}

function parseLearning(text: string): MomentumArtifact | null {
  const header = LEARNING_HEADER.exec(text);
  if (!header) return null;
  const [, type = 'NOTE', date, title = 'Untitled learning'] = header;

  const topicsLine = firstMatch(text, /^Topics:\s*(.+)$/m);
  const topics = (topicsLine ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const detail = extractDetail(text);

  return {
    kind: 'learning',
    title: title.trim(),
    date,
    topics,
    detail,
    sections: [],
    sourceRef: `[${type.toUpperCase()}] ${date}`,
  };
}

function parseAdr(text: string): MomentumArtifact {
  const rawTitle = firstMatch(text, ADR_TITLE) ?? 'Untitled decision';
  const numbered = ADR_NUMBERED_TITLE.exec(rawTitle);
  const id = numbered ? String(numbered[1]).padStart(4, '0') : undefined;
  const title = numbered ? (numbered[2] ?? rawTitle).trim() : rawTitle;

  const status = firstMatch(text, /^>\s*\*\*Status\*\*:\s*(.+?)\s*$/m);
  const deciders = firstMatch(text, /^>\s*\*\*Deciders\*\*:\s*(.+?)\s*$/m);
  const dateLine = firstMatch(text, /^>\s*\*\*Date\*\*:\s*(.+?)\s*$/m);
  const date = dateLine?.match(/\d{4}-\d{2}-\d{2}/)?.[0];

  const sections = splitSections(text);
  const decision = sections.find((s) => s.heading.toLowerCase() === 'decision')?.body;

  return {
    kind: 'adr',
    id,
    title,
    date,
    status,
    deciders,
    topics: [],
    decision,
    sections,
    sourceRef: id ? `ADR-${id}` : `decision "${title}"`,
  };
}

/**
 * Parse a momentum artifact. A `[TYPE] DATE — title` header selects the learning
 * path; everything else is treated as an ADR-shaped document.
 */
export function parseMomentum(text: string): MomentumArtifact {
  const normalized = normalize(text);
  return parseLearning(normalized) ?? parseAdr(normalized);
}
