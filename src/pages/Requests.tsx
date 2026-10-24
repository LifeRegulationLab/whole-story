import { useState } from 'react';
import { Link } from 'react-router';
import { Card, Page, Text } from '../components/ui';
import { ABOUT_SECTIONS } from '../lib/content/care';
import {
  accept,
  askEveryone,
  askSomeoneElse,
  canAccept,
  cannot,
  confirm,
  current,
  giveBack,
  markDone,
  moveTo,
  needsChoice,
  nextPerson,
  nothingNew,
  notYet,
  sectionsFor,
  sinceLastHere,
  startingAsks,
  stateText,
} from '../lib/logic/requests';
import { formatDate, formatDateTime } from '../lib/logic/summaries';
import type { HelpRequest, SavedAsk } from '../lib/model/types';
import { shareText } from '../lib/shell';
import { deviceStorage } from '../lib/store/local';
import { newId, useAuthor, useStore } from '../lib/store/StoreProvider';
import { useNow } from '../lib/time';

/** Asking for help in two taps, and following each request until the carer says it is done. */

const today = () => new Date().toISOString().slice(0, 10);

function when(r: HelpRequest): string {
  const parts = [r.day ? formatDate(new Date(r.day).getTime()) : '', r.time ?? ''].filter(Boolean);
  return parts.join(', ');
}

export function AskForHelp() {
  const { circle, shared, data, save, remove, user } = useStore();
  const author = useAuthor();
  const [what, setWhat] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [askedOf, setAskedOf] = useState('everyone');
  const [ticked, setTicked] = useState<string[]>([]);
  const [helps, setHelps] = useState(false);
  const [keep, setKeep] = useState(false);
  const [editing, setEditing] = useState(false);
  const [said, setSaid] = useState('');
  if (!circle || !shared || !user) return null;

  const people = Object.values(shared.members).filter((m) => m.uid !== user.uid && m.role !== 'viewer');
  const saved: SavedAsk[] = data.asks.length ? data.asks : startingAsks(circle.personName).map((text, i) => ({ id: `start-${i}`, text }));
  const written = ABOUT_SECTIONS.filter((s) => data.about?.sections[s.key]?.trim());

  const startEditing = () => {
    // The starting list is saved the first time it is changed, so it becomes the carer's own.
    if (!data.asks.length) saved.forEach((a) => void save('asks', { id: newId(), text: a.text } satisfies SavedAsk));
    setEditing(true);
  };

  const send = async () => {
    const now = Date.now();
    const person = people.find((p) => p.uid === askedOf);
    const r: HelpRequest = {
      id: newId(),
      what: what.trim(),
      askedOf: person ? person.uid : 'everyone',
      askedAt: now,
      state: 'asked',
      changedAt: now,
      changedName: author.name,
      createdBy: author.uid,
      createdName: author.name,
    };
    if (person) r.askedName = person.name;
    if (day) r.day = day;
    if (time.trim()) r.time = time.trim();
    if (note.trim()) r.note = note.trim();
    const how = sectionsFor(data.about, ticked, helps);
    if (how.length) r.howToHelp = how;
    await save('requests', r);
    if (keep && !saved.some((a) => a.text === r.what)) await save('asks', { id: newId(), text: r.what } satisfies SavedAsk);
    setSaid(person ? `${person.name} will see it in Whole Story.` : 'Everyone in the family will see it in Whole Story.');
    setWhat('');
    setDay('');
    setTime('');
    setNote('');
    setTicked([]);
    setHelps(false);
    setKeep(false);
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Ask for help</h2>
      <div className="flex flex-wrap gap-2">
        {saved.map((a) =>
          editing ? (
            <span key={a.id} className="chip">
              {a.text}{' '}
              <button aria-label={`Remove ${a.text}`} className="muted underline" onClick={() => void remove('asks', a.id)}>
                remove
              </button>
            </span>
          ) : (
            <button key={a.id} className="chip" aria-pressed={what === a.text} onClick={() => setWhat(a.text)}>
              {a.text}
            </button>
          ),
        )}
      </div>
      <button className="muted self-start text-sm underline" onClick={() => (editing ? setEditing(false) : startEditing())}>
        {editing ? 'Finished changing' : 'Change these'}
      </button>
      <Text label="What do you need?" hint="Tap one above, or write your own." value={what} onChange={setWhat} />
      {what.trim() && !saved.some((a) => a.text === what.trim()) ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          Keep this for next time
        </label>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Text label="Day (optional)" type="date" value={day} onChange={setDay} />
        <Text label="Time (optional)" placeholder="10 till 2" value={time} onChange={setTime} />
      </div>
      <Text label="Anything else (optional)" value={note} onChange={setNote} />
      <label className="block">
        <span className="label">Ask</span>
        <select className="field" value={askedOf} onChange={(e) => setAskedOf(e.target.value)}>
          <option value="everyone">Everyone</option>
          {people.map((p) => (
            <option key={p.uid} value={p.uid}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {written.length || data.about?.helps.length ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="label">Send with it (only what you tick)</legend>
          {written.map((s) => (
            <label key={s.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ticked.includes(s.key)}
                onChange={(e) => setTicked(e.target.checked ? [...ticked, s.key] : ticked.filter((k) => k !== s.key))}
              />
              {s.title}
            </label>
          ))}
          {data.about?.helps.length ? (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={helps} onChange={(e) => setHelps(e.target.checked)} />
              What helps
            </label>
          ) : null}
        </fieldset>
      ) : null}
      <button className="btn btn-primary" disabled={!what.trim() || people.length === 0} onClick={() => void send()}>
        Ask
      </button>
      {people.length === 0 ? <p className="muted text-sm">Invite someone first. Then you can ask them.</p> : null}
      {said ? <p className="muted text-sm">{said}</p> : null}
    </Card>
  );
}

/** Requests with the buttons that fit the person looking. `mine` shows only what needs them. */
export function RequestList({ mine = false }: { mine?: boolean }) {
  const { data, save, remove, shared, user } = useStore();
  const author = useAuthor();
  const [moving, setMoving] = useState<string | null>(null);
  const [moveDay, setMoveDay] = useState('');
  const now = useNow();
  if (!shared || !user) return null;
  const members = Object.values(shared.members);
  const me = author.uid;

  const needsMe = (r: HelpRequest) =>
    canAccept(r, me) ||
    (r.state === 'accepted' && r.acceptedBy === me) ||
    (r.createdBy === me && (r.state === 'done' || needsChoice(r, now, today())));
  const list = current(data.requests, now).filter((r) => !mine || needsMe(r));
  if (mine && list.length === 0) return null;
  const put = (r: HelpRequest) => void save('requests', r);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">{mine ? 'Help: needs you' : 'Requests'}</h2>
      {list.length === 0 ? <p className="muted text-sm">Nothing asked yet.</p> : null}
      <ul className="flex flex-col gap-4">
        {list.map((r) => {
          const next = nextPerson(r, members);
          const choose = r.createdBy === me && needsChoice(r, now, today());
          return (
            <li key={r.id} className="flex flex-col gap-2">
              <div>
                <p className={r.state === 'confirmed' ? 'muted line-through' : 'font-medium'}>{r.what}</p>
                <p className="muted text-sm">
                  {[when(r), r.createdBy === me ? '' : `from ${r.createdName}`, stateText(r)].filter(Boolean).join(' · ')}
                </p>
                {r.note ? <p className="text-sm">{r.note}</p> : null}
                {r.howToHelp && (r.createdBy === me || canAccept(r, me) || r.acceptedBy === me) ? (
                  <details className="text-sm">
                    <summary className="underline">How to help</summary>
                    {r.howToHelp.map((h) => (
                      <div key={h.title} className="mt-1">
                        <p className="font-medium">{h.title}</p>
                        <p className="whitespace-pre-wrap">{h.text}</p>
                      </div>
                    ))}
                  </details>
                ) : null}
              </div>
              {choose ? (
                <div className="warnbox flex flex-col gap-2">
                  <p>Nobody has said yes yet. What would you like to do?</p>
                  <div className="flex flex-wrap gap-2">
                    {next ? (
                      <button className="chip" onClick={() => put(askSomeoneElse(r, next, author, Date.now()))}>
                        Ask {next.name}
                      </button>
                    ) : null}
                    {r.askedOf !== 'everyone' || (r.cannot ?? []).length ? (
                      <button className="chip" onClick={() => put(askEveryone(r, author, Date.now()))}>
                        Ask everyone
                      </button>
                    ) : null}
                    <button className="chip" onClick={() => setMoving(moving === r.id ? null : r.id)}>
                      Move it
                    </button>
                    <button
                      className="chip"
                      onClick={() => void shareText('Whole Story', `Could you help with this? ${r.what}${when(r) ? `, ${when(r)}` : ''}. It is in Whole Story.`)}
                    >
                      Send a reminder myself
                    </button>
                  </div>
                  {moving === r.id ? (
                    <div className="flex items-end gap-2">
                      <Text label="New day" type="date" value={moveDay} onChange={setMoveDay} />
                      <button
                        className="btn"
                        disabled={!moveDay}
                        onClick={() => {
                          put(moveTo(r, moveDay, author, Date.now()));
                          setMoving(null);
                          setMoveDay('');
                        }}
                      >
                        Move
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canAccept(r, me) ? (
                  <>
                    <button className="btn btn-primary" onClick={() => put(accept(r, author, Date.now()))}>
                      I can do it
                    </button>
                    {r.askedOf === me ? (
                      <button className="chip" onClick={() => put(cannot(r, author, Date.now()))}>
                        I can’t this time
                      </button>
                    ) : null}
                  </>
                ) : null}
                {r.state === 'accepted' && r.acceptedBy === me ? (
                  <>
                    <button className="btn btn-primary" onClick={() => put(markDone(r, author, Date.now()))}>
                      It’s done
                    </button>
                    <button className="chip" onClick={() => put(giveBack(r, author, Date.now()))}>
                      I can’t now
                    </button>
                  </>
                ) : null}
                {r.state === 'done' && r.createdBy === me ? (
                  <>
                    <button className="btn btn-primary" onClick={() => put(confirm(r, author, Date.now()))}>
                      Yes, it’s done
                    </button>
                    <button className="chip" onClick={() => put(notYet(r, author, Date.now()))}>
                      Not yet
                    </button>
                  </>
                ) : null}
                {r.createdBy === me && !mine ? (
                  <button className="muted text-xs underline" onClick={() => window.confirm('Take this request away?') && void remove('requests', r.id)}>
                    {r.state === 'confirmed' ? 'Clear' : 'Cancel'}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {mine ? (
        <Link to="/family" className="muted text-sm underline">
          All requests
        </Link>
      ) : null}
    </Card>
  );
}

const DAY = 24 * 60 * 60 * 1000;

function lastKey(circleId: string, uid: string): string {
  return `whole-story:last-here:${circleId}:${uid}`;
}

export function lastHere(circleId: string, uid: string): number | undefined {
  const raw = deviceStorage().getItem(lastKey(circleId, uid));
  return raw ? Number(raw) : undefined;
}

/** For a helper starting a shift: what changed since they last looked, from what they may see. */
export function Since() {
  const { circle, data, user, shared } = useStore();
  const author = useAuthor();
  const [readAt, setReadAt] = useState<number | null>(null);
  const now = useNow();
  if (!circle || !user || !shared) return null;
  const before = lastHere(circle.id, user.uid);
  const since = before ?? now - 3 * DAY;
  const s = sinceLastHere(data, since, author.uid);
  const medName = new Map(data.medicines.map((m) => [m.id, m.name]));
  const done = () => {
    const now = Date.now();
    deviceStorage().setItem(lastKey(circle.id, user.uid), String(now));
    setReadAt(now);
  };

  return (
    <Page title="Since you were last here" back="/">
      <p className="muted">{before ? `Since ${formatDateTime(before)}.` : 'From the last three days.'}</p>
      {nothingNew(s) ? <Card>Nothing new.</Card> : null}
      {s.requests.length ? (
        <Card>
          <h2 className="mb-1 font-semibold">Help asked for</h2>
          <ul className="list-disc pl-5">
            {s.requests.map((r) => (
              <li key={r.id}>
                {r.what}
                {when(r) ? `, ${when(r)}` : ''}: {stateText(r).toLowerCase()}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {s.entries.length ? (
        <Card>
          <h2 className="mb-1 font-semibold">In the log</h2>
          <ul className="flex flex-col gap-2">
            {s.entries.map((e) => (
              <li key={e.id}>
                <Link to={`/log/${e.id}`} className="underline">
                  {e.title}
                </Link>
                <span className="muted text-sm"> · {formatDateTime(e.at)}, {e.authorName}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {s.given.length || s.medicines.length ? (
        <Card>
          <h2 className="mb-1 font-semibold">Medicines</h2>
          <ul className="list-disc pl-5">
            {s.given.map((d) => (
              <li key={d.id}>
                {medName.get(d.medicineId) ?? 'A medicine'} given when needed, {formatDateTime(d.at)}
                {d.reason ? `, for ${d.reason}` : ''}
              </li>
            ))}
            {s.medicines.map((m) => (
              <li key={m.id}>{m.name} added</li>
            ))}
          </ul>
        </Card>
      ) : null}
      {s.aboutChanged ? (
        <Card>
          <Link to="/them/about" className="underline">
            About {circle.personName} has been changed
          </Link>
        </Card>
      ) : null}
      {s.messages.length ? (
        <Card>
          <h2 className="mb-1 font-semibold">Messages</h2>
          <ul className="flex flex-col gap-2">
            {s.messages.map((m) => (
              <li key={m.id}>
                <strong>{m.byName}</strong> <span className="muted text-sm">{formatDateTime(m.at)}</span>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {readAt ? <p className="muted">Next time this starts from now.</p> : (
        <button className="btn btn-primary" onClick={done}>
          I’ve read this
        </button>
      )}
    </Page>
  );
}

