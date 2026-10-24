import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Area as TextArea, Card, Chips, Choice, Empty, fromLocalInput, Page, Text, toggle, toLocalInput } from '../components/ui';
import { AREAS, AREA_BY_CODE, HELP_TYPES } from '../lib/content/areas';
import { NEEDS, NEED_BY_CODE } from '../lib/content/care';
import { formatDate, formatDateTime } from '../lib/logic/summaries';
import type { Entry, EntryKind } from '../lib/model/types';
import { newId, useAuthor, useStore } from '../lib/store/StoreProvider';
import { now as clock, useNow } from '../lib/time';

export const KIND_NAMES: Record<EntryKind, string> = {
  happened: 'Something happened',
  night: 'A bad night',
  health: 'A health change',
  'care-given': 'Help I gave',
  contact: 'A call or appointment',
  note: 'A note',
  sign: 'An early sign',
};

/** Which area a kind of help counts towards, so the evidence packs fill without extra tapping. */
const HELP_AREA: Record<string, string> = {
  'personal-care': 'washing',
  meals: 'eating',
  medicines: 'medicines',
  supervision: 'safety',
  night: 'night',
  calming: 'distress',
  out: 'going-out',
  home: 'money',
};

const DEFAULT_AREAS: Partial<Record<EntryKind, string[]>> = { happened: ['distress'], night: ['night'] };

export function Log() {
  const { data, circle } = useStore();
  const [kind, setKind] = useState<EntryKind | 'all' | 'flagged'>('all');
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...data.entries]
      .filter((e) => (kind === 'all' ? true : kind === 'flagged' ? e.flagged : e.kind === kind))
      .filter((e) => !q || [e.title, e.what, e.before, e.after, e.service, e.agreed].some((t) => t?.toLowerCase().includes(q)))
      .sort((a, b) => b.at - a.at);
  }, [data.entries, kind, search]);
  const byDay = new Map<string, Entry[]>();
  for (const e of list) {
    const d = formatDate(e.at);
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  return (
    <Page title="Log">
      <div className="flex flex-wrap gap-2">
        {(['all', 'flagged', ...Object.keys(KIND_NAMES)] as const).map((k) => (
          <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k as typeof kind)}>
            {k === 'all' ? 'Everything' : k === 'flagged' ? 'Marked important' : KIND_NAMES[k as EntryKind]}
          </button>
        ))}
      </div>
      <Text label="Search" value={search} onChange={setSearch} />
      <Link to="/log/new/happened" className="btn btn-primary">
        Write something down
      </Link>
      {list.length === 0 ? <Empty>Nothing here yet. Notes about {circle?.personName} will show here, newest first.</Empty> : null}
      {[...byDay].map(([day, entries]) => (
        <section key={day}>
          <h2 className="muted mb-2 text-sm font-semibold">{day}</h2>
          <ul className="flex flex-col gap-2">
            {entries.map((e) => (
              <li key={e.id}>
                <Link to={`/log/${e.id}`} className="card block">
                  <p className="font-medium">
                    {e.flagged ? '★ ' : ''}
                    {e.title}
                  </p>
                  <p className="muted text-sm">
                    {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {KIND_NAMES[e.kind]} · {e.authorName}
                  </p>
                  {e.what ? <p className="mt-1 line-clamp-2 text-sm">{e.what}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}

export function LogNew() {
  const { kind = 'note' } = useParams();
  const [params] = useSearchParams();
  const k = (kind in KIND_NAMES ? kind : 'note') as EntryKind;
  const author = useAuthor();
  const now = useNow();
  const initial: Entry = {
    id: newId(),
    kind: k,
    at: now,
    writtenAt: now,
    author: author.uid,
    authorName: author.name,
    title: '',
    what: '',
    needs: params.get('needs')?.split(',').filter(Boolean) ?? [],
    helped: params.get('helped')?.split(',').filter(Boolean) ?? [],
    areas: DEFAULT_AREAS[k] ?? [],
  };
  return <EntryForm initial={initial} isNew />;
}

export function LogEntry() {
  const { id } = useParams();
  const { data } = useStore();
  const entry = data.entries.find((e) => e.id === id);
  if (!entry) return <Page title="Not found" back="/log"><Empty>That note is not here. It may have been deleted.</Empty></Page>;
  return <EntryView entry={entry} />;
}

function EntryView({ entry }: { entry: Entry }) {
  const { data, canWrite, remove, save } = useStore();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  if (editing) return <EntryForm initial={entry} isNew={false} />;
  const helps = new Map((data.about?.helps ?? []).map((h) => [h.code, h.text]));
  const late = entry.writtenAt - entry.at > 24 * 60 * 60 * 1000;
  const rows: [string, string | undefined][] = [
    ['Before', entry.before],
    ['What happened', entry.what],
    ['After', entry.after],
    ['Where', entry.where],
    ['Who was there', entry.who],
    ['How long', entry.minutes ? `${entry.minutes} minutes` : undefined],
    ['Times woken', entry.wakings ? String(entry.wakings) : undefined],
    ['Help given', entry.helpType ? HELP_TYPES.find((h) => h.code === entry.helpType)?.name : undefined],
    ['Service', entry.service],
    ['What was agreed', entry.agreed],
    ['Reference', entry.reference],
    ['Might have been', entry.needs?.map((n) => NEED_BY_CODE.get(n) ?? n).join(', ')],
    ['What helped', entry.helped?.map((h) => helps.get(h) ?? h).join(', ')],
    ['Shows help needed with', entry.areas?.map((a) => AREA_BY_CODE.get(a)?.name ?? a).join(', ')],
  ];
  return (
    <Page title={entry.title} back="/log">
      <Card>
        <p className="muted text-sm">
          {formatDateTime(entry.at)} · {KIND_NAMES[entry.kind]} · written by {entry.authorName}
          {late ? ` on ${formatDate(entry.writtenAt)}` : ''}
        </p>
        <dl className="mt-3 flex flex-col gap-2">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm font-semibold">{k}</dt>
                <dd className="whitespace-pre-wrap">{v}</dd>
              </div>
            ))}
        </dl>
      </Card>
      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => setEditing(true)}>
            Change
          </button>
          <button className="btn" onClick={() => void save('entries', { ...entry, flagged: !entry.flagged })}>
            {entry.flagged ? 'Unmark' : 'Mark as important for a professional'}
          </button>
          <button
            className="btn btn-warn"
            onClick={() => {
              if (window.confirm('Delete this note? This cannot be undone.')) {
                void remove('entries', entry.id);
                navigate('/log');
              }
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </Page>
  );
}

function EntryForm({ initial, isNew }: { initial: Entry; isNew: boolean }) {
  const { data, save, saveDoc, circle } = useStore();
  const navigate = useNavigate();
  const [e, setE] = useState<Entry>(initial);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Entry>(key: K, value: Entry[K]) => setE((x) => ({ ...x, [key]: value }));
  const name = circle?.personName ?? 'them';
  const helps = data.about?.helps ?? [];
  const signs = data.crisis?.earlySigns ?? [];

  const submit = async () => {
    const title = e.title.trim() || defaultTitle(e);
    const minutes = e.minutes && e.minutes > 0 ? e.minutes : undefined;
    const out: Entry = { ...e, title, writtenAt: isNew ? clock() : e.writtenAt };
    if (minutes === undefined) delete out.minutes;
    else out.minutes = minutes;
    await save('entries', out);
    if (isNew && data.about && e.helped?.length) {
      const fresh = e.helped.filter((h) => !(initial.helped ?? []).includes(h));
      if (fresh.length) {
        await saveDoc('about', { ...data.about, helps: data.about.helps.map((h) => (fresh.includes(h.code) ? { ...h, count: h.count + 1 } : h)) });
      }
    }
    setSaved(true);
    navigate(isNew ? '/' : `/log/${e.id}`, { replace: true });
  };

  return (
    <Page title={KIND_NAMES[e.kind]} back={isNew ? '/' : `/log/${e.id}`}>
      <Card className="flex flex-col gap-4">
        <Text
          label="When"
          type={e.kind === 'night' ? 'date' : 'datetime-local'}
          value={e.kind === 'night' ? toLocalInput(e.at).slice(0, 10) : toLocalInput(e.at)}
          onChange={(v) => set('at', fromLocalInput(e.kind === 'night' ? `${v}T03:00` : v))}
        />

        {e.kind === 'happened' ? (
          <>
            <TextArea label="What was going on before?" hint="Where, who was there, what had just happened." value={e.before ?? ''} onChange={(v) => set('before', v)} />
            <TextArea label={`What did ${name} do or say?`} hint="What you saw and heard, in your own words." value={e.what} onChange={(v) => set('what', v)} />
            <TextArea label="What happened next?" hint="How it ended, and anything that helped." value={e.after ?? ''} onChange={(v) => set('after', v)} />
            <Chips label="Might something have been wrong for them?" options={NEEDS} selected={e.needs ?? []} onToggle={(c) => set('needs', toggle(e.needs ?? [], c))} />
            {helps.length ? (
              <Chips label="What helped" options={helps.map((h) => ({ code: h.code, text: h.text }))} selected={e.helped ?? []} onToggle={(c) => set('helped', toggle(e.helped ?? [], c))} />
            ) : null}
            <Minutes value={e.minutes} onChange={(m) => set('minutes', m)} label="How long it went on" />
          </>
        ) : null}

        {e.kind === 'night' ? (
          <>
            <Text label="Times they woke you" type="number" value={e.wakings ? String(e.wakings) : ''} onChange={(v) => set('wakings', Number(v) || 0)} />
            <TextArea label="What happened in the night?" value={e.what} onChange={(v) => set('what', v)} />
            <Minutes value={e.minutes} onChange={(m) => set('minutes', m)} label="Time you were up with them" />
          </>
        ) : null}

        {e.kind === 'health' ? (
          <>
            <Text label="What changed, in a few words" hint="For example: a fall, not eating, a new rash, more confused than usual." value={e.title} onChange={(v) => set('title', v)} />
            <TextArea label="What you noticed" value={e.what} onChange={(v) => set('what', v)} />
            <TextArea label="What you did" value={e.after ?? ''} onChange={(v) => set('after', v)} />
          </>
        ) : null}

        {e.kind === 'care-given' ? (
          <>
            <Choice
              label="What help"
              options={HELP_TYPES.map((h) => ({ code: h.code, text: h.name }))}
              value={e.helpType}
              onChange={(c) => setE((x) => ({ ...x, helpType: c, areas: HELP_AREA[c] ? [...new Set([...(x.areas ?? []), HELP_AREA[c]])] : (x.areas ?? []) }))}
            />
            <Minutes value={e.minutes} onChange={(m) => set('minutes', m)} label="How long" />
            <TextArea label="What you did (if you want to say)" hint="Details make benefit and care evidence stronger: what they could not do, and why." value={e.what} onChange={(v) => set('what', v)} />
          </>
        ) : null}

        {e.kind === 'contact' ? (
          <>
            <Text label="Who" hint="The service, and the person's name if you have it." value={e.service ?? ''} onChange={(v) => set('service', v)} />
            <TextArea label="What was said" value={e.what} onChange={(v) => set('what', v)} />
            <TextArea label="What was agreed, and by when" value={e.agreed ?? ''} onChange={(v) => set('agreed', v)} />
            <Text label="Reference number" value={e.reference ?? ''} onChange={(v) => set('reference', v)} />
          </>
        ) : null}

        {e.kind === 'note' ? (
          <>
            <Text label="Title" value={e.title} onChange={(v) => set('title', v)} />
            <TextArea label="Note" value={e.what} onChange={(v) => set('what', v)} rows={5} />
          </>
        ) : null}

        {e.kind === 'sign' ? (
          <>
            {signs.length ? (
              <Choice label="Which early sign" options={signs.map((s) => ({ code: s, text: s }))} value={e.title || undefined} onChange={(s) => set('title', s)} />
            ) : (
              <p className="muted text-sm">
                No early signs written yet. Add them in the <Link to="/them/crisis" className="underline">crisis plan</Link>.
              </p>
            )}
            <TextArea label="What you noticed" value={e.what} onChange={(v) => set('what', v)} />
          </>
        ) : null}

        {e.kind !== 'contact' ? (
          <Chips
            label="This shows they need help with (optional)"
            options={AREAS.map((a) => ({ code: a.code, text: a.name }))}
            selected={e.areas ?? []}
            onToggle={(c) => set('areas', toggle(e.areas ?? [], c))}
          />
        ) : null}
        {e.kind !== 'contact' ? (
          <p className="muted -mt-2 text-sm">Tags put this note in the right place in continuing healthcare and benefit evidence.</p>
        ) : null}

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(e.flagged)} onChange={(x) => set('flagged', x.target.checked)} />
          Mark as important for a professional
        </label>

        <button className="btn btn-primary" disabled={saved} onClick={() => void submit()}>
          Save
        </button>
        <p className="muted text-sm">Saved on this phone straight away, even with no signal.</p>
      </Card>
    </Page>
  );
}

function Minutes({ value, onChange, label }: { value: number | undefined; onChange: (m: number) => void; label: string }) {
  const presets = [5, 15, 30, 60, 120];
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button key={p} type="button" className="chip" aria-pressed={value === p} onClick={() => onChange(p)}>
            {p < 60 ? `${p} min` : `${p / 60} hr`}
          </button>
        ))}
        <input
          className="field w-28"
          type="number"
          aria-label="Minutes"
          placeholder="minutes"
          value={value && !presets.includes(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </div>
    </fieldset>
  );
}

function defaultTitle(e: Entry): string {
  if (e.kind === 'care-given' && e.helpType) return HELP_TYPES.find((h) => h.code === e.helpType)?.name ?? KIND_NAMES[e.kind];
  if (e.kind === 'contact' && e.service) return `Contact with ${e.service}`;
  if (e.kind === 'night' && e.wakings) return `A bad night, woke ${e.wakings} times`;
  if (e.kind === 'happened' && e.what) return (e.what.split(/[.\n]/)[0] ?? e.what).slice(0, 60);
  return KIND_NAMES[e.kind];
}
