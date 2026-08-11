export interface WilsonResult {
  point: number;
  lower: number;
  upper: number;
}

export function wilsonInterval(successes: number, total: number, z?: number): WilsonResult;

export function cohensKappa(a: string[], b: string[]): number;
