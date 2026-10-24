import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Area as TextArea, Card, Choice, Page, Text, toDateInput } from '../components/ui';
import { PAPERS_FOR } from '../lib/content/care';
import { gaps } from '../lib/logic/evidence';
import { buildDoc, DOCS, type DocKind } from '../lib/papers/documents';
import { renderPdf } from '../lib/papers/pdf';
import { saveFile } from '../lib/shell';
import { useStore } from '../lib/store/StoreProvider';
import { useNow } from '../lib/time';

const DAY = 24 * 60 * 60 * 1000;

/** Documents made from what the carer has written, ready to print, email or take along. */
export function Papers() {
  const { circle } = useStore();
  if (!circle) return null;
  const first = circle.careFor.flatMap((c) => PAPERS_FOR[c]);
  const order = (k: DocKind) => {
    const i = first.indexOf(k);
    return i < 0 ? 99 : i;
  };
  const list = DOCS.filter((d) => d.kind !== 'chc' || ['england', 'wales'].includes(circle.region)).sort((a, b) => order(a.kind) - order(b.kind));
  return (
    <Page title="Papers">
      <p className="muted">Each one is made from your notes. Nothing is added that you did not write. Check it before you send it.</p>
      {list.map((d) => (
        <Link key={d.kind} to={`/papers/${d.kind}`} className="card block">
          <p className="font-semibold">{d.name}</p>
          <p className="muted text-sm">{d.what}</p>
        </Link>
      ))}
    </Page>
  );
}

const PERIODS = [
  { code: '28', text: 'Last 4 weeks' },
  { code: '91', text: 'Last 3 months' },
  { code: '182', text: 'Last 6 months' },
  { code: 'custom', text: 'Choose dates' },
] as const;

export function PaperMaker() {
  const { kind } = useParams();
  const { circle, data, carer } = useStore();
  const info = DOCS.find((d) => d.kind === kind);
  const now = useNow();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['code']>('91');
  const [fromInput, setFromInput] = useState(toDateInput(now - 91 * DAY));
  const [toInput, setToInput] = useState(toDateInput(now));
  const [views, setViews] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const to = period === 'custom' ? new Date(`${toInput}T23:59:59`).getTime() : now;
  const from = period === 'custom' ? new Date(`${fromInput}T00:00:00`).getTime() : now - Number(period) * DAY;

  const doc = useMemo(() => {
    if (!circle || !info) return null;
    return buildDoc(info.kind, {
      circle,
      carerName: carer.name,
      entries: data.entries,
      doses: data.doses,
      medicines: data.medicines,
      contacts: data.contacts,
      papers: data.papers,
      about: data.about,
      crisis: data.crisis,
      from,
      to,
      views,
    });
  }, [circle, info, carer.name, data, from, to, views]);

  if (!circle || !info || !doc) return <Page title="Papers" back="/papers"><p>Not found.</p></Page>;

  const make = async () => {
    setBusy(true);
    setError('');
    try {
      const bytes = await renderPdf(doc);
      const safe = `${info.name} - ${circle.personName}`.replace(/[^\w\s-]/g, '').trim();
      await saveFile(`${safe}.pdf`, bytes, 'application/pdf');
    } catch {
      setError('The PDF was not made. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const missing = info.kind === 'chc' || info.kind === 'benefits' ? gaps(data.entries, from, to) : [];
  const aboutEmpty = !data.about || Object.values(data.about.sections).every((s) => !s.trim());

  return (
    <Page title={info.name} back="/papers">
      <p className="muted">{info.what}</p>
      {info.period ? (
        <Card className="flex flex-col gap-3">
          <Choice label="Notes from" options={PERIODS} value={period} onChange={setPeriod} />
          {period === 'custom' ? (
            <div className="grid grid-cols-2 gap-2">
              <Text label="From" type="date" value={fromInput} onChange={setFromInput} />
              <Text label="To" type="date" value={toInput} onChange={setToInput} />
            </div>
          ) : null}
        </Card>
      ) : null}
      {info.kind === 'chc' ? (
        <Card className="flex flex-col gap-2">
          <TextArea
            label="Your views on their needs"
            hint="The assessment must take the family’s views into account. Say what a usual day and night are like, what would happen without your help, and anything the notes do not show."
            value={views}
            onChange={setViews}
            rows={6}
          />
          <p className="muted text-sm">
            Ask to be at the assessment, and ask for a copy of the completed tool. If the decision is not what you expected, you can ask for it to be
            looked at again.
          </p>
        </Card>
      ) : null}
      {info.kind === 'benefits' ? (
        <Card>
          <p className="text-sm">
            For the best evidence: log help as it happens with “Help I gave”, say what they could not do safely or without help, and how long it
            took. Include bad days and nights.
          </p>
        </Card>
      ) : null}
      {missing.length ? (
        <Card>
          <p className="font-semibold">Nothing written yet for</p>
          <p className="muted text-sm">{missing.join(', ')}. If they need help with any of these, add an example before you make the pack.</p>
        </Card>
      ) : null}
      {aboutEmpty && ['about-me', 'hospital', 'respite', 'care-home'].includes(info.kind) ? (
        <Card>
          <p>
            This uses <Link to="/them/about" className="underline">About {circle.personName}</Link>, which is still empty.
          </p>
        </Card>
      ) : null}

      <button className="btn btn-primary" disabled={busy} onClick={() => void make()}>
        {busy ? 'Making it…' : 'Make the PDF'}
      </button>
      {error ? <p className="warnbox">{error}</p> : null}

      <Card>
        <p className="muted mb-2 text-sm">Preview</p>
        <h2 className="text-xl font-semibold">{doc.title}</h2>
        {doc.subtitle ? <p className="muted">{doc.subtitle}</p> : null}
        {doc.intro ? <p className="mt-2 text-sm">{doc.intro}</p> : null}
        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-4">
            <h3 className="font-semibold">{s.heading}</h3>
            {s.paragraphs?.map((p) => (
              <p key={p} className="whitespace-pre-wrap">
                {p}
              </p>
            ))}
            {s.items?.length ? (
              <ul className="list-disc pl-5">
                {s.items.map((i, n) => (
                  <li key={n}>{i}</li>
                ))}
              </ul>
            ) : null}
            {s.pairs?.map(([k, v]) => (
              <p key={k}>
                <strong>{k}:</strong> <span className="whitespace-pre-wrap">{v}</span>
              </p>
            ))}
          </section>
        ))}
        <p className="muted mt-4 text-xs">{doc.footer}</p>
      </Card>
    </Page>
  );
}
