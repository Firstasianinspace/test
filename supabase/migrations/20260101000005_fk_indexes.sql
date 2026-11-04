-- Cover the remaining foreign keys flagged by the Supabase performance advisor.
-- tasks.author_id and task_status_history.changed_by are filtered by private.can_see_profile()
-- on every executor read of `profiles`, so these indexes matter for RLS, not just for joins.
create index tasks_author_id_idx on public.tasks (author_id);
create index task_status_history_changed_by_idx on public.task_status_history (changed_by);
create index objects_created_by_idx on public.objects (created_by);
