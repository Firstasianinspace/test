import type { CrmObject } from '@/domain/object/CrmObject';
import type { StatusChange, Task } from '@/domain/task/Task';
import type { User } from '@/domain/user/User';
import type { z } from 'zod';
import type { historyRow, objectRow, profileRow, taskRow } from './rows';

export const toUser = (r: z.infer<typeof profileRow>): User => ({
  id: r.id,
  fullName: r.full_name,
  role: r.role,
});
export const toObject = (r: z.infer<typeof objectRow>): CrmObject => ({
  id: r.id,
  name: r.name,
  address: r.address,
  createdAt: new Date(r.created_at),
});
export const toTask = (r: z.infer<typeof taskRow>): Task => ({
  id: r.id,
  objectId: r.object_id,
  title: r.title,
  description: r.description,
  assigneeId: r.assignee_id,
  authorId: r.author_id ?? '',
  status: r.status,
  createdAt: new Date(r.created_at),
});
export const toStatusChange = (r: z.infer<typeof historyRow>): StatusChange => ({
  id: r.id,
  taskId: r.task_id,
  fromStatus: r.from_status,
  toStatus: r.to_status,
  comment: r.comment,
  changedBy: r.changed_by ?? '',
  changedAt: new Date(r.changed_at),
});
