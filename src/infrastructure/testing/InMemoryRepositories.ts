import type {
  AuthGateway,
  NewTask,
  ObjectInput,
  ObjectRepository,
  TaskPatch,
  TaskRepository,
  UserRepository,
} from '@/application/ports/Repositories';
import type { CrmObject } from '@/domain/object/CrmObject';
import { DomainError } from '@/domain/shared/DomainError';
import type { StatusChange, Task } from '@/domain/task/Task';
import type { TaskStatus } from '@/domain/task/TaskStatus';
import { checkTransition } from '@/domain/task/TaskStatusMachine';
import type { User } from '@/domain/user/User';

export class InMemoryUserRepository implements UserRepository {
  constructor(readonly users: User[] = []) {}
  listExecutors(): Promise<User[]> {
    return Promise.resolve(this.users.filter((u) => u.role === 'executor'));
  }
  getMany(ids: readonly string[]): Promise<User[]> {
    return Promise.resolve(this.users.filter((u) => ids.includes(u.id)));
  }
}

export class InMemoryAuthGateway implements AuthGateway {
  private current: User | null = null;
  constructor(
    private readonly users: User[],
    private readonly passwords: Record<string, string> = {},
  ) {}
  signIn(email: string, password: string): Promise<User> {
    const user = this.users.find((u) => u.id === email);
    if (!user || this.passwords[email] !== password) {
      return Promise.reject(new DomainError('unauthenticated', 'Invalid credentials'));
    }
    this.current = user;
    return Promise.resolve(user);
  }
  signOut(): Promise<void> {
    this.current = null;
    return Promise.resolve();
  }
  currentUser(): Promise<User | null> {
    return Promise.resolve(this.current);
  }
}

export class InMemoryObjectRepository implements ObjectRepository {
  private items: CrmObject[] = [];
  private seq = 0;
  list(): Promise<CrmObject[]> {
    return Promise.resolve([...this.items]);
  }
  get(id: string): Promise<CrmObject> {
    const found = this.items.find((o) => o.id === id);
    return found ? Promise.resolve(found) : Promise.reject(new DomainError('not_found', 'Object'));
  }
  create(input: ObjectInput): Promise<CrmObject> {
    const obj: CrmObject = { id: `o${String(++this.seq)}`, ...input, createdAt: new Date() };
    this.items.push(obj);
    return Promise.resolve(obj);
  }
  async update(id: string, input: ObjectInput): Promise<CrmObject> {
    const current = await this.get(id);
    const next = { ...current, ...input };
    this.items = this.items.map((o) => (o.id === id ? next : o));
    return next;
  }
  delete(id: string): Promise<void> {
    this.items = this.items.filter((o) => o.id !== id);
    return Promise.resolve();
  }
}

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Task[] = [];
  private changes: StatusChange[] = [];
  private seq = 0;
  /** The "logged in" user; the real database uses auth.uid(). */
  actor: User | null = null;

  listByObject(objectId: string): Promise<Task[]> {
    return Promise.resolve(this.tasks.filter((t) => t.objectId === objectId));
  }
  listAssignedTo(userId: string): Promise<Task[]> {
    return Promise.resolve(this.tasks.filter((t) => t.assigneeId === userId));
  }
  get(id: string): Promise<Task> {
    const found = this.tasks.find((t) => t.id === id);
    return found ? Promise.resolve(found) : Promise.reject(new DomainError('not_found', 'Task'));
  }
  create(input: NewTask): Promise<Task> {
    const task: Task = {
      id: `t${String(++this.seq)}`,
      ...input,
      authorId: this.actor?.id ?? 'unknown',
      status: 'new',
      createdAt: new Date(),
    };
    this.tasks.push(task);
    this.log(task.id, null, 'new', null);
    return Promise.resolve(task);
  }
  async update(id: string, patch: TaskPatch): Promise<Task> {
    const current = await this.get(id);
    const next: Task = {
      ...current,
      title: patch.title ?? current.title,
      description: patch.description ?? current.description,
      objectId: patch.objectId ?? current.objectId,
      assigneeId: patch.assigneeId === undefined ? current.assigneeId : patch.assigneeId,
    };
    this.tasks = this.tasks.map((t) => (t.id === id ? next : t));
    return next;
  }
  delete(id: string): Promise<void> {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.changes = this.changes.filter((c) => c.taskId !== id);
    return Promise.resolve();
  }
  async updateStatus(id: string, to: TaskStatus, comment?: string): Promise<void> {
    const task = await this.get(id);
    if (!this.actor) throw new DomainError('unauthenticated', 'Not signed in');
    const check = checkTransition(task, this.actor, to, comment);
    if (!check.ok) throw new DomainError(check.code, 'Rejected by in-memory database');
    this.tasks = this.tasks.map((t) => (t.id === id ? { ...t, status: to } : t));
    this.log(id, task.status, to, comment?.trim() ?? null);
  }
  history(taskId: string): Promise<StatusChange[]> {
    return Promise.resolve(this.changes.filter((c) => c.taskId === taskId));
  }
  private log(taskId: string, from: TaskStatus | null, to: TaskStatus, comment: string | null) {
    this.changes.push({
      id: `h${String(this.changes.length + 1)}`,
      taskId,
      fromStatus: from,
      toStatus: to,
      comment: comment === '' ? null : comment,
      changedBy: this.actor?.id ?? 'unknown',
      changedAt: new Date(),
    });
  }
}
