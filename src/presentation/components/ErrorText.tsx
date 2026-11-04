import { DomainError } from '@/domain/shared/DomainError';
import { ERROR_LABEL } from '@/presentation/labels';

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const text =
    error instanceof DomainError
      ? (ERROR_LABEL[error.code] ?? error.message)
      : 'Что-то пошло не так';
  return (
    <p role="alert" className="text-sm text-red-600">
      {text}
    </p>
  );
}
