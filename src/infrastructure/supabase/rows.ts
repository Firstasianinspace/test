import { z } from 'zod';

const status = z.enum(['new', 'in_progress', 'on_review', 'accepted', 'needs_rework']);

export const profileRow = z.object({
  id: z.string(),
  full_name: z.string(),
  role: z.enum(['manager', 'executor']),
});
export const objectRow = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  created_at: z.string(),
});
export const taskRow = z.object({
  id: z.string(),
  object_id: z.string(),
  title: z.string(),
  description: z.string(),
  assignee_id: z.string().nullable(),
  author_id: z.string().nullable(),
  status,
  created_at: z.string(),
});
export const historyRow = z.object({
  id: z.string(),
  task_id: z.string(),
  from_status: status.nullable(),
  to_status: status,
  comment: z.string().nullable(),
  changed_by: z.string().nullable(),
  changed_at: z.string(),
});
