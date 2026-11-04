import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error('Run via `pnpm test:db` (needs local Supabase running)');

export const IDS = {
  manager: '11111111-1111-1111-1111-111111111111',
  ivan: '22222222-2222-2222-2222-222222222222',
  petr: '33333333-3333-3333-3333-333333333333',
  obj1: 'aaaaaaaa-0000-0000-0000-000000000001',
  obj3: 'aaaaaaaa-0000-0000-0000-000000000003',
  tNew: 'bbbbbbbb-0000-0000-0000-000000000001', // Ivan, new
  tProg: 'bbbbbbbb-0000-0000-0000-000000000002', // Ivan, in_progress
  tReview: 'bbbbbbbb-0000-0000-0000-000000000003', // Ivan, on_review
  tPetrRework: 'bbbbbbbb-0000-0000-0000-000000000005', // Petr, needs_rework
  tFree: 'bbbbbbbb-0000-0000-0000-000000000007', // no assignee
} as const;

export const anonClient = () => createClient(url, anon, { auth: { persistSession: false } });
export type Client = ReturnType<typeof anonClient>;

export async function login(email: string): Promise<Client> {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password: 'password123' });
  if (error) throw error;
  return c;
}
export const asManager = () => login('manager@example.com');
export const asIvan = () => login('ivan@example.com');
export const asPetr = () => login('petr@example.com');
