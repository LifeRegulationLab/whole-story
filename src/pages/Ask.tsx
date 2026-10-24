import { useState } from 'react';
import { Card, Page } from '../components/ui';
import { CARE_FOR } from '../lib/content/setup';
import { ask, helperAvailable, type Turn } from '../lib/helper/client';
import { weeklyUpdate } from '../lib/logic/summaries';
import { useStore } from '../lib/store/StoreProvider';
import { useNow } from '../lib/time';

/**
 * The helper. Off unless switched on. It sees only the question and what the carer ticks below,
 * never the log itself. Crisis words and medicine questions are answered here without the model.
 */
export function Ask() {
  const { circle, data, carer } = useStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [useCare, setUseCare] = useState(true);
  const [useHelps, setUseHelps] = useState(false);
  const [useWeek, setUseWeek] = useState(false);
  const now = useNow();
  if (!circle) return null;
  if (!helperAvailable() || !carer.helperOn) {
    return (
      <Page title="Ask" back="/help">
        <Card>
          <p>The helper is switched off. Everything else works without it. Help lists who to call.</p>
        </Card>
      </Page>
    );
  }
  const context = [
    ...(useCare ? [`Caring for: ${circle.careFor.map((c) => CARE_FOR.find((x) => x.code === c)?.text).join(', ')}. Lives in ${circle.region}.`] : []),
    ...(useHelps && data.about?.helps.length ? [`What helps them: ${data.about.helps.map((h) => h.text).join(', ')}.`] : []),
    ...(useWeek ? [weeklyUpdate('them', data.entries, [], [], now)] : []),
  ];
  const send = async () => {
    const q = text.trim();
    if (!q) return;
    const next: Turn[] = [...turns, { role: 'carer', text: q }];
    setTurns(next);
    setText('');
    setBusy(true);
    const reply = await ask(q, context, turns);
    setTurns([...next, reply]);
    setBusy(false);
  };
  return (
    <Page title="Ask" back="/help">
      <p className="muted text-sm">
        For questions about caring, services and forms. It does not answer questions about doses or changing medicines, and it is not for
        emergencies: call 999.
      </p>
      <Card className="flex flex-col gap-1 text-sm">
        <p className="font-medium">It can see</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useCare} onChange={(e) => setUseCare(e.target.checked)} /> What kind of caring and where
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useHelps} onChange={(e) => setUseHelps(e.target.checked)} /> What helps them
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useWeek} onChange={(e) => setUseWeek(e.target.checked)} /> Counts from this week’s log, with no names
        </label>
      </Card>
      <ul className="flex flex-col gap-3" aria-live="polite">
        {turns.map((t, i) => (
          <li key={i} className={t.role === 'carer' ? 'self-end' : ''}>
            <div className={`card whitespace-pre-wrap ${t.support ? 'border-[var(--warn)]' : ''}`}>{t.text}</div>
          </li>
        ))}
      </ul>
      <textarea className="field" aria-label="Your question" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={() => void send()}>
        {busy ? 'Thinking…' : 'Ask'}
      </button>
    </Page>
  );
}
