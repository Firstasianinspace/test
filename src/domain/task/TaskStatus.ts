export const TASK_STATUSES = [
  'new',
  'in_progress',
  'on_review',
  'accepted',
  'needs_rework',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
