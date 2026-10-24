import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, Text } from '../components/ui';
import { firebaseConfigured } from '../lib/firebase/app';
import { createCircle, joinWithCode, passwordSignIn, resetPassword } from '../lib/firebase/account';
import { socialSignIn, type Social } from '../lib/firebase/social';
import type { CareFor, Circle, Region } from '../lib/model/types';
import { DEVICE_KEYS, newId, useStore } from '../lib/store/StoreProvider';
import { deviceStorage } from '../lib/store/local';

/**
 * First open: one optional box, then straight into the app. The rest (what is happening for them,
 * age, where they live) has sensible defaults and can be changed later in Me.
 */
export function Start() {
  const store = useStore();
  const navigate = useNavigate();
  const [person, setPerson] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNew, setIsNew] = useState(true);
  const [note, setNote] = useState('');
  const needsAccount = firebaseConfigured() && !store.user;

  const social = async (which: Social) => {
    setBusy(true);
    setError('');
    const e = await socialSignIn(which);
    setBusy(false);
    if (e) return setError(e);
    if (deviceStorage().getItem(DEVICE_KEYS.circle)) navigate('/signin');
  };

  const account = async () => {
    setBusy(true);
    setError('');
    const e = await passwordSignIn(email.trim(), password, isNew);
    setBusy(false);
    if (e) return setError(e);
    // Notes made while looking around are offered for moving into the new account.
    if (deviceStorage().getItem(DEVICE_KEYS.circle)) navigate('/signin');
  };

  const open = async (personName: string) => {
    setBusy(true);
    setError('');
    try {
      const details = { personName, careFor: ['other' as CareFor], ageBand: 'adult' as Circle['ageBand'], region: 'england' as Region };
      if (store.user) {
        const c = await createCircle(details, store.user.uid, store.carer.name || 'Me');
        store.chooseCircle(c.id);
        await store.refreshCircles();
      } else {
        store.setDeviceCircle({ ...details, id: newId(), createdAt: Date.now(), createdBy: 'device' });
      }
      navigate('/');
    } catch {
      setError('That did not save. Check the signal and try again.');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (!store.user) return;
    setBusy(true);
    setError('');
    try {
      const id = await joinWithCode(code, store.user.uid, store.carer.name || 'Family');
      await store.refreshCircles();
      store.chooseCircle(id);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-5 py-10">
      <h1 className="text-3xl font-semibold">Whole Story</h1>
      <p className="text-lg">For anyone looking after someone they love.</p>
      <ul className="muted flex list-disc flex-col gap-1 pl-5">
        <li>Write down what happens in a few taps, even with no signal.</li>
        <li>Know what to try when things are hard, right now.</li>
        <li>Keep medicines, as-needed doses and whether they helped.</li>
        <li>Make the papers services ask for: hospital passport, GP summary, respite handover, continuing healthcare and benefit evidence.</li>
        <li>Share the load with family, if you want to.</li>
      </ul>
      {needsAccount ? (
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
          <p className="muted text-sm">Your notes are kept safe in your account, so nothing is lost if you change phone. Family only see what you choose to share.</p>
          <button className="btn" disabled={busy} onClick={() => void open('Mum')}>
            Just look around first
          </button>
        </Card>
      ) : (
      <Card className="flex flex-col gap-3">
        <Text label="What do you call the person you look after?" hint="A first name or what the family calls them, such as Mum." value={person} onChange={setPerson} />
        {error ? <p className="warnbox">{error}</p> : null}
        <button className="btn btn-primary" disabled={!person.trim() || busy} onClick={() => void open(person.trim())}>
          Open the app
        </button>
        {!store.user ? (
          <button className="btn" disabled={busy} onClick={() => void open('Mum')}>
            Just look around first
          </button>
        ) : null}
        <p className="muted text-sm">You can change this and add more later in Me.</p>
      </Card>
      )}
      {store.user ? (
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Joining someone else’s family?</h2>
          <Text label="Code they sent you" value={code} onChange={setCode} />
          <button className="btn" disabled={code.trim().length < 6 || busy} onClick={() => void join()}>
            Join
          </button>
        </Card>
      ) : null}
    </main>
  );
}
