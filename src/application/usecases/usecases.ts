import type { CrmObject } from '@/domain/object/CrmObject';
import { DomainError } from '@/domain/shared/DomainError';
import type { StatusChange, Task } from '@/domain/task/Task';
import { createTaskDraft, type CreateTaskInput } from '@/domain/task/TaskFactory';
import type { TaskStatus } from '@/domain/task/TaskStatus';
import { checkTransition } from '@/domain/task/TaskStatusMachine';
import type { User } from '@/domain/user/User';
import type {
  AuthGateway,
  ObjectInput,
  ObjectRepository,
  TaskPatch,
  TaskRepository,
  UserRepository,
} from '../ports/Repositories';

// ---- auth
export class SignIn {
  constructor(private readonly auth: AuthGateway) {}
  execute(email: string, password: string): Promise<User> {
    if (email.trim() === '' || password === '') {
      return Promise.reject(new DomainError('validation', 'Email and password are required'));
    }
    return this.auth.signIn(email.trim(), password);
  }
}
export class SignOut {
  constructor(private readonly auth: AuthGateway) {}
  execute(): Promise<void> {
    return this.auth.signOut();
  }
}
export class GetCurrentUser {
  constructor(private readonly auth: AuthGateway) {}
  execute(): Promise<User | null> {
    return this.auth.currentUser();
  }
}

// ---- objects
export class ListObjects {
  constructor(private readonly objects: ObjectRepository) {}
  execute(): Promise<CrmObject[]> {
    return this.objects.list();
  }
}
export class GetObject {
  constructor(private readonly objects: ObjectRepository) {}
  execute(id: string): Promise<CrmObject> {
    return this.objects.get(id);
  }
}
const validateObject = (input: ObjectInput): ObjectInput => {
  const name = input.name.trim();
  if (name === '') throw new DomainError('validation', 'Object name is required');
  return { name, address: input.address.trim() };
};
export class CreateObject {
  constructor(private readonly objects: ObjectRepository) {}
  execute(input: ObjectInput): Promise<CrmObject> {
    return this.objects.create(validateObject(input));
  }
}
export class UpdateObject {
  constructor(private readonly objects: ObjectRepository) {}
  execute(id: string, input: ObjectInput): Promise<CrmObject> {
    return this.objects.update(id, validateObject(input));
  }
}
export class DeleteObject {
  constructor(private readonly objects: ObjectRepository) {}
  execute(id: string): Promise<void> {
    return this.objects.delete(id);
  }
}

// ---- tasks
export class ListObjectTasks {
  constructor(private readonly tasks: TaskRepository) {}
  execute(objectId: string): Promise<Task[]> {
    return this.tasks.listByObject(objectId);
  }
}
export class ListMyTasks {
  constructor(private readonly tasks: TaskRepository) {}
  execute(user: User): Promise<Task[]> {
    return this.tasks.listAssignedTo(user.id);
  }
}
export class GetTask {
  constructor(private readonly tasks: TaskRepository) {}
  execute(id: string): Promise<Task> {
    return this.tasks.get(id);
  }
}
export class GetTaskHistory {
  constructor(private readonly tasks: TaskRepository) {}
  async execute(taskId: string): Promise<StatusChange[]> {
    const changes = await this.tasks.history(taskId);
    return [...changes].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  }
}
export class CreateTask {
  constructor(private readonly tasks: TaskRepository) {}
  execute(input: CreateTaskInput, author: User): Promise<Task> {
    const draft = createTaskDraft(input, author);
    return this.tasks.create({
      title: draft.title,
      description: draft.description,
      objectId: draft.objectId,
      assigneeId: draft.assigneeId,
    });
  }
}
export class UpdateTask {
  constructor(private readonly tasks: TaskRepository) {}
  execute(id: string, patch: TaskPatch, actor: User): Promise<Task> {
    if (actor.role !== 'manager') {
      return Promise.reject(new DomainError('forbidden', 'Only a manager can edit tasks'));
    }
    if (patch.title?.trim() === '') {
      return Promise.reject(new DomainError('validation', 'Title is required'));
    }
    return this.tasks.update(id, patch);
  }
}
export class DeleteTask {
  constructor(private readonly tasks: TaskRepository) {}
  execute(id: string, actor: User): Promise<void> {
    if (actor.role !== 'manager') {
      return Promise.reject(new DomainError('forbidden', 'Only a manager can delete tasks'));
    }
    return this.tasks.delete(id);
  }
}
export class ChangeTaskStatus {
  constructor(private readonly tasks: TaskRepository) {}
  /** Pre-checks for fast feedback; the database re-validates authoritatively. */
  async execute(taskId: string, to: TaskStatus, actor: User, comment?: string): Promise<void> {
    const task = await this.tasks.get(taskId);
    const check = checkTransition(task, actor, to, comment);
    if (!check.ok) throw new DomainError(check.code, `Transition rejected: ${check.code}`);
    await this.tasks.updateStatus(taskId, to, comment?.trim());
  }
}

// ---- users
export class ListExecutors {
  constructor(private readonly users: UserRepository) {}
  execute(): Promise<User[]> {
    return this.users.listExecutors();
  }
}
export class ResolveUsers {
  constructor(private readonly users: UserRepository) {}
  execute(ids: readonly string[]): Promise<User[]> {
    return this.users.getMany([...new Set(ids)]);
  }
}
