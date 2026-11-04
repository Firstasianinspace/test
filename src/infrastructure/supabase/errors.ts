import { DomainError, type DomainErrorCode } from '@/domain/shared/DomainError';

const BY_SQLSTATE: Record<string, DomainErrorCode> = {
  CRF01: 'forbidden',
  CRT01: 'invalid_transition',
  CRC01: 'comment_required',
  CRA01: 'assignee_required',
  CRV01: 'invalid_assignee',
  CRN01: 'not_found',
  '23503': 'has_dependents',
  '42501': 'forbidden',
  PGRST116: 'not_found',
};

export interface PostgrestLikeError {
  readonly code?: string;
  readonly message: string;
}

export function toDomainError(error: PostgrestLikeError): DomainError {
  const code = (error.code !== undefined ? BY_SQLSTATE[error.code] : undefined) ?? 'unknown';
  return new DomainError(code, error.message);
}
