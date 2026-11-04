import {
  ChangeTaskStatus,
  CreateObject,
  CreateTask,
  DeleteObject,
  DeleteTask,
  GetCurrentUser,
  GetObject,
  GetTask,
  GetTaskHistory,
  ListExecutors,
  ListMyTasks,
  ListObjects,
  ListObjectTasks,
  ResolveUsers,
  SignIn,
  SignOut,
  UpdateObject,
  UpdateTask,
} from '@/application/usecases/usecases';
import { supabase } from '@/infrastructure/supabase/client';
import {
  SupabaseAuthGateway,
  SupabaseObjectRepository,
  SupabaseTaskRepository,
  SupabaseUserRepository,
} from '@/infrastructure/supabase/repositories';
export function buildUseCases() {
  const auth = new SupabaseAuthGateway(supabase);
  const objects = new SupabaseObjectRepository(supabase);
  const tasks = new SupabaseTaskRepository(supabase);
  const users = new SupabaseUserRepository(supabase);
  return {
    signIn: new SignIn(auth),
    signOut: new SignOut(auth),
    getCurrentUser: new GetCurrentUser(auth),
    listObjects: new ListObjects(objects),
    getObject: new GetObject(objects),
    createObject: new CreateObject(objects),
    updateObject: new UpdateObject(objects),
    deleteObject: new DeleteObject(objects),
    listObjectTasks: new ListObjectTasks(tasks),
    listMyTasks: new ListMyTasks(tasks),
    getTask: new GetTask(tasks),
    getTaskHistory: new GetTaskHistory(tasks),
    createTask: new CreateTask(tasks),
    updateTask: new UpdateTask(tasks),
    deleteTask: new DeleteTask(tasks),
    changeTaskStatus: new ChangeTaskStatus(tasks),
    listExecutors: new ListExecutors(users),
    resolveUsers: new ResolveUsers(users),
  };
}
