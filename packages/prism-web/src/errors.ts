/** Error codes shared with knowhere-nexus (internal/contract/errors.go) and the Kotlin library. */
export const ErrorCodes = {
  tooLarge: 'too_large',
  invalidDocument: 'invalid_document',
  wrongSchema: 'wrong_schema',
  unsupportedVersion: 'unsupported_schema_version',
  schemaViolation: 'schema_violation',
  invalidValue: 'invalid_value',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Maximum number of problems reported for one document. */
export const MAX_PROBLEMS = 20;

export interface PrismError {
  readonly code: ErrorCode;
  readonly problems: readonly string[];
}

export function prismError(code: ErrorCode, ...problems: string[]): PrismError {
  return { code, problems: problems.slice(0, MAX_PROBLEMS) };
}

export function formatError(e: PrismError): string {
  return e.problems.length === 0 ? e.code : `${e.code}: ${e.problems.join('; ')}`;
}

/** Thrown by the throwing helpers (parseTheme / parseThemePack). */
export class PrismValidationError extends Error {
  readonly code: ErrorCode;
  readonly problems: readonly string[];
  constructor(e: PrismError) {
    super(formatError(e));
    this.name = 'PrismValidationError';
    this.code = e.code;
    this.problems = e.problems;
  }
}
