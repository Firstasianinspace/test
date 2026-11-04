import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { securityHeaders } from './securityHeaders';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `vite preview` serves the production build with the same headers Vercel sends.
  preview: {
    headers: Object.fromEntries(
      securityHeaders(process.env.VITE_SUPABASE_URL ?? '').map((h) => [h.key, h.value]),
    ),
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
