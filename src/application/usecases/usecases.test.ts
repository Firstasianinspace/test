import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryTaskRepository } from '@/infrastructure/testing/InMemoryRepositories';
import type { User } from '@/domain/user/User';
import { DomainError } from '@/domain/shared/DomainError';
import { ChangeTaskStatus, CreateTask, GetTaskHistory, ListMyTasks, UpdateTask } from './usecases';

const manager: User = { id: 'm1', fullName: 'M', role: 'manager' };
const ivan: User = { id: 'e1', fullName: 'Ivan', role: 'executor' };
const petr: User = { id: 'e2', fullName: 'Petr', role: 'executor' };

let repo: InMemoryTaskRepository;

beforeEach(() => {
  repo = new InMemoryTaskRepository();
  repo.actor = manager;
});

describe('ListMyTasks', () => {
  it('returns only tasks assigned to the user', async () => {
    const create = new CreateTask(repo);
    await create.execute({ title: 'A', objectId: 'o1', assigneeId: 'e1' }, manager);
    await create.execute({ title: 'B', objectId: 'o1', assigneeId: 'e2' }, manager);
    await create.execute({ title: 'C', objectId: 'o1' }, manager);
    const mine = await new ListMyTasks(repo).execute(ivan);
    expect(mine.map((t) => t.title)).toEqual(['A']);
  });
});

describe('ChangeTaskStatus', () => {
  it('runs the full cycle including rework and records history', async () => {
    const task = await new CreateTask(repo).execute(
      { title: 'A', objectId: 'o1', assigneeId: 'e1' },
      manager,
    );
    const change = new ChangeTaskStatus(repo);
    repo.actor = ivan;
    await change.execute(task.id, 'in_progress', ivan);
    await change.execute(task.id, 'on_review', ivan);
    repo.actor = manager;
    await change.execute(task.id, 'needs_rework', manager, 'Переделать');
    repo.actor = ivan;
    await change.execute(task.id, 'in_progress', ivan);
    const history = await new GetTaskHistory(repo).execute(task.id);
    expect(history.map((h) => h.toStatus)).toEqual([
      'new',
      'in_progress',
      'on_review',
      'needs_rework',
      'in_progress',
    ]);
    expect(history[3]?.comment).toBe('Переделать');
  });

  it('rejects rework without comment before touching the repository', async () => {
    const task = await new CreateTask(repo).execute(
      { title: 'A', objectId: 'o1', assigneeId: 'e1' },
      manager,
    );
    repo.actor = ivan;
    const change = new ChangeTaskStatus(repo);
    await change.execute(task.id, 'in_progress', ivan);
    await change.execute(task.id, 'on_review', ivan);
    await expect(change.execute(task.id, 'needs_rework', manager, '')).rejects.toMatchObject({
      code: 'comment_required',
    });
  });

  it('rejects a foreign executor', async () => {
    const task = await new CreateTask(repo).execute(
      { title: 'A', objectId: 'o1', assigneeId: 'e1' },
      manager,
    );
    await expect(new ChangeTaskStatus(repo).execute(task.id, 'in_progress', petr)).rejects.toThrow(
      DomainError,
    );
  });
});

describe('UpdateTask', () => {
  it('forbids executors', async () => {
    await expect(new UpdateTask(repo).execute('t1', { title: 'x' }, ivan)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});
