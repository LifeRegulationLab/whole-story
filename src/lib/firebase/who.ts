import type { User } from 'firebase/auth';

/** Who is signed in, so a carer who signed in before can see it and switch account. */
export function signedInAs(user: Pick<User, 'email' | 'providerData'>): string {
  const provider = user.providerData[0]?.providerId;
  const how = provider === 'apple.com' ? ' with Apple' : provider === 'google.com' ? ' with Google' : '';
  return user.email ? `Signed in${how} as ${user.email}.` : `Signed in${how}.`;
}
