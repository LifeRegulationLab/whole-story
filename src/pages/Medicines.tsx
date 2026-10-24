import { useState } from 'react';
import { Area as TextArea, Card, Empty, Page, Text } from '../components/ui';
import { checkPrn, prnHelped } from '../lib/logic/prn';
import { formatDateTime } from '../lib/logic/summaries';
import type { Dose, Medicine } from '../lib/model/types';
import { newId, useAuthor, useStore } from '../lib/store/StoreProvider';
import { now as clock } from '../lib/time';
import type { PrnCheck } from '../lib/logic/prn';

/**
 * Medicines as written on the label. The app records what was given and whether it helped. It
 * compares the as-needed gap and daily limit the carer typed from the label, warns, and never
 * blocks or suggests a dose.
 */
export function Medicines() {
  const { data, canWrite } = useStore();
  const [editing, setEditing] = useState<Medicine | null>(null);
  const current = data.medicines.filter((m) => !m.stopped).sort((a, b) => a.name.localeCompare(b.name));
  const stopped = data.medicines.filter((m) => m.stopped);
  if (editing) return <MedicineForm initial={editing} done={() => setEditing(null)} />;
  return (
    <Page title="Medicines" back="/them">
      <p className="muted">Copy each one from the pharmacy label. The label is always the instruction to follow.</p>
      {current.length === 0 ? <Empty>No medicines added.</Empty> : null}
      {current.map((m) => (
        <MedicineCard key={m.id} medicine={m} onEdit={() => setEditing(m)} />
      ))}
      {canWrite ? (
        <button className="btn btn-primary" onClick={() => setEditing({ id: newId(), name: '', label: '', times: [], asNeeded: false, addedAt: clock() })}>
          Add a medicine
        </button>
      ) : null}
      {stopped.length ? (
        <details>
          <summary className="muted cursor-pointer">Stopped ({stopped.length})</summary>
          <ul className="mt-2 list-disc pl-5">
            {stopped.map((m) => (
              <li key={m.id}>{m.name}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </Page>
  );
}

function MedicineCard({ medicine: m, onEdit }: { medicine: Medicine; onEdit: () => void }) {
  const { data, save, canWrite } = useStore();
  const author = useAuthor();
  const [check, setCheck] = useState<PrnCheck | null>(null);
  const giving = check !== null;
  const [reason, setReason] = useState('');
  const doses = data.doses.filter((d) => d.medicineId === m.id).sort((a, b) => b.at - a.at);
  const helped = m.asNeeded ? prnHelped(m.id, data.doses) : undefined;
  const lastGiven = m.asNeeded ? doses.find((d) => d.outcome === 'given') : undefined;

  const give = () => {
    const dose: Dose = {
      id: newId(),
      medicineId: m.id,
      at: clock(),
      outcome: 'given',
      reason: reason.trim() || (m.givenFor ?? 'As needed'),
      by: author.uid,
      byName: author.name,
    };
    if (check?.warnings.length) dose.warnedAndGiven = true;
    void save('doses', dose);
    setCheck(null);
    setReason('');
  };

  return (
    <Card>
      <p className="text-lg font-semibold">{m.name}</p>
      <p className="whitespace-pre-wrap">{m.label}</p>
      {m.what ? <p className="muted text-sm">For: {m.what}</p> : null}
      {m.times.length ? <p className="muted text-sm">Usually at {m.times.join(', ')}</p> : null}
      {m.asNeeded ? (
        <p className="muted text-sm">
          As needed{m.givenFor ? `, for ${m.givenFor}` : ''}.{m.minGapHours ? ` At least ${m.minGapHours} hours apart.` : ''}
          {m.maxPer24h ? ` No more than ${m.maxPer24h} in 24 hours.` : ''}
        </p>
      ) : null}
      {helped && helped.yes + helped.aLittle + helped.no > 0 ? (
        <p className="mt-1 text-sm">
          Helped {helped.yes}, a little {helped.aLittle}, did not help {helped.no}.
        </p>
      ) : null}
      {lastGiven ? <p className="muted text-sm">Last given {formatDateTime(lastGiven.at)} by {lastGiven.byName}.</p> : null}

      {m.asNeeded && canWrite ? (
        giving ? (
          <div className="mt-3 flex flex-col gap-2">
            {check?.warnings.length ? (
              <div className="warnbox" role="alert">
                {check.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            ) : null}
            <Text label="Why it is being given" value={reason} onChange={setReason} placeholder={m.givenFor ?? ''} />
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={give}>
                {check?.warnings.length ? 'Record it anyway' : 'Record it'}
              </button>
              <button className="btn" onClick={() => setCheck(null)}>
                Cancel
              </button>
            </div>
            <p className="muted text-sm">You will be asked later whether it helped.</p>
          </div>
        ) : (
          <button className="btn mt-3" onClick={() => setCheck(checkPrn(m, data.doses, clock()))}>
            Give a dose now
          </button>
        )
      ) : null}

      {doses.length ? (
        <details className="mt-3">
          <summary className="muted cursor-pointer text-sm">Record ({doses.length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {doses.slice(0, 30).map((d) => (
              <li key={d.id}>
                {formatDateTime(d.at)}: {d.outcome}
                {d.reason ? `, for ${d.reason}` : ''}
                {d.helped ? `, helped: ${d.helped === 'a-little' ? 'a little' : d.helped}` : ''}
                {d.warnedAndGiven ? ' (given after a warning)' : ''} · {d.byName}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {canWrite ? (
        <div className="mt-3 flex gap-2">
          <button className="chip" onClick={onEdit}>
            Change
          </button>
          <button className="chip" onClick={() => window.confirm(`Mark ${m.name} as stopped?`) && void save('medicines', { ...m, stopped: true })}>
            Stopped
          </button>
        </div>
      ) : null}
    </Card>
  );
}

function MedicineForm({ initial, done }: { initial: Medicine; done: () => void }) {
  const { save } = useStore();
  const [m, setM] = useState<Medicine>(initial);
  const [time, setTime] = useState('08:00');
  const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? undefined : Number(v));
  const submit = () => {
    const out: Medicine = { ...m, name: m.name.trim(), label: m.label.trim() };
    if (out.minGapHours === undefined) delete out.minGapHours;
    if (out.maxPer24h === undefined) delete out.maxPer24h;
    void save('medicines', out);
    done();
  };
  return (
    <Page title={initial.name || 'Add a medicine'}>
      <Card className="flex flex-col gap-4">
        <Text label="Name, as on the label" value={m.name} onChange={(v) => setM({ ...m, name: v })} />
        <TextArea label="The label's instructions, word for word" value={m.label} onChange={(v) => setM({ ...m, label: v })} />
        <Text label="What it is for, in your words (optional)" value={m.what ?? ''} onChange={(v) => setM({ ...m, what: v })} />
        <div>
          <p className="label">Regular times</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {m.times.map((t) => (
              <button key={t} className="chip" aria-label={`Remove ${t}`} onClick={() => setM({ ...m, times: m.times.filter((x) => x !== t) })}>
                {t} ✕
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="field w-36" type="time" aria-label="Time" value={time} onChange={(e) => setTime(e.target.value)} />
            <button className="btn" onClick={() => !m.times.includes(time) && setM({ ...m, times: [...m.times, time].sort() })}>
              Add time
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={m.asNeeded} onChange={(e) => setM({ ...m, asNeeded: e.target.checked })} />
          Can also be given as needed (PRN)
        </label>
        {m.asNeeded ? (
          <>
            <Text label="What the prescriber said it is for" value={m.givenFor ?? ''} onChange={(v) => setM({ ...m, givenFor: v })} />
            <Text
              label="Shortest gap between doses, in hours, from the label"
              type="number"
              value={m.minGapHours?.toString() ?? ''}
              onChange={(v) => setM({ ...m, ...{ minGapHours: num(v) } } as Medicine)}
            />
            <Text
              label="Most doses in 24 hours, from the label"
              type="number"
              value={m.maxPer24h?.toString() ?? ''}
              onChange={(v) => setM({ ...m, ...{ maxPer24h: num(v) } } as Medicine)}
            />
            <p className="muted text-sm">Only numbers from the label. These are used to warn you; they never stop you recording a dose.</p>
          </>
        ) : null}
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={!m.name.trim()} onClick={submit}>
            Save
          </button>
          <button className="btn" onClick={done}>
            Cancel
          </button>
        </div>
      </Card>
    </Page>
  );
}
