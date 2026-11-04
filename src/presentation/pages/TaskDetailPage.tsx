import type { TaskStatus } from '@/domain/task/TaskStatus';
import { useUseCases } from '@/presentation/app/context';
import { ErrorText } from '@/presentation/components/ErrorText';
import { StatusBadge } from '@/presentation/components/StatusBadge';
import { TaskActions } from '@/presentation/components/TaskActions';
import { Button } from '@/presentation/components/ui/button';
import { Input, Select, Textarea } from '@/presentation/components/ui/input';
import { useSession } from '@/presentation/hooks/useSession';
import { useSingleFlight } from '@/presentation/hooks/useSingleFlight';
import { STATUS_LABEL } from '@/presentation/labels';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export function TaskDetailPage() {
  const { id = '' } = useParams();
  const uc = useUseCases();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useSession();
  const task = useQuery({ queryKey: ['task', id], queryFn: () => uc.getTask.execute(id) });
  const object = useQuery({
    queryKey: ['object', task.data?.objectId],
    queryFn: () => uc.getObject.execute(task.data?.objectId ?? ''),
    enabled: task.data !== undefined,
  });
  const history = useQuery({
    queryKey: ['history', id],
    queryFn: () => uc.getTaskHistory.execute(id),
  });
  const executors = useQuery({
    queryKey: ['executors'],
    queryFn: () => uc.listExecutors.execute(),
    enabled: user?.role === 'manager',
  });
  const people = useQuery({
    queryKey: ['people', task.data?.authorId, task.data?.assigneeId, history.data?.length],
    queryFn: () =>
      uc.resolveUsers.execute(
        [
          task.data?.authorId,
          task.data?.assigneeId,
          ...(history.data ?? []).map((h) => h.changedBy),
        ].filter((x): x is string => typeof x === 'string' && x !== ''),
      ),
    enabled: task.data !== undefined && history.data !== undefined,
  });
  const nameOf = (uid: string | null | undefined) =>
    uid ? (people.data?.find((p) => p.id === uid)?.fullName ?? '—') : 'не назначен';

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['task', id] }),
      qc.invalidateQueries({ queryKey: ['history', id] }),
      qc.invalidateQueries({ queryKey: ['my-tasks'] }),
      qc.invalidateQueries({ queryKey: ['object-tasks'] }),
    ]);
  };
  const changeOnce = useSingleFlight();
  const saveOnce = useSingleFlight();
  const removeOnce = useSingleFlight();
  const change = useMutation({
    mutationFn: ({ to, comment }: { to: TaskStatus; comment?: string }) => {
      if (!user) throw new Error('no user');
      return uc.changeTaskStatus.execute(id, to, user, comment);
    },
    // Refresh on error as well: a rejected transition means our view was stale.
    onSettled: refresh,
  });
  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('no user');
      return uc.updateTask.execute(
        id,
        { title, description, assigneeId: assigneeId || null },
        user,
      );
    },
    onSuccess: async () => {
      setEditing(false);
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('no user');
      return uc.deleteTask.execute(id, user);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['object-tasks'] });
      void navigate(task.data ? `/objects/${task.data.objectId}` : '/objects');
    },
  });

  const t = task.data;
  if (task.error) return <ErrorText error={task.error} />;
  if (!t || !user) return <p>Загрузка…</p>;

  return (
    <div className="space-y-4">
      <Link to={`/objects/${t.objectId}`} className="text-sm text-slate-600">
        ← К объекту
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <StatusBadge status={t.status} />
      </div>
      <dl className="grid grid-cols-[8rem_1fr] gap-1 text-sm">
        <dt className="text-slate-600">Объект</dt>
        <dd>{object.data?.name ?? '—'}</dd>
        <dt className="text-slate-600">Описание</dt>
        <dd>{t.description || '—'}</dd>
        <dt className="text-slate-600">Исполнитель</dt>
        <dd>{nameOf(t.assigneeId)}</dd>
        <dt className="text-slate-600">Автор</dt>
        <dd>{nameOf(t.authorId)}</dd>
        <dt className="text-slate-600">Создана</dt>
        <dd>{t.createdAt.toLocaleString('ru-RU')}</dd>
      </dl>
      <TaskActions
        task={t}
        user={user}
        pending={change.isPending}
        onChange={(to, comment) => {
          changeOnce((done) => {
            change.mutate(comment === undefined ? { to } : { to, comment }, { onSettled: done });
          });
        }}
      />
      <ErrorText error={change.error ?? save.error ?? remove.error} />
      {user.role === 'manager' && !editing && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTitle(t.title);
              setDescription(t.description);
              setAssigneeId(t.assigneeId ?? '');
              setEditing(true);
            }}
          >
            Редактировать
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => {
              removeOnce((done) => {
                remove.mutate(undefined, { onSettled: done });
              });
            }}
          >
            Удалить задачу
          </Button>
        </div>
      )}
      {editing && (
        <form
          className="space-y-2 rounded-md border bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveOnce((done) => {
              save.mutate(undefined, { onSettled: done });
            });
          }}
        >
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            aria-label="Название"
          />
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            aria-label="Описание"
          />
          <Select
            value={assigneeId}
            onChange={(e) => {
              setAssigneeId(e.target.value);
            }}
            aria-label="Исполнитель"
          >
            <option value="">Без исполнителя</option>
            {executors.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              Сохранить
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setEditing(false);
              }}
            >
              Отмена
            </Button>
          </div>
        </form>
      )}
      <section>
        <h2 className="mb-2 font-medium">История</h2>
        <ul className="space-y-1 text-sm" data-testid="history">
          {history.data?.map((h) => (
            <li key={h.id} className="rounded border bg-white p-2">
              {h.changedAt.toLocaleString('ru-RU')} — {nameOf(h.changedBy)}:{' '}
              {h.fromStatus ? STATUS_LABEL[h.fromStatus] : '—'} → {STATUS_LABEL[h.toStatus]}
              {h.comment && <div className="text-slate-600">«{h.comment}»</div>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
