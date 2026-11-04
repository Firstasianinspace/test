import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaders } from './securityHeaders';

const CLOUD = 'https://dapybxsjlvayagqivbjh.supabase.co';

interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[];
}

describe('security headers', () => {
  it('vercel.json serves exactly what securityHeaders() defines for the cloud project', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as VercelConfig;
    const all = config.headers.find((h) => h.source === '/(.*)');
    expect(all?.headers).toEqual(securityHeaders(CLOUD));
  });

  it('CSP allows scripts only from self and never inline or eval', () => {
    const csp = contentSecurityPolicy(CLOUD);
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain(`connect-src 'self' ${CLOUD}`);
    expect(csp).toContain("object-src 'none'");
  });

  it('only the Supabase origin (not a path or foreign host) is added to connect-src', () => {
    expect(contentSecurityPolicy(`${CLOUD}/rest/v1/`)).toContain(`connect-src 'self' ${CLOUD};`);
    expect(contentSecurityPolicy('')).toContain("connect-src 'self';");
  });
});
