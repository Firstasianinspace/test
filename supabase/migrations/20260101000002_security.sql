-- Security: private helpers, RLS, grants, policies.

create schema private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.current_app_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create function private.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role = 'manager' from public.profiles p where p.id = (select auth.uid())), false)
$$;

create function private.is_task_assignee(p_task_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task_id and t.assignee_id = (select auth.uid())
  )
$$;

create function private.has_task_in_object(p_object_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
    where t.object_id = p_object_id and t.assignee_id = (select auth.uid())
  )
$$;

-- An executor may see profiles of people connected to their tasks (authors, status-change actors).
create function private.can_see_profile(p_profile_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
    where t.assignee_id = (select auth.uid()) and t.author_id = p_profile_id
  ) or exists (
    select 1 from public.task_status_history h
    join public.tasks t on t.id = h.task_id
    where t.assignee_id = (select auth.uid()) and h.changed_by = p_profile_id
  )
$$;

-- Policies run with invoker rights, so `authenticated` needs EXECUTE on the helpers.
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_transitions enable row level security;
alter table public.task_status_history enable row level security;

-- Start from nothing, then grant the minimum.
revoke all on public.profiles, public.objects, public.tasks, public.task_transitions,
  public.task_status_history from anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.task_transitions to authenticated;
grant select on public.task_status_history to authenticated;

grant select, delete on public.objects to authenticated;
grant insert (name, address), update (name, address) on public.objects to authenticated;

-- `status`, `author_id`, `created_at` are deliberately not writable by API roles.
grant select, delete on public.tasks to authenticated;
grant insert (title, description, object_id, assignee_id),
      update (title, description, object_id, assignee_id) on public.tasks to authenticated;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_manager()) or (select private.can_see_profile(id)));

-- task_transitions: public reference data for signed-in users
create policy transitions_select on public.task_transitions for select to authenticated using (true);

-- objects
create policy objects_select on public.objects for select to authenticated
  using ((select private.is_manager()) or (select private.has_task_in_object(id)));
create policy objects_insert on public.objects for insert to authenticated
  with check ((select private.is_manager()));
create policy objects_update on public.objects for update to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));
create policy objects_delete on public.objects for delete to authenticated
  using ((select private.is_manager()));

-- tasks
create policy tasks_select on public.tasks for select to authenticated
  using ((select private.is_manager()) or assignee_id = (select auth.uid()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check ((select private.is_manager()));
create policy tasks_update on public.tasks for update to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));
create policy tasks_delete on public.tasks for delete to authenticated
  using ((select private.is_manager()));

-- history: read-only for API roles (no insert/update/delete grants and no such policies)
create policy history_select on public.task_status_history for select to authenticated
  using ((select private.is_manager()) or (select private.is_task_assignee(task_id)));
