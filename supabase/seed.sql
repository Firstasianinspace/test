-- Local development seed. Passwords here are for LOCAL demo users only.
-- Manager:   manager@example.com   / password123
-- Executors: ivan@example.com, petr@example.com / password123

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'manager@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'ivan@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'petr@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u;

insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Анна Руководитель', 'manager'),
  ('22222222-2222-2222-2222-222222222222', 'Иван Исполнитель', 'executor'),
  ('33333333-3333-3333-3333-333333333333', 'Пётр Исполнитель', 'executor');

do $$
declare
  c_manager constant uuid := '11111111-1111-1111-1111-111111111111';
  c_ivan constant uuid := '22222222-2222-2222-2222-222222222222';
  c_petr constant uuid := '33333333-3333-3333-3333-333333333333';
  o1 constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  o2 constant uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  o3 constant uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  t_new constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  t_prog constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  t_rev constant uuid := 'bbbbbbbb-0000-0000-0000-000000000003';
  t_acc constant uuid := 'bbbbbbbb-0000-0000-0000-000000000004';
  t_rew constant uuid := 'bbbbbbbb-0000-0000-0000-000000000005';
  t_petr constant uuid := 'bbbbbbbb-0000-0000-0000-000000000006';
  t_free constant uuid := 'bbbbbbbb-0000-0000-0000-000000000007';

begin
  perform set_config('request.jwt.claims', json_build_object('sub', c_manager, 'role', 'authenticated')::text, true);

  insert into public.objects (id, name, address) values
    (o1, 'ЖК «Северный»', 'г. Москва, ул. Северная, 12'),
    (o2, 'Склад на Промышленной', 'г. Тверь, ул. Промышленная, 5'),
    (o3, 'Коттедж Озёрный', 'Московская обл., пос. Озёрный, уч. 8');

  insert into public.tasks (id, object_id, title, description, assignee_id) values
    (t_new, o1, 'Подготовить площадку', 'Расчистить территорию и разметить границы.', c_ivan),
    (t_prog, o1, 'Залить фундамент', 'Бетон М300, армирование по проекту.', c_ivan),
    (t_rev, o2, 'Монтаж каркаса', 'Металлический каркас склада, секции A–C.', c_ivan),
    (t_acc, o2, 'Устройство кровли', 'Профнастил, утепление 150 мм.', c_petr),
    (t_rew, o3, 'Электропроводка', 'Разводка по первому этажу.', c_petr),
    (t_petr, o3, 'Отделка фасада', 'Штукатурка и покраска.', c_petr),
    (t_free, o3, 'Благоустройство участка', 'Пока без исполнителя.', null);

  -- Walk tasks through the real RPC so history is consistent.
  perform set_config('request.jwt.claims', json_build_object('sub', c_ivan, 'role', 'authenticated')::text, true);
  perform public.change_task_status(t_prog, 'in_progress');
  perform public.change_task_status(t_rev, 'in_progress');
  perform public.change_task_status(t_rev, 'on_review', 'Каркас смонтирован, прошу проверить.');

  perform set_config('request.jwt.claims', json_build_object('sub', c_petr, 'role', 'authenticated')::text, true);
  perform public.change_task_status(t_acc, 'in_progress');
  perform public.change_task_status(t_acc, 'on_review');
  perform public.change_task_status(t_rew, 'in_progress');
  perform public.change_task_status(t_rew, 'on_review');

  perform set_config('request.jwt.claims', json_build_object('sub', c_manager, 'role', 'authenticated')::text, true);
  perform public.change_task_status(t_acc, 'accepted', 'Принято, замечаний нет.');
  perform public.change_task_status(t_rew, 'needs_rework', 'Нет заземления в санузле, доделать.');

  perform set_config('request.jwt.claims', '', true);

end $$;
