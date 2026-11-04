import type { TaskStatus } from '@/domain/task/TaskStatus';
import { STATUS_LABEL } from '@/presentation/labels';

export const StatusBadge = ({ status }: { status: TaskStatus }) => (
  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs" data-testid="status-badge">
    {STATUS_LABEL[status]}
  </span>
);
