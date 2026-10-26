import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, Choice, Empty, Page, Text } from '../components/ui';
import { firebaseConfigured } from '../lib/firebase/app';
import { createInvite, joinWithCode, removeMember, type Invite } from '../lib/firebase/account';
import { formatDate, formatDateTime, weeklyUpdate } from '../lib/logic/summaries';
import type { CoverRequest, Member, Message, Role, Task } from '../lib/model/types';
import { shareText } from '../lib/shell';
import { newId, useAuthor, useStore } from '../lib/store/StoreProvider';
import { AskForHelp, RequestList } from './Requests';
import { possessive } from '../lib/model/name';

/** Sharing the load: who is in, messages, cover for a break, jobs, and a weekly update. */
export function Family() {
  const store = useStore();
  const { circle, shared, user, data, isLead } = store;
  if (!circle) return null;

  if (!shared || !user) {
    return (
      <Page title="Family">
        <Card className="flex flex-col gap-3">
          <p>Everything is on this phone only. To let family see what you choose, or ask them for help, make a free account.</p>
          <p className="muted text-sm">
            You decide what each person sees: the log, medicines, About {circle.personName}, papers. Your own check-ins are never shared.
          </p>
          {firebaseConfigured() ? (
            <Link to="/signin" className="btn btn-primary">
              Make an account
            </Link>
          ) : null}
        </Card>
        <WeeklyUpdate />
      </Page>
    );
  }

  const members = Object.values(shared.members).sort((a, b) => a.joinedAt - b.joinedAt);
  return (
    <Page title="Family">
      <JoinFamily />
      <Card>
        <h2 className="mb-2 font-semibold">Who is in</h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.uid} className="flex items-center justify-between gap-2">
              <span>
                {m.name} <span className="muted text-sm">· {roleName(m.role)}</span>
                {m.role !== 'lead' ? <span className="muted block text-xs">Sees: {seesText(m.sees)}</span> : null}
              </span>
              {isLead && m.uid !== user.uid ? (
                <button className="chip" onClick={() => window.confirm(`Remove ${m.name}? They will no longer see anything.`) && void removeMember(shared, m.uid).then(store.refreshCircles)}>
                  Remove
                </button>
              ) : null}
              {!isLead && m.uid === user.uid ? (
                <button className="chip" onClick={() => window.confirm('Leave this family?') && void removeMember(shared, m.uid).then(store.refreshCircles)}>
                  Leave
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      {isLead ? <InviteCard /> : null}
      {store.canWrite ? <AskForHelp /> : null}
      <RequestList />
      <Messages />
      {/* Cover and jobs from before requests; shown only while old ones remain. */}
      {data.cover.length ? <Cover /> : null}
      {data.tasks.length ? <Tasks /> : null}
      {isLead ? <WeeklyUpdate /> : null}
      {data.messages.length === 0 && members.length === 1 ? (
        <Empty>Invite someone with a code. They download the app, make an account and type the code.</Empty>
      ) : null}
    </Page>
  );
}

function roleName(r: Role): string {
  return r === 'lead' ? 'main carer' : r === 'family' ? 'can write' : 'can only read';
}

function seesText(s: Member['sees']): string {
  const parts = [s.log && 'log', s.medicines && 'medicines', s.about && 'about them', s.papers && 'papers'].filter(Boolean);
  return parts.length ? parts.join(', ') : 'messages, cover and jobs only';
}

function InviteCard() {
  const { circle, user } = useStore();
  const [role, setRole] = useState<Role>('family');
  const [sees, setSees] = useState<Member['sees']>({ log: true, medicines: true, about: true, papers: false });
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState('');
  if (!circle || !user) return null;
  const make = async () => {
    setError('');
    try {
      setInvite(await createInvite(circle, role, sees, user.uid));
    } catch {
      setError('The code was not made. Check the signal and try again.');
    }
  };
  const box = (key: keyof Member['sees'], text: string) => (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={sees[key]} onChange={(e) => setSees({ ...sees, [key]: e.target.checked })} />
      {text}
    </label>
  );
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Invite someone</h2>
      <Choice
        label="They can"
        options={[
          { code: 'family', text: 'Read and write' },
          { code: 'viewer', text: 'Only read' },
        ]}
        value={role}
        onChange={setRole}
      />
      <fieldset className="flex flex-col gap-1">
        <legend className="label">They can see</legend>
        {box('log', 'The log')}
        {box('medicines', 'Medicines')}
        {box('about', `About ${circle.personName} and the crisis plan`)}
        {box('papers', 'Where papers are kept')}
      </fieldset>
      <button className="btn btn-primary" onClick={() => void make()}>
        Make a code
      </button>
      {invite ? (
        <div className="rounded-xl border border-[var(--accent)] p-3">
          <p className="text-2xl font-semibold tracking-widest">{invite.code}</p>
          <p className="muted text-sm">Works once, until {formatDate(invite.expiresAt)}.</p>
          <button
            className="btn mt-2"
            onClick={() =>
              void shareText(
                'Whole Story',
                `I'm using Whole Story to keep track of ${possessive(circle.personName)} care. Get the app, make an account, then type this code to join: ${invite.code}`,
              )
            }
          >
            Send it
          </button>
        </div>
      ) : null}
      {error ? <p className="warnbox">{error}</p> : null}
    </Card>
  );
}

function Messages() {
  const { data, save, remove, isLead } = useStore();
  const author = useAuthor();
  const [text, setText] = useState('');
  const list = [...data.messages].sort((a, b) => a.at - b.at).slice(-30);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Messages</h2>
      {list.length === 0 ? <p className="muted text-sm">No messages yet.</p> : null}
      <ul className="flex flex-col gap-2">
        {list.map((m) => (
          <li key={m.id}>
            <p className="text-sm">
              <strong>{m.byName}</strong> <span className="muted">{formatDateTime(m.at)}</span>
            </p>
            <p className="whitespace-pre-wrap">{m.text}</p>
            {m.by === author.uid || isLead ? (
              <button className="muted text-xs underline" onClick={() => void remove('messages', m.id)}>
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className="field" aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} />
        <button
          className="btn btn-primary"
          disabled={!text.trim()}
          onClick={() => {
            void save('messages', { id: newId(), at: Date.now(), by: author.uid, byName: author.name, text: text.trim() } satisfies Message);
            setText('');
          }}
        >
          Send
        </button>
      </div>
    </Card>
  );
}

function Cover() {
  const { data, save, remove } = useStore();
  const author = useAuthor();
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('10:00');
  const [to, setTo] = useState('14:00');
  const [note, setNote] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const list = data.cover.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Cover for a break</h2>
      <p className="muted text-sm">Ask for someone to take a slot. Anyone in the family can say they will do it.</p>
      <ul className="flex flex-col gap-2">
        {list.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {formatDate(new Date(c.date).getTime())}, {c.from} to {c.to}
              {c.note ? <span className="muted"> · {c.note}</span> : null}
              <span className="block text-sm">{c.takenName ? `${c.takenName} is doing it` : 'Nobody yet'}</span>
            </span>
            <span className="flex gap-2">
              {!c.takenBy ? (
                <button className="chip" onClick={() => void save('cover', { ...c, takenBy: author.uid, takenName: author.name })}>
                  I can do it
                </button>
              ) : c.takenBy === author.uid ? (
                <button
                  className="chip"
                  onClick={() => {
                    const rest: CoverRequest = { ...c };
                    delete rest.takenBy;
                    delete rest.takenName;
                    void save('cover', rest);
                  }}
                >
                  I can’t now
                </button>
              ) : null}
              {c.createdBy === author.uid ? (
                <button className="chip" onClick={() => void remove('cover', c.id)}>
                  Cancel
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-2">
        <Text label="Day" type="date" value={date} onChange={setDate} />
        <Text label="From" type="time" value={from} onChange={setFrom} />
        <Text label="To" type="time" value={to} onChange={setTo} />
      </div>
      <Text label="Note (optional)" value={note} onChange={setNote} />
      <button
        className="btn"
        disabled={!date}
        onClick={() => {
          const c: CoverRequest = { id: newId(), date, from, to, createdBy: author.uid };
          if (note.trim()) c.note = note.trim();
          void save('cover', c);
          setDate('');
          setNote('');
        }}
      >
        Ask for cover
      </button>
    </Card>
  );
}

function Tasks() {
  const { data, save, remove, shared } = useStore();
  const author = useAuthor();
  const [title, setTitle] = useState('');
  const [who, setWho] = useState('');
  const [due, setDue] = useState('');
  const members = shared ? Object.values(shared.members) : [];
  const list = [...data.tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? '9').localeCompare(b.due ?? '9'));
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Jobs</h2>
      <ul className="flex flex-col gap-1">
        {list.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={t.done} onChange={(e) => void save('tasks', { ...t, done: e.target.checked })} />
              <span className={t.done ? 'muted line-through' : ''}>
                {t.title}
                {t.assignedName ? <span className="muted text-sm"> · {t.assignedName}</span> : null}
                {t.due ? <span className="muted text-sm"> · by {formatDate(new Date(t.due).getTime())}</span> : null}
              </span>
            </label>
            {t.done ? (
              <button className="muted text-xs underline" onClick={() => void remove('tasks', t.id)}>
                Clear
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <Text label="A job" hint="For example: collect prescription, ring the council" value={title} onChange={setTitle} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label">Who</span>
          <select className="field" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Anyone</option>
            {members.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <Text label="By" type="date" value={due} onChange={setDue} />
      </div>
      <button
        className="btn"
        disabled={!title.trim()}
        onClick={() => {
          const t: Task = { id: newId(), title: title.trim(), done: false, createdBy: author.uid };
          const m = members.find((x) => x.uid === who);
          if (m) {
            t.assignedTo = m.uid;
            t.assignedName = m.name;
          }
          if (due) t.due = due;
          void save('tasks', t);
          setTitle('');
          setWho('');
          setDue('');
        }}
      >
        Add
      </button>
    </Card>
  );
}

function WeeklyUpdate() {
  const { circle, data } = useStore();
  const [text, setText] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  if (!circle) return null;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Weekly update</h2>
      <p className="muted text-sm">A short note for family from this week’s log. Change anything before you send it.</p>
      {text === null ? (
        <button className="btn" onClick={() => setText(weeklyUpdate(circle.personName, data.entries, data.doses, data.checkins, Date.now()))}>
          Write this week’s update
        </button>
      ) : (
        <>
          <textarea className="field" rows={8} aria-label="Weekly update" value={text} onChange={(e) => setText(e.target.value)} />
          <button
            className="btn btn-primary"
            onClick={() =>
              void shareText(`${circle.personName} this week`, text).then((r) => setSaid(r === 'copied' ? 'Copied. Paste it into a message.' : r === 'failed' ? 'That did not work.' : ''))
            }
          >
            Send it
          </button>
          {said ? <p className="muted text-sm">{said}</p> : null}
        </>
      )}
    </Card>
  );
}

/** Joining a family someone else set up, with the code they sent. */
function JoinFamily() {
  const store = useStore();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!store.user) return null;
  const uid = store.user.uid;
  const join = async () => {
    setBusy(true);
    setError('');
    try {
      const id = await joinWithCode(code, uid, store.carer.name || 'Family');
      await store.refreshCircles();
      store.chooseCircle(id);
      setCode('');
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Joining someone else’s family?</h2>
      <Text label="Code they sent you" value={code} onChange={setCode} />
      {error ? <p className="warnbox">{error}</p> : null}
      <button className="btn" disabled={code.trim().length < 6 || busy} onClick={() => void join()}>
        Join
      </button>
    </Card>
  );
}
