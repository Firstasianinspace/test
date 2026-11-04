import { useUseCases } from '@/presentation/app/context';
import { ErrorText } from '@/presentation/components/ErrorText';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { useSession } from '@/presentation/hooks/useSession';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ObjectsPage() {
  const uc = useUseCases();
  const qc = useQueryClient();
  const { user } = useSession();
  const isManager = user?.role === 'manager';
  const objects = useQuery({ queryKey: ['objects'], queryFn: () => uc.listObjects.execute() });
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['objects'] });
  const create = useMutation({
    mutationFn: () => uc.createObject.execute({ name, address }),
    onSuccess: async () => {
      setName('');
      setAddress('');
      await refresh();
    },
  });
  const update = useMutation({
    mutationFn: (id: string) => uc.updateObject.execute(id, { name, address }),
    onSuccess: async () => {
      setEditing(null);
      setName('');
      setAddress('');
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => uc.deleteObject.execute(id),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Объекты</h1>
      {objects.data?.length === 0 && <p className="text-slate-600">Объектов пока нет.</p>}
      <ul className="space-y-2">
        {objects.data?.map((o) => (
          <li key={o.id} className="flex items-center gap-3 rounded-md border bg-white p-3">
            <Link to={`/objects/${o.id}`} className="flex-1">
              <div className="font-medium">{o.name}</div>
              <div className="text-sm text-slate-600">{o.address}</div>
            </Link>
            {isManager && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(o.id);
                    setName(o.name);
                    setAddress(o.address);
                  }}
                >
                  Изменить
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    remove.mutate(o.id);
                  }}
                >
                  Удалить
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <ErrorText error={objects.error ?? remove.error ?? create.error ?? update.error} />
      {isManager && (
        <form
          className="space-y-2 rounded-md border bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (editing) update.mutate(editing);
            else create.mutate();
          }}
        >
          <h2 className="font-medium">{editing ? 'Редактирование объекта' : 'Новый объект'}</h2>
          <Input
            placeholder="Название"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <Input
            placeholder="Адрес"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
            }}
          />
          <div className="flex gap-2">
            <Button type="submit">{editing ? 'Сохранить' : 'Создать'}</Button>
            {editing && (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setName('');
                  setAddress('');
                }}
              >
                Отмена
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
