import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, Text } from '../components/ui';
import { firebaseConfigured } from '../lib/firebase/app';
import { createCircle, joinWithCode } from '../lib/firebase/account';
import type { CareFor, Circle, Region } from '../lib/model/types';
import { newId, useStore } from '../lib/store/StoreProvider';

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
      <Card className="flex flex-col gap-3">
        <Text label="What do you call the person you look after?" hint="A first name or what the family calls them, such as Mum." value={person} onChange={setPerson} />
        {error ? <p className="warnbox">{error}</p> : null}
        <button className="btn btn-primary" disabled={!person.trim() || busy} onClick={() => void open(person.trim())}>
          Open the app
        </button>
        <button className="btn" disabled={busy} onClick={() => void open('Mum')}>
          Just look around first
        </button>
        <p className="muted text-sm">No account needed. Nothing leaves this phone until you choose to share it. You can change everything later.</p>
      </Card>
      {store.user ? (
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Joining someone else’s family?</h2>
          <Text label="Code they sent you" value={code} onChange={setCode} />
          <button className="btn" disabled={code.trim().length < 6 || busy} onClick={() => void join()}>
            Join
          </button>
        </Card>
      ) : firebaseConfigured() ? (
        <Link to="/signin" className="btn">
          Sign in, or join a family with a code
        </Link>
      ) : null}
    </main>
  );
}
