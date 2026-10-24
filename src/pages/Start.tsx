import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, Chips, Choice, Text, toggle } from '../components/ui';
import { AGE_BANDS, CARE_FOR, REGIONS } from '../lib/content/setup';
import { firebaseConfigured } from '../lib/firebase/app';
import { createCircle, joinWithCode } from '../lib/firebase/account';
import type { CareFor, Circle, Region } from '../lib/model/types';
import { newId, useStore } from '../lib/store/StoreProvider';

/** First open: who you are caring for. Works with no account; an account can be made later. */
export function Start() {
  const store = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<'hello' | 'about'>(store.user ? 'about' : 'hello');
  const [name, setName] = useState(store.carer.name);
  const [person, setPerson] = useState('');
  const [careFor, setCareFor] = useState<CareFor[]>([]);
  const [ageBand, setAgeBand] = useState<Circle['ageBand']>();
  const [region, setRegion] = useState<Region>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = name.trim() && person.trim() && careFor.length > 0 && ageBand && region;

  const finish = async () => {
    if (!ready || !ageBand || !region) return;
    setBusy(true);
    setError('');
    try {
      await store.saveCarer({ ...store.carer, name: name.trim() });
      const details = { personName: person.trim(), careFor, ageBand, region };
      if (store.user) {
        const c = await createCircle(details, store.user.uid, name.trim());
        store.chooseCircle(c.id);
        await store.refreshCircles();
      } else {
        store.setDeviceCircle({ ...details, id: newId(), createdAt: Date.now(), createdBy: 'device' });
      }
      navigate('/them/about');
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
      if (name.trim()) await store.saveCarer({ ...store.carer, name: name.trim() });
      const id = await joinWithCode(code, store.user.uid, name.trim() || 'Family');
      await store.refreshCircles();
      store.chooseCircle(id);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'hello') {
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
        <button className="btn btn-primary" onClick={() => setStep('about')}>
          Start on this phone
        </button>
        {firebaseConfigured() ? (
          <Link to="/signin" className="btn">
            Sign in, or join a family with a code
          </Link>
        ) : null}
        <p className="muted text-sm">
          Starting on this phone needs no account. Nothing leaves the phone until you choose to share it.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-8">
      <h1 className="text-2xl font-semibold">Who are you looking after?</h1>
      <Card className="flex flex-col gap-4">
        <Text label="Your first name" value={name} onChange={setName} />
        <Text label="What you call them" hint="A first name or what the family calls them, such as Mum." value={person} onChange={setPerson} />
        <Chips label="What is happening for them? Choose any that fit." options={CARE_FOR} selected={careFor} onToggle={(c) => setCareFor((l) => toggle(l, c))} />
        <Choice label="Their age" options={AGE_BANDS} value={ageBand} onChange={setAgeBand} />
        <Choice label="Where they live" options={REGIONS} value={region} onChange={setRegion} />
        <p className="muted text-sm">This decides the helplines, benefit headings and papers offered. You can change it later.</p>
        {error ? <p className="warnbox">{error}</p> : null}
        <button className="btn btn-primary" disabled={!ready || busy} onClick={() => void finish()}>
          Carry on
        </button>
      </Card>
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
