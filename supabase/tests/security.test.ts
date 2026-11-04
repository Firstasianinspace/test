import { beforeAll, describe, expect, it } from 'vitest';
import { anonClient, asIvan, asManager, asPetr, IDS, type Client } from './helpers';

interface HistoryRow {
  to_status: string;
  comment: string | null;
  changed_by: string | null;
}

let manager: Client;
let ivan: Client;
let petr: Client;

beforeAll(async () => {
  [manager, ivan, petr] = await Promise.all([asManager(), asIvan(), asPetr()]);
});

const rpc = (c: Client, id: string, to: string, comment?: string) =>
  c.rpc('change_task_status', { p_task_id: id, p_to: to, p_comment: comment ?? null });

async function freshTask(assignee: string | null = IDS.ivan): Promise<string> {
  const { data, error } = await manager
    .from('tasks')
    .insert({ title: 'Temp', object_id: IDS.obj1, assignee_id: assignee })
    .select('id')
    .single();
  if (error) throw error;
  const id: unknown = data.id;
  return String(id);
}

describe('1. executor cannot read foreign tasks / objects / profiles', () => {
  it('sees only own tasks', async () => {
    const { data } = await ivan.from('tasks').select('id, assignee_id');
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((t) => t.assignee_id === IDS.ivan)).toBe(true);
  });
  it("cannot fetch Petr's task by id", async () => {
    const { data } = await ivan.from('tasks').select('*').eq('id', IDS.tPetrRework);
    expect(data).toEqual([]);
  });
  it("cannot read Petr's task history", async () => {
    const { data } = await ivan
      .from('task_status_history')
      .select('*')
      .eq('task_id', IDS.tPetrRework);
    expect(data).toEqual([]);
  });
  it('cannot see an object where he has no tasks', async () => {
    const { data } = await ivan.from('objects').select('id').eq('id', IDS.obj3);
    expect(data).toEqual([]);
  });
  it("cannot see another executor's profile", async () => {
    const { data } = await ivan.from('profiles').select('id').eq('id', IDS.petr);
    expect(data).toEqual([]);
  });
  it('manager sees everything', async () => {
    const { data } = await manager.from('tasks').select('id');
    expect(data?.length).toBeGreaterThanOrEqual(7);
  });
});

describe('2. forbidden transitions are rejected by the database', () => {
  it('new -> accepted', async () => {
    const { error } = await rpc(ivan, IDS.tNew, 'accepted');
    expect(error?.code).toBe('CRT01');
  });
  it('new -> on_review', async () => {
    expect((await rpc(ivan, IDS.tNew, 'on_review')).error?.code).toBe('CRT01');
  });
  it('same status', async () => {
    expect((await rpc(ivan, IDS.tNew, 'new')).error?.code).toBe('CRT01');
  });
  it('executor cannot accept his own reviewed task', async () => {
    expect((await rpc(ivan, IDS.tReview, 'accepted')).error?.code).toBe('CRF01');
  });
  it('manager cannot do executor transitions', async () => {
    expect((await rpc(manager, IDS.tNew, 'in_progress')).error?.code).toBe('CRF01');
  });
  it("another executor cannot touch Ivan's task (looks like not found)", async () => {
    expect((await rpc(petr, IDS.tNew, 'in_progress')).error?.code).toBe('CRN01');
  });
  it('new -> in_progress without assignee fails', async () => {
    expect((await rpc(manager, IDS.tFree, 'in_progress')).error?.code).toBe('CRA01');
  });
  it('direct UPDATE of status is denied for executor', async () => {
    const { error } = await ivan.from('tasks').update({ status: 'accepted' }).eq('id', IDS.tNew);
    expect(error?.code).toBe('42501');
  });
  it('direct UPDATE of status is denied for manager', async () => {
    const { error } = await manager.from('tasks').update({ status: 'accepted' }).eq('id', IDS.tNew);
    expect(error?.code).toBe('42501');
  });
});

describe('3. history cannot be forged, changed or deleted via API', () => {
  it('insert denied', async () => {
    for (const c of [ivan, manager]) {
      const { error } = await c
        .from('task_status_history')
        .insert({ task_id: IDS.tNew, to_status: 'accepted', changed_by: IDS.manager });
      expect(error?.code).toBe('42501');
    }
  });
  it('update denied', async () => {
    const { error } = await manager
      .from('task_status_history')
      .update({ comment: 'x' })
      .eq('task_id', IDS.tNew);
    expect(error?.code).toBe('42501');
  });
  it('delete denied', async () => {
    const { error } = await manager.from('task_status_history').delete().eq('task_id', IDS.tNew);
    expect(error?.code).toBe('42501');
  });
});

describe('4. anonymous access', () => {
  it('reads nothing', async () => {
    const anon = anonClient();
    for (const table of [
      'tasks',
      'objects',
      'profiles',
      'task_status_history',
      'task_transitions',
    ]) {
      const { data, error } = await anon.from(table).select('*');
      expect(error?.code === '42501' || (data?.length ?? 0) === 0).toBe(true);
    }
  });
  it('cannot call the RPC', async () => {
    expect((await rpc(anonClient(), IDS.tNew, 'in_progress')).error).not.toBeNull();
  });
  it('cannot sign up', async () => {
    const { error } = await anonClient().auth.signUp({
      email: 'x@example.com',
      password: 'password123',
    });
    expect(error).not.toBeNull();
  });
});

describe('5. executor cannot change data', () => {
  it('cannot edit own task fields (no rows affected)', async () => {
    const { data, error } = await ivan
      .from('tasks')
      .update({ title: 'hacked' })
      .eq('id', IDS.tNew)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const { data: check } = await manager.from('tasks').select('title').eq('id', IDS.tNew).single();
    expect((check as { title: string }).title).not.toBe('hacked');
  });
  it('cannot reassign himself a foreign task', async () => {
    const { data } = await ivan
      .from('tasks')
      .update({ assignee_id: IDS.ivan })
      .eq('id', IDS.tPetrRework)
      .select();
    expect(data).toEqual([]);
  });
  it('cannot create tasks', async () => {
    const { error } = await ivan
      .from('tasks')
      .insert({ title: 'x', object_id: IDS.obj1, assignee_id: IDS.ivan });
    expect(error).not.toBeNull();
  });
  it('cannot delete tasks or objects', async () => {
    const t = await ivan.from('tasks').delete().eq('id', IDS.tNew).select();
    expect(t.data ?? []).toEqual([]);
    const o = await ivan.from('objects').delete().eq('id', IDS.obj1).select();
    expect(o.data ?? []).toEqual([]);
  });
  it('cannot change own role', async () => {
    const { error } = await ivan.from('profiles').update({ role: 'manager' }).eq('id', IDS.ivan);
    expect(error?.code).toBe('42501');
  });
});

describe('6. rework requires a comment', () => {
  it('rejects empty and blank comment, accepts a real one, then the cycle continues', async () => {
    const id = await freshTask();
    expect((await rpc(ivan, id, 'in_progress')).error).toBeNull();
    expect((await rpc(ivan, id, 'on_review')).error).toBeNull();
    expect((await rpc(manager, id, 'needs_rework')).error?.code).toBe('CRC01');
    expect((await rpc(manager, id, 'needs_rework', '   ')).error?.code).toBe('CRC01');
    expect((await rpc(manager, id, 'needs_rework', 'Переделать шов')).error).toBeNull();
    expect((await rpc(ivan, id, 'in_progress')).error).toBeNull();
    expect((await rpc(ivan, id, 'on_review')).error).toBeNull();
    expect((await rpc(manager, id, 'accepted')).error).toBeNull();

    const res = await ivan
      .from('task_status_history')
      .select('*')
      .eq('task_id', id)
      .order('changed_at');
    const data = res.data as HistoryRow[] | null;
    expect(data?.map((h) => h.to_status)).toEqual([
      'new',
      'in_progress',
      'on_review',
      'needs_rework',
      'in_progress',
      'on_review',
      'accepted',
    ]);
    expect(data?.[3]?.comment).toBe('Переделать шов');
    expect(data?.[3]?.changed_by).toBe(IDS.manager);
    expect(data?.[1]?.changed_by).toBe(IDS.ivan);

    // accepted is terminal
    expect((await rpc(manager, id, 'needs_rework', 'ещё раз')).error?.code).toBe('CRT01');
    // deleting the task removes its history inside the database
    expect((await manager.from('tasks').delete().eq('id', id)).error).toBeNull();
    const after = await manager.from('task_status_history').select('id').eq('task_id', id);
    expect(after.data).toEqual([]);
  });
});

describe('7. manager-side integrity', () => {
  it('cannot assign a manager as executor', async () => {
    const { error } = await manager
      .from('tasks')
      .insert({ title: 'x', object_id: IDS.obj1, assignee_id: IDS.manager });
    expect(error?.code).toBe('CRV01');
  });
  it('cannot forge author or status on insert', async () => {
    const { error } = await manager
      .from('tasks')
      .insert({ title: 'x', object_id: IDS.obj1, status: 'accepted', author_id: IDS.ivan });
    expect(error?.code).toBe('42501');
  });
  it('new task always starts as new with the real author', async () => {
    const id = await freshTask();
    const { data } = await manager.from('tasks').select('status, author_id').eq('id', id).single();
    expect(data).toEqual({ status: 'new', author_id: IDS.manager });
    await manager.from('tasks').delete().eq('id', id);
  });
  it('object with tasks cannot be deleted', async () => {
    const { error } = await manager.from('objects').delete().eq('id', IDS.obj1);
    expect(error?.code).toBe('23503');
  });
  it('manager can edit fields of a task in any status', async () => {
    const { error } = await manager
      .from('tasks')
      .update({ description: 'updated' })
      .eq('id', IDS.tReview);
    expect(error).toBeNull();
  });
});
