import type { TaskStatus } from './TaskStatus';

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly objectId: string;
  readonly assigneeId: string | null;
  readonly authorId: string;
  readonly status: TaskStatus;
  readonly createdAt: Date;
}

export interface StatusChange {
  readonly id: string;
  readonly taskId: string;
  readonly fromStatus: TaskStatus | null;
  readonly toStatus: TaskStatus;
  readonly comment: string | null;
  readonly changedBy: string;
  readonly changedAt: Date;
}
