import { useState } from 'react';
import { helpFromAppointment } from '../lib/logic/requests';
import { AskWithThis } from './Requests';
import { Link, useNavigate, useParams } from 'react-router';
import { Area, Card, Choice, Empty, Page, Text } from '../components/ui';
import { calendarFile, openQuestions, ordered, summaryText, toEntry, whenAt } from '../lib/logic/appointments';
import { formatDateTime } from '../lib/logic/summaries';
import type { Appointment } from '../lib/model/types';
import { saveFile, shareText } from '../lib/shell';
import { newId, useAuthor, useStore } from '../lib/store/StoreProvider';
import { useNow } from '../lib/time';

/** Appointments: what to ask before, one question at a time in the room, and what happens next. */

export function Appointments() {
  const { circle, data, canWrite, save } = useStore();
  const author = useAuthor();
  const navigate = useNavigate();
  const now = useNow();
  if (!circle) return null;
  const list = ordered(data.appointments, now);

  const add = async () => {
    const a: Appointment = { id: newId(), with: '', questions: [], next: [], createdBy: author.uid, updatedAt: Date.now() };
    await save('appointments', a);
    navigate(`/them/appointments/${a.id}`);
  };

  return (
    <Page title="Appointments" back="/them">
      <p className="muted">
        Write down what you want to ask, keep {circle.personName}’s own words apart from yours, and note what happens next.
      </p>
      {canWrite ? (
        <button className="btn btn-primary" onClick={() => void add()}>
          Get ready for an appointment
        </button>
      ) : null}
      {list.length === 0 ? <Empty>No appointments written yet.</Empty> : null}
      {list.map((a) => {
        const at = whenAt(a.when);
        const open = openQuestions(a).length;
        return (
          <Link key={a.id} to={`/them/appointments/${a.id}`} className="card block">
            <p className="font-semibold">{a.with || 'Appointment'}</p>
            <p className="muted text-sm">
              {[at ? formatDateTime(at) : 'No time yet', open ? `${open} to ask` : '', a.entryId ? 'In the log' : ''].filter(Boolean).join(' · ')}
            </p>
          </Link>
        );
      })}
    </Page>
  );
}

type Step = 'before' | 'during' | 'after';

export function AppointmentPage() {
  const { id } = useParams();
  const { data } = useStore();
  const saved = data.appointments.find((a) => a.id === id);
  if (!saved) return <Page title="Appointment" back="/them/appointments"><Empty>This appointment is not here.</Empty></Page>;
  return <AppointmentForm key={saved.id} saved={saved} />;
}

function AppointmentForm({ saved }: { saved: Appointment }) {
  const { circle, save, remove, canWrite } = useStore();
  const author = useAuthor();
  const navigate = useNavigate();
  const [a, setA] = useState<Appointment>(saved);
  const [step, setStep] = useState<Step>(() => ((whenAt(saved.when) ?? Infinity) < Date.now() ? 'after' : 'before'));
  const [question, setQuestion] = useState('');
  const [current, setCurrent] = useState(0);
  const [note, setNote] = useState('');
  if (!circle) return null;
  const name = circle.personName;

  const keep = (next: Appointment) => {
    const stamped = { ...next, updatedAt: Date.now() };
    setA(stamped);
    void save('appointments', stamped);
  };
  const set = <K extends keyof Appointment>(k: K, v: Appointment[K]) => setA((x) => ({ ...x, [k]: v }));
  const blurSave = () => keep(a);

  const addQuestion = () => {
    if (!question.trim()) return;
    keep({ ...a, questions: [...a.questions, { id: newId(), text: question.trim() }] });
    setQuestion('');
  };
  const mark = (qid: string, status: 'answered' | 'unclear', answer?: string) =>
    keep({ ...a, questions: a.questions.map((q) => (q.id === qid ? { ...q, status, ...(answer?.trim() ? { answer: answer.trim() } : {}) } : q)) });

  const calendar = async (title: string, when: string, where?: string) => {
    const ics = calendarFile({ id: `${a.id}-${when}`, title, when, ...(where ? { where } : {}) }, Date.now());
    await saveFile('appointment.ics', new TextEncoder().encode(ics), 'text/calendar');
  };

  const toLog = () => {
    const e = toEntry(a, name, author, Date.now());
    void save('entries', e);
    keep({ ...a, entryId: e.id });
  };

  const asking = a.questions.filter((q) => q.text.trim());
  const q = asking[Math.min(current, Math.max(asking.length - 1, 0))];

  return (
    <Page title={a.with || 'Appointment'} back="/them/appointments">
      <Choice
        label="Part"
        options={[
          { code: 'before', text: 'Before' },
          { code: 'during', text: 'In the room' },
          { code: 'after', text: 'After' },
        ]}
        value={step}
        onChange={setStep}
      />

      {step === 'before' ? (
        <>
          <Card className="flex flex-col gap-3">
            <div onBlur={blurSave} className="flex flex-col gap-3">
              <Text label="Who is it with" hint="For example: memory clinic, Dr Shah, the social worker" value={a.with} onChange={(v) => set('with', v)} />
              <Text label="When" type="datetime-local" value={a.when ?? ''} onChange={(v) => set('when', v)} />
              <Text label="Where (optional)" value={a.where ?? ''} onChange={(v) => set('where', v)} />
            </div>
            {a.when ? (
              <button className="btn" onClick={() => void calendar(`${a.with || 'Appointment'}, with ${name}`, a.when ?? '', a.where)}>
                Add to my calendar
              </button>
            ) : null}
            {canWrite ? <AskWithThis draft={helpFromAppointment(a, name)} /> : null}
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold">Questions to ask</h2>
            <ol className="list-decimal pl-5">
              {asking.map((x) => (
                <li key={x.id} className="mb-1">
                  {x.text}{' '}
                  {canWrite ? (
                    <button className="muted text-xs underline" onClick={() => keep({ ...a, questions: a.questions.filter((y) => y.id !== x.id) })}>
                      remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <input className="field" aria-label="A question" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuestion()} />
              <button className="btn" disabled={!question.trim()} onClick={addQuestion}>
                Add
              </button>
            </div>
            <p className="muted text-sm">Put the most important one first. Three is plenty.</p>
          </Card>
          <Card className="flex flex-col gap-3">
            <div onBlur={blurSave} className="flex flex-col gap-3">
              <Area label={`In ${name}’s own words`} hint={`What ${name} wants to say or ask. Write it as they say it.`} value={a.theirWords ?? ''} onChange={(v) => set('theirWords', v)} />
              <Area label="What I have noticed" hint="Your own observations, kept separate. Dates and examples help." value={a.noticed ?? ''} onChange={(v) => set('noticed', v)} />
            </div>
            <p className="muted text-sm">
              Examples from the <Link to="/log" className="underline">log</Link> marked “worth showing” help here.
            </p>
          </Card>
        </>
      ) : null}

      {step === 'during' ? (
        <Card className="flex flex-col gap-3">
          {q ? (
            <>
              <p className="muted text-sm">
                Question {Math.min(current, asking.length - 1) + 1} of {asking.length}
              </p>
              <p className="text-xl font-semibold">{q.text}</p>
              {q.status ? <p className="muted text-sm">{q.status === 'answered' ? 'Answered' : 'Still unclear'}{q.answer ? `: ${q.answer}` : ''}</p> : null}
              <Area label="What they said (optional)" value={note} onChange={setNote} rows={2} />
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    mark(q.id, 'answered', note);
                    setNote('');
                    setCurrent((c) => Math.min(c + 1, asking.length - 1));
                  }}
                >
                  Answered
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    mark(q.id, 'unclear', note);
                    setNote('');
                    setCurrent((c) => Math.min(c + 1, asking.length - 1));
                  }}
                >
                  Still unclear
                </button>
              </div>
              <div className="flex justify-between">
                <button className="chip" disabled={current === 0} onClick={() => setCurrent((c) => Math.max(c - 1, 0))}>
                  ‹ Back
                </button>
                <button className="chip" disabled={current >= asking.length - 1} onClick={() => setCurrent((c) => c + 1)}>
                  Next ›
                </button>
              </div>
            </>
          ) : (
            <p>No questions written. Add them in Before.</p>
          )}
          {a.theirWords?.trim() ? (
            <details>
              <summary className="underline">{name}’s own words</summary>
              <p className="whitespace-pre-wrap">{a.theirWords}</p>
            </details>
          ) : null}
          <button className="chip self-start" onClick={() => setStep('after')}>
            Finished
          </button>
        </Card>
      ) : null}

      {step === 'after' ? (
        <>
          <Card className="flex flex-col gap-3">
            {openQuestions(a).length ? (
              <div className="warnbox">
                <p className="font-medium">Still to ask or still unclear</p>
                <ul className="list-disc pl-5">
                  {openQuestions(a).map((x) => (
                    <li key={x.id}>{x.text}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div onBlur={blurSave} className="flex flex-col gap-3">
              <Area label="What was said" value={a.said ?? ''} onChange={(v) => set('said', v)} />
              <Area label={`What ${name} said`} hint="Kept apart from what you noticed." value={a.theySaid ?? ''} onChange={(v) => set('theySaid', v)} />
              <Text label="Reference number (optional)" value={a.reference ?? ''} onChange={(v) => set('reference', v)} />
            </div>
          </Card>
          <NextSteps a={a} keep={keep} />
          <Card className="flex flex-col gap-3">
            <div onBlur={blurSave}>
              <Text label="Next appointment (optional)" type="datetime-local" value={a.nextWhen ?? ''} onChange={(v) => set('nextWhen', v)} />
            </div>
            {a.nextWhen ? (
              <button className="btn" onClick={() => void calendar(`${a.with || 'Appointment'}, with ${name}`, a.nextWhen ?? '', a.where)}>
                Add the next one to my calendar
              </button>
            ) : null}
          </Card>
          <Card className="flex flex-col gap-2">
            <button className="btn btn-primary" disabled={!canWrite} onClick={toLog}>
              {a.entryId ? 'Update it in the log' : 'Save it to the log'}
            </button>
            <p className="muted text-sm">It goes in as a call or appointment, with what was agreed and the reference, ready for papers and evidence.</p>
            <button className="btn" onClick={() => void shareText(`Appointment with ${a.with}`, summaryText(a, name))}>
              Send or keep a copy
            </button>
            <p className="muted text-sm">If a letter follows, Dealt With can take it from there.</p>
          </Card>
        </>
      ) : null}

      {canWrite && a.createdBy === author.uid ? (
        <button
          className="muted self-start text-sm underline"
          onClick={() => {
            if (!window.confirm('Delete this appointment? The log entry, if saved, stays.')) return;
            void remove('appointments', a.id);
            navigate('/them/appointments');
          }}
        >
          Delete this appointment
        </button>
      ) : null}
    </Page>
  );
}

function NextSteps({ a, keep }: { a: Appointment; keep: (a: Appointment) => void }) {
  const [what, setWhat] = useState('');
  const [who, setWho] = useState('');
  const [by, setBy] = useState('');
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">What happens next</h2>
      <ul className="list-disc pl-5">
        {a.next.map((n) => (
          <li key={n.id}>
            {n.what}
            {n.who ? <span className="muted"> · {n.who}</span> : null}
            {n.by ? <span className="muted"> · by {n.by}</span> : null}{' '}
            <button className="muted text-xs underline" onClick={() => keep({ ...a, next: a.next.filter((x) => x.id !== n.id) })}>
              remove
            </button>
          </li>
        ))}
      </ul>
      <Text label="What" hint="For example: bloods booked, referral to memory nurse" value={what} onChange={setWhat} />
      <div className="grid grid-cols-2 gap-2">
        <Text label="Who" placeholder="Me, the GP" value={who} onChange={setWho} />
        <Text label="By" type="date" value={by} onChange={setBy} />
      </div>
      <button
        className="btn"
        disabled={!what.trim()}
        onClick={() => {
          keep({ ...a, next: [...a.next, { id: newId(), what: what.trim(), ...(who.trim() ? { who: who.trim() } : {}), ...(by ? { by } : {}) }] });
          setWhat('');
          setWho('');
          setBy('');
        }}
      >
        Add
      </button>
    </Card>
  );
}
