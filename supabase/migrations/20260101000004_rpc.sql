-- The only way for clients to change a task status.

create function public.change_task_status(
  p_task_id uuid,
  p_to public.task_status,
  p_comment text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_task public.tasks%rowtype;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'CRF01';
  end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  -- Hide existence of tasks the caller cannot see.
  if not found or not (private.is_manager() or v_task.assignee_id = v_uid) then
    raise exception 'Task not found' using errcode = 'CRN01';
  end if;

  if p_to = v_task.status then
    raise exception 'Transition % -> % is not allowed', v_task.status, p_to using errcode = 'CRT01';
  end if;

  perform set_config('app.transition_comment', coalesce(p_comment, ''), true);
  update public.tasks set status = p_to where id = p_task_id;
end $$;

revoke execute on function public.change_task_status(uuid, public.task_status, text) from public, anon;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;
