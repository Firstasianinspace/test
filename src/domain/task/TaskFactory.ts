import { DomainError } from '../shared/DomainError';
import type { User } from '../user/User';
import type { TaskStatus } from './TaskStatus';

export interface TaskDraft {
  readonly title: string;
  readonly description: string;
  readonly objectId: string;
  readonly assigneeId: string | null;
  readonly authorId: string;
  readonly status: Extract<TaskStatus, 'new'>;
}

export interface CreateTaskInput {
  readonly title: string;
  readonly description?: string;
  readonly objectId: string;
  readonly assigneeId?: string | null;
}

export function createTaskDraft(input: CreateTaskInput, author: User): TaskDraft {
  if (author.role !== 'manager') {
    throw new DomainError('forbidden', 'Only a manager can create tasks');
  }
  const title = input.title.trim();
  if (title === '') throw new DomainError('validation', 'Title is required');
  return {
    title,
    description: (input.description ?? '').trim(),
    objectId: input.objectId,
    assigneeId: input.assigneeId ?? null,
    authorId: author.id,
    status: 'new',
  };
}
