import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, Chips, Choice, Page, Text, toggle } from '../components/ui';
import { AGE_BANDS, CARE_FOR, REGIONS } from '../lib/content/setup';
import { firebaseConfigured } from '../lib/firebase/app';
import { deleteEverything, openBilling, signOut, updateCircle } from '../lib/firebase/account';
import { helperAvailable } from '../lib/helper/client';
import { formatDate } from '../lib/logic/summaries';
import type { Carer, Circle } from '../lib/model/types';
import { COLLECTIONS, PRIVATE } from '../lib/store/backend';
import { deviceStorage } from '../lib/store/local';
import { saveFile } from '../lib/shell';
import { DEVICE_KEYS, useStore } from '../lib/store/StoreProvider';

const TEXT_KEY = 'whole-story:text-size';

/** The carer's own page: how they are, what helps them, settings, their records. */
export function Me() {
  const { carer } = useStore();
  return <MeForm key={JSON.stringify(carer)} />;
}

function MeForm() {
  const store = useStore();
  const { carer, data, user, circle, shared, isLead, circles, plus } = store;
  const [billingNote, setBillingNote] = useState('');
  const thanks = new URLSearchParams(window.location.search).get('plus') === 'thanks';
  const navigate = useNavigate();
  const [c, setC] = useState<Carer>(carer);
  const [newHelp, setNewHelp] = useState('');
  const [size, setSize] = useState(deviceStorage().getItem(TEXT_KEY) ?? 'normal');
  useEffect(() => {
    document.documentElement.dataset['text'] = size;
    deviceStorage().setItem(TEXT_KEY, size);
  }, [size]);
  if (!circle) return null;

  const recent = [...data.checkins].sort((a, b) => b.at - a.at).slice(0, 14);
  const hard = recent.filter((x) => x.level >= 3).length;

  const exportAll = async () => {
    const payload = { exported: new Date().toISOString(), circle, carer, ...data };
    await saveFile(`Whole Story records - ${circle.personName}.json`, new TextEncoder().encode(JSON.stringify(payload, null, 2)), 'application/json');
  };

  const wipe = async () => {
    if (!window.confirm('Delete everything? Save a copy first if you want one. This cannot be undone.')) return;
    if (user) {
      try {
        await deleteEverything(user);
      } catch {
        window.alert('Not everything was deleted. For safety you may need to sign in again first, then try again.');
        return;
      }
    }
    store.device.clear([...COLLECTIONS, ...PRIVATE, 'doc:about', 'doc:crisis']);
    deviceStorage().removeItem(DEVICE_KEYS.circle);
    deviceStorage().removeItem(DEVICE_KEYS.carer);
    window.location.assign('/start');
  };

  return (
    <Page title={`Me${c.name ? `: ${c.name}` : ''}`} back="/">
      {helperAvailable() ? (
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Ask</h2>
          <p className="muted text-sm">Ask everyday caring questions and get plain answers. It never gives medical advice.</p>
          {user ? (
            <>
              <button
                className={carer.helperOn ? 'btn' : 'btn btn-primary'}
                onClick={() => {
                  const next = { ...carer, helperOn: !carer.helperOn };
                  setC({ ...c, helperOn: next.helperOn });
                  void store.saveCarer(next);
                }}
              >
                {carer.helperOn ? 'Switch Ask off' : 'Switch Ask on'}
              </button>
              {carer.helperOn ? (
                <Link to="/ask" className="btn">
                  Open Ask
                </Link>
              ) : null}
              <div className="mt-2 border-t border-[var(--line)] pt-3">
                <h3 className="font-semibold">Whole Story Plus</h3>
                {plus ? (
                  <>
                    <p className="muted text-sm">You have Plus. Thank you.</p>
                    <button className="btn mt-2" onClick={() => void openBilling('portal').then((e) => setBillingNote(e ?? ''))}>
                      Change card or cancel Plus
                    </button>
                  </>
                ) : (
                  <>
                    <p className="muted text-sm">Ask is part of Plus, paid monthly, cancel any time. Everything else in the app stays free.</p>
                    <button className="btn btn-primary mt-2" onClick={() => void openBilling('checkout').then((e) => setBillingNote(e ?? ''))}>
                      Get Plus
                    </button>
                  </>
                )}
                {billingNote ? <p className="warnbox mt-2">{billingNote}</p> : null}
                {thanks ? <p className="muted mt-2 text-sm">Payment done. Plus switches on within a minute.</p> : null}
              </div>
            </>
          ) : (
            <Link to="/start" className="btn btn-primary">
              Make an account to use Ask
            </Link>
          )}
        </Card>
      ) : null}
      <Card>
        <h2 className="mb-1 font-semibold">How you have been</h2>
        <p className="muted mb-2 text-sm">Only you see this. It is never shared with family.</p>
        {recent.length === 0 ? <p className="muted text-sm">No check-ins yet. Today shows the question once a day.</p> : null}
        <ul className="flex flex-wrap gap-2">
          {recent.map((x) => (
            <li key={x.id} className="chip" title={formatDate(x.at)}>
              {new Date(x.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}: {carer.levelWords[x.level - 1]}
            </li>
          ))}
        </ul>
        {hard >= 4 ? (
          <p className="warnbox mt-3">
            You have said things were hard on {hard} of your last {recent.length} check-ins. That is a lot to carry. A carer’s assessment can bring
            breaks and help; see Who to ask for what in <Link to="/help" className="underline">Help</Link>.
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">What helps me</h2>
        <ul className="flex flex-col gap-1">
          {c.whatHelpsMe.map((h) => (
            <li key={h} className="flex justify-between gap-2">
              {h}
              <button className="chip" onClick={() => setC({ ...c, whatHelpsMe: c.whatHelpsMe.filter((x) => x !== h) })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="field" aria-label="Something that helps me" placeholder="For example: ten minutes outside" value={newHelp} onChange={(e) => setNewHelp(e.target.value)} />
          <button
            className="btn"
            onClick={() => {
              if (!newHelp.trim()) return;
              setC({ ...c, whatHelpsMe: [...c.whatHelpsMe, newHelp.trim()] });
              setNewHelp('');
            }}
          >
            Add
          </button>
        </div>
        <Text label="One person I could text when it is hard" hint="Their name, and their number if you like. The app never messages them." value={c.someone ?? ''} onChange={(v) => setC({ ...c, someone: v })} />
        <Text label="Your first name" value={c.name} onChange={(v) => setC({ ...c, name: v })} />
        <fieldset>
          <legend className="label">Your four words for how you are, from best to worst</legend>
          <div className="grid grid-cols-2 gap-2">
            {c.levelWords.map((w, i) => (
              <input
                key={i}
                className="field"
                aria-label={`Word ${i + 1}`}
                value={w}
                onChange={(e) => {
                  const words = [...c.levelWords] as Carer['levelWords'];
                  words[i] = e.target.value;
                  setC({ ...c, levelWords: words });
                }}
              />
            ))}
          </div>
        </fieldset>
        <button className="btn btn-primary" onClick={() => void store.saveCarer(c)}>
          Save
        </button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Text size</h2>
        <Choice
          label="Size"
          options={[
            { code: 'normal', text: 'Normal' },
            { code: 'large', text: 'Large' },
            { code: 'larger', text: 'Larger' },
          ]}
          value={size}
          onChange={setSize}
        />
      </Card>

      {isLead ? <CircleSettings circle={circle} /> : null}

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Account and records</h2>
        {user ? (
          <>
            <p className="text-sm">
              Signed in as {user.email}. Records are kept in London and on this phone for when there is no signal.
            </p>
            {circles.length > 1 ? (
              <Choice label="Who you are looking at" options={circles.map((x) => ({ code: x.id, text: x.personName }))} value={shared?.id} onChange={store.chooseCircle} />
            ) : null}
            <button className="btn" onClick={() => void signOut().then(() => navigate('/start'))}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="text-sm">Everything is on this phone only. If the phone is lost, so are the notes, unless you save a copy or make an account.</p>
            {firebaseConfigured() ? (
              <Link to="/signin" className="btn">
                Make an account or sign in
              </Link>
            ) : null}
          </>
        )}
        <button className="btn" onClick={() => void exportAll()}>
          Save a copy of everything
        </button>
        <button className="btn btn-warn" onClick={() => void wipe()}>
          {user ? 'Delete my account and records' : 'Delete everything on this phone'}
        </button>
        {user && isLead ? <p className="muted text-xs">As the main carer, deleting your account deletes {circle.personName}’s records for everyone.</p> : null}
      </Card>
      <p className="muted text-center text-xs">Whole Story by Life Regulation Lab</p>
    </Page>
  );
}

function CircleSettings({ circle }: { circle: Circle }) {
  const store = useStore();
  const [c, setC] = useState(circle);
  const save = async () => {
    const changes = { personName: c.personName, careFor: c.careFor, ageBand: c.ageBand, region: c.region };
    if (store.user && store.shared) {
      await updateCircle(circle.id, changes);
      await store.refreshCircles();
    } else store.setDeviceCircle({ ...circle, ...changes });
  };
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">About {circle.personName}: settings</h2>
      <Text label="What you call them" value={c.personName} onChange={(v) => setC({ ...c, personName: v })} />
      <Chips label="What is happening for them" options={CARE_FOR} selected={c.careFor} onToggle={(x) => setC({ ...c, careFor: toggle(c.careFor, x) })} />
      <Choice label="Their age" options={AGE_BANDS} value={c.ageBand} onChange={(x) => setC({ ...c, ageBand: x })} />
      <Choice label="Where they live" options={REGIONS} value={c.region} onChange={(x) => setC({ ...c, region: x })} />
      <button className="btn" disabled={!c.personName.trim() || c.careFor.length === 0} onClick={() => void save()}>
        Save
      </button>
    </Card>
  );
}
