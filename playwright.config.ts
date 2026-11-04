import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173' },
  webServer: {
    command: process.env.E2E_PREVIEW
      ? 'pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 5173 --strictPort'
      : 'pnpm dev --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
