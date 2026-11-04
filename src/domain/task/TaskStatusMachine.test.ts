import { describe, expect, it } from 'vitest';
import type { User } from '../user/User';
import type { Task } from './Task';
import { TASK_STATUSES, type TaskStatus } from './TaskStatus';
import { availableTransitions, checkTransition } from './TaskStatusMachine';

const manager: User = { id: 'm1', fullName: 'Manager', role: 'manager' };
const exec1: User = { id: 'e1', fullName: 'Exec 1', role: 'executor' };
const exec2: User = { id: 'e2', fullName: 'Exec 2', role: 'executor' };

const task = (status: TaskStatus, assigneeId: string | null = 'e1'): Task => ({
  id: 't1',
  title: 'T',
  description: '',
  objectId: 'o1',
  assigneeId,
  authorId: 'm1',
  status,
  createdAt: new Date(0),
});

const allowed: [TaskStatus, TaskStatus, 'manager' | 'assignee'][] = [
  ['new', 'in_progress', 'assignee'],
  ['in_progress', 'on_review', 'assignee'],
  ['on_review', 'accepted', 'manager'],
  ['on_review', 'needs_rework', 'manager'],
  ['needs_rework', 'in_progress', 'assignee'],
];

describe('checkTransition', () => {
  for (const from of TASK_STATUSES) {
    for (const to of TASK_STATUSES) {
      const rule = allowed.find(([f, t]) => f === from && t === to);
      for (const [label, user] of [
        ['manager', manager],
        ['assigned executor', exec1],
        ['other executor', exec2],
      ] as const) {
        const shouldPass =
          rule !== undefined &&
          ((rule[2] === 'manager' && user.role === 'manager') ||
            (rule[2] === 'assignee' && user.id === 'e1'));
        it(`${from} -> ${to} by ${label}: ${shouldPass ? 'ok' : 'rejected'}`, () => {
          const result = checkTransition(task(from), user, to, 'comment');
          expect(result.ok).toBe(shouldPass);
        });
      }
    }
  }

  it('requires a comment for on_review -> needs_rework', () => {
    const result = checkTransition(task('on_review'), manager, 'needs_rework', '   ');
    expect(result).toEqual({ ok: false, code: 'comment_required' });
  });

  it('does not require a comment for on_review -> accepted', () => {
    expect(checkTransition(task('on_review'), manager, 'accepted').ok).toBe(true);
  });

  it('rejects new -> in_progress without assignee', () => {
    const result = checkTransition(task('new', null), exec1, 'in_progress');
    expect(result.ok).toBe(false);
  });
});

describe('availableTransitions', () => {
  it('offers assignee the start action on a new task', () => {
    expect(availableTransitions(task('new'), exec1)).toEqual(['in_progress']);
  });
  it('offers manager accept/rework on review', () => {
    expect(availableTransitions(task('on_review'), manager)).toEqual(['accepted', 'needs_rework']);
  });
  it('offers nothing to a foreign executor', () => {
    expect(availableTransitions(task('new'), exec2)).toEqual([]);
  });
  it('offers nothing to the manager on a new task', () => {
    expect(availableTransitions(task('new'), manager)).toEqual([]);
  });
  it('offers nothing on accepted', () => {
    expect(availableTransitions(task('accepted'), manager)).toEqual([]);
  });
});
