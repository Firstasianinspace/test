import { describe, expect, it } from 'vitest';
import { toStatusChange, toTask } from './mappers';

describe('mappers', () => {
  it('maps a task row', () => {
    const t = toTask({
      id: '1',
      object_id: 'o',
      title: 'T',
      description: '',
      assignee_id: null,
      author_id: 'a',
      status: 'new',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(t.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(t.assigneeId).toBeNull();
  });
  it('maps a history row', () => {
    const h = toStatusChange({
      id: '1',
      task_id: 't',
      from_status: null,
      to_status: 'new',
      comment: null,
      changed_by: 'a',
      changed_at: '2026-01-01T00:00:00Z',
    });
    expect(h.fromStatus).toBeNull();
  });
});
