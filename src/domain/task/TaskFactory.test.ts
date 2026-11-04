import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/DomainError';
import type { User } from '../user/User';
import { createTaskDraft } from './TaskFactory';

const manager: User = { id: 'm1', fullName: 'M', role: 'manager' };
const executor: User = { id: 'e1', fullName: 'E', role: 'executor' };

describe('createTaskDraft', () => {
  it('creates a new task authored by the manager', () => {
    const draft = createTaskDraft({ title: ' Залить фундамент ', objectId: 'o1' }, manager);
    expect(draft).toMatchObject({
      title: 'Залить фундамент',
      description: '',
      objectId: 'o1',
      assigneeId: null,
      authorId: 'm1',
      status: 'new',
    });
  });

  it('rejects an empty title', () => {
    expect(() => createTaskDraft({ title: '  ', objectId: 'o1' }, manager)).toThrow(DomainError);
  });

  it('rejects creation by an executor', () => {
    expect(() => createTaskDraft({ title: 'x', objectId: 'o1' }, executor)).toThrow(DomainError);
  });
});
