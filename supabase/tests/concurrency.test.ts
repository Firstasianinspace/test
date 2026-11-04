import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asIvan, asManager, IDS, type Client } from './helpers';

interface HistoryRow {
  to_status: string;
  changed_by: string | null;
}

let manager: Client;
let managerSecondTab: Client;
let ivan: Client;
const created: string[] = [];

beforeAll(async () => {
  [manager, managerSecondTab, ivan] = await Promise.all([asManager(), asManager(), asIvan()]);
});

afterAll(async () => {
  for (const id of created) await manager.from('tasks').delete().eq('id', id);
});

const errorCode = (r: { error: { code: string } | null }): string | null => r.error?.code ?? null;

const rpc = (c: Client, id: string, to: string, comment?: string) =>
  c.rpc('change_task_status', { p_task_id: id, p_to: to, p_comment: comment ?? null });

async function newTask(): Promise<string> {
  const { data, error } = await manager
    .from('tasks')
    .insert({ title: 'Race', object_id: IDS.obj1, assignee_id: IDS.ivan })
    .select('id')
    .single();
  if (error) throw error;
  const id: unknown = data.id;
  created.push(String(id));
  return String(id);
}

async function taskOnReview(): Promise<string> {
  const id = await newTask();
  expect((await rpc(ivan, id, 'in_progress')).error).toBeNull();
  expect((await rpc(ivan, id, 'on_review')).error).toBeNull();
  return id;
}

async function history(id: string): Promise<HistoryRow[]> {
  const res = await manager
    .from('task_status_history')
    .select('to_status, changed_by')
    .eq('task_id', id)
    .order('changed_at');
  const data: unknown = res.data;
  return Array.isArray(data) ? (data as HistoryRow[]) : [];
}

async function currentStatus(id: string): Promise<string> {
  const res = await manager.from('tasks').select('status').eq('id', id).single();
  const data: unknown = res.data;
  const row = data as { status: string } | null;
  return row?.status ?? 'missing';
}

describe('concurrent requests are serialized by the database', () => {
  it('two managers deciding the same review at once: exactly one decision wins', async () => {
    for (let round = 0; round < 3; round++) {
      const id = await taskOnReview();
      const [accept, rework] = await Promise.all([
        rpc(manager, id, 'accepted'),
        rpc(managerSecondTab, id, 'needs_rework', 'Переделать'),
      ]);
      const winners = [accept, rework].filter((r) => r.error === null);
      const losers = [accept, rework].filter((r) => r.error !== null);
      expect(winners).toHaveLength(1);
      expect(losers.map(errorCode)).toEqual(['CRT01']);

      const rows = await history(id);
      expect(rows.map((r) => r.to_status)).toHaveLength(4); // new, in_progress, on_review, decision
      expect(rows.at(-1)?.to_status).toBe(await currentStatus(id)); // history == truth
    }
  });

  it('a double-clicked transition is applied once; the duplicate is rejected', async () => {
    const id = await newTask();
    const [a, b] = await Promise.all([rpc(ivan, id, 'in_progress'), rpc(ivan, id, 'in_progress')]);
    expect([a, b].filter((r) => r.error === null)).toHaveLength(1);
    expect([a, b].map(errorCode).filter((c) => c !== null)).toEqual(['CRT01']);
    const rows = await history(id);
    expect(rows.filter((r) => r.to_status === 'in_progress')).toHaveLength(1);
  });

  it('reassigning while the executor transitions never records a change by a stale assignee', async () => {
    for (let round = 0; round < 5; round++) {
      const id = await newTask();
      const [transition, reassign] = await Promise.all([
        rpc(ivan, id, 'in_progress'),
        manager.from('tasks').update({ assignee_id: IDS.petr }).eq('id', id),
      ]);
      expect(reassign.error).toBeNull();
      const status = await currentStatus(id);
      if (transition.error === null) {
        // transition committed first, then the reassignment
        expect(status).toBe('in_progress');
        expect((await history(id)).at(-1)?.changed_by).toBe(IDS.ivan);
      } else {
        // reassignment committed first: Ivan no longer sees the task
        expect(transition.error.code).toBe('CRN01');
        expect(status).toBe('new');
      }
      // either way the task is now Petr's: Ivan can no longer see or move it
      const ivanTry = await rpc(ivan, id, status === 'new' ? 'in_progress' : 'on_review');
      expect(ivanTry.error?.code).toBe('CRN01');
    }
  });

  it('deleting a task while a transition is in flight leaves no orphans', async () => {
    const id = await newTask();
    await Promise.all([rpc(ivan, id, 'in_progress'), manager.from('tasks').delete().eq('id', id)]);
    expect(await currentStatus(id)).toBe('missing');
    expect(await history(id)).toEqual([]);
  });
});
