/**
 * A line diff, so `engram queue show` is a review rather than a dump.
 *
 * v2-overview §11 describes the CLI half of the approval queue as "a `git`-style
 * review". Printing the proposed file whole would satisfy the letter of that and
 * miss the point: what a human needs to decide is **what changes**, and on a
 * replacement that is usually three lines inside a hundred.
 *
 * Presentation only — no policy lives here. The gate has already decided; this
 * just makes the decision reviewable.
 */

export interface DiffLine {
  sign: ' ' | '-' | '+';
  text: string;
}

/**
 * Beyond this, the quadratic LCS stops being free and a note this large is not
 * being line-reviewed anyway. Falls back to whole-file replacement.
 */
const MAX_LINES = 2000;

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before === '' ? [] : before.split('\n');
  const b = after === '' ? [] : after.split('\n');

  if (a.length > MAX_LINES || b.length > MAX_LINES) {
    return [
      ...a.map((text): DiffLine => ({ sign: '-', text })),
      ...b.map((text): DiffLine => ({ sign: '+', text })),
    ];
  }

  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ sign: ' ', text: a[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ sign: '-', text: a[i]! });
      i++;
    } else {
      out.push({ sign: '+', text: b[j]! });
      j++;
    }
  }
  while (i < n) out.push({ sign: '-', text: a[i++]! });
  while (j < m) out.push({ sign: '+', text: b[j++]! });
  return out;
}

/** Unified-ish rendering, with unchanged runs collapsed. */
export function renderDiff(before: string, after: string, context = 3): string {
  const lines = diffLines(before, after);
  if (lines.every((l) => l.sign === ' ')) return '  (no change)';

  const keep = new Set<number>();
  lines.forEach((l, i) => {
    if (l.sign === ' ') return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) {
      keep.add(k);
    }
  });

  const out: string[] = [];
  let skipping = false;
  lines.forEach((l, i) => {
    if (keep.has(i)) {
      out.push(`${l.sign} ${l.text}`);
      skipping = false;
    } else if (!skipping) {
      out.push('  ...');
      skipping = true;
    }
  });
  return out.join('\n');
}
