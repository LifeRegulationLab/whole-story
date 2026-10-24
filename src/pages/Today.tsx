import { Link } from 'react-router';
import { Card, Page } from '../components/ui';
import { findPatterns } from '../lib/logic/patterns';
import { dueToday } from '../lib/logic/prn';
import { formatDate } from '../lib/logic/summaries';
import type { CheckIn, Dose } from '../lib/model/types';
import { newId, useAuthor, useStore } from '../lib/store/StoreProvider';
import { now as clock, useNow } from '../lib/time';
import { RequestList } from './Requests';

export const QUICK = [
  { kind: 'happened', text: 'Something happened' },
  { kind: 'night', text: 'A bad night' },
  { kind: 'health', text: 'A health change' },
  { kind: 'care-given', text: 'Help I gave' },
  { kind: 'contact', text: 'A call or appointment' },
  { kind: 'note', text: 'A note' },
] as const;

const HOUR = 60 * 60 * 1000;

export function Today() {
  const { circle, data, save, carer, canWrite, shared, isLead } = useStore();
  const author = useAuthor();
  const now = useNow();
  if (!circle) return null;
  const due = dueToday(data.medicines, data.doses, new Date(now));
  const askHelped = data.doses
    .filter((d) => d.reason !== undefined && d.outcome === 'given' && !d.helped && now - d.at > HOUR && now - d.at < 2 * 24 * HOUR)
    .sort((a, b) => b.at - a.at);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const checkedIn = data.checkins.some((c) => c.at >= start.getTime());
  const patterns = findPatterns(data.entries, data.doses, data.about).slice(0, 3);
  const cover = data.cover.filter((c) => !c.takenBy && c.date >= new Date(now).toISOString().slice(0, 10));
  const tasks = data.tasks.filter((t) => !t.done && (!t.assignedTo || t.assignedTo === author.uid));

  const record = (medicineId: string, outcome: Dose['outcome']) =>
    void save('doses', { id: newId(), medicineId, at: clock(), outcome, by: author.uid, byName: author.name } satisfies Dose);

  const checkIn = (level: CheckIn['level']) => void save('checkins', { id: newId(), at: clock(), level } satisfies CheckIn);

  return (
    <Page
      title={`Today with ${circle.personName}`}
    >
      {canWrite ? (
        <Card>
          <h2 className="mb-3 font-semibold">Write something down</h2>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map((q) => (
              <Link key={q.kind} to={`/log/new/${q.kind}`} className="btn">
                {q.text}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {due.length > 0 && canWrite ? (
        <Card>
          <h2 className="mb-2 font-semibold">Medicines still to record today</h2>
          <ul className="flex flex-col gap-3">
            {due.map(({ medicine, time }) => (
              <li key={`${medicine.id}-${time}`}>
                <p>
                  <strong>{time}</strong> {medicine.name}
                </p>
                <p className="muted text-sm">{medicine.label}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button className="chip" onClick={() => record(medicine.id, 'given')}>
                    Given
                  </button>
                  <button className="chip" onClick={() => record(medicine.id, 'refused')}>
                    Refused
                  </button>
                  <button className="chip" onClick={() => record(medicine.id, 'missed')}>
                    Missed
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {askHelped.slice(0, 3).map((d) => {
        const m = data.medicines.find((x) => x.id === d.medicineId);
        return (
          <Card key={d.id}>
            <p>
              Did the {m?.name ?? 'as-needed medicine'} given {formatDate(d.at)} help?
            </p>
            <div className="mt-2 flex gap-2">
              {(['yes', 'a-little', 'no'] as const).map((h) => (
                <button key={h} className="chip" onClick={() => void save('doses', { ...d, helped: h })}>
                  {h === 'yes' ? 'Yes' : h === 'a-little' ? 'A little' : 'No'}
                </button>
              ))}
            </div>
          </Card>
        );
      })}

      {!checkedIn ? (
        <Card>
          <h2 className="font-semibold">How are you today?</h2>
          <p className="muted mb-2 text-sm">Only you see this.</p>
          <div className="flex flex-wrap gap-2">
            {carer.levelWords.map((w, i) => (
              <button key={w} className="chip" onClick={() => checkIn((i + 1) as CheckIn['level'])}>
                {w}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {shared && !isLead ? (
        <Card>
          <Link to="/since" className="font-semibold underline">
            Since you were last here
          </Link>
          <p className="muted text-sm">What has changed, before you start.</p>
        </Card>
      ) : null}

      <RequestList mine />

      {cover.length > 0 ? (
        <Card>
          <h2 className="mb-1 font-semibold">Asked for cover</h2>
          {cover.map((c) => (
            <p key={c.id}>
              {formatDate(new Date(c.date).getTime())}, {c.from} to {c.to}: nobody yet. <Link to="/family" className="underline">Family</Link>
            </p>
          ))}
        </Card>
      ) : null}

      {tasks.length > 0 ? (
        <Card>
          <h2 className="mb-1 font-semibold">To do</h2>
          <ul className="list-disc pl-5">
            {tasks.slice(0, 5).map((t) => (
              <li key={t.id}>
                {t.title}
                {t.due ? <span className="muted"> by {formatDate(new Date(t.due).getTime())}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {patterns.length > 0 ? (
        <Card>
          <h2 className="mb-1 font-semibold">What your notes show</h2>
          <ul className="list-disc pl-5">
            {patterns.map((p) => (
              <li key={p.text}>{p.text}</li>
            ))}
          </ul>
          <p className="muted mt-2 text-sm">Counted from your notes. It is not advice; take it to their GP if it worries you.</p>
        </Card>
      ) : null}

      {circle.careFor.length === 1 && circle.careFor[0] === 'other' ? (
        <Card>
          <p>
            Helplines and papers are set for England for now. When you have a minute, say what is happening for {circle.personName} and where
            they live in <Link to="/me" className="underline">Me</Link>, so they fit.
          </p>
        </Card>
      ) : null}

      {!data.about ? (
        <Card>
          <p>
            When you are ready, <Link to="/them/about" className="underline">About {circle.personName}</Link> fills the hospital passport,
            respite handover and care home papers later.
          </p>
        </Card>
      ) : null}
    </Page>
  );
}
