import { describe, expect, it } from 'vitest';
import { resolveProfileImageUrl } from '@/api/user';

describe('resolveProfileImageUrl', () => {
  it('returns undefined for an empty value', () => {
    expect(resolveProfileImageUrl(undefined)).toBeUndefined();
    expect(resolveProfileImageUrl(null)).toBeUndefined();
    expect(resolveProfileImageUrl('')).toBeUndefined();
  });

  it('leaves absolute Google and data URLs untouched', () => {
    const google = 'https://lh3.googleusercontent.com/a/avatar=s96-c';

    expect(resolveProfileImageUrl(google)).toBe(google);
    expect(resolveProfileImageUrl('data:image/png;base64,AAAA')).toBe(
      'data:image/png;base64,AAAA'
    );
  });

  it('does not duplicate the API prefix on a stored managed image path', () => {
    const stored = '/goevent/api/images/profile/6/b3c71b0f-03d1-4bb7-b933-2d8eef4c3bf2.jpg';

    const resolved = resolveProfileImageUrl(stored);

    expect(resolved).not.toContain('/goevent/api/goevent/api');
    expect(resolved?.endsWith(stored)).toBe(true);
  });

  it('prefixes a legacy relative value exactly once', () => {
    const resolved = resolveProfileImageUrl('profile/6/legacy.jpg');

    expect(resolved).not.toContain('profile/profile');
    expect(resolved?.endsWith('/profile/6/legacy.jpg')).toBe(true);
  });
});
