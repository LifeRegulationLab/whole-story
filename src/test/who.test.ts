import { describe, expect, it } from 'vitest';
import { signedInAs } from '../lib/firebase/who';

const user = (providerId: string, email: string | null) => ({ email, providerData: [{ providerId }] }) as Parameters<typeof signedInAs>[0];

describe('signedInAs', () => {
  it('names Apple, Google and email sign-in', () => {
    expect(signedInAs(user('apple.com', 'a@privaterelay.appleid.com'))).toBe('Signed in with Apple as a@privaterelay.appleid.com.');
    expect(signedInAs(user('google.com', 'b@example.com'))).toBe('Signed in with Google as b@example.com.');
    expect(signedInAs(user('password', 'c@example.com'))).toBe('Signed in as c@example.com.');
  });
  it('copes with no email', () => {
    expect(signedInAs(user('apple.com', null))).toBe('Signed in with Apple.');
  });
});
