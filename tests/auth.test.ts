import { describe, expect, it } from 'vitest';
import { authFailureMessage } from '@/lib/supabase/browser';

describe('Supabase player diagnostics', () => {
  it('explains the anonymous provider setting instead of hiding the Auth code', () => {
    expect(
      authFailureMessage({
        code: 'anonymous_provider_disabled',
        message: 'Anonymous sign-ins are disabled',
      }),
    ).toContain('Authentication → Sign In / Providers');
    expect(
      authFailureMessage({
        code: 'anonymous_provider_disabled',
        message: 'Anonymous sign-ins are disabled',
      }),
    ).toContain('anonymous_provider_disabled');
  });

  it('separates CAPTCHA, rate limits and network failures', () => {
    expect(authFailureMessage({ code: 'captcha_failed', message: 'captcha failed' })).toContain(
      'CAPTCHA',
    );
    expect(authFailureMessage({ status: 429, message: 'rate limit exceeded' })).toContain('limitó');
    expect(authFailureMessage({ message: 'Failed to fetch' })).toContain('llegar a Supabase');
  });
});
