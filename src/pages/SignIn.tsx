import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, Text } from '../components/ui';
import { firebaseConfigured } from '../lib/firebase/app';
import { createCircle, finishLink, importIntoCircle, sendLink } from '../lib/firebase/account';
import { COLLECTIONS, PRIVATE } from '../lib/store/backend';
import { DEVICE_KEYS, useStore } from '../lib/store/StoreProvider';
import { deviceStorage } from '../lib/store/local';

/** Sign in with a link sent by email. No password. Then move anything already on this phone. */
export function SignIn() {
  const store = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'ask' | 'sent' | 'need-email' | 'moving' | 'error'>('ask');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!firebaseConfigured()) return;
    void finishLink().then((r) => {
      if (r === 'need-email') setState('need-email');
    }).catch(() => {
      setState('error');
      setError('That link did not work. It may have been used already or be more than an hour old. Ask for a new one.');
    });
  }, []);

  const deviceCircle = store.user && !store.shared ? (store.circle ?? null) : null;
  const hasDevice = Boolean(deviceStorage().getItem(DEVICE_KEYS.circle));

  useEffect(() => {
    if (!store.user) return;
    if (store.circles.length > 0 && !hasDevice) navigate('/', { replace: true });
  }, [store.user, store.circles.length, hasDevice, navigate]);

  const send = async () => {
    setError('');
    try {
      await sendLink(email.trim());
      setState('sent');
    } catch {
      setError('The link was not sent. Check the email address and the signal.');
    }
  };

  const finishWithEmail = async () => {
    try {
      await finishLink(email.trim());
    } catch {
      setError('That did not work. Check it is the same email address the link was sent to.');
    }
  };

  const move = async () => {
    if (!store.user) return;
    setState('moving');
    const raw = deviceStorage().getItem(DEVICE_KEYS.circle);
    if (!raw) return;
    try {
      const old = JSON.parse(raw) as { personName: string; careFor: []; ageBand: 'adult'; region: 'england' };
      const c = await createCircle(
        { personName: old.personName, careFor: old.careFor, ageBand: old.ageBand, region: old.region },
        store.user.uid,
        store.carer.name || 'Me',
      );
      const names = [...COLLECTIONS, ...PRIVATE, 'doc:about', 'doc:crisis'];
      await importIntoCircle(c.id, store.device.dump(names), store.user.uid);
      await store.saveCarer({ ...store.carer, uid: store.user.uid });
      store.device.clear(names);
      deviceStorage().removeItem(DEVICE_KEYS.circle);
      store.chooseCircle(c.id);
      await store.refreshCircles();
      navigate('/family');
    } catch {
      setState('error');
      setError('Moving did not finish. Nothing on this phone was removed. Try again with a better signal.');
    }
  };

  if (!firebaseConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-5 py-10">
        <p>Sharing with family is not switched on in this version. Everything stays on this phone.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-10">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {store.user ? (
        <Card className="flex flex-col gap-3">
          <p>Signed in as {store.user.email}.</p>
          {hasDevice ? (
            <>
              <p>
                There are notes on this phone{deviceCircle ? ` about ${deviceCircle.personName}` : ''}. Move them into your account so
                family can see what you choose to share, and so they are kept if you lose the phone.
              </p>
              <button className="btn btn-primary" disabled={state === 'moving'} onClick={() => void move()}>
                {state === 'moving' ? 'Moving…' : 'Move them into my account'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/start')}>
              Carry on
            </button>
          )}
        </Card>
      ) : state === 'sent' ? (
        <Card>
          <p>A sign-in link is on its way to {email}. Open it on this phone. It works once and lasts an hour.</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <Text label="Your email address" type="email" value={email} onChange={setEmail} />
          <button className="btn btn-primary" disabled={!email.includes('@')} onClick={() => void (state === 'need-email' ? finishWithEmail() : send())}>
            {state === 'need-email' ? 'Finish signing in' : 'Send me a link'}
          </button>
          <p className="muted text-sm">
            {state === 'need-email'
              ? 'Type the email address the link was sent to.'
              : 'You get an email with a link. There is no password to remember.'}
          </p>
        </Card>
      )}
      {error ? <p className="warnbox">{error}</p> : null}
    </main>
  );
}
