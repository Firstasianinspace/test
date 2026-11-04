import type { DomainErrorCode } from '../shared/DomainError';
import type { User } from '../user/User';
import type { Task } from './Task';
import type { TaskStatus } from './TaskStatus';

export type TransitionActor = 'manager' | 'assignee';

export interface TransitionRule {
  readonly from: TaskStatus;
  readonly to: TaskStatus;
  readonly actor: TransitionActor;
  readonly requiresComment: boolean;
}

/** Mirrors the `task_transitions` table in Postgres. Keep both in sync. */
export const TRANSITIONS: readonly TransitionRule[] = [
  { from: 'new', to: 'in_progress', actor: 'assignee', requiresComment: false },
  { from: 'in_progress', to: 'on_review', actor: 'assignee', requiresComment: false },
  { from: 'on_review', to: 'accepted', actor: 'manager', requiresComment: false },
  { from: 'on_review', to: 'needs_rework', actor: 'manager', requiresComment: true },
  { from: 'needs_rework', to: 'in_progress', actor: 'assignee', requiresComment: false },
];

export type TransitionCheck =
  { readonly ok: true } | { readonly ok: false; readonly code: DomainErrorCode };

const isActor = (rule: TransitionRule, task: Task, user: User): boolean =>
  rule.actor === 'manager'
    ? user.role === 'manager'
    : task.assigneeId !== null && task.assigneeId === user.id;

export function checkTransition(
  task: Task,
  user: User,
  to: TaskStatus,
  comment?: string,
): TransitionCheck {
  const rule = TRANSITIONS.find((r) => r.from === task.status && r.to === to);
  if (!rule) return { ok: false, code: 'invalid_transition' };
  if (!isActor(rule, task, user)) {
    return { ok: false, code: task.assigneeId === null ? 'assignee_required' : 'forbidden' };
  }
  if (rule.requiresComment && (comment ?? '').trim() === '') {
    return { ok: false, code: 'comment_required' };
  }
  return { ok: true };
}

export function availableTransitions(task: Task, user: User): TaskStatus[] {
  return TRANSITIONS.filter((r) => r.from === task.status && isActor(r, task, user)).map(
    (r) => r.to,
  );
}

export function requiresComment(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS.some((r) => r.from === from && r.to === to && r.requiresComment);
}
