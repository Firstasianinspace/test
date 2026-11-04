export interface Header {
  readonly key: string;
  readonly value: string;
}

/**
 * Content Security Policy for the SPA. Everything is same-origin except API calls to Supabase.
 * No 'unsafe-inline' and no 'unsafe-eval': the build emits one external script and one stylesheet.
 */
export function contentSecurityPolicy(supabaseUrl: string): string {
  const api = supabaseUrl === '' ? '' : ` ${new URL(supabaseUrl).origin}`;
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${api}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Single source of truth for the headers served by Vercel (vercel.json) and `vite preview`. */
export function securityHeaders(supabaseUrl: string): Header[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(supabaseUrl) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}
