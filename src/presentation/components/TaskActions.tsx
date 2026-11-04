import type { Task } from '@/domain/task/Task';
import type { TaskStatus } from '@/domain/task/TaskStatus';
import { availableTransitions, requiresComment } from '@/domain/task/TaskStatusMachine';
import type { User } from '@/domain/user/User';
import { Button } from '@/presentation/components/ui/button';
import { Textarea } from '@/presentation/components/ui/input';
import { ACTION_LABEL } from '@/presentation/labels';
import { useState } from 'react';

interface Props {
  task: Task;
  user: User;
  pending: boolean;
  onChange: (to: TaskStatus, comment?: string) => void;
}

/** Renders only the actions the domain says this user may take in this status. */
export function TaskActions({ task, user, pending, onChange }: Props) {
  const [commentFor, setCommentFor] = useState<TaskStatus | null>(null);
  const [comment, setComment] = useState('');
  const options = availableTransitions(task, user);

  if (options.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {options.map((to) => (
          <Button
            key={to}
            variant={to === 'needs_rework' ? 'danger' : 'primary'}
            disabled={pending}
            onClick={() => {
              if (requiresComment(task.status, to)) setCommentFor(to);
              else onChange(to);
            }}
          >
            {ACTION_LABEL[to]}
          </Button>
        ))}
      </div>
      {commentFor && (
        <div className="space-y-2">
          <Textarea
            aria-label="Комментарий"
            placeholder="Комментарий (обязателен)"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
          />
          <div className="flex gap-2">
            <Button
              disabled={pending || comment.trim() === ''}
              onClick={() => {
                onChange(commentFor, comment);
                setCommentFor(null);
                setComment('');
              }}
            >
              Подтвердить
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCommentFor(null);
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
