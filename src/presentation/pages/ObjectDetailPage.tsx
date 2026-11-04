import { useUseCases } from '@/presentation/app/context';
import { ErrorText } from '@/presentation/components/ErrorText';
import { StatusBadge } from '@/presentation/components/StatusBadge';
import { Button } from '@/presentation/components/ui/button';
import { Input, Select, Textarea } from '@/presentation/components/ui/input';
import { useSession } from '@/presentation/hooks/useSession';
import { useSingleFlight } from '@/presentation/hooks/useSingleFlight';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export function ObjectDetailPage() {
  const { id = '' } = useParams();
  const uc = useUseCases();
  const qc = useQueryClient();
  const { user } = useSession();
  const object = useQuery({ queryKey: ['object', id], queryFn: () => uc.getObject.execute(id) });
  const tasks = useQuery({
    queryKey: ['object-tasks', id],
    queryFn: () => uc.listObjectTasks.execute(id),
  });
  const executors = useQuery({
    queryKey: ['executors'],
    queryFn: () => uc.listExecutors.execute(),
    enabled: user?.role === 'manager',
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const once = useSingleFlight();
  const create = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('no user');
      return uc.createTask.execute(
        { title, description, objectId: id, assigneeId: assigneeId || null },
        user,
      );
    },
    onSuccess: async () => {
      setTitle('');
      setDescription('');
      setAssigneeId('');
      await qc.invalidateQueries({ queryKey: ['object-tasks', id] });
    },
  });

  return (
    <div className="space-y-4">
      <Link to="/objects" className="text-sm text-slate-600">
        ← Объекты
      </Link>
      <h1 className="text-xl font-semibold">{object.data?.name}</h1>
      <p className="text-slate-600">{object.data?.address}</p>
      <ErrorText error={object.error ?? tasks.error} />
      <h2 className="font-medium">Задачи</h2>
      {tasks.data?.length === 0 && <p className="text-slate-600">Задач пока нет.</p>}
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
      {user?.role === 'manager' && (
        <form
          className="space-y-2 rounded-md border bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            once((done) => {
              create.mutate(undefined, { onSettled: done });
            });
          }}
        >
          <h2 className="font-medium">Новая задача</h2>
          <Input
            placeholder="Название"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
          <Textarea
            placeholder="Описание"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
          <Select
            aria-label="Исполнитель"
            value={assigneeId}
            onChange={(e) => {
              setAssigneeId(e.target.value);
            }}
          >
            <option value="">Без исполнителя</option>
            {executors.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
          <ErrorText error={create.error} />
          <Button type="submit" disabled={create.isPending}>
            Создать задачу
          </Button>
        </form>
      )}
    </div>
  );
}
