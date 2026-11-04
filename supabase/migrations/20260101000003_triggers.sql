-- Triggers: invariants enforced inside Postgres regardless of the caller.
-- Error SQLSTATEs (stable, mapped to DomainError in the frontend):
--   CRF01 forbidden | CRT01 invalid transition | CRC01 comment required
--   CRA01 assignee required | CRV01 invalid assignee | CRN01 not found | CRI01 immutable field

create function private.tasks_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if not private.is_manager() then
      raise exception 'Only a manager can create tasks' using errcode = 'CRF01';
    end if;
    new.author_id := (select auth.uid());
  end if;
  new.status := 'new';
  new.created_at := now();
  return new;
end $$;
create trigger tasks_before_insert before insert on public.tasks
  for each row execute function private.tasks_before_insert();

create function private.tasks_check_assignee() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.profiles p where p.id = new.assignee_id and p.role = 'executor'
  ) then
    raise exception 'Assignee must be an executor' using errcode = 'CRV01';
  end if;
  return new;
end $$;
create trigger tasks_check_assignee before insert or update of assignee_id on public.tasks
  for each row execute function private.tasks_check_assignee();

create function private.tasks_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'id, author and creation date are immutable' using errcode = 'CRI01';
  end if;
  return new;
end $$;
create trigger tasks_immutable before update on public.tasks
  for each row execute function private.tasks_immutable();

create function private.tasks_validate_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_rule public.task_transitions%rowtype;
  v_uid uuid := (select auth.uid());
  v_comment text := nullif(btrim(coalesce(current_setting('app.transition_comment', true), '')), '');
begin
  select * into v_rule from public.task_transitions
   where from_status = old.status and to_status = new.status;
  if not found then
    raise exception 'Transition % -> % is not allowed', old.status, new.status using errcode = 'CRT01';
  end if;

  if v_rule.actor = 'manager' then
    if not private.is_manager() then
      raise exception 'Only a manager can do this transition' using errcode = 'CRF01';
    end if;
  else
    if old.assignee_id is null then
      raise exception 'Task has no assignee' using errcode = 'CRA01';
    end if;
    if v_uid is distinct from old.assignee_id then
      raise exception 'Only the assigned executor can do this transition' using errcode = 'CRF01';
    end if;
  end if;

  if v_rule.requires_comment and v_comment is null then
    raise exception 'Comment is required' using errcode = 'CRC01';
  end if;
  return new;
end $$;
create trigger tasks_validate_status_change before update of status on public.tasks
  for each row when (old.status is distinct from new.status)
  execute function private.tasks_validate_status_change();

create function private.tasks_log_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.task_status_history (task_id, from_status, to_status, changed_by)
  values (new.id, null, new.status, new.author_id);
  return new;
end $$;
create trigger tasks_log_insert after insert on public.tasks
  for each row execute function private.tasks_log_insert();

create function private.tasks_log_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.task_status_history (task_id, from_status, to_status, comment, changed_by)
  values (new.id, old.status, new.status,
          nullif(btrim(coalesce(current_setting('app.transition_comment', true), '')), ''),
          (select auth.uid()));
  perform set_config('app.transition_comment', '', true);
  return new;
end $$;
create trigger tasks_log_status_change after update of status on public.tasks
  for each row when (old.status is distinct from new.status)
  execute function private.tasks_log_status_change();

-- Trigger functions are never called directly; nobody needs EXECUTE on them.
revoke execute on function
  private.tasks_before_insert(), private.tasks_check_assignee(), private.tasks_immutable(),
  private.tasks_validate_status_change(), private.tasks_log_insert(), private.tasks_log_status_change()
from public, anon, authenticated;
