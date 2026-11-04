import { beforeAll, describe, expect, it } from 'vitest';
import { TRANSITIONS } from '../../src/domain/task/TaskStatusMachine';
import { asManager, type Client } from './helpers';

interface RegistryRow {
  from_status: string;
  to_status: string;
  actor: string;
  requires_comment: boolean;
}

const key = (from: string, to: string, actor: string, comment: boolean) =>
  `${from} -> ${to} | ${actor} | comment required: ${String(comment)}`;

let manager: Client;

beforeAll(async () => {
  manager = await asManager();
});

describe('transition rules have a single meaning in TypeScript and Postgres', () => {
  it('domain TRANSITIONS equals the task_transitions table', async () => {
    const { data, error } = await manager.from('task_transitions').select('*');
    expect(error).toBeNull();
    const rows = (data ?? []) as RegistryRow[];
    const inDatabase = rows.map((r) =>
      key(r.from_status, r.to_status, r.actor, r.requires_comment),
    );
    const inDomain = TRANSITIONS.map((r) => key(r.from, r.to, r.actor, r.requiresComment));
    expect(inDatabase.sort()).toEqual(inDomain.sort());
  });
});
