/**
 * Creates demo users + data in a CLOUD Supabase project.
 * Run locally by a human. The service_role key comes from the shell environment only:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SEED_PASSWORD=… SUPABASE_ANON_KEY=… pnpm tsx scripts/seed-cloud.ts
 * Never commit the key.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD;
if (!url || !key || !password) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_PASSWORD in your shell');
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const people = [
  { email: 'manager@example.com', name: 'Анна Руководитель', role: 'manager' },
  { email: 'ivan@example.com', name: 'Иван Исполнитель', role: 'executor' },
  { email: 'petr@example.com', name: 'Пётр Исполнитель', role: 'executor' },
] as const;

const ids: Record<string, string> = {};
for (const p of people) {
  const { data, error } = await admin.auth.admin.createUser({
    email: p.email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  ids[p.email] = data.user.id;
  const { error: pe } = await admin
    .from('profiles')
    .insert({ id: data.user.id, full_name: p.name, role: p.role });
  if (pe) throw pe;
}

const anonKey = process.env.SUPABASE_ANON_KEY;
if (!anonKey) throw new Error('Set SUPABASE_ANON_KEY');
const make = async (email: string) => {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
};

// Data goes through the real API as real users so history is produced by the database itself.
const m = await make('manager@example.com');
const ivan = await make('ivan@example.com');
const petr = await make('petr@example.com');

const obj = async (name: string, address: string) => {
  const { data, error } = await m.from('objects').insert({ name, address }).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
};
const task = async (object_id: string, title: string, assignee: string | null) => {
  const { data, error } = await m
    .from('tasks')
    .insert({ object_id, title, description: '', assignee_id: assignee })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
};
const go = async (c: typeof m, id: string, to: string, comment?: string) => {
  const { error } = await c.rpc('change_task_status', {
    p_task_id: id,
    p_to: to,
    p_comment: comment ?? null,
  });
  if (error) throw error;
};

const o1 = await obj('ЖК «Северный»', 'г. Москва, ул. Северная, 12');
const o2 = await obj('Склад на Промышленной', 'г. Тверь, ул. Промышленная, 5');
const o3 = await obj('Коттедж Озёрный', 'Московская обл., пос. Озёрный, уч. 8');
const iv = ids['ivan@example.com'] ?? '';
const pe = ids['petr@example.com'] ?? '';

await task(o1, 'Подготовить площадку', iv);
const prog = await task(o1, 'Залить фундамент', iv);
await go(ivan, prog, 'in_progress');
const rev = await task(o2, 'Монтаж каркаса', iv);
await go(ivan, rev, 'in_progress');
await go(ivan, rev, 'on_review', 'Каркас смонтирован, прошу проверить.');
const acc = await task(o2, 'Устройство кровли', pe);
await go(petr, acc, 'in_progress');
await go(petr, acc, 'on_review');
await go(m, acc, 'accepted', 'Принято.');
const rew = await task(o3, 'Электропроводка', pe);
await go(petr, rew, 'in_progress');
await go(petr, rew, 'on_review');
await go(m, rew, 'needs_rework', 'Нет заземления в санузле.');
await task(o3, 'Отделка фасада', pe);
console.log('Cloud seed done');
