export type DomainErrorCode =
  | 'forbidden'
  | 'not_found'
  | 'invalid_transition'
  | 'comment_required'
  | 'assignee_required'
  | 'invalid_assignee'
  | 'validation'
  | 'has_dependents'
  | 'unauthenticated'
  | 'unknown';

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
