import { useState } from 'react';
import { Link } from 'react-router';
import { Area as TextArea, Card, Choice, Empty, Page, Text } from '../components/ui';
import { ABOUT_GROUPS, ABOUT_SECTIONS, HELP_SUGGESTIONS } from '../lib/content/care';
import { formatDate } from '../lib/logic/summaries';
import type { About, Contact, CrisisPlan, Paper } from '../lib/model/types';
import { newId, useStore } from '../lib/store/StoreProvider';
import { capital } from '../lib/model/name';

export function Them() {
  const { circle, data, shared, user } = useStore();
  if (!circle) return null;
  const me = user && shared ? shared.members[user.uid] : undefined;
  const sees = me?.sees ?? { log: true, medicines: true, about: true, papers: true };
  const filled = ABOUT_SECTIONS.filter((s) => data.about?.sections[s.key]?.trim()).length;
  const links = [
    { to: '/them/about', title: `About ${circle.personName}`, note: `${filled} of ${ABOUT_SECTIONS.length} parts written`, show: sees.about },
    { to: '/them/medicines', title: 'Medicines', note: `${data.medicines.filter((m) => !m.stopped).length} current`, show: sees.medicines },
    { to: '/them/crisis', title: 'Crisis plan', note: data.crisis ? `Updated ${formatDate(data.crisis.updatedAt)}` : 'Not written yet', show: sees.about },
    { to: '/them/appointments', title: 'Appointments', note: `${data.appointments.length} written`, show: sees.log },
    { to: '/them/contacts', title: 'Who’s who', note: `${data.contacts.length} people and services`, show: true },
    { to: '/them/papers', title: 'Where papers are kept', note: `${data.papers.length} written down`, show: sees.papers },
  ];
  return (
    <Page title={capital(circle.personName)}>
      {links
        .filter((l) => l.show)
        .map((l) => (
          <Link key={l.to} to={l.to} className="card block">
            <p className="font-semibold">{l.title}</p>
            <p className="muted text-sm">{l.note}</p>
          </Link>
        ))}
    </Page>
  );
}

const EMPTY_ABOUT: About = { sections: {}, helps: [], worse: [], updatedAt: 0 };

export function AboutThem() {
  const { data } = useStore();
  // A fresh copy of the form whenever the saved version changes, here or on someone else's phone.
  return <AboutForm key={data.about?.updatedAt ?? 0} saved={data.about ?? EMPTY_ABOUT} />;
}

function AboutForm({ saved }: { saved: About }) {
  const { circle, saveDoc, canWrite } = useStore();
  const [about, setAbout] = useState<About>(saved);
  const [dirty, setDirty] = useState(false);
  const [newHelp, setNewHelp] = useState('');
  const [newWorse, setNewWorse] = useState('');
  if (!circle) return null;

  const update = (a: About) => {
    setAbout(a);
    setDirty(true);
  };
  const store = () => {
    void saveDoc('about', { ...about, updatedAt: Date.now() });
    setDirty(false);
  };
  const addHelp = (text: string) => {
    if (!text.trim() || about.helps.some((h) => h.text === text.trim())) return;
    update({ ...about, helps: [...about.helps, { code: newId(), text: text.trim(), count: 0 }] });
    setNewHelp('');
  };
  const suggestions = circle.careFor.flatMap((c) => HELP_SUGGESTIONS[c]).filter((s, i, l) => l.indexOf(s) === i && !about.helps.some((h) => h.text === s));

  return (
    <Page title={`About ${circle.personName}`} back="/them">
      <p className="muted">
        Write it as you would explain them to someone new. Your words fill the hospital passport, respite handover and care home papers. It saves
        when you press Save.
      </p>
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">What helps</h2>
        <p className="muted text-sm">These become buttons on the Now screen. Each time you tap one, it is counted, so you can see what works.</p>
        <ul className="flex flex-col gap-1">
          {about.helps.map((h) => (
            <li key={h.code} className="flex items-center justify-between gap-2">
              <span>
                {h.text}
                {h.count ? <span className="muted text-sm"> · helped {h.count} times</span> : null}
              </span>
              {canWrite ? (
                <button className="chip" aria-label={`Remove ${h.text}`} onClick={() => update({ ...about, helps: about.helps.filter((x) => x.code !== h.code) })}>
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canWrite ? (
          <>
            <div className="flex gap-2">
              <input className="field" aria-label="Something that helps" value={newHelp} onChange={(e) => setNewHelp(e.target.value)} />
              <button className="btn" onClick={() => addHelp(newHelp)}>
                Add
              </button>
            </div>
            {suggestions.length ? (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} className="chip" onClick={() => addHelp(s)}>
                    + {s}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
        <h2 className="mt-2 text-lg font-semibold">What makes things worse</h2>
        <ul className="flex flex-col gap-1">
          {about.worse.map((w) => (
            <li key={w.code} className="flex items-center justify-between gap-2">
              <span>{w.text}</span>
              {canWrite ? (
                <button className="chip" onClick={() => update({ ...about, worse: about.worse.filter((x) => x.code !== w.code) })}>
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canWrite ? (
          <div className="flex gap-2">
            <input className="field" aria-label="Something that makes things worse" value={newWorse} onChange={(e) => setNewWorse(e.target.value)} />
            <button
              className="btn"
              onClick={() => {
                if (!newWorse.trim()) return;
                update({ ...about, worse: [...about.worse, { code: newId(), text: newWorse.trim() }] });
                setNewWorse('');
              }}
            >
              Add
            </button>
          </div>
        ) : null}
      </Card>
      {(Object.keys(ABOUT_GROUPS) as (keyof typeof ABOUT_GROUPS)[]).map((g) => (
        <Card key={g} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{ABOUT_GROUPS[g]}</h2>
          {ABOUT_SECTIONS.filter((s) => s.group === g).map((s) =>
            canWrite ? (
              <TextArea
                key={s.key}
                label={s.title}
                hint={s.prompt}
                value={about.sections[s.key] ?? ''}
                onChange={(v) => update({ ...about, sections: { ...about.sections, [s.key]: v } })}
              />
            ) : about.sections[s.key] ? (
              <div key={s.key}>
                <p className="font-semibold">{s.title}</p>
                <p className="whitespace-pre-wrap">{about.sections[s.key]}</p>
              </div>
            ) : null,
          )}
        </Card>
      ))}
      {canWrite ? (
        <div className="sticky bottom-20 z-10">
          <button className="btn btn-primary w-full" disabled={!dirty} onClick={store}>
            {dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      ) : null}
    </Page>
  );
}

const EMPTY_CRISIS: CrisisPlan = { earlySigns: [], whatHelps: '', whatDoesNotHelp: '', whoToCall: '', theirWishes: '', writtenWith: 'carer-only', updatedAt: 0 };

export function Crisis() {
  const { data } = useStore();
  return <CrisisForm key={data.crisis?.updatedAt ?? 0} saved={data.crisis ?? EMPTY_CRISIS} />;
}

function CrisisForm({ saved }: { saved: CrisisPlan }) {
  const { circle, saveDoc, canWrite } = useStore();
  const [plan, setPlan] = useState<CrisisPlan>(saved);
  const [sign, setSign] = useState('');
  const [dirty, setDirty] = useState(false);
  if (!circle) return null;
  const update = (p: CrisisPlan) => {
    setPlan(p);
    setDirty(true);
  };
  return (
    <Page title="Crisis plan" back="/them">
      <p className="muted">
        Best written with {circle.personName} when things are calm, so their own wishes are in it. Early signs you add here can be logged in one
        tap, so you can see when things start to slip.
      </p>
      <Card className="flex flex-col gap-4">
        <Choice
          label="Who wrote it"
          options={[
            { code: 'together', text: `Together with ${circle.personName}` },
            { code: 'carer-only', text: 'Just me, for now' },
          ]}
          value={plan.writtenWith}
          onChange={(c) => update({ ...plan, writtenWith: c })}
        />
        <div>
          <p className="label">Early signs that things are slipping</p>
          <ul className="mb-2 flex flex-col gap-1">
            {plan.earlySigns.map((s) => (
              <li key={s} className="flex justify-between gap-2">
                {s}
                {canWrite ? (
                  <button className="chip" onClick={() => update({ ...plan, earlySigns: plan.earlySigns.filter((x) => x !== s) })}>
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {canWrite ? (
            <div className="flex gap-2">
              <input className="field" aria-label="An early sign" placeholder="For example: sleeping less" value={sign} onChange={(e) => setSign(e.target.value)} />
              <button
                className="btn"
                onClick={() => {
                  if (!sign.trim()) return;
                  update({ ...plan, earlySigns: [...plan.earlySigns, sign.trim()] });
                  setSign('');
                }}
              >
                Add
              </button>
            </div>
          ) : null}
        </div>
        <TextArea label="What helps when things start to slip" value={plan.whatHelps} onChange={(v) => update({ ...plan, whatHelps: v })} />
        <TextArea label="What does not help" value={plan.whatDoesNotHelp} onChange={(v) => update({ ...plan, whatDoesNotHelp: v })} />
        <TextArea label="Who to call, in order" hint="For example: their care coordinator, then the crisis team, then 999." value={plan.whoToCall} onChange={(v) => update({ ...plan, whoToCall: v })} />
        <TextArea label="Their wishes" hint="Hospital, treatment, who to tell, pets, children, anything they asked for." value={plan.theirWishes} onChange={(v) => update({ ...plan, theirWishes: v })} />
        {canWrite ? (
          <button
            className="btn btn-primary"
            disabled={!dirty}
            onClick={() => {
              void saveDoc('crisis', { ...plan, updatedAt: Date.now() });
              setDirty(false);
            }}
          >
            {dirty ? 'Save' : 'Saved'}
          </button>
        ) : null}
        {plan.earlySigns.length ? (
          <Link to="/log/new/sign" className="btn">
            Log an early sign now
          </Link>
        ) : null}
      </Card>
    </Page>
  );
}

export function Contacts() {
  const { data, save, remove, canWrite } = useStore();
  const [c, setC] = useState<Contact>({ id: newId(), name: '', role: '' });
  return (
    <Page title="Who’s who" back="/them">
      <p className="muted">Everyone involved: GP, social worker, nurse, school, day centre, pharmacy. Your notes on each help later.</p>
      {data.contacts.length === 0 ? <Empty>No one added yet.</Empty> : null}
      {data.contacts.map((x) => (
        <Card key={x.id}>
          <p className="font-semibold">
            {x.name} <span className="muted font-normal">{x.role}</span>
          </p>
          {x.phone ? (
            <a className="underline" href={`tel:${x.phone.replace(/\s/g, '')}`}>
              {x.phone}
            </a>
          ) : null}
          {x.email ? <p>{x.email}</p> : null}
          {x.notes ? <p className="muted text-sm whitespace-pre-wrap">{x.notes}</p> : null}
          {canWrite ? (
            <div className="mt-2 flex gap-2">
              <button className="chip" onClick={() => setC(x)}>
                Change
              </button>
              <button className="chip" onClick={() => window.confirm(`Remove ${x.name}?`) && void remove('contacts', x.id)}>
                Remove
              </button>
            </div>
          ) : null}
        </Card>
      ))}
      {canWrite ? (
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">{data.contacts.some((x) => x.id === c.id) ? 'Change' : 'Add someone'}</h2>
          <Text label="Name" value={c.name} onChange={(v) => setC({ ...c, name: v })} />
          <Text label="Role" hint="For example: GP, social worker, school SENCo" value={c.role} onChange={(v) => setC({ ...c, role: v })} />
          <Text label="Phone" type="tel" value={c.phone ?? ''} onChange={(v) => setC({ ...c, phone: v })} />
          <Text label="Email" type="email" value={c.email ?? ''} onChange={(v) => setC({ ...c, email: v })} />
          <TextArea label="Notes" value={c.notes ?? ''} onChange={(v) => setC({ ...c, notes: v })} />
          <button
            className="btn btn-primary"
            disabled={!c.name.trim()}
            onClick={() => {
              void save('contacts', c);
              setC({ id: newId(), name: '', role: '' });
            }}
          >
            Save
          </button>
        </Card>
      ) : null}
    </Page>
  );
}

const PAPER_KINDS: { code: Paper['kind']; text: string }[] = [
  { code: 'power-of-attorney', text: 'Power of attorney' },
  { code: 'care-plan', text: 'Care plan' },
  { code: 'letter', text: 'Letter' },
  { code: 'benefit', text: 'Benefit' },
  { code: 'medical', text: 'Health' },
  { code: 'money', text: 'Money' },
  { code: 'other', text: 'Other' },
];

export function KeptPapers() {
  const { data, save, remove, canWrite } = useStore();
  const blank = (): Paper => ({ id: newId(), title: '', kind: 'other', whereKept: '' });
  const [p, setP] = useState<Paper>(blank);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Page title="Where papers are kept" back="/them">
      <p className="muted">
        So anyone can find the power of attorney, the care plan or the benefit letter when it is needed. Add a review date and it shows when it
        is due.
      </p>
      {data.papers.length === 0 ? <Empty>Nothing written down yet.</Empty> : null}
      {[...data.papers]
        .sort((a, b) => (a.reviewBy ?? '9').localeCompare(b.reviewBy ?? '9'))
        .map((x) => (
          <Card key={x.id}>
            <p className="font-semibold">{x.title}</p>
            <p>Kept: {x.whereKept}</p>
            {x.reference ? <p className="muted text-sm">Reference: {x.reference}</p> : null}
            {x.reviewBy ? (
              <p className={x.reviewBy <= today ? 'warnbox mt-1' : 'muted text-sm'}>Review by {formatDate(new Date(x.reviewBy).getTime())}</p>
            ) : null}
            {x.notes ? <p className="muted text-sm">{x.notes}</p> : null}
            {canWrite ? (
              <div className="mt-2 flex gap-2">
                <button className="chip" onClick={() => setP(x)}>
                  Change
                </button>
                <button className="chip" onClick={() => window.confirm(`Remove ${x.title}?`) && void remove('papers', x.id)}>
                  Remove
                </button>
              </div>
            ) : null}
          </Card>
        ))}
      {canWrite ? (
        <Card className="flex flex-col gap-3">
          <Text label="What it is" value={p.title} onChange={(v) => setP({ ...p, title: v })} />
          <Choice label="Kind" options={PAPER_KINDS} value={p.kind} onChange={(k) => setP({ ...p, kind: k })} />
          <Text label="Where it is kept" hint="For example: blue folder, kitchen drawer. Or: with the solicitor." value={p.whereKept} onChange={(v) => setP({ ...p, whereKept: v })} />
          <Text label="Reference number" value={p.reference ?? ''} onChange={(v) => setP({ ...p, reference: v })} />
          <Text label="Review by" type="date" value={p.reviewBy ?? ''} onChange={(v) => setP({ ...p, reviewBy: v })} />
          <TextArea label="Notes" value={p.notes ?? ''} onChange={(v) => setP({ ...p, notes: v })} />
          <button
            className="btn btn-primary"
            disabled={!p.title.trim() || !p.whereKept.trim()}
            onClick={() => {
              void save('papers', p);
              setP(blank());
            }}
          >
            Save
          </button>
        </Card>
      ) : null}
    </Page>
  );
}
