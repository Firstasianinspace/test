import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { buildUseCases } from './buildUseCases';
import { UseCasesContext } from './context';

export function AppProviders({ children }: { children: ReactNode }) {
  const [useCases] = useState(buildUseCases);
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <UseCasesContext.Provider value={useCases}>{children}</UseCasesContext.Provider>
    </QueryClientProvider>
  );
}
