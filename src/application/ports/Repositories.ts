import type { CrmObject } from '@/domain/object/CrmObject';
import type { StatusChange, Task } from '@/domain/task/Task';
import type { TaskStatus } from '@/domain/task/TaskStatus';
import type { User } from '@/domain/user/User';

export interface TaskPatch {
  readonly title?: string;
  readonly description?: string;
  readonly objectId?: string;
  readonly assigneeId?: string | null;
}

export interface NewTask {
  readonly title: string;
  readonly description: string;
  readonly objectId: string;
  readonly assigneeId: string | null;
}

export interface TaskRepository {
  listByObject(objectId: string): Promise<Task[]>;
  listAssignedTo(userId: string): Promise<Task[]>;
  get(id: string): Promise<Task>;
  create(task: NewTask): Promise<Task>;
  update(id: string, patch: TaskPatch): Promise<Task>;
  delete(id: string): Promise<void>;
  /** Must go through the database RPC; the database is the authority. */
  updateStatus(id: string, to: TaskStatus, comment?: string): Promise<void>;
  history(taskId: string): Promise<StatusChange[]>;
}

export interface ObjectInput {
  readonly name: string;
  readonly address: string;
}

export interface ObjectRepository {
  list(): Promise<CrmObject[]>;
  get(id: string): Promise<CrmObject>;
  create(input: ObjectInput): Promise<CrmObject>;
  update(id: string, input: ObjectInput): Promise<CrmObject>;
  delete(id: string): Promise<void>;
}

export interface UserRepository {
  listExecutors(): Promise<User[]>;
  getMany(ids: readonly string[]): Promise<User[]>;
}

export interface AuthGateway {
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  currentUser(): Promise<User | null>;
}
