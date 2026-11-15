/** MAJOR.MINOR.PATCH contract versions and rule R-17 (docs/CONTRACTS.md §0 in knowhere-nexus). */
export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

const SEMVER_RE = /^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$/;

export function parseVersion(s: unknown): Version | undefined {
  if (typeof s !== 'string') return undefined;
  const m = SEMVER_RE.exec(s);
  if (!m) return undefined;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function versionString(v: Version): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

/** strict: a version Prism fully knows (unknown fields are errors). pruned: a newer MINOR. */
export type ValidationMode = 'strict' | 'pruned';

export interface Support {
  readonly major: number;
  readonly minor: number;
}

/** R-17: same MAJOR required; MINOR <= known is strict; newer MINOR is pruned, then strict. */
export function modeFor(sup: Support, v: Version): ValidationMode | undefined {
  if (v.major !== sup.major) return undefined;
  return v.minor <= sup.minor ? 'strict' : 'pruned';
}
