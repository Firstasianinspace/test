import { useUseCases } from '@/presentation/app/context';
import { ErrorText } from '@/presentation/components/ErrorText';
import { StatusBadge } from '@/presentation/components/StatusBadge';
import { useSession } from '@/presentation/hooks/useSession';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export function MyTasksPage() {
  const uc = useUseCases();
  const { user } = useSession();
  const tasks = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => {
      if (!user) throw new Error('no user');
      return uc.listMyTasks.execute(user);
    },
    enabled: user !== null,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Мои задачи</h1>
      <ErrorText error={tasks.error} />
      {tasks.data?.length === 0 && <p className="text-slate-600">Задач нет.</p>}
      <ul className="space-y-2">
        {tasks.data?.map((t) => (
          <li key={t.id}>
            <Link
              to={`/tasks/${t.id}`}
              className="flex items-center justify-between rounded-md border bg-white p-3"
            >
              <span>{t.title}</span>
              <StatusBadge status={t.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
