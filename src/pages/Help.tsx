import { Link } from 'react-router';
import { Card, Page } from '../components/ui';
import { CHECKED_ON, helplinesFor, localFor, WHO_DOES_WHAT } from '../lib/content/help';
import { formatDate } from '../lib/logic/summaries';
import { helperAvailable } from '../lib/helper/client';
import { useStore } from '../lib/store/StoreProvider';

const tel = (p: string) => `tel:${p.replace(/\s/g, '')}`;

export function Help() {
  const { circle, carer } = useStore();
  if (!circle) return null;
  const lines = helplinesFor(circle.careFor, circle.region);
  const local = localFor(circle.careFor, circle.region);
  const who = WHO_DOES_WHAT.filter((w) => w.regions.includes(circle.region));
  return (
    <Page title="Help">
      {helperAvailable() && carer.helperOn ? (
        <Link to="/ask" className="card block">
          <p className="font-semibold">Ask a question</p>
          <p className="muted text-sm">Plain answers about caring, services and forms. Not for medicines or emergencies.</p>
        </Link>
      ) : null}

      <Card>
        <h2 className="mb-2 font-semibold">Who to ask for what</h2>
        <dl className="flex flex-col gap-3">
          {who.map((w) => (
            <div key={w.question}>
              <dt className="font-medium">{w.question}</dt>
              <dd className="muted text-sm">{w.answer}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Helplines</h2>
        <ul className="flex flex-col gap-3">
          {lines.map((h) => (
            <li key={h.name}>
              <p className="font-medium">{h.name}</p>
              <p className="muted text-sm">
                {h.forWhat}. {h.when}.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {h.phone ? (
                  <a className="chip" href={tel(h.phone)}>
                    Call {h.phone}
                  </a>
                ) : null}
                {h.text ? <span className="chip">{h.text}</span> : null}
                {h.web ? (
                  <a className="chip" href={h.web} target="_blank" rel="noreferrer">
                    Website
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {local.length ? (
        <Card>
          <h2 className="mb-2 font-semibold">Near you</h2>
          <ul className="flex flex-col gap-3">
            {local.map((o) => (
              <li key={o.name}>
                <p className="font-medium">{o.name}</p>
                <p className="muted text-sm">{o.what}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {o.phone ? (
                    <a className="chip" href={tel(o.phone)}>
                      Call {o.phone}
                    </a>
                  ) : null}
                  {o.email ? (
                    <a className="chip" href={`mailto:${o.email}`}>
                      Email
                    </a>
                  ) : null}
                  {o.web ? (
                    <a className="chip" href={o.web} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-semibold">Your part in their care</h2>
        <ul className="list-disc pl-5 text-sm">
          <li>You can ask for a carer’s assessment of your own needs, separate from theirs.</li>
          <li>You can ask to be at assessments and reviews, and for copies of what is written about care plans.</li>
          <li>Staff may need the person’s agreement to share some details with you, but they can always listen to what you tell them.</li>
          <li>Write down who you spoke to, when, and what was agreed. Use “A call or appointment” in the log.</li>
        </ul>
      </Card>

      <p className="muted text-xs">Numbers checked {formatDate(new Date(CHECKED_ON).getTime())}. If one has changed, the organisation’s website has the current one.</p>
    </Page>
  );
}
