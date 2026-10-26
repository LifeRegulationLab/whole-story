import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, Page } from '../components/ui';
import { NEEDS } from '../lib/content/care';
import { helplinesFor } from '../lib/content/help';
import { DANGER_LINE, meCards, themCards, type NowCard } from '../lib/content/now';
import { useStore } from '../lib/store/StoreProvider';
import { isUnnamed } from '../lib/model/name';

/** What to try right now. Fixed words, no signal needed, no AI. */
export function Now() {
  const { circle, data, carer, saveDoc, canWrite } = useStore();
  const navigate = useNavigate();
  const [who, setWho] = useState<'them' | 'me'>('them');
  const [needs, setNeeds] = useState<string[]>([]);
  const [helped, setHelped] = useState<string[]>([]);
  if (!circle) return null;
  const cards = who === 'them' ? themCards(circle.careFor) : meCards;
  const lines = helplinesFor(circle.careFor, circle.region).filter((h) => h.urgent || who === 'me');

  const useHelp = (code: string) => {
    if (!data.about || helped.includes(code)) return;
    setHelped((h) => [...h, code]);
    void saveDoc('about', { ...data.about, helps: data.about.helps.map((h) => (h.code === code ? { ...h, count: h.count + 1 } : h)) });
  };

  const writeItDown = () => {
    const q = new URLSearchParams();
    if (needs.length) q.set('needs', needs.join(','));
    if (helped.length) q.set('helped', helped.join(','));
    navigate(`/log/new/happened?${q.toString()}`);
  };

  return (
    <Page title="Now">
      <p className="warnbox font-medium">{DANGER_LINE}</p>
      <div className="flex gap-2" role="tablist">
        <button role="tab" aria-selected={who === 'them'} className={`btn flex-1 ${who === 'them' ? 'btn-primary' : ''}`} onClick={() => setWho('them')}>
          {isUnnamed(circle.personName) ? 'They are struggling' : `${circle.personName} is struggling`}
        </button>
        <button role="tab" aria-selected={who === 'me'} className={`btn flex-1 ${who === 'me' ? 'btn-primary' : ''}`} onClick={() => setWho('me')}>
          I am struggling
        </button>
      </div>
      {cards.map((c) => (
        <NowCardView
          key={c.title}
          card={c}
          helps={data.about?.helps ?? []}
          helped={helped}
          onHelp={useHelp}
          needs={needs}
          onNeed={(n) => setNeeds((l) => (l.includes(n) ? l.filter((x) => x !== n) : [...l, n]))}
          mine={carer.whatHelpsMe}
          someone={carer.someone}
          lines={lines}
        />
      ))}
      {who === 'them' && canWrite ? (
        <button className="btn btn-primary" onClick={writeItDown}>
          Write down what happened
        </button>
      ) : null}
      {who === 'me' ? (
        <Link to="/me" className="btn">
          Change what helps me
        </Link>
      ) : null}
    </Page>
  );
}

function NowCardView(props: {
  card: NowCard;
  helps: { code: string; text: string }[];
  helped: string[];
  onHelp: (code: string) => void;
  needs: string[];
  onNeed: (code: string) => void;
  mine: string[];
  someone: string | undefined;
  lines: ReturnType<typeof helplinesFor>;
}) {
  const { card } = props;
  return (
    <Card>
      <h2 className="mb-1 text-lg font-semibold">{card.title}</h2>
      <p>{card.body}</p>
      {card.showHelps ? (
        props.helps.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {props.helps.map((h) => (
              <button key={h.code} className="chip" aria-pressed={props.helped.includes(h.code)} onClick={() => props.onHelp(h.code)}>
                {h.text}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted mt-2 text-sm">
            Nothing written yet. Add what helps them in <Link to="/them/about" className="underline">About them</Link>.
          </p>
        )
      ) : null}
      {card.showNeeds ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {NEEDS.map((n) => (
            <button key={n.code} className="chip" aria-pressed={props.needs.includes(n.code)} onClick={() => props.onNeed(n.code)}>
              {n.text}
            </button>
          ))}
        </div>
      ) : null}
      {card.timer ? <Timer /> : null}
      {card.helplines ? (
        <ul className="mt-3 flex flex-col gap-2">
          {props.lines.map((h) => (
            <li key={h.name}>
              {h.phone ? (
                <a className="btn w-full justify-between" href={`tel:${h.phone.replace(/\s/g, '')}`}>
                  <span>{h.name}</span>
                  <span>{h.phone}</span>
                </a>
              ) : null}
              {h.text ? (
                <a className="btn mt-1 w-full justify-between" href={`sms:${h.text.replace(/\D/g, '')}`}>
                  <span>{h.name} by text</span>
                  <span>{h.text}</span>
                </a>
              ) : null}
              <span className="muted text-xs">
                {h.forWhat}. {h.when}.
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {card.showMine ? (
        props.mine.length ? (
          <ul className="mt-2 list-disc pl-5">
            {props.mine.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : (
          <p className="muted mt-2 text-sm">Add your own list in Me.</p>
        )
      ) : null}
      {card.showSomeone ? (
        props.someone ? (
          <p className="mt-2 font-medium">{props.someone}</p>
        ) : (
          <p className="muted mt-2 text-sm">Add one person in Me. The app never messages them.</p>
        )
      ) : null}
    </Card>
  );
}

function Timer() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (left === null) {
    return (
      <button className="btn mt-3" onClick={() => setLeft(300)}>
        Start five minutes
      </button>
    );
  }
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  return (
    <p className="mt-3 text-3xl font-semibold tabular-nums" aria-live="polite">
      {left > 0 ? `${m}:${s}` : 'Five minutes are up. How is it now?'}
    </p>
  );
}
