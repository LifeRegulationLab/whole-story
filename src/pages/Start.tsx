import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, Text } from '../components/ui';
import { signInFirst } from '../lib/firebase/app';
import { createCircle, passwordSignIn, resetPassword } from '../lib/firebase/account';
import { socialSignIn, type Social } from '../lib/firebase/social';
import { UNNAMED } from '../lib/model/name';
import type { CareFor, Circle, Region } from '../lib/model/types';
import { DEVICE_KEYS, newId, useStore } from '../lib/store/StoreProvider';
import { deviceStorage } from '../lib/store/local';

const DETAILS = { personName: UNNAMED, careFor: ['other' as CareFor], ageBand: 'adult' as Circle['ageBand'], region: 'england' as Region };

/**
 * The first page is sign-in and nothing else. Once signed in the app opens straight away: a first
 * circle is made with sensible defaults, and the name and the rest can be added later in Me.
 */
export function Start() {
  const store = useStore();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [note, setNote] = useState('');
  const making = useRef(false);
  const needsAccount = signInFirst() && !store.user;

  useEffect(() => {
    if (!store.loaded || needsAccount || making.current) return;
    // Notes made on this phone before signing in are offered for moving into the account.
    if (store.user && deviceStorage().getItem(DEVICE_KEYS.circle)) return void navigate('/signin', { replace: true });
    if (store.circle) return void navigate('/', { replace: true });
    making.current = true;
    void (async () => {
      try {
        if (store.user) {
          const c = await createCircle(DETAILS, store.user.uid, store.carer.name || 'Me');
          store.chooseCircle(c.id);
          await store.refreshCircles();
        } else {
          store.setDeviceCircle({ ...DETAILS, id: newId(), createdAt: Date.now(), createdBy: 'device' });
        }
        navigate('/', { replace: true });
      } catch {
        making.current = false;
        setError('That did not open. Check the signal and try again.');
      }
    })();
  }, [store, needsAccount, navigate]);

  const social = async (which: Social) => {
    setBusy(true);
    setError('');
    const e = await socialSignIn(which);
    setBusy(false);
    if (e) setError(e);
  };

  const account = async () => {
    setBusy(true);
    setError('');
    const e = await passwordSignIn(email.trim(), password, isNew);
    setBusy(false);
    if (e) setError(e);
  };

  if (!store.loaded || !needsAccount) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-5 py-10">
        {error ? (
          <>
            <p className="warnbox">{error}</p>
            <button className="btn" onClick={() => window.location.reload()}>
              Try again
            </button>
          </>
        ) : (
          <p className="muted">Opening…</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-5 py-10">
      <h1 className="text-3xl font-semibold">Whole Story</h1>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{isNew ? 'Make your account' : 'Sign in'}</h2>
        <button className="btn btn-primary" disabled={busy} onClick={() => void social('apple')}>
          Continue with Apple
        </button>
        <button className="btn" disabled={busy} onClick={() => void social('google')}>
          Continue with Google
        </button>
        <p className="muted text-center text-sm">or with your email</p>
        <Text label="Your email address" type="email" value={email} onChange={setEmail} />
        <Text label="Password" {...(isNew ? { hint: 'At least 8 characters.' } : {})} type="password" value={password} onChange={setPassword} />
        {error ? <p className="warnbox">{error}</p> : null}
        <button className="btn" disabled={!email.includes('@') || password.length < (isNew ? 8 : 1) || busy} onClick={() => void account()}>
          {isNew ? 'Make my account' : 'Sign in'}
        </button>
        <button className="btn" onClick={() => setIsNew(!isNew)}>
          {isNew ? 'I have an account' : 'I need an account'}
        </button>
        {!isNew ? (
          <button
            className="text-left text-sm underline"
            disabled={!email.includes('@')}
            onClick={() => void resetPassword(email.trim()).then(() => setNote('A link to set a new password is on its way.'), () => setNote('That did not send. Check the email address.'))}
          >
            Forgotten your password?
          </button>
        ) : null}
        {note ? <p className="muted text-sm">{note}</p> : null}
      </Card>
    </main>
  );
}
