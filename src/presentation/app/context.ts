import { createContext, useContext } from 'react';
import type { buildUseCases } from './buildUseCases';

export type UseCases = ReturnType<typeof buildUseCases>;

export const UseCasesContext = createContext<UseCases | null>(null);

export function useUseCases(): UseCases {
  const v = useContext(UseCasesContext);
  if (!v) throw new Error('AppProviders missing');
  return v;
}
