-- Schema: enums, tables, indexes, transition registry.

create type public.user_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'on_review', 'accepted', 'needs_rework');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (btrim(full_name) <> ''),
  role public.user_role not null
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  address text not null default '',
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  assignee_id uuid references public.profiles (id) on delete set null,
  author_id uuid default auth.uid() references public.profiles (id),
  status public.task_status not null default 'new',
  created_at timestamptz not null default now()
);
create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

-- DB-side registry of allowed transitions (mirrors domain TRANSITIONS).
create table public.task_transitions (
  from_status public.task_status not null,
  to_status public.task_status not null,
  actor text not null check (actor in ('manager', 'assignee')),
  requires_comment boolean not null default false,
  primary key (from_status, to_status)
);
insert into public.task_transitions (from_status, to_status, actor, requires_comment) values
  ('new', 'in_progress', 'assignee', false),
  ('in_progress', 'on_review', 'assignee', false),
  ('on_review', 'accepted', 'manager', false),
  ('on_review', 'needs_rework', 'manager', true),
  ('needs_rework', 'in_progress', 'assignee', false);

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status,
  to_status public.task_status not null,
  comment text,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default clock_timestamp()
);
create index task_status_history_task_id_idx on public.task_status_history (task_id);
