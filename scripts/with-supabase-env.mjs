// Runs a command with SUPABASE_URL / SUPABASE_ANON_KEY of the LOCAL stack (never cloud, never service_role).
import { execFileSync, spawnSync } from 'node:child_process';

const out = execFileSync('pnpm', ['--silent', 'supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
});
const env = Object.fromEntries(
  out
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const [cmd, ...args] = process.argv.slice(2);
const res = spawnSync(cmd, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    SUPABASE_URL: env.API_URL,
    SUPABASE_ANON_KEY: env.ANON_KEY,
    VITE_SUPABASE_URL: env.API_URL,
    VITE_SUPABASE_ANON_KEY: env.ANON_KEY,
  },
});
process.exit(res.status ?? 1);
