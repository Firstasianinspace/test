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
import type { User } from '@/domain/user/User';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { toDomainError } from './errors';
import { toObject, toStatusChange, toTask, toUser } from './mappers';
import { historyRow, objectRow, profileRow, taskRow } from './rows';

function unwrap<T>(res: { data: T | null; error: { code?: string; message: string } | null }): T {
  if (res.error) throw toDomainError(res.error);
  if (res.data === null) throw new DomainError('not_found', 'Not found');
  return res.data;
}

export class SupabaseObjectRepository implements ObjectRepository {
  constructor(private readonly db: SupabaseClient) {}
  async list(): Promise<CrmObject[]> {
    const rows = unwrap(await this.db.from('objects').select('*').order('created_at'));
    return z.array(objectRow).parse(rows).map(toObject);
  }
  async get(id: string): Promise<CrmObject> {
    const row = unwrap(await this.db.from('objects').select('*').eq('id', id).single());
    return toObject(objectRow.parse(row));
  }
  async create(input: ObjectInput): Promise<CrmObject> {
    const row = unwrap(await this.db.from('objects').insert(input).select('*').single());
    return toObject(objectRow.parse(row));
  }
  async update(id: string, input: ObjectInput): Promise<CrmObject> {
    const row = unwrap(
      await this.db.from('objects').update(input).eq('id', id).select('*').single(),
    );
    return toObject(objectRow.parse(row));
  }
  async delete(id: string): Promise<void> {
    const { error } = await this.db.from('objects').delete().eq('id', id);
    if (error) throw toDomainError(error);
  }
}

export class SupabaseTaskRepository implements TaskRepository {
  constructor(private readonly db: SupabaseClient) {}
  async listByObject(objectId: string): Promise<Task[]> {
    const rows = unwrap(
      await this.db.from('tasks').select('*').eq('object_id', objectId).order('created_at'),
    );
    return z.array(taskRow).parse(rows).map(toTask);
  }
  async listAssignedTo(userId: string): Promise<Task[]> {
    const rows = unwrap(
      await this.db.from('tasks').select('*').eq('assignee_id', userId).order('created_at'),
    );
    return z.array(taskRow).parse(rows).map(toTask);
  }
  async get(id: string): Promise<Task> {
    const row = unwrap(await this.db.from('tasks').select('*').eq('id', id).single());
    return toTask(taskRow.parse(row));
  }
  async create(task: NewTask): Promise<Task> {
    const row = unwrap(
      await this.db
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          object_id: task.objectId,
          assignee_id: task.assigneeId,
        })
        .select('*')
        .single(),
    );
    return toTask(taskRow.parse(row));
  }
  async update(id: string, patch: TaskPatch): Promise<Task> {
    const values: {
      title?: string;
      description?: string;
      object_id?: string;
      assignee_id?: string | null;
    } = {};
    if (patch.title !== undefined) values.title = patch.title;
    if (patch.description !== undefined) values.description = patch.description;
    if (patch.objectId !== undefined) values.object_id = patch.objectId;
    if (patch.assigneeId !== undefined) values.assignee_id = patch.assigneeId;
    const row = unwrap(
      await this.db.from('tasks').update(values).eq('id', id).select('*').single(),
    );
    return toTask(taskRow.parse(row));
  }
  async delete(id: string): Promise<void> {
    const { error } = await this.db.from('tasks').delete().eq('id', id);
    if (error) throw toDomainError(error);
  }
  async updateStatus(id: string, to: TaskStatus, comment?: string): Promise<void> {
    const { error } = await this.db.rpc('change_task_status', {
      p_task_id: id,
      p_to: to,
      p_comment: comment ?? null,
    });
    if (error) throw toDomainError(error);
  }
  async history(taskId: string): Promise<StatusChange[]> {
    const rows = unwrap(
      await this.db
        .from('task_status_history')
        .select('*')
        .eq('task_id', taskId)
        .order('changed_at'),
    );
    return z.array(historyRow).parse(rows).map(toStatusChange);
  }
}

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly db: SupabaseClient) {}
  async listExecutors(): Promise<User[]> {
    const rows = unwrap(
      await this.db.from('profiles').select('*').eq('role', 'executor').order('full_name'),
    );
    return z.array(profileRow).parse(rows).map(toUser);
  }
  async getMany(ids: readonly string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = unwrap(
      await this.db
        .from('profiles')
        .select('*')
        .in('id', [...ids]),
    );
    return z.array(profileRow).parse(rows).map(toUser);
  }
}

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly db: SupabaseClient) {}
  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await this.db.auth.signInWithPassword({ email, password });
    if (error) throw new DomainError('unauthenticated', 'Неверный email или пароль');
    return this.profile(data.user.id);
  }
  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }
  async currentUser(): Promise<User | null> {
    const { data } = await this.db.auth.getSession();
    return data.session ? this.profile(data.session.user.id) : null;
  }
  private async profile(id: string): Promise<User> {
    const row = unwrap(await this.db.from('profiles').select('*').eq('id', id).single());
    return toUser(profileRow.parse(row));
  }
}
