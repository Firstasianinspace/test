import { useUseCases } from '@/presentation/app/context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useSession() {
  const uc = useUseCases();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['me'], queryFn: () => uc.getCurrentUser.execute() });
  return {
    user: query.data ?? null,
    loading: query.isLoading,
    signIn: async (email: string, password: string) => {
      const user = await uc.signIn.execute(email, password);
      qc.setQueryData(['me'], user);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
    signOut: async () => {
      await uc.signOut.execute();
      qc.setQueryData(['me'], null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
  };
}
